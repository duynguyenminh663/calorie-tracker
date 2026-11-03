/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * Requirement-Driven, Opaque-Box E2E Tests
 * Validates 5 boundary & corner categories (>= 5 test cases per category = 30 total test cases):
 * 1. Zero Portions & Zero Values
 * 2. Fractional & Decimal Portions
 * 3. Negative & Invalid Guards
 * 4. Large Calorie Numbers & Upper Limits
 * 5. Boundary Limits & Storage Edge Cases
 */

import {
  getCalorieMath,
  getStorageRepository,
  ICalorieMath,
  ICalorieRepository,
  InMemoryStorageAdapter,
} from './mockStorage';

describe('Tier 2: Boundary & Corner Cases E2E Suite', () => {
  let math: ICalorieMath;
  let repo: ICalorieRepository;
  let adapter: InMemoryStorageAdapter;

  beforeEach(async () => {
    adapter = new InMemoryStorageAdapter();
    math = await getCalorieMath();
    repo = await getStorageRepository(adapter);
  });

  // =========================================================================
  // Category 1: Zero Portions & Zero Values (6 Test Cases)
  // =========================================================================
  describe('Category 1: Zero Portions & Zero Values', () => {
    test('TC2.1.1: Portion = 0 produces exactly 0 calories', () => {
      expect(math.calculateItemCalories(0, 150)).toBe(0);
    });

    test('TC2.1.2: Food with 0 base calories (e.g. water, zero-calorie soda) produces 0 calories for any portion', () => {
      expect(math.calculateItemCalories(1.5, 0)).toBe(0);
      expect(math.calculateItemCalories(5.0, 0)).toBe(0);
    });

    test('TC2.1.3: Portion = 0 and caloriesPerUnit = 0 produces 0 calories', () => {
      expect(math.calculateItemCalories(0, 0)).toBe(0);
    });

    test('TC2.1.4: Portion validator rejects numeric 0 as invalid', () => {
      const res = math.validatePortionInput(0);
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/greater than zero/i);
    });

    test('TC2.1.5: Portion validator rejects string "0" and "0.00" as invalid', () => {
      const inputs = ['0', '0.0', '0.00', ' 0 '];
      for (const input of inputs) {
        const res = math.validatePortionInput(input);
        expect(res.isValid).toBe(false);
        expect(res.error).toMatch(/greater than zero/i);
      }
    });

    test('TC2.1.6: Daily total for entries with 0 calories sums to 0', () => {
      const zeroEntries = [
        { calories: 0 },
        { calories: 0 },
        { calories: 0 },
      ] as any;
      expect(math.calculateDailyTotal(zeroEntries)).toBe(0);
    });
  });

  // =========================================================================
  // Category 2: Fractional & Decimal Portions (6 Test Cases)
  // =========================================================================
  describe('Category 2: Fractional & Decimal Portions', () => {
    test('TC2.2.1: Very small fractional portion scales and rounds accurately (0.01 * 100 = 1 kcal)', () => {
      expect(math.calculateItemCalories(0.01, 100)).toBe(1);
    });

    test('TC2.2.2: Half-up rounding exact boundary condition (0.5 * 95 = 47.5 -> 48 kcal)', () => {
      expect(math.calculateItemCalories(0.5, 95)).toBe(48);
    });

    test('TC2.2.3: Half-down rounding exact boundary condition (0.25 * 205 = 51.25 -> 51 kcal)', () => {
      expect(math.calculateItemCalories(0.25, 205)).toBe(51);
    });

    test('TC2.2.4: Recurring decimal portion (1/3 cup of 300 kcal food -> 100 kcal)', () => {
      const portion = 1 / 3; // 0.3333333333333333
      expect(math.calculateItemCalories(portion, 300)).toBe(100);
    });

    test('TC2.2.5: Validates decimal string portions with leading zeros or surrounding whitespace', () => {
      const validCases = [
        { input: '  0.75  ', expected: 0.75 },
        { input: '001.50', expected: 1.5 },
        { input: '2.333', expected: 2.333 },
      ];
      for (const { input, expected } of validCases) {
        const res = math.validatePortionInput(input);
        expect(res.isValid).toBe(true);
        expect(res.parsedValue).toBeCloseTo(expected);
      }
    });

    test('TC2.2.6: Eliminates IEEE-754 precision drift (e.g. 0.1 + 0.2 multipliers)', () => {
      // 0.1 * 100 = 10, 0.2 * 100 = 20
      const cal1 = math.calculateItemCalories(0.1, 100);
      const cal2 = math.calculateItemCalories(0.2, 100);
      expect(cal1 + cal2).toBe(30);
      // Math.round ensures clean integer output
      expect(Number.isInteger(cal1)).toBe(true);
      expect(Number.isInteger(cal2)).toBe(true);
    });
  });

  // =========================================================================
  // Category 3: Negative & Invalid Input Guards (6 Test Cases)
  // =========================================================================
  describe('Category 3: Negative & Invalid Input Guards', () => {
    test('TC2.3.1: Negative portion returns 0 and is safely guarded', () => {
      expect(math.calculateItemCalories(-1.5, 100)).toBe(0);
      expect(math.calculateItemCalories(-0.01, 100)).toBe(0);
    });

    test('TC2.3.2: Negative calories per unit returns 0 and is safely guarded', () => {
      expect(math.calculateItemCalories(1.0, -200)).toBe(0);
      expect(math.calculateItemCalories(2.5, -50)).toBe(0);
    });

    test('TC2.3.3: NaN portion or NaN caloriesPerUnit returns 0 safely without throwing', () => {
      expect(math.calculateItemCalories(NaN, 100)).toBe(0);
      expect(math.calculateItemCalories(1.0, NaN)).toBe(0);
      expect(math.calculateItemCalories(NaN, NaN)).toBe(0);
    });

    test('TC2.3.4: Infinite values (Infinity, -Infinity) return 0 safely', () => {
      expect(math.calculateItemCalories(Infinity, 100)).toBe(0);
      expect(math.calculateItemCalories(1.0, Infinity)).toBe(0);
      expect(math.calculateItemCalories(-Infinity, 100)).toBe(0);
    });

    test('TC2.3.5: Portion validator rejects negative values with clear error', () => {
      const negativeInputs = [-1, -0.5, '-1.5', '-0.01'];
      for (const input of negativeInputs) {
        const res = math.validatePortionInput(input);
        expect(res.isValid).toBe(false);
        expect(res.error).toMatch(/greater than zero/i);
      }
    });

    test('TC2.3.6: Portion validator rejects non-numeric or malformed strings and types', () => {
      const invalidInputs = ['abc', '', '   ', '1.2.3', 'one', null as any, undefined as any];
      for (const input of invalidInputs) {
        const res = math.validatePortionInput(input);
        expect(res.isValid).toBe(false);
        expect(res.error).toBeDefined();
      }
    });
  });

  // =========================================================================
  // Category 4: Large Calorie Numbers & Upper Limits (6 Test Cases)
  // =========================================================================
  describe('Category 4: Large Calorie Numbers & Upper Limits', () => {
    test('TC2.4.1: Accurately calculates calories for high-density foods (portion 2 * 9000 = 18000 kcal)', () => {
      const result = math.calculateItemCalories(2.0, 9000);
      expect(result).toBe(18000);
    });

    test('TC2.4.2: Large daily accumulation (50 logged items summing to 50,000 kcal)', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        id: `e_${i}`,
        calories: 1000,
      })) as any;
      const total = math.calculateDailyTotal(items);
      expect(total).toBe(50000);
    });

    test('TC2.4.3: Calculates remaining balance with high calorie target (10,000 kcal target - 3,500 consumed = 6,500 kcal)', () => {
      const remaining = math.calculateRemainingBalance(10000, 3500);
      expect(remaining).toBe(6500);
    });

    test('TC2.4.4: High portion multiplier (100 servings of 150 kcal food = 15,000 kcal)', () => {
      const result = math.calculateItemCalories(100, 150);
      expect(result).toBe(15000);
    });

    test('TC2.4.5: Extreme surplus / over-target condition (target 1,200 kcal, consumed 12,000 kcal yields -10,800 balance)', () => {
      const balance = math.calculateRemainingBalance(1200, 12000);
      expect(balance).toBe(-10800);
    });

    test('TC2.4.6: Large numbers remain safe integers within Number.MAX_SAFE_INTEGER bounds', () => {
      const largeCal = math.calculateItemCalories(1000, 5000);
      expect(Number.isSafeInteger(largeCal)).toBe(true);
      expect(largeCal).toBe(5000000);
    });
  });

  // =========================================================================
  // Category 5: Boundary Limits & Storage Edge Cases (6 Test Cases)
  // =========================================================================
  describe('Category 5: Boundary Limits & Storage Edge Cases', () => {
    test('TC2.5.1: Querying a date with zero entries returns empty array without throwing', async () => {
      const entries = await repo.getLoggedEntries('2099-12-31');
      expect(Array.isArray(entries)).toBe(true);
      expect(entries).toHaveLength(0);
    });

    test('TC2.5.2: Updating non-existent entry ID rejects with clear error', async () => {
      await expect(
        repo.updateLoggedEntry('non_existent_id', { portion: 2.0 })
      ).rejects.toThrow(/not found/i);
    });

    test('TC2.5.3: Deleting non-existent entry ID returns false without crashing', async () => {
      const res = await repo.deleteLoggedEntry('non_existent_id_xyz');
      expect(res).toBe(false);
    });

    test('TC2.5.4: Setting non-positive daily goal (<= 0) throws validation error', async () => {
      await expect(repo.setDailyGoal('2026-11-03', 0)).rejects.toThrow(/greater than zero/i);
      await expect(repo.setDailyGoal('2026-11-03', -500)).rejects.toThrow(/greater than zero/i);
    });

    test('TC2.5.5: Custom food with special characters and symbols in name persists and retrieves intact', async () => {
      const specialName = 'Chili con Carne #1 (100% Organic & Spicy! / "Grandma\'s")';
      const custom = await repo.saveCustomFood({
        name: specialName,
        servingUnit: '1 bowl (350g)',
        caloriesPerUnit: 420,
        category: 'Proteins',
      });

      expect(custom.name).toBe(specialName);
      const catalog = await repo.getFoodCatalog();
      const match = catalog.find((i) => i.id === custom.id);
      expect(match?.name).toBe(specialName);
    });

    test('TC2.5.6: Logging multiple entries at identical timestamp assigns unique IDs without collision', async () => {
      const [e1, e2] = await Promise.all([
        repo.addLoggedEntry({
          foodItemId: 'starter_egg',
          foodName: 'Whole Egg',
          servingUnit: '1 large',
          portion: 1.0,
          calories: 72,
          dateString: '2026-11-03',
          mealType: 'Breakfast',
        }),
        repo.addLoggedEntry({
          foodItemId: 'starter_egg',
          foodName: 'Whole Egg',
          servingUnit: '1 large',
          portion: 1.0,
          calories: 72,
          dateString: '2026-11-03',
          mealType: 'Breakfast',
        }),
      ]);

      expect(e1.id).not.toBe(e2.id);
      const entries = await repo.getLoggedEntries('2026-11-03');
      expect(entries).toHaveLength(2);
    });
  });
});
