import { STARTER_FOOD_CATALOG } from '../src/data/starterCatalog';
import { CalorieRepository } from '../src/services/storageService';
import { MemoryStorageAdapter } from '../src/services/storageAdapter';
import {
  calculateDailyTotal,
  calculateItemCalories,
  calculateRemainingBalance,
  validatePortionInput,
} from '../src/utils/calorieMath';
import { FoodCategory, FoodItem } from '../src/types';

describe('Milestone 2 Challenger 2 Empirical Verification Suite', () => {
  // =========================================================================
  // Task 1: Starter Catalog Data Integrity
  // =========================================================================
  describe('Task 1: Starter Catalog Data Integrity', () => {
    test('1.1: Catalog contains exactly 36 items', () => {
      expect(STARTER_FOOD_CATALOG).toHaveLength(36);
    });

    test('1.2: All IDs are unique, non-empty, and prefixed with "starter_"', () => {
      const ids = STARTER_FOOD_CATALOG.map((f) => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(36);

      for (const item of STARTER_FOOD_CATALOG) {
        expect(typeof item.id).toBe('string');
        expect(item.id.length).toBeGreaterThan(0);
        expect(item.id.startsWith('starter_')).toBe(true);
        expect(item.id).not.toMatch(/\s/);
      }
    });

    test('1.3: All food names are unique, non-empty strings without stray whitespace', () => {
      const names = STARTER_FOOD_CATALOG.map((f) => f.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(36);

      for (const item of STARTER_FOOD_CATALOG) {
        expect(typeof item.name).toBe('string');
        expect(item.name.trim()).toBe(item.name);
        expect(item.name.length).toBeGreaterThan(0);
      }
    });

    test('1.4: All categories are valid FoodCategory types with exact expected distribution', () => {
      const validCategories: FoodCategory[] = [
        'Fruits',
        'Vegetables',
        'Proteins',
        'Grains',
        'Dairy',
        'Snacks & Fats',
        'Beverages',
      ];

      const counts: Record<string, number> = {};
      for (const item of STARTER_FOOD_CATALOG) {
        expect(validCategories).toContain(item.category);
        counts[item.category] = (counts[item.category] || 0) + 1;
      }

      expect(counts['Fruits']).toBe(6);
      expect(counts['Vegetables']).toBe(6);
      expect(counts['Proteins']).toBe(7);
      expect(counts['Grains']).toBe(6);
      expect(counts['Dairy']).toBe(4);
      expect(counts['Snacks & Fats']).toBe(4);
      expect(counts['Beverages']).toBe(3);

      const totalCategorized = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(totalCategorized).toBe(36);
    });

    test('1.5: Calories per unit are strictly positive integers in realistic range (1 to 1000)', () => {
      for (const item of STARTER_FOOD_CATALOG) {
        expect(typeof item.caloriesPerUnit).toBe('number');
        expect(Number.isInteger(item.caloriesPerUnit)).toBe(true);
        expect(item.caloriesPerUnit).toBeGreaterThan(0);
        expect(item.caloriesPerUnit).toBeLessThanOrEqual(1000);
        expect(Number.isNaN(item.caloriesPerUnit)).toBe(false);
        expect(Number.isFinite(item.caloriesPerUnit)).toBe(true);
      }
    });

    test('1.6: Serving units are non-empty descriptive strings', () => {
      for (const item of STARTER_FOOD_CATALOG) {
        expect(typeof item.servingUnit).toBe('string');
        expect(item.servingUnit.trim().length).toBeGreaterThan(0);
      }
    });

    test('1.7: isCustom is false for all starter items', () => {
      for (const item of STARTER_FOOD_CATALOG) {
        expect(item.isCustom).toBe(false);
      }
    });

    test('1.8: Repository getFoodCatalog returns all 36 starter items when no custom foods exist', async () => {
      const adapter = new MemoryStorageAdapter();
      const repo = new CalorieRepository(adapter);
      const catalog = await repo.getFoodCatalog();
      expect(catalog).toHaveLength(36);
      expect(catalog.map((i) => i.id)).toEqual(STARTER_FOOD_CATALOG.map((i) => i.id));
    });
  });

  // =========================================================================
  // Task 2: Denormalized Snapshot Integrity on Food Item Modifications
  // =========================================================================
  describe('Task 2: Denormalized Snapshot Integrity on Food Item Modifications', () => {
    let adapter: MemoryStorageAdapter;
    let repo: CalorieRepository;

    beforeEach(() => {
      adapter = new MemoryStorageAdapter();
      repo = new CalorieRepository(adapter);
    });

    test('2.1: Deleting a custom food item preserves previously logged meal snapshots intact', async () => {
      // 1. Create a custom food item
      const customFood = await repo.saveCustomFood({
        name: 'Homemade Energy Bar',
        caloriesPerUnit: 245,
        servingUnit: '1 bar (55g)',
        category: 'Snacks & Fats',
      });

      expect(customFood.id).toBeDefined();
      expect(customFood.isCustom).toBe(true);

      // Verify custom food shows up in catalog
      let catalog = await repo.getFoodCatalog();
      expect(catalog).toHaveLength(37);

      // 2. Log a meal using the custom food
      const loggedEntry = await repo.addLoggedEntry({
        foodItemId: customFood.id,
        foodName: customFood.name,
        portion: 2,
        servingUnit: customFood.servingUnit,
        calories: 490,
        dateString: '2026-11-03',
        mealType: 'Snack',
      });

      expect(loggedEntry.id).toBeDefined();
      expect(loggedEntry.foodName).toBe('Homemade Energy Bar');
      expect(loggedEntry.calories).toBe(490);

      // 3. Delete the custom food item
      const deleteResult = await repo.deleteCustomFood(customFood.id);
      expect(deleteResult).toBe(true);

      // Verify custom food is removed from catalog
      catalog = await repo.getFoodCatalog();
      expect(catalog).toHaveLength(36);
      expect(catalog.some((f) => f.id === customFood.id)).toBe(false);

      // 4. Verify logged entry snapshot is 100% intact
      const entries = await repo.getLoggedEntries('2026-11-03');
      expect(entries).toHaveLength(1);
      const entrySnapshot = entries[0];
      expect(entrySnapshot.id).toBe(loggedEntry.id);
      expect(entrySnapshot.foodItemId).toBe(customFood.id);
      expect(entrySnapshot.foodName).toBe('Homemade Energy Bar');
      expect(entrySnapshot.portion).toBe(2);
      expect(entrySnapshot.servingUnit).toBe('1 bar (55g)');
      expect(entrySnapshot.calories).toBe(490);
      expect(entrySnapshot.mealType).toBe('Snack');
      expect(entrySnapshot.dateString).toBe('2026-11-03');

      // 5. Verify DailySummary remains completely intact
      const summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(490);
      expect(summary.entries).toHaveLength(1);
      expect(summary.entries[0].foodName).toBe('Homemade Energy Bar');
    });

    test('2.2: Updating a logged entry portion correctly scales denormalized calories while keeping food metadata intact', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_chicken_breast',
        foodName: 'Chicken Breast (Grilled)',
        portion: 1,
        servingUnit: '100g',
        calories: 165,
        dateString: '2026-11-03',
        mealType: 'Dinner',
      });

      // Update portion from 1 to 2.5 without specifying calories
      const updated = await repo.updateLoggedEntry(entry.id, {
        portion: 2.5,
      });

      // Expected calories: Math.round(2.5 * 165) = 412.5 -> 413
      expect(updated.portion).toBe(2.5);
      expect(updated.calories).toBe(413);
      expect(updated.foodName).toBe('Chicken Breast (Grilled)');
      expect(updated.servingUnit).toBe('100g');
      expect(updated.mealType).toBe('Dinner');

      // Verify persistence in storage
      const entries = await repo.getLoggedEntries('2026-11-03');
      expect(entries[0].portion).toBe(2.5);
      expect(entries[0].calories).toBe(413);
    });

    test('2.3: Updating entry with explicit calories overrides calculation', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_pasta',
        foodName: 'Pasta (Cooked)',
        portion: 1,
        servingUnit: '1 cup (140g)',
        calories: 220,
        dateString: '2026-11-03',
        mealType: 'Lunch',
      });

      const updated = await repo.updateLoggedEntry(entry.id, {
        portion: 1.5,
        calories: 350, // Custom measured calories
      });

      expect(updated.portion).toBe(1.5);
      expect(updated.calories).toBe(350);

      const summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(350);
    });

    test('2.4: Multiple entries maintain independent snapshots across multiple dates and deletions', async () => {
      const e1 = await repo.addLoggedEntry({
        foodItemId: 'starter_apple',
        foodName: 'Apple',
        portion: 1,
        servingUnit: '1 medium (182g)',
        calories: 95,
        dateString: '2026-11-01',
        mealType: 'Breakfast',
      });

      const e2 = await repo.addLoggedEntry({
        foodItemId: 'starter_banana',
        foodName: 'Banana',
        portion: 2,
        servingUnit: '1 medium (118g)',
        calories: 210,
        dateString: '2026-11-01',
        mealType: 'Lunch',
      });

      const e3 = await repo.addLoggedEntry({
        foodItemId: 'starter_oats',
        foodName: 'Rolled Oats (Dry)',
        portion: 1.5,
        servingUnit: '0.5 cup (40g)',
        calories: 225,
        dateString: '2026-11-02',
        mealType: 'Breakfast',
      });

      // Delete e2 on 2026-11-01
      await repo.deleteLoggedEntry(e2.id);

      // Check date 1
      const entriesDate1 = await repo.getLoggedEntries('2026-11-01');
      expect(entriesDate1).toHaveLength(1);
      expect(entriesDate1[0].id).toBe(e1.id);
      expect(entriesDate1[0].calories).toBe(95);

      // Check date 2
      const entriesDate2 = await repo.getLoggedEntries('2026-11-02');
      expect(entriesDate2).toHaveLength(1);
      expect(entriesDate2[0].id).toBe(e3.id);
      expect(entriesDate2[0].calories).toBe(225);
    });

    test('2.5: Fresh repository instance reads persistent snapshots identically', async () => {
      await repo.addLoggedEntry({
        foodItemId: 'starter_salmon',
        foodName: 'Salmon Fillet (Baked)',
        portion: 1.75,
        servingUnit: '100g',
        calories: 364,
        dateString: '2026-11-03',
        mealType: 'Dinner',
      });

      // Re-instantiate repo with same adapter (simulating app reload)
      const freshRepo = new CalorieRepository(adapter);
      const entries = await freshRepo.getLoggedEntries('2026-11-03');
      expect(entries).toHaveLength(1);
      expect(entries[0].foodName).toBe('Salmon Fillet (Baked)');
      expect(entries[0].calories).toBe(364);
      expect(entries[0].portion).toBe(1.75);
    });
  });

  // =========================================================================
  // Task 3: calculateRemainingBalance Across Deficit, Surplus, and Maintenance
  // =========================================================================
  describe('Task 3: calculateRemainingBalance Verification', () => {
    test('3.1: Deficit regime (consumed < target -> positive remaining balance)', () => {
      expect(calculateRemainingBalance(2000, 1500)).toBe(500);
      expect(calculateRemainingBalance(2500, 0)).toBe(2500);
      expect(calculateRemainingBalance(1800, 1)).toBe(1799);
      expect(calculateRemainingBalance(3000, 2999)).toBe(1);
      expect(calculateRemainingBalance(10000, 4500)).toBe(5500);
    });

    test('3.2: Exact maintenance regime (consumed === target -> exactly 0 remaining balance)', () => {
      expect(calculateRemainingBalance(2000, 2000)).toBe(0);
      expect(calculateRemainingBalance(1500, 1500)).toBe(0);
      expect(calculateRemainingBalance(0, 0)).toBe(0);
      expect(calculateRemainingBalance(3500, 3500)).toBe(0);
    });

    test('3.3: Surplus regime (consumed > target -> negative remaining balance)', () => {
      expect(calculateRemainingBalance(2000, 2350)).toBe(-350);
      expect(calculateRemainingBalance(1500, 1501)).toBe(-1);
      expect(calculateRemainingBalance(1800, 2500)).toBe(-700);
      expect(calculateRemainingBalance(0, 500)).toBe(-500);
      expect(calculateRemainingBalance(2000, 10000)).toBe(-8000);
    });

    test('3.4: Edge cases: NaN, null, undefined, non-numeric values are safely coerced to 0', () => {
      expect(calculateRemainingBalance(NaN, 500)).toBe(-500);
      expect(calculateRemainingBalance(2000, NaN)).toBe(2000);
      expect(calculateRemainingBalance(NaN, NaN)).toBe(0);
      expect(calculateRemainingBalance(null as any, 500)).toBe(-500);
      expect(calculateRemainingBalance(2000, undefined as any)).toBe(2000);
      expect(calculateRemainingBalance('abc' as any, 'xyz' as any)).toBe(0);
    });

    test('3.5: Mathematical identity holds: consumed + calculateRemainingBalance(target, consumed) === target', () => {
      const testCases = [
        { target: 2000, consumed: 1200 },
        { target: 2000, consumed: 2000 },
        { target: 2000, consumed: 2800 },
        { target: 0, consumed: 0 },
        { target: 1500, consumed: 0 },
        { target: 5000, consumed: 7200 },
      ];

      for (const { target, consumed } of testCases) {
        const remaining = calculateRemainingBalance(target, consumed);
        expect(consumed + remaining).toBe(target);
      }
    });

    test('3.6: DailySummary integration: reflects deficit, maintenance, and surplus accurately', async () => {
      const adapter = new MemoryStorageAdapter();
      const repo = new CalorieRepository(adapter);
      await repo.setDailyGoal('2026-11-03', 2000);

      // Case A: Deficit (consumed 800, target 2000)
      await repo.addLoggedEntry({
        foodItemId: 'starter_apple',
        foodName: 'Apple',
        portion: 2,
        servingUnit: '1 medium (182g)',
        calories: 190,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
      });
      await repo.addLoggedEntry({
        foodItemId: 'starter_pasta',
        foodName: 'Pasta (Cooked)',
        portion: 2,
        servingUnit: '1 cup (140g)',
        calories: 440,
        dateString: '2026-11-03',
        mealType: 'Lunch',
      });

      let summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(630);
      expect(summary.remainingCalories).toBe(1370);
      expect(summary.isOverTarget).toBe(false);
      expect(summary.percentageConsumed).toBe(32); // Math.round(630/2000 * 100) = 32%

      // Case B: Exact Maintenance (add 1370 calories -> total 2000)
      const maintenanceEntry = await repo.addLoggedEntry({
        foodItemId: 'custom_dinner',
        foodName: 'Big Dinner',
        portion: 1,
        servingUnit: '1 meal',
        calories: 1370,
        dateString: '2026-11-03',
        mealType: 'Dinner',
      });

      summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(2000);
      expect(summary.remainingCalories).toBe(0);
      expect(summary.isOverTarget).toBe(false);
      expect(summary.percentageConsumed).toBe(100);

      // Case C: Surplus (add 300 calories snack -> total 2300)
      await repo.addLoggedEntry({
        foodItemId: 'starter_dark_chocolate',
        foodName: 'Dark Chocolate (70%)',
        portion: 1.76,
        servingUnit: '1 oz (28g)',
        calories: 300,
        dateString: '2026-11-03',
        mealType: 'Snack',
      });

      summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(2300);
      expect(summary.remainingCalories).toBe(-300);
      expect(summary.isOverTarget).toBe(true);
      expect(summary.percentageConsumed).toBe(115);
    });
  });

  // =========================================================================
  // Property-Based & Stress Harness
  // =========================================================================
  describe('Adversarial Stress Harness: Portion Math & Summation', () => {
    test('calculateItemCalories preserves integer invariant across 100 random fractions', () => {
      for (let i = 0; i < 100; i++) {
        const portion = Math.random() * 10 + 0.01;
        const caloriesPerUnit = Math.floor(Math.random() * 800) + 10;
        const result = calculateItemCalories(portion, caloriesPerUnit);

        expect(typeof result).toBe('number');
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(Number.isNaN(result)).toBe(false);
      }
    });

    test('Summation is strictly associative and immune to floating point drift', () => {
      // Create entries with fractional portions whose floating sum would drift
      // e.g. 0.1 * 100 = 10, 0.2 * 100 = 20, 0.3 * 100 = 30
      const entries = [
        {
          id: '1',
          foodItemId: 'f1',
          foodName: 'F1',
          portion: 0.1,
          servingUnit: 'unit',
          calories: calculateItemCalories(0.1, 100), // 10
          dateString: '2026-11-03',
          mealType: 'Breakfast' as const,
          timestamp: 1,
        },
        {
          id: '2',
          foodItemId: 'f2',
          foodName: 'F2',
          portion: 0.2,
          servingUnit: 'unit',
          calories: calculateItemCalories(0.2, 100), // 20
          dateString: '2026-11-03',
          mealType: 'Breakfast' as const,
          timestamp: 2,
        },
        {
          id: '3',
          foodItemId: 'f3',
          foodName: 'F3',
          portion: 0.7,
          servingUnit: 'unit',
          calories: calculateItemCalories(0.7, 100), // 70
          dateString: '2026-11-03',
          mealType: 'Breakfast' as const,
          timestamp: 3,
        },
      ];

      const total = calculateDailyTotal(entries);
      expect(total).toBe(100);
      expect(Number.isInteger(total)).toBe(true);
    });

    test('validatePortionInput strictly handles edge inputs', () => {
      expect(validatePortionInput('0').isValid).toBe(false);
      expect(validatePortionInput('-1').isValid).toBe(false);
      expect(validatePortionInput('1.2.3').isValid).toBe(false);
      expect(validatePortionInput('   ').isValid).toBe(false);
      expect(validatePortionInput('abc').isValid).toBe(false);
      expect(validatePortionInput(Infinity).isValid).toBe(false);
      expect(validatePortionInput(NaN).isValid).toBe(false);

      expect(validatePortionInput('0.5').isValid).toBe(true);
      expect(validatePortionInput('0.5').parsedValue).toBe(0.5);
      expect(validatePortionInput('.75').isValid).toBe(true);
      expect(validatePortionInput('.75').parsedValue).toBe(0.75);
      expect(validatePortionInput(2).isValid).toBe(true);
      expect(validatePortionInput(2).parsedValue).toBe(2);
    });

    test('High-concurrency stress test: 50 parallel operations maintain sequential consistency', async () => {
      const adapter = new MemoryStorageAdapter();
      const repo = new CalorieRepository(adapter);

      const promises = Array.from({ length: 50 }, (_, i) =>
        repo.addLoggedEntry({
          foodItemId: `stress_food_${i}`,
          foodName: `Stress Food ${i}`,
          portion: 1,
          servingUnit: '1 unit',
          calories: 10,
          dateString: '2026-11-03',
          mealType: 'Snack',
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);

      const entries = await repo.getLoggedEntries('2026-11-03');
      expect(entries).toHaveLength(50);

      const summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(500);
    });

    test('Extreme portion scaling and boundary portions', () => {
      // Extremely small fractional portion
      expect(calculateItemCalories(0.001, 100)).toBe(0); // 0.1 -> 0
      expect(calculateItemCalories(0.005, 100)).toBe(1); // 0.5 -> 1

      // Very large portion
      expect(calculateItemCalories(10000, 500)).toBe(5000000);

      // Portion validation
      expect(validatePortionInput('0.001').isValid).toBe(true);
      expect(validatePortionInput('0.001').parsedValue).toBe(0.001);
      expect(validatePortionInput('99999').isValid).toBe(true);
      expect(validatePortionInput('99999').parsedValue).toBe(99999);
    });

    test('Daily goal rejection on non-positive target', async () => {
      const adapter = new MemoryStorageAdapter();
      const repo = new CalorieRepository(adapter);

      await expect(repo.setDailyGoal('2026-11-03', 0)).rejects.toThrow(
        'Calorie target must be greater than zero'
      );
      await expect(repo.setDailyGoal('2026-11-03', -500)).rejects.toThrow(
        'Calorie target must be greater than zero'
      );

      // Valid target succeeds
      await repo.setDailyGoal('2026-11-03', 2500);
      expect(await repo.getDailyGoal('2026-11-03')).toBe(2500);
    });
  });
});
