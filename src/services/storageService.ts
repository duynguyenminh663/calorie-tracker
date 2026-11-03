import { STARTER_FOOD_CATALOG } from '../data/starterCatalog';
import {
  DailySummary,
  FoodItem,
  ICalorieRepository,
  IStorageAdapter,
  LoggedEntry,
} from '../types';
import {
  calculateDailyTotal,
  calculateItemCalories,
  calculateMealBreakdown,
  calculateProgressPercentage,
  calculateRemainingBalance,
} from '../utils/calorieMath';
import { AsyncStorageAdapter } from './storageAdapter';

class AsyncMutex {
  private queue: Promise<unknown> = Promise.resolve();

  run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue
        .then(() => fn().then(resolve, reject))
        .catch(() => fn().then(resolve, reject));
    });
  }
}

export class CalorieRepository implements ICalorieRepository {
  private customFoodsKey = '@calorie_app/custom_foods';
  private entriesKey = '@calorie_app/entries';
  private goalsKey = '@calorie_app/goals';
  private mutex = new AsyncMutex();
  private idCounter = 0;

  constructor(private storage: IStorageAdapter = AsyncStorageAdapter) {}

  /**
   * Retrieves full food catalog combining static starter items and user custom items.
   */
  async getFoodCatalog(): Promise<FoodItem[]> {
    return this.mutex.run(async () => {
      const custom = (await this.storage.getItem<FoodItem[]>(this.customFoodsKey)) || [];
      return [...STARTER_FOOD_CATALOG, ...custom];
    });
  }

  /**
   * Saves a user-created custom food item.
   */
  async saveCustomFood(food: Omit<FoodItem, 'id'>): Promise<FoodItem> {
    return this.mutex.run(async () => {
      const custom = (await this.storage.getItem<FoodItem[]>(this.customFoodsKey)) || [];
      const newFood: FoodItem = {
        ...food,
        id: `custom_${Date.now()}_${++this.idCounter}_${Math.random().toString(36).substring(2, 8)}`,
        isCustom: true,
      };
      await this.storage.setItem(this.customFoodsKey, [...custom, newFood]);
      return newFood;
    });
  }

  /**
   * Deletes a custom food item from storage.
   * Note: Historical logged entries remain preserved due to denormalized snapshots.
   */
  async deleteCustomFood(foodId: string): Promise<boolean> {
    return this.mutex.run(async () => {
      const custom = (await this.storage.getItem<FoodItem[]>(this.customFoodsKey)) || [];
      const exists = custom.some((f) => f.id === foodId);
      if (!exists) return false;
      const filtered = custom.filter((f) => f.id !== foodId);
      await this.storage.setItem(this.customFoodsKey, filtered);
      return true;
    });
  }

  /**
   * Retrieves all logged food entries for a specific calendar date (YYYY-MM-DD),
   * sorted in chronological ascending order.
   */
  async getLoggedEntries(dateString: string): Promise<LoggedEntry[]> {
    return this.mutex.run(async () => {
      const all = (await this.storage.getItem<LoggedEntry[]>(this.entriesKey)) || [];
      return all
        .filter((e) => e.dateString === dateString)
        .sort((a, b) => a.timestamp - b.timestamp);
    });
  }

  /**
   * Adds a new logged meal entry with denormalized snapshot of food name, portion, and calories.
   */
  async addLoggedEntry(entry: Omit<LoggedEntry, 'id' | 'timestamp'>): Promise<LoggedEntry> {
    return this.mutex.run(async () => {
      const all = (await this.storage.getItem<LoggedEntry[]>(this.entriesKey)) || [];
      const newEntry: LoggedEntry = {
        ...entry,
        id: `entry_${Date.now()}_${++this.idCounter}_${Math.random().toString(36).substring(2, 8)}`,
        timestamp: Date.now(),
      };
      await this.storage.setItem(this.entriesKey, [...all, newEntry]);
      return newEntry;
    });
  }

