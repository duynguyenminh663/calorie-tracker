/**
 * Tier 1: Feature Coverage Test Suite
 * Requirement-Driven, Opaque-Box E2E Tests
 * Validates the 6 core features (>= 5 test cases per feature = 36 total test cases)
 * 1. Calorie Calculation
 * 2. Local Storage Persistence
 * 3. Starter Food Catalog
 * 4. Food Logging
 * 5. Daily Sum
 * 6. Daily Calorie Target and Remaining Balance
 */

import {
  getCalorieMath,
  getStorageRepository,
  ICalorieMath,
  ICalorieRepository,
  InMemoryStorageAdapter,
  STARTER_FOOD_CATALOG,
} from './mockStorage';

describe('Tier 1: Feature Coverage E2E Suite', () => {
  let math: ICalorieMath;
  let repo: ICalorieRepository;
  let adapter: InMemoryStorageAdapter;

  beforeEach(async () => {
    adapter = new InMemoryStorageAdapter();
    math = await getCalorieMath();
    repo = await getStorageRepository(adapter);
  });

  // =========================================================================
  // Feature 1: Calorie Calculation (6 Test Cases)
  // =========================================================================
  describe('Feature 1: Calorie Calculation', () => {
    test('TC1.1.1: Single serving integer portion calculation (1 * 165 = 165 kcal)', () => {
      const result = math.calculateItemCalories(1, 165);
      expect(result).toBe(165);
    });

    test('TC1.1.2: Multi-serving integer portion scaling (3 * 72 = 216 kcal)', () => {
      const result = math.calculateItemCalories(3, 72);
      expect(result).toBe(216);
    });

    test('TC1.1.3: Fractional half portion scaling with half-up rounding (0.5 * 95 = 47.5 -> 48 kcal)', () => {
      const result = math.calculateItemCalories(0.5, 95);
      expect(result).toBe(48);
    });

    test('TC1.1.4: Fractional quarter portion scaling with integer floor rounding (0.25 * 205 = 51.25 -> 51 kcal)', () => {
      const result = math.calculateItemCalories(0.25, 205);
      expect(result).toBe(51);
    });

    test('TC1.1.5: Validates numeric and string decimal portion inputs properly', () => {
      const validInputs = [1, 0.5, 1.25, 2.75, '1', '0.5', '2.5'];
      for (const input of validInputs) {
        const val = math.validatePortionInput(input);
        expect(val.isValid).toBe(true);
        expect(val.parsedValue).toBe(typeof input === 'number' ? input : parseFloat(input));
      }
    });

    test('TC1.1.6: Fractional scaling for arbitrary custom food calories (1.75 * 120 = 210 kcal)', () => {
      const result = math.calculateItemCalories(1.75, 120);
      expect(result).toBe(210);
    });
  });

  // =========================================================================
  // Feature 2: Local Storage Persistence (6 Test Cases)
  // =========================================================================
  describe('Feature 2: Local Storage Persistence', () => {
    test('TC1.2.1: Stores daily calorie goal and persists across retrieval', async () => {
      await repo.setDailyGoal('2026-11-03', 2250);
      const retrieved = await repo.getDailyGoal('2026-11-03');
      expect(retrieved).toBe(2250);
    });

    test('TC1.2.2: Persists custom food item and retrieves in catalog', async () => {
      const customFood = await repo.saveCustomFood({
        name: 'Protein Oatmeal',
        servingUnit: '1 bowl (200g)',
        caloriesPerUnit: 280,
        category: 'Grains',
      });

      expect(customFood.id).toBeDefined();
      expect(customFood.isCustom).toBe(true);

      const catalog = await repo.getFoodCatalog();
      const match = catalog.find((item) => item.id === customFood.id);
      expect(match).toBeDefined();
      expect(match?.name).toBe('Protein Oatmeal');
      expect(match?.caloriesPerUnit).toBe(280);
    });

    test('TC1.2.3: Adds logged food entry and persists under target date key', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_apple',
        foodName: 'Apple',
        servingUnit: '1 medium (182g)',
        portion: 1.5,
        calories: 143,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
      });

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();

      const savedEntries = await repo.getLoggedEntries('2026-11-03');
      expect(savedEntries).toHaveLength(1);
      expect(savedEntries[0].id).toBe(entry.id);
      expect(savedEntries[0].calories).toBe(143);
    });

    test('TC1.2.4: Updates logged entry portion and persists updated calories', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_banana',
        foodName: 'Banana',
        servingUnit: '1 medium (118g)',
        portion: 1.0,
        calories: 105,
        dateString: '2026-11-03',
        mealType: 'Snack',
      });

      const updated = await repo.updateLoggedEntry(entry.id, {
        portion: 2.0,
        calories: 210,
      });

      expect(updated.portion).toBe(2.0);
      expect(updated.calories).toBe(210);

      const saved = await repo.getLoggedEntries('2026-11-03');
      expect(saved[0].portion).toBe(2.0);
      expect(saved[0].calories).toBe(210);
    });

    test('TC1.2.5: Deletes logged entry and removes it permanently from storage', async () => {
      const entry1 = await repo.addLoggedEntry({
        foodItemId: 'starter_egg',
        foodName: 'Whole Egg',
        servingUnit: '1 large (50g)',
        portion: 2.0,
        calories: 144,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
      });
      const entry2 = await repo.addLoggedEntry({
        foodItemId: 'starter_white_bread',
        foodName: 'White Bread',
        servingUnit: '1 slice (25g)',
        portion: 2.0,
        calories: 134,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
      });

      const deleteResult = await repo.deleteLoggedEntry(entry1.id);
      expect(deleteResult).toBe(true);

      const remaining = await repo.getLoggedEntries('2026-11-03');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(entry2.id);
    });

    test('TC1.2.6: Ensures date isolation so entries for Date A never leak into Date B', async () => {
      await repo.addLoggedEntry({
        foodItemId: 'starter_apple',
        foodName: 'Apple',
        servingUnit: '1 medium (182g)',
        portion: 1.0,
        calories: 95,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
      });

      const dayTwoEntries = await repo.getLoggedEntries('2026-11-04');
      expect(dayTwoEntries).toHaveLength(0);

      const dayOneEntries = await repo.getLoggedEntries('2026-11-03');
      expect(dayOneEntries).toHaveLength(1);
    });
  });

  // =========================================================================
  // Feature 3: Starter Food Catalog (6 Test Cases)
  // =========================================================================
  describe('Feature 3: Starter Food Catalog', () => {
    test('TC1.3.1: Catalog contains at least 30 (specifically 36) curated dietary items', async () => {
      const catalog = await repo.getFoodCatalog();
      expect(catalog.length).toBeGreaterThanOrEqual(30);
      expect(catalog.length).toBe(36);
    });

    test('TC1.3.2: Catalog covers all 7 required core nutritional categories', async () => {
      const catalog = await repo.getFoodCatalog();
      const categories = new Set(catalog.map((i) => i.category));

      expect(categories.has('Fruits')).toBe(true);
      expect(categories.has('Vegetables')).toBe(true);
      expect(categories.has('Proteins')).toBe(true);
      expect(categories.has('Grains')).toBe(true);
      expect(categories.has('Dairy')).toBe(true);
      expect(categories.has('Snacks & Fats')).toBe(true);
      expect(categories.has('Beverages')).toBe(true);
    });

    test('TC1.3.3: Every starter item has valid non-empty id, name, and servingUnit', async () => {
      const catalog = await repo.getFoodCatalog();
      for (const item of catalog) {
        expect(typeof item.id).toBe('string');
        expect(item.id.length).toBeGreaterThan(0);
        expect(typeof item.name).toBe('string');
        expect(item.name.length).toBeGreaterThan(0);
        expect(typeof item.servingUnit).toBe('string');
        expect(item.servingUnit.length).toBeGreaterThan(0);
      }
    });

    test('TC1.3.4: Every starter item has realistic positive integer caloriesPerUnit (> 0)', async () => {
      const catalog = await repo.getFoodCatalog();
      for (const item of catalog) {
        expect(typeof item.caloriesPerUnit).toBe('number');
        expect(item.caloriesPerUnit).toBeGreaterThan(0);
        expect(Number.isInteger(item.caloriesPerUnit)).toBe(true);
      }
    });

    test('TC1.3.5: Starter items are explicitly marked as isCustom === false', async () => {
      const catalog = await repo.getFoodCatalog();
      const starters = catalog.filter((i) => i.id.startsWith('starter_'));
      for (const item of starters) {
        expect(item.isCustom).toBe(false);
      }
    });

    test('TC1.3.6: Custom foods added by user are returned alongside starter items', async () => {
      await repo.saveCustomFood({
        name: 'Avocado Toast with Egg',
        servingUnit: '1 plate',
        caloriesPerUnit: 340,
        category: 'Breakfast',
      });

      const updatedCatalog = await repo.getFoodCatalog();
      expect(updatedCatalog.length).toBe(37);
      const customAdded = updatedCatalog.find((i) => i.name === 'Avocado Toast with Egg');
      expect(customAdded).toBeDefined();
      expect(customAdded?.isCustom).toBe(true);
    });
  });

  // =========================================================================
  // Feature 4: Food Logging (6 Test Cases)
  // =========================================================================
  describe('Feature 4: Food Logging', () => {
    test('TC1.4.1: Successfully logs food for Breakfast meal type', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_oats',
        foodName: 'Rolled Oats (Dry)',
        servingUnit: '0.5 cup (40g)',
        portion: 1.0,
        calories: 150,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
      });

      expect(entry.mealType).toBe('Breakfast');
      expect(entry.foodName).toBe('Rolled Oats (Dry)');
    });

    test('TC1.4.2: Successfully logs food for Lunch meal type', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_chicken_breast',
        foodName: 'Chicken Breast (Grilled)',
        servingUnit: '100g',
        portion: 1.5,
        calories: 248,
        dateString: '2026-11-03',
        mealType: 'Lunch',
      });

      expect(entry.mealType).toBe('Lunch');
      expect(entry.calories).toBe(248);
    });

    test('TC1.4.3: Successfully logs food for Dinner meal type', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_salmon',
        foodName: 'Salmon Fillet (Baked)',
        servingUnit: '100g',
        portion: 1.0,
        calories: 208,
        dateString: '2026-11-03',
        mealType: 'Dinner',
      });

      expect(entry.mealType).toBe('Dinner');
      expect(entry.calories).toBe(208);
    });

    test('TC1.4.4: Successfully logs food for Snack meal type', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_almonds',
        foodName: 'Almonds',
        servingUnit: '1 handful (28g)',
        portion: 0.5,
        calories: 82,
        dateString: '2026-11-03',
        mealType: 'Snack',
      });

      expect(entry.mealType).toBe('Snack');
      expect(entry.calories).toBe(82);
    });

    test('TC1.4.5: Logged entry retains denormalized snapshot of food details at logging time', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_apple',
        foodName: 'Apple',
        servingUnit: '1 medium (182g)',
        portion: 2.0,
        calories: 190,
        dateString: '2026-11-03',
        mealType: 'Snack',
      });

      expect(entry.foodName).toBe('Apple');
      expect(entry.servingUnit).toBe('1 medium (182g)');
      expect(entry.portion).toBe(2.0);
      expect(entry.calories).toBe(190);
    });

    test('TC1.4.6: Logging multiple items for same meal assigns unique IDs and preserves both', async () => {
      const item1 = await repo.addLoggedEntry({
        foodItemId: 'starter_white_rice',
        foodName: 'White Rice (Cooked)',
        servingUnit: '1 cup (158g)',
        portion: 1.0,
        calories: 205,
        dateString: '2026-11-03',
        mealType: 'Lunch',
      });
      const item2 = await repo.addLoggedEntry({
        foodItemId: 'starter_beef_steak',
        foodName: 'Lean Beef (Grilled)',
        servingUnit: '100g',
        portion: 1.0,
        calories: 217,
        dateString: '2026-11-03',
        mealType: 'Lunch',
      });

      expect(item1.id).not.toBe(item2.id);

      const lunchEntries = await repo.getLoggedEntries('2026-11-03');
      expect(lunchEntries).toHaveLength(2);
      expect(lunchEntries.map((e) => e.foodName)).toEqual(
        expect.arrayContaining(['White Rice (Cooked)', 'Lean Beef (Grilled)'])
      );
    });
  });

  // =========================================================================
  // Feature 5: Daily Sum (6 Test Cases)
  // =========================================================================
  describe('Feature 5: Daily Sum', () => {
    test('TC1.5.1: Daily sum returns 0 kcal when no entries are logged', () => {
      const sum = math.calculateDailyTotal([]);
      expect(sum).toBe(0);
    });

    test('TC1.5.2: Daily sum returns exact calories for a single logged item', () => {
      const entries = [
        {
          id: 'e1',
          foodItemId: 'starter_apple',
          foodName: 'Apple',
          servingUnit: '1 medium',
          portion: 1,
          calories: 95,
          dateString: '2026-11-03',
          mealType: 'Breakfast' as const,
          timestamp: 1000,
        },
      ];
      expect(math.calculateDailyTotal(entries)).toBe(95);
    });

    test('TC1.5.3: Daily sum calculates correct cumulative total for multiple entries across meals', () => {
      const entries = [
        { calories: 150 },
        { calories: 248 },
        { calories: 208 },
        { calories: 120 },
      ] as any;
      // 150 + 248 + 208 + 120 = 726
      expect(math.calculateDailyTotal(entries)).toBe(726);
    });

    test('TC1.5.4: Daily sum updates correctly when a new entry is added via repository', async () => {
      await repo.addLoggedEntry({
        foodItemId: 'starter_egg',
        foodName: 'Whole Egg',
        servingUnit: '1 large',
        portion: 2,
        calories: 144,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
      });
      let summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(144);

      await repo.addLoggedEntry({
        foodItemId: 'starter_white_bread',
        foodName: 'White Bread',
        servingUnit: '1 slice',
        portion: 2,
        calories: 134,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
      });
      summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(278);
    });

    test('TC1.5.5: Daily sum updates correctly after modifying an entry portion', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_white_rice',
        foodName: 'White Rice',
        servingUnit: '1 cup',
        portion: 1.0,
        calories: 205,
        dateString: '2026-11-03',
        mealType: 'Lunch',
      });

      let summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(205);

      await repo.updateLoggedEntry(entry.id, {
        portion: 2.0,
        calories: 410,
      });

      summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(410);
    });

    test('TC1.5.6: Daily sum updates correctly after deleting an entry', async () => {
      const e1 = await repo.addLoggedEntry({
        foodItemId: 'starter_apple',
        foodName: 'Apple',
        servingUnit: '1 medium',
        portion: 1.0,
        calories: 95,
        dateString: '2026-11-03',
        mealType: 'Snack',
      });
      await repo.addLoggedEntry({
        foodItemId: 'starter_banana',
        foodName: 'Banana',
        servingUnit: '1 medium',
        portion: 1.0,
        calories: 105,
        dateString: '2026-11-03',
        mealType: 'Snack',
      });

      let summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(200);

      await repo.deleteLoggedEntry(e1.id);

      summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(105);
    });
  });

  // =========================================================================
  // Feature 6: Daily Calorie Target and Remaining Balance (6 Test Cases)
  // =========================================================================
  describe('Feature 6: Daily Calorie Target and Remaining Balance', () => {
    test('TC1.6.1: Default daily goal is 2000 kcal when unset', async () => {
      const goal = await repo.getDailyGoal('2026-11-03');
      expect(goal).toBe(2000);
    });

    test('TC1.6.2: Under-target scenario: target 2000, consumed 1450 yields +550 kcal remaining', () => {
      const balance = math.calculateRemainingBalance(2000, 1450);
      expect(balance).toBe(550);
    });

    test('TC1.6.3: Target exactly met: target 2000, consumed 2000 yields exactly 0 remaining', () => {
      const balance = math.calculateRemainingBalance(2000, 2000);
      expect(balance).toBe(0);
    });

    test('TC1.6.4: Over-target scenario: target 2000, consumed 2350 yields -350 kcal balance', () => {
      const balance = math.calculateRemainingBalance(2000, 2350);
      expect(balance).toBe(-350);
    });

    test('TC1.6.5: Changing daily goal dynamically updates remaining balance for the day', async () => {
      await repo.addLoggedEntry({
        foodItemId: 'starter_pasta',
        foodName: 'Pasta',
        servingUnit: '1 cup',
        portion: 2.0,
        calories: 440,
        dateString: '2026-11-03',
        mealType: 'Dinner',
      });

      let summary = await repo.getDailySummary('2026-11-03');
      expect(summary.calorieTarget).toBe(2000);
      expect(summary.remainingCalories).toBe(1560); // 2000 - 440

      await repo.setDailyGoal('2026-11-03', 2500);

      summary = await repo.getDailySummary('2026-11-03');
      expect(summary.calorieTarget).toBe(2500);
      expect(summary.remainingCalories).toBe(2060); // 2500 - 440
    });

    test('TC1.6.6: DailySummary contract provides consistent snapshot of all metrics and entries', async () => {
      await repo.setDailyGoal('2026-11-03', 1800);
      await repo.addLoggedEntry({
        foodItemId: 'starter_chicken_breast',
        foodName: 'Chicken Breast',
        servingUnit: '100g',
        portion: 2.0,
        calories: 330,
        dateString: '2026-11-03',
        mealType: 'Lunch',
      });

      const summary = await repo.getDailySummary('2026-11-03');
      expect(summary.dateString).toBe('2026-11-03');
      expect(summary.calorieTarget).toBe(1800);
      expect(summary.totalCalories).toBe(330);
      expect(summary.remainingCalories).toBe(1470);
      expect(Array.isArray(summary.entries)).toBe(true);
      expect(summary.entries).toHaveLength(1);
      expect(summary.entries[0].foodName).toBe('Chicken Breast');
    });
  });
});
