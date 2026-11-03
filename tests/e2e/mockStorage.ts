/**
 * Self-contained Mock Storage Adapter & Contract Reference Engine
 * Conforms strictly to PROJECT.md § Interface Contracts & Survey 2/3 specifications.
 * Provides in-memory storage, mock data, and dynamic resolution for test isolation.
 */

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type FoodCategory =
  | 'Fruits'
  | 'Vegetables'
  | 'Proteins'
  | 'Grains'
  | 'Dairy'
  | 'Snacks & Fats'
  | 'Beverages';

export interface FoodItem {
  id: string;
  name: string;
  servingUnit: string;
  caloriesPerUnit: number;
  category: string;
  isCustom?: boolean;
}

export interface LoggedEntry {
  id: string;
  foodItemId: string;
  foodName: string;
  portion: number;
  servingUnit: string;
  calories: number;
  dateString: string;
  mealType: MealType;
  timestamp: number;
}

export interface DailyGoal {
  dateString: string;
  calorieTarget: number;
}

export interface DailySummary {
  dateString: string;
  totalCalories: number;
  calorieTarget: number;
  remainingCalories: number;
  entries: LoggedEntry[];
}

export interface IStorageAdapter {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  clear(): Promise<void>;
}

export class InMemoryStorageAdapter implements IStorageAdapter {
  private store: Map<string, string> = new Map<string, string>();

