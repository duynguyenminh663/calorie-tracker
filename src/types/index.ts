export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type AuthProvider = 'google' | 'apple' | 'email' | 'guest';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  provider: AuthProvider;
  avatarUrl?: string;
}

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
  protein?: number;
  carbs?: number;
  fat?: number;
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
  notes?: string;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface DailyGoal {
  dateString: string;
  calorieTarget: number;
}

export interface MealBreakdown {
  Breakfast: number;
  Lunch: number;
  Dinner: number;
  Snack: number;
}

export interface DailySummary {
  dateString: string;
  totalCalories: number;
  calorieTarget: number;
  remainingCalories: number;
  entries: LoggedEntry[];
  isOverTarget?: boolean;
  percentageConsumed?: number;
  mealBreakdown?: MealBreakdown;
}

export interface IStorageAdapter {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  clear(): Promise<void>;
}

export interface ICalorieMath {
  calculateItemCalories(portion: number, caloriesPerUnit: number): number;
  calculateDailyTotal(entries: LoggedEntry[]): number;
  calculateRemainingBalance(target: number, consumed: number): number;
  validatePortionInput(input: string | number): { isValid: boolean; parsedValue: number; error?: string };
}

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
