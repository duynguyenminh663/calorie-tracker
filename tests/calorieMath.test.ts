import {
  calculateDailyTotal,
  calculateItemCalories,
  calculateMealBreakdown,
  calculateProgressPercentage,
  calculateRemainingBalance,
  validatePortionInput,
} from '../src/utils/calorieMath';
import { LoggedEntry } from '../src/types';

describe('calorieMath Unit Tests', () => {

  describe('calculateItemCalories', () => {
    test('calculates integer portion correctly', () => {
      expect(calculateItemCalories(1, 100)).toBe(100);
      expect(calculateItemCalories(2, 150)).toBe(300);
    });

    test('calculates fractional portion with half-up rounding', () => {
      expect(calculateItemCalories(0.5, 95)).toBe(48); // 47.5 -> 48
      expect(calculateItemCalories(0.25, 205)).toBe(51); // 51.25 -> 51
    });

    test('returns 0 for portion <= 0', () => {
      expect(calculateItemCalories(0, 100)).toBe(0);
      expect(calculateItemCalories(-1, 100)).toBe(0);
      expect(calculateItemCalories(-0.5, 100)).toBe(0);
    });

    test('returns 0 for caloriesPerUnit <= 0', () => {
      expect(calculateItemCalories(1, 0)).toBe(0);
      expect(calculateItemCalories(1, -50)).toBe(0);
    });

    test('guards against NaN and Infinity', () => {
      expect(calculateItemCalories(NaN, 100)).toBe(0);
      expect(calculateItemCalories(1, NaN)).toBe(0);
      expect(calculateItemCalories(Infinity, 100)).toBe(0);
      expect(calculateItemCalories(1, Infinity)).toBe(0);
      expect(calculateItemCalories(-Infinity, 100)).toBe(0);
    });
  });

  describe('calculateDailyTotal', () => {
    test('returns 0 for empty array', () => {
      expect(calculateDailyTotal([])).toBe(0);
    });

    test('sums entry calories accurately', () => {
      const entries = [
        { calories: 150 },
        { calories: 250 },
        { calories: 95 },
      ] as LoggedEntry[];
      expect(calculateDailyTotal(entries)).toBe(495);
    });

    test('handles entries with 0 calories or missing values', () => {
      const entries = [
        { calories: 0 },
        { calories: 100 },
        { calories: undefined as any },
      ] as LoggedEntry[];
      expect(calculateDailyTotal(entries)).toBe(100);
    });
  });

  describe('calculateRemainingBalance', () => {
    test('calculates surplus and deficit balances', () => {
      expect(calculateRemainingBalance(2000, 1500)).toBe(500);
      expect(calculateRemainingBalance(2000, 2000)).toBe(0);
      expect(calculateRemainingBalance(2000, 2500)).toBe(-500);
    });

    test('handles zero or missing target/consumed', () => {
      expect(calculateRemainingBalance(0, 500)).toBe(-500);
      expect(calculateRemainingBalance(2000, 0)).toBe(2000);
    });
  });

  describe('validatePortionInput', () => {
    test('validates positive integers and decimals', () => {
      expect(validatePortionInput(1)).toEqual({ isValid: true, parsedValue: 1 });
      expect(validatePortionInput(0.5)).toEqual({ isValid: true, parsedValue: 0.5 });
      expect(validatePortionInput('1.5')).toEqual({ isValid: true, parsedValue: 1.5 });
      expect(validatePortionInput('  2.25  ')).toEqual({ isValid: true, parsedValue: 2.25 });
      expect(validatePortionInput('001.50')).toEqual({ isValid: true, parsedValue: 1.5 });
    });

    test('rejects zero and negative values', () => {
      expect(validatePortionInput(0).isValid).toBe(false);
      expect(validatePortionInput('0').isValid).toBe(false);
      expect(validatePortionInput('0.00').isValid).toBe(false);
      expect(validatePortionInput(-1).isValid).toBe(false);
      expect(validatePortionInput('-0.5').isValid).toBe(false);
    });

    test('rejects empty, non-numeric and malformed inputs', () => {
      expect(validatePortionInput('').isValid).toBe(false);
      expect(validatePortionInput('   ').isValid).toBe(false);
      expect(validatePortionInput('abc').isValid).toBe(false);
      expect(validatePortionInput('1.2.3').isValid).toBe(false);
      expect(validatePortionInput(null as any).isValid).toBe(false);
      expect(validatePortionInput(undefined as any).isValid).toBe(false);
    });
  });

  describe('calculateProgressPercentage & calculateMealBreakdown', () => {
    test('calculates progress percentage capped at 999', () => {
      expect(calculateProgressPercentage(1000, 2000)).toBe(50);
      expect(calculateProgressPercentage(2000, 2000)).toBe(100);
      expect(calculateProgressPercentage(3000, 2000)).toBe(150);
      expect(calculateProgressPercentage(1000, 0)).toBe(0);
    });

    test('calculates meal breakdown correctly', () => {
      const entries: LoggedEntry[] = [
        { mealType: 'Breakfast', calories: 300 } as any,
        { mealType: 'Breakfast', calories: 150 } as any,
        { mealType: 'Lunch', calories: 600 } as any,
        { mealType: 'Dinner', calories: 700 } as any,
        { mealType: 'Snack', calories: 100 } as any,
      ];
      const breakdown = calculateMealBreakdown(entries);
      expect(breakdown.Breakfast).toBe(450);
      expect(breakdown.Lunch).toBe(600);
      expect(breakdown.Dinner).toBe(700);
      expect(breakdown.Snack).toBe(100);
    });
  });
});