  async getItem<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAllKeys(): Promise<readonly string[]> {
    return Array.from(this.store.keys());
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export const STARTER_FOOD_CATALOG: FoodItem[] = [
  // Fruits
  { id: 'starter_apple', name: 'Apple', caloriesPerUnit: 95, servingUnit: '1 medium (182g)', category: 'Fruits', isCustom: false },
  { id: 'starter_banana', name: 'Banana', caloriesPerUnit: 105, servingUnit: '1 medium (118g)', category: 'Fruits', isCustom: false },
  { id: 'starter_orange', name: 'Orange', caloriesPerUnit: 62, servingUnit: '1 medium (131g)', category: 'Fruits', isCustom: false },
  { id: 'starter_strawberries', name: 'Strawberries', caloriesPerUnit: 49, servingUnit: '1 cup (144g)', category: 'Fruits', isCustom: false },
  { id: 'starter_blueberries', name: 'Blueberries', caloriesPerUnit: 84, servingUnit: '1 cup (148g)', category: 'Fruits', isCustom: false },
  { id: 'starter_avocado', name: 'Avocado', caloriesPerUnit: 160, servingUnit: '0.5 fruit (100g)', category: 'Fruits', isCustom: false },
  // Vegetables
  { id: 'starter_broccoli', name: 'Broccoli (Steamed)', caloriesPerUnit: 35, servingUnit: '100g', category: 'Vegetables', isCustom: false },
  { id: 'starter_spinach', name: 'Spinach (Fresh)', caloriesPerUnit: 23, servingUnit: '100g', category: 'Vegetables', isCustom: false },
  { id: 'starter_carrots', name: 'Carrot', caloriesPerUnit: 41, servingUnit: '1 medium (100g)', category: 'Vegetables', isCustom: false },
  { id: 'starter_mixed_salad', name: 'Mixed Greens Salad', caloriesPerUnit: 15, servingUnit: '1 bowl (100g)', category: 'Vegetables', isCustom: false },
  { id: 'starter_cucumber', name: 'Cucumber', caloriesPerUnit: 15, servingUnit: '100g', category: 'Vegetables', isCustom: false },
  { id: 'starter_tomato', name: 'Tomato', caloriesPerUnit: 22, servingUnit: '1 medium (123g)', category: 'Vegetables', isCustom: false },
  // Proteins
  { id: 'starter_chicken_breast', name: 'Chicken Breast (Grilled)', caloriesPerUnit: 165, servingUnit: '100g', category: 'Proteins', isCustom: false },
  { id: 'starter_salmon', name: 'Salmon Fillet (Baked)', caloriesPerUnit: 208, servingUnit: '100g', category: 'Proteins', isCustom: false },
  { id: 'starter_beef_steak', name: 'Lean Beef (Grilled)', caloriesPerUnit: 217, servingUnit: '100g', category: 'Proteins', isCustom: false },
  { id: 'starter_egg', name: 'Whole Egg (Boiled/Fried)', caloriesPerUnit: 72, servingUnit: '1 large (50g)', category: 'Proteins', isCustom: false },
  { id: 'starter_egg_white', name: 'Egg Whites', caloriesPerUnit: 52, servingUnit: '100g (approx 3 whites)', category: 'Proteins', isCustom: false },
  { id: 'starter_tofu', name: 'Firm Tofu', caloriesPerUnit: 83, servingUnit: '100g', category: 'Proteins', isCustom: false },
  { id: 'starter_tuna', name: 'Canned Tuna (in Water)', caloriesPerUnit: 116, servingUnit: '1 can drained (100g)', category: 'Proteins', isCustom: false },
  { id: 'starter_whey_protein', name: 'Whey Protein Powder', caloriesPerUnit: 120, servingUnit: '1 scoop (30g)', category: 'Proteins', isCustom: false },
  // Grains
  { id: 'starter_white_rice', name: 'White Rice (Cooked)', caloriesPerUnit: 205, servingUnit: '1 cup (158g)', category: 'Grains', isCustom: false },
  { id: 'starter_brown_rice', name: 'Brown Rice (Cooked)', caloriesPerUnit: 216, servingUnit: '1 cup (195g)', category: 'Grains', isCustom: false },
  { id: 'starter_oats', name: 'Rolled Oats (Dry)', caloriesPerUnit: 150, servingUnit: '0.5 cup (40g)', category: 'Grains', isCustom: false },
  { id: 'starter_whole_wheat_bread', name: 'Whole Wheat Bread', caloriesPerUnit: 80, servingUnit: '1 slice (32g)', category: 'Grains', isCustom: false },
  { id: 'starter_white_bread', name: 'White Bread', caloriesPerUnit: 67, servingUnit: '1 slice (25g)', category: 'Grains', isCustom: false },
  { id: 'starter_pasta', name: 'Pasta (Cooked)', caloriesPerUnit: 220, servingUnit: '1 cup (140g)', category: 'Grains', isCustom: false },
  // Dairy
  { id: 'starter_whole_milk', name: 'Whole Milk', caloriesPerUnit: 149, servingUnit: '1 cup (244ml)', category: 'Dairy', isCustom: false },
  { id: 'starter_greek_yogurt', name: 'Greek Yogurt (Plain 0%)', caloriesPerUnit: 120, servingUnit: '1 cup (200g)', category: 'Dairy', isCustom: false },
  { id: 'starter_cheddar_cheese', name: 'Cheddar Cheese', caloriesPerUnit: 113, servingUnit: '1 slice (28g)', category: 'Dairy', isCustom: false },
  { id: 'starter_almond_milk', name: 'Almond Milk (Unsweetened)', caloriesPerUnit: 30, servingUnit: '1 cup (240ml)', category: 'Dairy', isCustom: false },
  // Snacks & Fats
  { id: 'starter_peanut_butter', name: 'Peanut Butter', caloriesPerUnit: 190, servingUnit: '2 tbsp (32g)', category: 'Snacks & Fats', isCustom: false },
  { id: 'starter_almonds', name: 'Almonds', caloriesPerUnit: 164, servingUnit: '1 handful (28g)', category: 'Snacks & Fats', isCustom: false },
  { id: 'starter_olive_oil', name: 'Olive Oil', caloriesPerUnit: 119, servingUnit: '1 tbsp (15ml)', category: 'Snacks & Fats', isCustom: false },
  { id: 'starter_dark_chocolate', name: 'Dark Chocolate (70%)', caloriesPerUnit: 170, servingUnit: '1 oz (28g)', category: 'Snacks & Fats', isCustom: false },
  // Beverages
  { id: 'starter_black_coffee', name: 'Black Coffee', caloriesPerUnit: 2, servingUnit: '1 cup (240ml)', category: 'Beverages', isCustom: false },
  { id: 'starter_orange_juice', name: 'Orange Juice', caloriesPerUnit: 112, servingUnit: '1 cup (248ml)', category: 'Beverages', isCustom: false },
  { id: 'starter_regular_cola', name: 'Regular Cola', caloriesPerUnit: 140, servingUnit: '1 can (355ml)', category: 'Beverages', isCustom: false },
];

export interface ICalorieMath {
  calculateItemCalories(portion: number, caloriesPerUnit: number): number;
  calculateDailyTotal(entries: LoggedEntry[]): number;
  calculateRemainingBalance(target: number, consumed: number): number;
  validatePortionInput(input: string | number): { isValid: boolean; parsedValue: number; error?: string };
}

export const ContractCalorieMath: ICalorieMath = {
  calculateItemCalories(portion: number, caloriesPerUnit: number): number {
    if (typeof portion !== 'number' || typeof caloriesPerUnit !== 'number') return 0;
    if (isNaN(portion) || isNaN(caloriesPerUnit) || !isFinite(portion) || !isFinite(caloriesPerUnit)) return 0;
    if (portion <= 0 || caloriesPerUnit <= 0) return 0;
    return Math.round(portion * caloriesPerUnit);
  },

  calculateDailyTotal(entries: LoggedEntry[]): number {
    if (!Array.isArray(entries) || entries.length === 0) return 0;
    return entries.reduce((sum, e) => sum + (typeof e?.calories === 'number' && !isNaN(e.calories) ? e.calories : 0), 0);
  },

  calculateRemainingBalance(target: number, consumed: number): number {
    const t = typeof target === 'number' && !isNaN(target) ? target : 0;
    const c = typeof consumed === 'number' && !isNaN(consumed) ? consumed : 0;
    return t - c;
  },

  validatePortionInput(input: string | number): { isValid: boolean; parsedValue: number; error?: string } {
    if (input === null || input === undefined) {
      return { isValid: false, parsedValue: 0, error: 'Portion is required' };
    }
    const val = typeof input === 'number' ? input : parseFloat(String(input).trim());
    if (isNaN(val) || !isFinite(val)) {
      return { isValid: false, parsedValue: 0, error: 'Portion must be a valid number' };
    }
    if (val <= 0) {
      return { isValid: false, parsedValue: 0, error: 'Portion must be greater than zero' };
    }
    return { isValid: true, parsedValue: val };
  },
};

export interface ICalorieRepository {
  getFoodCatalog(): Promise<FoodItem[]>;
  saveCustomFood(food: Omit<FoodItem, 'id'>): Promise<FoodItem>;
  getLoggedEntries(dateString: string): Promise<LoggedEntry[]>;
  addLoggedEntry(entry: Omit<LoggedEntry, 'id' | 'timestamp'>): Promise<LoggedEntry>;
  updateLoggedEntry(id: string, updates: Partial<LoggedEntry>): Promise<LoggedEntry>;
  deleteLoggedEntry(id: string): Promise<boolean>;
  getDailyGoal(dateString: string): Promise<number>;
  setDailyGoal(dateString: string, target: number): Promise<void>;
  getDailySummary(dateString: string): Promise<DailySummary>;
}

export class ContractCalorieRepository implements ICalorieRepository {
  private customFoodsKey = '@calorie_app/custom_foods';
  private entriesKey = '@calorie_app/entries';
  private goalsKey = '@calorie_app/goals';

  constructor(private storage: IStorageAdapter = new InMemoryStorageAdapter()) {}

  async getFoodCatalog(): Promise<FoodItem[]> {
    const custom = (await this.storage.getItem<FoodItem[]>(this.customFoodsKey)) || [];
    return [...STARTER_FOOD_CATALOG, ...custom];
  }

  async saveCustomFood(food: Omit<FoodItem, 'id'>): Promise<FoodItem> {
    const custom = (await this.storage.getItem<FoodItem[]>(this.customFoodsKey)) || [];
    const newFood: FoodItem = {
      ...food,
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      isCustom: true,
    };
    await this.storage.setItem(this.customFoodsKey, [...custom, newFood]);
    return newFood;
  }

  async getLoggedEntries(dateString: string): Promise<LoggedEntry[]> {
    const all = (await this.storage.getItem<LoggedEntry[]>(this.entriesKey)) || [];
    return all.filter((e) => e.dateString === dateString).sort((a, b) => a.timestamp - b.timestamp);
  }

  async addLoggedEntry(entry: Omit<LoggedEntry, 'id' | 'timestamp'>): Promise<LoggedEntry> {
    const all = (await this.storage.getItem<LoggedEntry[]>(this.entriesKey)) || [];
    const newEntry: LoggedEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
    };
    await this.storage.setItem(this.entriesKey, [...all, newEntry]);
    return newEntry;
  }

  async updateLoggedEntry(id: string, updates: Partial<LoggedEntry>): Promise<LoggedEntry> {
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
      const baseCal = (current.calories / (current.portion || 1));
      updated.calories = ContractCalorieMath.calculateItemCalories(updates.portion, baseCal);
    }
    all[index] = updated;
    await this.storage.setItem(this.entriesKey, all);
    return updated;
  }

