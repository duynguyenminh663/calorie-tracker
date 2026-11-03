import { LoggedEntry, MealBreakdown } from '../types';

/**
 * Calculates item calories based on portion multiplier and base calories per serving unit.
 * Uses Math.round to eliminate floating-point precision drift.
 * Returns 0 for invalid inputs, negative portions, zero portions, or zero base calories.
 */
export function calculateItemCalories(portion: number, caloriesPerUnit: number): number {
  if (typeof portion !== 'number' || typeof caloriesPerUnit !== 'number') return 0;
  if (isNaN(portion) || isNaN(caloriesPerUnit) || !isFinite(portion) || !isFinite(caloriesPerUnit)) return 0;
  if (portion <= 0 || caloriesPerUnit <= 0) return 0;
  return Math.round(portion * caloriesPerUnit);
}

/**
 * Calculates cumulative daily calorie total by summing all logged entries.
 * Operates on integer calories, completely preventing IEEE-754 precision drift.
 */
export function calculateDailyTotal(entries: LoggedEntry[]): number {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  return entries.reduce(
    (sum, e) => sum + (typeof e?.calories === 'number' && !isNaN(e.calories) ? e.calories : 0),
    0
  );
}

/**
 * Calculates remaining calories: target minus consumed.
 * Positive when under target, negative when budget is exceeded.
 */
export function calculateRemainingBalance(target: number, consumed: number): number {
  const t = typeof target === 'number' && !isNaN(target) ? target : 0;
  const c = typeof consumed === 'number' && !isNaN(consumed) ? consumed : 0;
  return t - c;
}

/**
 * Strictly validates and parses portion input from number or string.
 * Accepts positive integers and decimals (e.g. 1, 0.5, 1.25, 2.75).
 * Rejects zero, negative, empty, non-numeric, or malformed strings (e.g. '1.2.3').
 */
export function validatePortionInput(input: string | number): {
  isValid: boolean;
  parsedValue: number;
  error?: string;
} {
  if (input === null || input === undefined) {
    return { isValid: false, parsedValue: 0, error: 'Portion is required' };
  }

  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) {
      return { isValid: false, parsedValue: 0, error: 'Portion must be a valid number' };
    }
    if (input <= 0) {
      return { isValid: false, parsedValue: 0, error: 'Portion must be greater than zero' };
    }
    return { isValid: true, parsedValue: input };
  }

  const trimmed = String(input).trim();
  if (trimmed === '') {
    return { isValid: false, parsedValue: 0, error: 'Portion is required' };
  }

  // Must match standard positive decimal or integer pattern
  const isNumericFormat = /^\d+(\.\d+)?$/.test(trimmed) || /^\.\d+$/.test(trimmed);
  if (!isNumericFormat) {
    const num = Number(trimmed);
    if (!isNaN(num) && num <= 0) {
      return { isValid: false, parsedValue: 0, error: 'Portion must be greater than zero' };
    }
    return { isValid: false, parsedValue: 0, error: 'Portion must be a valid number' };
  }

  const val = Number(trimmed);
  if (isNaN(val) || !isFinite(val)) {
    return { isValid: false, parsedValue: 0, error: 'Portion must be a valid number' };
  }
  if (val <= 0) {
    return { isValid: false, parsedValue: 0, error: 'Portion must be greater than zero' };
  }

  return { isValid: true, parsedValue: val };
}

/**
 * Calculates progress percentage towards daily calorie target.
 */
export function calculateProgressPercentage(totalCalories: number, calorieTarget: number): number {
  if (calorieTarget <= 0) return 0;
  return Math.min(999, Math.round((totalCalories / calorieTarget) * 100));
}

/**
 * Calculates calorie subtotal per meal type.
 */
export function calculateMealBreakdown(entries: LoggedEntry[]): MealBreakdown {
  const breakdown: MealBreakdown = {
    Breakfast: 0,
    Lunch: 0,
    Dinner: 0,
    Snack: 0,
  };
  if (!Array.isArray(entries)) return breakdown;
  for (const entry of entries) {
    if (entry && entry.mealType in breakdown) {
      breakdown[entry.mealType] += typeof entry.calories === 'number' ? entry.calories : 0;
    }
  }
  return breakdown;
}
