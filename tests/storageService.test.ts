import { CalorieRepository } from '../src/services/storageService';
import { MemoryStorageAdapter } from '../src/services/storageAdapter';
import { STARTER_FOOD_CATALOG } from '../src/data/starterCatalog';

describe('CalorieRepository Unit Tests', () => {
  let adapter: MemoryStorageAdapter;
  let repo: CalorieRepository;

  beforeEach(() => {
    adapter = new MemoryStorageAdapter();
    repo = new CalorieRepository(adapter);
  });

  describe('Food Catalog & Custom Foods', () => {
    test('loads 36 starter foods initially', async () => {
      const catalog = await repo.getFoodCatalog();
      expect(catalog.length).toBe(36);
      expect(catalog).toEqual(STARTER_FOOD_CATALOG);
    });

    test('saves and returns custom food in catalog', async () => {
      const custom = await repo.saveCustomFood({
        name: 'Homemade Granola',
        servingUnit: '0.5 cup (50g)',
        caloriesPerUnit: 220,
        category: 'Grains',
      });

      expect(custom.id).toMatch(/^custom_/);
      expect(custom.isCustom).toBe(true);

      const catalog = await repo.getFoodCatalog();
      expect(catalog.length).toBe(37);
      const found = catalog.find((f) => f.id === custom.id);
      expect(found?.name).toBe('Homemade Granola');
    });

    test('deletes custom food from catalog', async () => {
      const custom = await repo.saveCustomFood({
        name: 'Flax Seed Oil',
        servingUnit: '1 tbsp',
        caloriesPerUnit: 120,
        category: 'Snacks & Fats',
      });

      let catalog = await repo.getFoodCatalog();
      expect(catalog.length).toBe(37);

      const deleted = await repo.deleteCustomFood(custom.id);
      expect(deleted).toBe(true);

      catalog = await repo.getFoodCatalog();
      expect(catalog.length).toBe(36);

      const deleteAgain = await repo.deleteCustomFood(custom.id);
      expect(deleteAgain).toBe(false);
    });
  });

  describe('Logged Entries CRUD', () => {
    const testDate = '2026-11-03';

    test('adds logged entry with denormalized snapshot and timestamp', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_apple',
        foodName: 'Apple',
        servingUnit: '1 medium (182g)',
        portion: 2,
        calories: 190,
        dateString: testDate,
        mealType: 'Breakfast',
      });

      expect(entry.id).toMatch(/^entry_/);
      expect(typeof entry.timestamp).toBe('number');

      const entries = await repo.getLoggedEntries(testDate);
      expect(entries).toHaveLength(1);
      expect(entries[0].foodName).toBe('Apple');
      expect(entries[0].calories).toBe(190);
    });

    test('isolates entries across different dates', async () => {
      await repo.addLoggedEntry({
        foodItemId: 'starter_apple',
        foodName: 'Apple',
        servingUnit: '1 med',
        portion: 1,
        calories: 95,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
      });

      await repo.addLoggedEntry({
        foodItemId: 'starter_banana',
        foodName: 'Banana',
        servingUnit: '1 med',
        portion: 1,
        calories: 105,
        dateString: '2026-11-04',
        mealType: 'Breakfast',
      });

      const day1 = await repo.getLoggedEntries('2026-11-03');
      const day2 = await repo.getLoggedEntries('2026-11-04');
      const day3 = await repo.getLoggedEntries('2026-11-05');

      expect(day1).toHaveLength(1);
      expect(day1[0].foodName).toBe('Apple');
      expect(day2).toHaveLength(1);
      expect(day2[0].foodName).toBe('Banana');
      expect(day3).toHaveLength(0);
    });

    test('updates logged entry portion and recalculates calories', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_chicken_breast',
        foodName: 'Chicken Breast (Grilled)',
        servingUnit: '100g',
        portion: 1.0,
        calories: 165,
        dateString: testDate,
        mealType: 'Lunch',
      });

      const updated = await repo.updateLoggedEntry(entry.id, {
        portion: 2.0,
      });

      expect(updated.portion).toBe(2.0);
      expect(updated.calories).toBe(330);

      const saved = await repo.getLoggedEntries(testDate);
      expect(saved[0].calories).toBe(330);
    });

    test('updates logged entry with explicit calories', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_oats',
        foodName: 'Rolled Oats (Dry)',
        servingUnit: '0.5 cup',
        portion: 1,
        calories: 150,
        dateString: testDate,
        mealType: 'Breakfast',
      });

      const updated = await repo.updateLoggedEntry(entry.id, {
        portion: 1.5,
        calories: 225,
      });

      expect(updated.portion).toBe(1.5);
      expect(updated.calories).toBe(225);
    });

    test('throws error when updating non-existent entry ID', async () => {
      await expect(
        repo.updateLoggedEntry('non_existent_id', { portion: 2 })
      ).rejects.toThrow(/not found/i);
    });

    test('deletes logged entry and returns false for unknown id', async () => {
      const entry = await repo.addLoggedEntry({
        foodItemId: 'starter_egg',
        foodName: 'Whole Egg',
        servingUnit: '1 large',
        portion: 2,
        calories: 144,
        dateString: testDate,
        mealType: 'Breakfast',
      });

      expect(await repo.deleteLoggedEntry(entry.id)).toBe(true);
      expect(await repo.getLoggedEntries(testDate)).toHaveLength(0);
      expect(await repo.deleteLoggedEntry('random_id')).toBe(false);
    });

    test('handles concurrent writes via Promise.all without race conditions', async () => {
      const [e1, e2, e3] = await Promise.all([
        repo.addLoggedEntry({
          foodItemId: 'starter_apple',
          foodName: 'Apple',
          servingUnit: '1 med',
          portion: 1,
          calories: 95,
          dateString: testDate,
          mealType: 'Breakfast',
        }),
        repo.addLoggedEntry({
          foodItemId: 'starter_banana',
          foodName: 'Banana',
          servingUnit: '1 med',
          portion: 1,
          calories: 105,
          dateString: testDate,
          mealType: 'Lunch',
        }),
        repo.addLoggedEntry({
          foodItemId: 'starter_orange',
          foodName: 'Orange',
          servingUnit: '1 med',
          portion: 1,
          calories: 62,
          dateString: testDate,
          mealType: 'Dinner',
        }),
      ]);

      expect(e1.id).not.toBe(e2.id);
      expect(e2.id).not.toBe(e3.id);

      const entries = await repo.getLoggedEntries(testDate);
      expect(entries).toHaveLength(3);
    });
  });

  describe('Daily Goal & Daily Summary', () => {
    const testDate = '2026-11-03';

    test('defaults to 2000 kcal goal', async () => {
      expect(await repo.getDailyGoal(testDate)).toBe(2000);
    });

    test('sets and persists daily goal for specific date and default', async () => {
      await repo.setDailyGoal(testDate, 2200);
      expect(await repo.getDailyGoal(testDate)).toBe(2200);
      expect(await repo.getDailyGoal('2026-11-04')).toBe(2200);
    });

    test('throws when setting non-positive daily goal', async () => {
      await expect(repo.setDailyGoal(testDate, 0)).rejects.toThrow(/greater than zero/i);
      await expect(repo.setDailyGoal(testDate, -100)).rejects.toThrow(/greater than zero/i);
    });

    test('computes complete daily summary with balances and breakdown', async () => {
      await repo.setDailyGoal(testDate, 2000);

      await repo.addLoggedEntry({
        foodItemId: 'starter_oats',
        foodName: 'Rolled Oats (Dry)',
        servingUnit: '0.5 cup',
        portion: 1,
        calories: 150,
        dateString: testDate,
        mealType: 'Breakfast',
      });

      await repo.addLoggedEntry({
        foodItemId: 'starter_chicken_breast',
        foodName: 'Chicken Breast',
        servingUnit: '100g',
        portion: 2,
        calories: 330,
        dateString: testDate,
        mealType: 'Lunch',
      });

      const summary = await repo.getDailySummary(testDate);
      expect(summary.dateString).toBe(testDate);
      expect(summary.calorieTarget).toBe(2000);
      expect(summary.totalCalories).toBe(480);
      expect(summary.remainingCalories).toBe(1520);
      expect(summary.isOverTarget).toBe(false);
      expect(summary.percentageConsumed).toBe(24);
      expect(summary.entries).toHaveLength(2);
      expect(summary.mealBreakdown?.Breakfast).toBe(150);
      expect(summary.mealBreakdown?.Lunch).toBe(330);
    });
  });
});