  /**
   * Updates an existing logged entry's portion, meal type, or calories.
   * Recalculates calories if portion changes and calories are not explicitly provided.
   */
  async updateLoggedEntry(id: string, updates: Partial<LoggedEntry>): Promise<LoggedEntry> {
    return this.mutex.run(async () => {
      const all = (await this.storage.getItem<LoggedEntry[]>(this.entriesKey)) || [];
      const index = all.findIndex((e) => e.id === id);
      if (index === -1) {
        throw new Error(`Entry with id ${id} not found`);
      }

      const current = all[index];
      const updated: LoggedEntry = {
        ...current,
        ...updates,
        id: current.id,
        timestamp: current.timestamp,
      };

      if (updates.portion !== undefined && updates.calories === undefined) {
        const baseCalories = current.calories / (current.portion || 1);
        updated.calories = calculateItemCalories(updates.portion, baseCalories);
      }

      all[index] = updated;
      await this.storage.setItem(this.entriesKey, all);
      return updated;
    });
  }

  /**
   * Deletes a logged entry permanently from local storage.
   */
  async deleteLoggedEntry(id: string): Promise<boolean> {
    return this.mutex.run(async () => {
      const all = (await this.storage.getItem<LoggedEntry[]>(this.entriesKey)) || [];
      const exists = all.some((e) => e.id === id);
      if (!exists) return false;
      const remaining = all.filter((e) => e.id !== id);
      await this.storage.setItem(this.entriesKey, remaining);
      return true;
    });
  }

  /**
   * Gets the calorie goal for a specific date, or fallback default (2000).
   */
  async getDailyGoal(dateString: string): Promise<number> {
    return this.mutex.run(async () => {
      const goals = (await this.storage.getItem<Record<string, number>>(this.goalsKey)) || {};
      if (goals[dateString] !== undefined) {
        return goals[dateString];
      }
      if (goals['default'] !== undefined) {
        return goals['default'];
      }
      return 2000;
    });
  }

  /**
   * Sets the calorie target for a date and updates default goal.
   * Throws if target <= 0.
   */
  async setDailyGoal(dateString: string, target: number): Promise<void> {
    if (target <= 0) {
      throw new Error('Calorie target must be greater than zero');
    }
    return this.mutex.run(async () => {
      const goals = (await this.storage.getItem<Record<string, number>>(this.goalsKey)) || {};
      goals[dateString] = target;
      goals['default'] = target;
      await this.storage.setItem(this.goalsKey, goals);
    });
  }

  /**
   * Computes comprehensive daily summary for a date: total intake, target, remaining balance,
   * progress percentage, and meal breakdown.
   */
  async getDailySummary(dateString: string): Promise<DailySummary> {
    const entries = await this.getLoggedEntries(dateString);
    const target = await this.getDailyGoal(dateString);
    const totalCalories = calculateDailyTotal(entries);
    const remainingCalories = calculateRemainingBalance(target, totalCalories);
    const percentageConsumed = calculateProgressPercentage(totalCalories, target);
    const mealBreakdown = calculateMealBreakdown(entries);

    return {
      dateString,
      calorieTarget: target,
      totalCalories,
      remainingCalories,
      isOverTarget: totalCalories > target,
      percentageConsumed,
      mealBreakdown,
      entries,
    };
  }
}

/**
 * Default singleton instance connected to native AsyncStorageAdapter
 */
export const defaultCalorieRepository = new CalorieRepository(AsyncStorageAdapter);

export const getFoodCatalog = () => defaultCalorieRepository.getFoodCatalog();
export const saveCustomFood = (food: Omit<FoodItem, 'id'>) => defaultCalorieRepository.saveCustomFood(food);
export const deleteCustomFood = (foodId: string) => defaultCalorieRepository.deleteCustomFood(foodId);
export const getLoggedEntries = (dateString: string) => defaultCalorieRepository.getLoggedEntries(dateString);
export const addLoggedEntry = (entry: Omit<LoggedEntry, 'id' | 'timestamp'>) => defaultCalorieRepository.addLoggedEntry(entry);
export const updateLoggedEntry = (id: string, updates: Partial<LoggedEntry>) => defaultCalorieRepository.updateLoggedEntry(id, updates);
export const deleteLoggedEntry = (id: string) => defaultCalorieRepository.deleteLoggedEntry(id);
export const getDailyGoal = (dateString: string) => defaultCalorieRepository.getDailyGoal(dateString);
export const setDailyGoal = (dateString: string, target: number) => defaultCalorieRepository.setDailyGoal(dateString, target);
export const getDailySummary = (dateString: string) => defaultCalorieRepository.getDailySummary(dateString);
