/**
 * Tier 4: Real-World Application Scenarios Test Suite
 * Requirement-Driven, Opaque-Box E2E Tests
 * Validates 8 comprehensive real-world scenarios:
 * 1. Caloric Deficit Scenario (Cutting / Weight Loss Plan)
 * 2. Caloric Surplus Scenario (Bulking / Muscle Gain Plan)
 * 3. Exact Target Maintenance Scenario (Zero Balance Budget Met)
 * 4. 7-Day Weekly Tracking Simulation (Longitudinal Isolation & Weekly Sums)
 * 5. Accidental User Misentry & Rapid In-Place Correction
 * 6. Meal Prep Container / Multi-Day Custom Recipe Workflow
 * 7. Intermittent Fasting Scenario (Skipped Breakfast & Lunch)
 * 8. High-Density Cheat Meal & Deep Caloric Surplus Handling
 */

import {
  getCalorieMath,
  getStorageRepository,
  ICalorieMath,
  ICalorieRepository,
  InMemoryStorageAdapter,
} from './mockStorage';

describe('Tier 4: Real-World Application Scenarios E2E Suite', () => {
  let math: ICalorieMath;
  let repo: ICalorieRepository;
  let adapter: InMemoryStorageAdapter;

  beforeEach(async () => {
    adapter = new InMemoryStorageAdapter();
    math = await getCalorieMath();
    repo = await getStorageRepository(adapter);
  });

  test('TC4.1: Caloric Deficit Scenario (Cutting Plan: 1,500 kcal goal, controlled healthy portions)', async () => {
    const date = '2026-11-03';
    await repo.setDailyGoal(date, 1500);

    // Breakfast: Rolled Oats (150 kcal) + Half cup Whole Milk (75 kcal) + Half cup Blueberries (42 kcal) = 267 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_oats',
      foodName: 'Rolled Oats (Dry)',
      servingUnit: '0.5 cup (40g)',
      portion: 1.0,
      calories: 150,
      dateString: date,
      mealType: 'Breakfast',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_whole_milk',
      foodName: 'Whole Milk',
      servingUnit: '1 cup (244ml)',
      portion: 0.5,
      calories: math.calculateItemCalories(0.5, 149), // 75 kcal
      dateString: date,
      mealType: 'Breakfast',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_blueberries',
      foodName: 'Blueberries',
      servingUnit: '1 cup (148g)',
      portion: 0.5,
      calories: math.calculateItemCalories(0.5, 84), // 42 kcal
      dateString: date,
      mealType: 'Breakfast',
    });

    // Lunch: 1.5 Grilled Chicken (248 kcal) + Steamed Broccoli (35 kcal) + 0.75 cup Brown Rice (162 kcal) = 445 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_chicken_breast',
      foodName: 'Chicken Breast (Grilled)',
      servingUnit: '100g',
      portion: 1.5,
      calories: math.calculateItemCalories(1.5, 165), // 248 kcal
      dateString: date,
      mealType: 'Lunch',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_broccoli',
      foodName: 'Broccoli (Steamed)',
      servingUnit: '100g',
      portion: 1.0,
      calories: 35,
      dateString: date,
      mealType: 'Lunch',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_brown_rice',
      foodName: 'Brown Rice (Cooked)',
      servingUnit: '1 cup (195g)',
      portion: 0.75,
      calories: math.calculateItemCalories(0.75, 216), // 162 kcal
      dateString: date,
      mealType: 'Lunch',
    });

    // Dinner: Salmon Fillet (208 kcal) + Mixed Greens Salad (15 kcal) + 0.5 tbsp Olive Oil (60 kcal) = 283 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_salmon',
      foodName: 'Salmon Fillet (Baked)',
      servingUnit: '100g',
      portion: 1.0,
      calories: 208,
      dateString: date,
      mealType: 'Dinner',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_mixed_salad',
      foodName: 'Mixed Greens Salad',
      servingUnit: '1 bowl (100g)',
      portion: 1.0,
      calories: 15,
      dateString: date,
      mealType: 'Dinner',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_olive_oil',
      foodName: 'Olive Oil',
      servingUnit: '1 tbsp (15ml)',
      portion: 0.5,
      calories: math.calculateItemCalories(0.5, 119), // 60 kcal
      dateString: date,
      mealType: 'Dinner',
    });

    // Snack: Plain Greek Yogurt (120 kcal) + Strawberries (49 kcal) = 169 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_greek_yogurt',
      foodName: 'Greek Yogurt (Plain 0%)',
      servingUnit: '1 cup (200g)',
      portion: 1.0,
      calories: 120,
      dateString: date,
      mealType: 'Snack',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_strawberries',
      foodName: 'Strawberries',
      servingUnit: '1 cup (144g)',
      portion: 1.0,
      calories: 49,
      dateString: date,
      mealType: 'Snack',
    });

    // Expected daily total: 267 + 445 + 283 + 169 = 1,164 kcal
    const summary = await repo.getDailySummary(date);
    expect(summary.totalCalories).toBe(1164);
    expect(summary.calorieTarget).toBe(1500);
    expect(summary.remainingCalories).toBe(336); // 1500 - 1164 = +336 kcal under budget
    expect(summary.entries).toHaveLength(11);
  });

  test('TC4.2: Caloric Surplus Scenario (Bulking Plan: 2,800 kcal goal with heavy calorie surplus)', async () => {
    const date = '2026-11-03';
    await repo.setDailyGoal(date, 2800);

    // Breakfast: 3 Eggs (216 kcal) + 2 Slices Whole Wheat Bread (160 kcal) + Peanut Butter (190 kcal) + Whole Milk (149 kcal) = 715 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_egg',
      foodName: 'Whole Egg',
      servingUnit: '1 large',
      portion: 3.0,
      calories: math.calculateItemCalories(3.0, 72),
      dateString: date,
      mealType: 'Breakfast',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_whole_wheat_bread',
      foodName: 'Whole Wheat Bread',
      servingUnit: '1 slice',
      portion: 2.0,
      calories: math.calculateItemCalories(2.0, 80),
      dateString: date,
      mealType: 'Breakfast',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_peanut_butter',
      foodName: 'Peanut Butter',
      servingUnit: '2 tbsp',
      portion: 1.0,
      calories: 190,
      dateString: date,
      mealType: 'Breakfast',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_whole_milk',
      foodName: 'Whole Milk',
      servingUnit: '1 cup',
      portion: 1.0,
      calories: 149,
      dateString: date,
      mealType: 'Breakfast',
    });

    // Lunch: 200g Lean Beef (434 kcal) + 2 cups White Rice (410 kcal) + 1 tbsp Olive Oil (119 kcal) = 963 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_beef_steak',
      foodName: 'Lean Beef',
      servingUnit: '100g',
      portion: 2.0,
      calories: math.calculateItemCalories(2.0, 217),
      dateString: date,
      mealType: 'Lunch',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_white_rice',
      foodName: 'White Rice',
      servingUnit: '1 cup',
      portion: 2.0,
      calories: math.calculateItemCalories(2.0, 205),
      dateString: date,
      mealType: 'Lunch',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_olive_oil',
      foodName: 'Olive Oil',
      servingUnit: '1 tbsp',
      portion: 1.0,
      calories: 119,
      dateString: date,
      mealType: 'Lunch',
    });

    // Snack: 2 scoops Whey Protein (240 kcal) + 1 Banana (105 kcal) + 1 handful Almonds (164 kcal) = 509 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_whey_protein',
      foodName: 'Whey Protein Powder',
      servingUnit: '1 scoop',
      portion: 2.0,
      calories: math.calculateItemCalories(2.0, 120),
      dateString: date,
      mealType: 'Snack',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_banana',
      foodName: 'Banana',
      servingUnit: '1 medium',
      portion: 1.0,
      calories: 105,
      dateString: date,
      mealType: 'Snack',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_almonds',
      foodName: 'Almonds',
      servingUnit: '1 handful',
      portion: 1.0,
      calories: 164,
      dateString: date,
      mealType: 'Snack',
    });

    // Dinner: 2 cups Pasta (440 kcal) + 200g Grilled Chicken (330 kcal) + 1 slice Cheddar Cheese (113 kcal) = 883 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_pasta',
      foodName: 'Pasta',
      servingUnit: '1 cup',
      portion: 2.0,
      calories: math.calculateItemCalories(2.0, 220),
      dateString: date,
      mealType: 'Dinner',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_chicken_breast',
      foodName: 'Chicken Breast',
      servingUnit: '100g',
      portion: 2.0,
      calories: math.calculateItemCalories(2.0, 165),
      dateString: date,
      mealType: 'Dinner',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_cheddar_cheese',
      foodName: 'Cheddar Cheese',
      servingUnit: '1 slice',
      portion: 1.0,
      calories: 113,
      dateString: date,
      mealType: 'Dinner',
    });

    // Cumulative sum: 715 + 963 + 509 + 883 = 3,070 kcal
    // Target: 2,800 kcal -> remaining: -270 kcal
    const summary = await repo.getDailySummary(date);
    expect(summary.totalCalories).toBe(3070);
    expect(summary.calorieTarget).toBe(2800);
    expect(summary.remainingCalories).toBe(-270);
  });

  test('TC4.3: Exact Maintenance Scenario (Intake perfectly matches 2,000 kcal target yields exactly 0 balance)', async () => {
    const date = '2026-11-03';
    await repo.setDailyGoal(date, 2000);

    // Specifically calibrated: 500 (Breakfast) + 700 (Lunch) + 600 (Dinner) + 200 (Snack) = 2,000 kcal
    await repo.addLoggedEntry({
      foodItemId: 'custom_b',
      foodName: 'Breakfast Set',
      servingUnit: '1 set',
      portion: 1.0,
      calories: 500,
      dateString: date,
      mealType: 'Breakfast',
    });
    await repo.addLoggedEntry({
      foodItemId: 'custom_l',
      foodName: 'Lunch Set',
      servingUnit: '1 set',
      portion: 1.0,
      calories: 700,
      dateString: date,
      mealType: 'Lunch',
    });
    await repo.addLoggedEntry({
      foodItemId: 'custom_d',
      foodName: 'Dinner Set',
      servingUnit: '1 set',
      portion: 1.0,
      calories: 600,
      dateString: date,
      mealType: 'Dinner',
    });
    await repo.addLoggedEntry({
      foodItemId: 'custom_s',
      foodName: 'Snack Set',
      servingUnit: '1 set',
      portion: 1.0,
      calories: 200,
      dateString: date,
      mealType: 'Snack',
    });

    const summary = await repo.getDailySummary(date);
    expect(summary.totalCalories).toBe(2000);
    expect(summary.calorieTarget).toBe(2000);
    expect(summary.remainingCalories).toBe(0);
  });

  test('TC4.4: 7-Day Weekly Tracking Simulation verifies longitudinal persistence and independent daily summaries', async () => {
    const dailyIntakes = [
      { date: '2026-11-01', calories: 1850 },
      { date: '2026-11-02', calories: 2100 },
      { date: '2026-11-03', calories: 1950 },
      { date: '2026-11-04', calories: 1800 },
      { date: '2026-11-05', calories: 2200 },
      { date: '2026-11-06', calories: 2050 },
      { date: '2026-11-07', calories: 1900 },
    ];

    // Log each day independently
    for (const day of dailyIntakes) {
      await repo.addLoggedEntry({
        foodItemId: `item_${day.date}`,
        foodName: `Daily Meal Plan for ${day.date}`,
        servingUnit: 'day plan',
        portion: 1.0,
        calories: day.calories,
        dateString: day.date,
        mealType: 'Lunch',
      });
    }

    // Verify each day independently
    let weeklyTotal = 0;
    for (const day of dailyIntakes) {
      const summary = await repo.getDailySummary(day.date);
      expect(summary.totalCalories).toBe(day.calories);
      expect(summary.entries).toHaveLength(1);
      weeklyTotal += summary.totalCalories;
    }

    const expectedWeeklySum = 1850 + 2100 + 1950 + 1800 + 2200 + 2050 + 1900; // 13,850 kcal
    expect(weeklyTotal).toBe(expectedWeeklySum);
    const averageDaily = Math.round(weeklyTotal / 7);
    expect(averageDaily).toBe(1979);
  });

  test('TC4.5: Accidental User Misentry & Rapid In-Place Correction', async () => {
    const date = '2026-11-03';
    await repo.setDailyGoal(date, 2000);

    // Initial breakfast items
    await repo.addLoggedEntry({
      foodItemId: 'starter_oats',
      foodName: 'Rolled Oats',
      servingUnit: '0.5 cup',
      portion: 1.0,
      calories: 150,
      dateString: date,
      mealType: 'Breakfast',
    });

    // User intends to log 1 serving (190 kcal) of peanut butter, but accidentally types portion 10 (1,900 kcal)
    const misentry = await repo.addLoggedEntry({
      foodItemId: 'starter_peanut_butter',
      foodName: 'Peanut Butter',
      servingUnit: '2 tbsp',
      portion: 10.0,
      calories: math.calculateItemCalories(10.0, 190), // 1900 kcal
      dateString: date,
      mealType: 'Breakfast',
    });

    // User views dashboard: 150 + 1900 = 2050 kcal consumed, remaining is -50 kcal
    let summary = await repo.getDailySummary(date);
    expect(summary.totalCalories).toBe(2050);
    expect(summary.remainingCalories).toBe(-50);

    // User notices mistake, edits portion to 1.0 (190 kcal)
    await repo.updateLoggedEntry(misentry.id, {
      portion: 1.0,
      calories: math.calculateItemCalories(1.0, 190),
    });

    // Corrected dashboard: 150 + 190 = 340 kcal consumed, remaining is 1660 kcal
    summary = await repo.getDailySummary(date);
    expect(summary.totalCalories).toBe(340);
    expect(summary.remainingCalories).toBe(1660);
  });

  test('TC4.6: Meal Prep Container / Multi-Day Custom Recipe Workflow', async () => {
    // User creates a batch prep recipe: "Batch Turkey Chili" (420 kcal per 350g container)
    const prepFood = await repo.saveCustomFood({
      name: 'Batch Turkey Chili Prep',
      servingUnit: '1 container (350g)',
      caloriesPerUnit: 420,
      category: 'Proteins',
    });

    // Day 1: Eats 1 container for Lunch
    await repo.addLoggedEntry({
      foodItemId: prepFood.id,
      foodName: prepFood.name,
      servingUnit: prepFood.servingUnit,
      portion: 1.0,
      calories: prepFood.caloriesPerUnit,
      dateString: '2026-11-03',
      mealType: 'Lunch',
    });

    // Day 2: Eats 1.5 containers for Lunch (hunger spike)
    await repo.addLoggedEntry({
      foodItemId: prepFood.id,
      foodName: prepFood.name,
      servingUnit: prepFood.servingUnit,
      portion: 1.5,
      calories: math.calculateItemCalories(1.5, prepFood.caloriesPerUnit), // 630 kcal
      dateString: '2026-11-04',
      mealType: 'Lunch',
    });

    // Day 3: Eats remaining 0.75 container for Lunch
    await repo.addLoggedEntry({
      foodItemId: prepFood.id,
      foodName: prepFood.name,
      servingUnit: prepFood.servingUnit,
      portion: 0.75,
      calories: math.calculateItemCalories(0.75, prepFood.caloriesPerUnit), // 315 kcal
      dateString: '2026-11-05',
      mealType: 'Lunch',
    });

    const d1 = await repo.getDailySummary('2026-11-03');
    const d2 = await repo.getDailySummary('2026-11-04');
    const d3 = await repo.getDailySummary('2026-11-05');

    expect(d1.totalCalories).toBe(420);
    expect(d2.totalCalories).toBe(630);
    expect(d3.totalCalories).toBe(315);
  });

  test('TC4.7: Intermittent Fasting Scenario (Skipped Breakfast & Lunch with late intake)', async () => {
    const date = '2026-11-03';
    await repo.setDailyGoal(date, 1800);

    // Fasting window: 0 entries logged for Breakfast & Lunch
    const morningSummary = await repo.getDailySummary(date);
    expect(morningSummary.totalCalories).toBe(0);
    expect(morningSummary.remainingCalories).toBe(1800);

    // Eating window opens in evening:
    // Dinner: Grilled Salmon (208 kcal) + 2 cups White Rice (410 kcal) + Lean Beef (434 kcal) = 1,052 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_salmon',
      foodName: 'Salmon Fillet',
      servingUnit: '100g',
      portion: 1.0,
      calories: 208,
      dateString: date,
      mealType: 'Dinner',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_white_rice',
      foodName: 'White Rice',
      servingUnit: '1 cup',
      portion: 2.0,
      calories: 410,
      dateString: date,
      mealType: 'Dinner',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_beef_steak',
      foodName: 'Lean Beef',
      servingUnit: '100g',
      portion: 2.0,
      calories: 434,
      dateString: date,
      mealType: 'Dinner',
    });

    // Late evening snack: Greek Yogurt (120 kcal) + Dark Chocolate (170 kcal) = 290 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_greek_yogurt',
      foodName: 'Greek Yogurt',
      servingUnit: '1 cup',
      portion: 1.0,
      calories: 120,
      dateString: date,
      mealType: 'Snack',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_dark_chocolate',
      foodName: 'Dark Chocolate',
      servingUnit: '1 oz',
      portion: 1.0,
      calories: 170,
      dateString: date,
      mealType: 'Snack',
    });

    const finalSummary = await repo.getDailySummary(date);
    expect(finalSummary.totalCalories).toBe(1342); // 1052 + 290 = 1342 kcal
    expect(finalSummary.calorieTarget).toBe(1800);
    expect(finalSummary.remainingCalories).toBe(458); // 1800 - 1342 = +458 kcal
  });

  test('TC4.8: High-Density Cheat Meal & Deep Caloric Surplus Handling', async () => {
    const date = '2026-11-03';
    await repo.setDailyGoal(date, 2000);

    // Normal day breakfast & lunch: 850 kcal
    await repo.addLoggedEntry({
      foodItemId: 'starter_egg',
      foodName: 'Whole Egg',
      servingUnit: '1 large',
      portion: 2.0,
      calories: 144,
      dateString: date,
      mealType: 'Breakfast',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_white_bread',
      foodName: 'White Bread',
      servingUnit: '1 slice',
      portion: 2.0,
      calories: 134,
      dateString: date,
      mealType: 'Breakfast',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_chicken_breast',
      foodName: 'Chicken Breast',
      servingUnit: '100g',
      portion: 2.0,
      calories: 330,
      dateString: date,
      mealType: 'Lunch',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_pasta',
      foodName: 'Pasta',
      servingUnit: '1 cup',
      portion: 1.1,
      calories: 242,
      dateString: date,
      mealType: 'Lunch',
    });

    // Cheat dinner: Large Pizza & Cola (2,800 kcal)
    const cheatFood = await repo.saveCustomFood({
      name: 'Entire Large Pepperoni Pizza',
      servingUnit: '1 whole pizza',
      caloriesPerUnit: 2660,
      category: 'Dinner',
    });

    await repo.addLoggedEntry({
      foodItemId: cheatFood.id,
      foodName: cheatFood.name,
      servingUnit: cheatFood.servingUnit,
      portion: 1.0,
      calories: 2660,
      dateString: date,
      mealType: 'Dinner',
    });
    await repo.addLoggedEntry({
      foodItemId: 'starter_regular_cola',
      foodName: 'Regular Cola',
      servingUnit: '1 can',
      portion: 1.0,
      calories: 140,
      dateString: date,
      mealType: 'Dinner',
    });

    // Total: (144 + 134 + 330 + 242) + 2660 + 140 = 850 + 2800 = 3,650 kcal
    // Target: 2000 kcal -> Remaining: 2000 - 3650 = -1650 kcal
    const summary = await repo.getDailySummary(date);
    expect(summary.totalCalories).toBe(3650);
    expect(summary.remainingCalories).toBe(-1650);
    expect(summary.entries).toHaveLength(6);
  });
});
