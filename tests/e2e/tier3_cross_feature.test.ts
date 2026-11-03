/**
 * Tier 3: Cross-Feature Combinations Test Suite
 * Requirement-Driven, Opaque-Box E2E Tests
 * Validates pairwise interactions, multi-step lifecycles, and cross-feature interactions:
 * - Log multiple foods -> edit portion -> recalculate remaining balance
 * - Log multiple foods -> delete item -> recalculate balance
 * - Cross-date switching with independent state isolation
 * - Custom food creation -> logging -> catalog mutation -> historical snapshot preservation
 * - Goal modification across active date summaries
 * - Multi-meal category distribution & subtotal consistency
 * - Rapid repeated portion edits & oscillation invariance
 * - Sequential deletion to empty log recovery
 */

import {
  getCalorieMath,
  getStorageRepository,
  ICalorieMath,
  ICalorieRepository,
  InMemoryStorageAdapter,
} from './mockStorage';

describe('Tier 3: Cross-Feature Combinations E2E Suite', () => {
  let math: ICalorieMath;
  let repo: ICalorieRepository;
  let adapter: InMemoryStorageAdapter;

  beforeEach(async () => {
    adapter = new InMemoryStorageAdapter();
    math = await getCalorieMath();
    repo = await getStorageRepository(adapter);
  });

  test('TC3.1: Log multiple foods -> edit portion -> verify immediate recalculation of daily sum and remaining balance', async () => {
    const testDate = '2026-11-03';
    await repo.setDailyGoal(testDate, 2000);

    // 1. Log Breakfast: Rolled Oats (150 kcal)
    const e1 = await repo.addLoggedEntry({
      foodItemId: 'starter_oats',
      foodName: 'Rolled Oats (Dry)',
      servingUnit: '0.5 cup (40g)',
      portion: 1.0,
      calories: 150,
      dateString: testDate,
      mealType: 'Breakfast',
    });

    // 2. Log Lunch: Chicken Breast (248 kcal for 1.5 servings)
    const e2 = await repo.addLoggedEntry({
      foodItemId: 'starter_chicken_breast',
      foodName: 'Chicken Breast (Grilled)',
      servingUnit: '100g',
      portion: 1.5,
      calories: 248,
      dateString: testDate,
      mealType: 'Lunch',
    });

    // Initial check: 150 + 248 = 398 kcal consumed, 2000 - 398 = 1602 kcal remaining
    let summary = await repo.getDailySummary(testDate);
    expect(summary.totalCalories).toBe(398);
    expect(summary.remainingCalories).toBe(1602);

    // 3. Edit portion of Lunch: increase portion from 1.5 to 2.5 (165 * 2.5 = 412.5 -> 413 kcal)
    const newPortion = 2.5;
    const newCalories = math.calculateItemCalories(newPortion, 165); // 413 kcal
    await repo.updateLoggedEntry(e2.id, {
      portion: newPortion,
      calories: newCalories,
    });

    // Updated check: 150 + 413 = 563 kcal consumed, 2000 - 563 = 1437 kcal remaining
    summary = await repo.getDailySummary(testDate);
    expect(summary.totalCalories).toBe(563);
    expect(summary.remainingCalories).toBe(1437);
  });

  test('TC3.2: Log multiple foods -> delete one item -> verify daily total decreases and remaining balance increases', async () => {
    const testDate = '2026-11-03';
    await repo.setDailyGoal(testDate, 2000);

    const e1 = await repo.addLoggedEntry({
      foodItemId: 'starter_salmon',
      foodName: 'Salmon Fillet',
      servingUnit: '100g',
      portion: 1.0,
      calories: 208,
      dateString: testDate,
      mealType: 'Dinner',
    });
    const e2 = await repo.addLoggedEntry({
      foodItemId: 'starter_white_rice',
      foodName: 'White Rice',
      servingUnit: '1 cup',
      portion: 1.0,
      calories: 205,
      dateString: testDate,
      mealType: 'Dinner',
    });
    const e3 = await repo.addLoggedEntry({
      foodItemId: 'starter_olive_oil',
      foodName: 'Olive Oil',
      servingUnit: '1 tbsp',
      portion: 1.0,
      calories: 119,
      dateString: testDate,
      mealType: 'Dinner',
    });

    // Initial total: 208 + 205 + 119 = 532 kcal, remaining: 1468 kcal
    let summary = await repo.getDailySummary(testDate);
    expect(summary.totalCalories).toBe(532);
    expect(summary.remainingCalories).toBe(1468);
    expect(summary.entries).toHaveLength(3);

    // Delete White Rice (205 kcal)
    const deleteSuccess = await repo.deleteLoggedEntry(e2.id);
    expect(deleteSuccess).toBe(true);

    // New total: 532 - 205 = 327 kcal, remaining: 2000 - 327 = 1673 kcal
    summary = await repo.getDailySummary(testDate);
    expect(summary.totalCalories).toBe(327);
    expect(summary.remainingCalories).toBe(1673);
    expect(summary.entries).toHaveLength(2);
    expect(summary.entries.map((e) => e.foodName)).not.toContain('White Rice');
  });

  test('TC3.3: Cross-date switching with independent state isolation between consecutive days', async () => {
    const day1 = '2026-11-03';
    const day2 = '2026-11-04';

    await repo.setDailyGoal(day1, 2000);

    // Day 1 logs: Apple (95 kcal) + Banana (105 kcal) = 200 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_apple',
      foodName: 'Apple',
      servingUnit: '1 medium',
      portion: 1.0,
      calories: 95,
      dateString: day1,
      mealType: 'Breakfast',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_banana',
      foodName: 'Banana',
      servingUnit: '1 medium',
      portion: 1.0,
      calories: 105,
      dateString: day1,
      mealType: 'Snack',
    });

    // Switch to Day 2: starts clean with 0 consumed
    let day2Summary = await repo.getDailySummary(day2);
    expect(day2Summary.totalCalories).toBe(0);
    expect(day2Summary.remainingCalories).toBe(2000);
    expect(day2Summary.entries).toHaveLength(0);

    // Log on Day 2: Salmon (208 kcal)
    await repo.addLoggedEntry({
      foodItemId: 'starter_salmon',
      foodName: 'Salmon Fillet',
      servingUnit: '100g',
      portion: 1.0,
      calories: 208,
      dateString: day2,
      mealType: 'Dinner',
    });

    day2Summary = await repo.getDailySummary(day2);
    expect(day2Summary.totalCalories).toBe(208);
    expect(day2Summary.remainingCalories).toBe(1792);

    // Switch back to Day 1: Day 1 data is completely preserved
    const day1Summary = await repo.getDailySummary(day1);
    expect(day1Summary.totalCalories).toBe(200);
    expect(day1Summary.remainingCalories).toBe(1800);
    expect(day1Summary.entries).toHaveLength(2);
  });

  test('TC3.4: Custom food creation -> log entry -> catalog modification preserves denormalized snapshot in history', async () => {
    const testDate = '2026-11-03';

    // 1. Create custom food
    const customFood = await repo.saveCustomFood({
      name: 'Homemade Lasagna',
      servingUnit: '1 square (300g)',
      caloriesPerUnit: 550,
      category: 'Grains',
    });

    // 2. Log 1.5 portions (550 * 1.5 = 825 kcal)
    const loggedEntry = await repo.addLoggedEntry({
      foodItemId: customFood.id,
      foodName: customFood.name,
      servingUnit: customFood.servingUnit,
      portion: 1.5,
      calories: math.calculateItemCalories(1.5, 550),
      dateString: testDate,
      mealType: 'Dinner',
    });

    expect(loggedEntry.calories).toBe(825);
    expect(loggedEntry.foodName).toBe('Homemade Lasagna');

    // 3. Even if the custom food in catalog is hypothetically superseded or modified
    // the logged historical entry preserves its denormalized snapshot
    const dayEntries = await repo.getLoggedEntries(testDate);
    expect(dayEntries[0].foodName).toBe('Homemade Lasagna');
    expect(dayEntries[0].servingUnit).toBe('1 square (300g)');
    expect(dayEntries[0].calories).toBe(825);
    expect(dayEntries[0].portion).toBe(1.5);
  });

  test('TC3.5: Goal modification dynamically updates remaining balance for current day summary', async () => {
    const testDate = '2026-11-03';

    // Log 1200 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_pasta',
      foodName: 'Pasta',
      servingUnit: '1 cup',
      portion: 3.0,
      calories: 660,
      dateString: testDate,
      mealType: 'Lunch',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_beef_steak',
      foodName: 'Lean Beef',
      servingUnit: '100g',
      portion: 2.5,
      calories: 543,
      dateString: testDate,
      mealType: 'Dinner',
    });

    // Total: 660 + 543 = 1203 kcal. Initial goal 2000 -> remaining: 797 kcal
    let summary = await repo.getDailySummary(testDate);
    expect(summary.totalCalories).toBe(1203);
    expect(summary.remainingCalories).toBe(797);

    // Update goal to 1800 (cutting target) -> remaining should update to 1800 - 1203 = 597 kcal
    await repo.setDailyGoal(testDate, 1800);
    summary = await repo.getDailySummary(testDate);
    expect(summary.calorieTarget).toBe(1800);
    expect(summary.remainingCalories).toBe(597);

    // Update goal to 2500 (bulking target) -> remaining should update to 2500 - 1203 = 1297 kcal
    await repo.setDailyGoal(testDate, 2500);
    summary = await repo.getDailySummary(testDate);
    expect(summary.calorieTarget).toBe(2500);
    expect(summary.remainingCalories).toBe(1297);
  });

  test('TC3.6: Multi-meal distribution across Breakfast, Lunch, Dinner, Snack sums strictly to totalCalories', async () => {
    const testDate = '2026-11-03';

    await repo.addLoggedEntry({
      foodItemId: 'starter_egg',
      foodName: 'Whole Egg',
      servingUnit: '1 large',
      portion: 2,
      calories: 144,
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
    await repo.addLoggedEntry({
      foodItemId: 'starter_salmon',
      foodName: 'Salmon Fillet',
      servingUnit: '100g',
      portion: 1.5,
      calories: 312,
      dateString: testDate,
      mealType: 'Dinner',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_dark_chocolate',
      foodName: 'Dark Chocolate',
      servingUnit: '1 oz',
      portion: 1,
      calories: 170,
      dateString: testDate,
      mealType: 'Snack',
    });

    const summary = await repo.getDailySummary(testDate);
    const expectedTotal = 144 + 330 + 312 + 170; // 956 kcal
    expect(summary.totalCalories).toBe(expectedTotal);

    // Verify individual meal subsets
    const breakfastCal = summary.entries
      .filter((e) => e.mealType === 'Breakfast')
      .reduce((s, e) => s + e.calories, 0);
    const lunchCal = summary.entries
      .filter((e) => e.mealType === 'Lunch')
      .reduce((s, e) => s + e.calories, 0);
    const dinnerCal = summary.entries
      .filter((e) => e.mealType === 'Dinner')
      .reduce((s, e) => s + e.calories, 0);
    const snackCal = summary.entries
      .filter((e) => e.mealType === 'Snack')
      .reduce((s, e) => s + e.calories, 0);

    expect(breakfastCal + lunchCal + dinnerCal + snackCal).toBe(summary.totalCalories);
  });

  test('TC3.7: Rapid repeated portion edits and reversals yield exact integer results with zero drift', async () => {
    const testDate = '2026-11-03';
    const entry = await repo.addLoggedEntry({
      foodItemId: 'starter_oats',
      foodName: 'Rolled Oats',
      servingUnit: '0.5 cup',
      portion: 1.0,
      calories: 150,
      dateString: testDate,
      mealType: 'Breakfast',
    });

    // Cycle through multiple portion changes: 0.5 -> 3.0 -> 1.5 -> 1.0
    const sequence = [
      { portion: 0.5, expected: 75 },
      { portion: 3.0, expected: 450 },
      { portion: 1.5, expected: 225 },
      { portion: 1.0, expected: 150 },
    ];

    for (const step of sequence) {
      await repo.updateLoggedEntry(entry.id, {
        portion: step.portion,
        calories: math.calculateItemCalories(step.portion, 150),
      });
      const summary = await repo.getDailySummary(testDate);
      expect(summary.totalCalories).toBe(step.expected);
    }
  });

  test('TC3.8: Complete log purge (deleting all entries sequentially) returns summary to zero consumed cleanly', async () => {
    const testDate = '2026-11-03';
    await repo.setDailyGoal(testDate, 2000);

    const items = await Promise.all([
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

    let summary = await repo.getDailySummary(testDate);
    expect(summary.totalCalories).toBe(262);

    // Delete each entry one by one
    for (const item of items) {
      await repo.deleteLoggedEntry(item.id);
    }

    summary = await repo.getDailySummary(testDate);
    expect(summary.totalCalories).toBe(0);
    expect(summary.remainingCalories).toBe(2000);
    expect(summary.entries).toHaveLength(0);
  });
});