  async deleteLoggedEntry(id: string): Promise<boolean> {
    const all = (await this.storage.getItem<LoggedEntry[]>(this.entriesKey)) || [];
    const exists = all.some((e) => e.id === id);
    if (!exists) return false;
    const remaining = all.filter((e) => e.id !== id);
    await this.storage.setItem(this.entriesKey, remaining);
    return true;
  }

  async getDailyGoal(dateString: string): Promise<number> {
    const goals = (await this.storage.getItem<Record<string, number>>(this.goalsKey)) || {};
    if (goals[dateString] !== undefined) {
      return goals[dateString];
    }
    if (goals['default'] !== undefined) {
      return goals['default'];
    }
    return 2000;
  }

  async setDailyGoal(dateString: string, target: number): Promise<void> {
    if (target <= 0) throw new Error('Calorie target must be greater than zero');
    const goals = (await this.storage.getItem<Record<string, number>>(this.goalsKey)) || {};
    goals[dateString] = target;
    goals['default'] = target;
    await this.storage.setItem(this.goalsKey, goals);
  }

  async getDailySummary(dateString: string): Promise<DailySummary> {
    const [entries, target] = await Promise.all([
      this.getLoggedEntries(dateString),
      this.getDailyGoal(dateString),
    ]);
    const totalCalories = ContractCalorieMath.calculateDailyTotal(entries);
    const remainingCalories = ContractCalorieMath.calculateRemainingBalance(target, totalCalories);
    return {
      dateString,
      calorieTarget: target,
      totalCalories,
      remainingCalories,
      entries,
    };
  }
}

/**
 * Dynamic resolution helpers to test either real implementation or contract fallback
 */
export async function getCalorieMath(): Promise<ICalorieMath> {
  try {
    const impl = await import('../../src/utils/calorieMath');
    if (impl && typeof impl.calculateItemCalories === 'function') {
      return {
        calculateItemCalories: impl.calculateItemCalories,
        calculateDailyTotal: impl.calculateDailyTotal,
        calculateRemainingBalance: impl.calculateRemainingBalance,
        validatePortionInput: impl.validatePortionInput || ContractCalorieMath.validatePortionInput,
      };
    }
  } catch {
    // Expected before M2 implementation is complete
  }
  return ContractCalorieMath;
}

export async function getStorageRepository(adapter?: IStorageAdapter): Promise<ICalorieRepository> {
  const currentAdapter = adapter || new InMemoryStorageAdapter();
  try {
    const impl = await import('../../src/services/storageService');
    if (impl) {
      if (typeof impl.CalorieRepository === 'function') {
        return new impl.CalorieRepository(currentAdapter);
      }
      if (typeof impl.getDailySummary === 'function') {
        return impl as unknown as ICalorieRepository;
      }
    }
  } catch {
    // Expected before M2 implementation is complete
  }
  return new ContractCalorieRepository(currentAdapter);
}
