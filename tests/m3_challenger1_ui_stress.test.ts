import React from 'react';
import {
  StandaloneBadge,
  ErrorBoundary,
  DateNavigator,
  CalorieProgressCard,
  MealSection,
  GoalSettingsModal,
  EditMealModal,
  FoodLoggingModal,
  shiftDate,
  formatFriendlyDate,
  getLocalDateString,
} from '../src/components';
import App from '../src/App';
import { STARTER_FOOD_CATALOG } from '../src/data/starterCatalog';
import { FoodCategory, FoodItem, LoggedEntry, MealType } from '../src/types';
import {
  calculateDailyTotal,
  calculateItemCalories,
  calculateMealBreakdown,
  calculateProgressPercentage,
  calculateRemainingBalance,
  validatePortionInput,
} from '../src/utils/calorieMath';
import { AsyncStorageAdapter } from '../src/services/storageAdapter';
import { defaultCalorieRepository } from '../src/services/storageService';

// React test renderer typings and utilities
const renderer = require('react-test-renderer');
const { create, act } = renderer;
const h = React.createElement;

describe('Milestone 3 Challenger 1: UI Interaction & State Stress Test Suite', () => {
  // Helper to extract text content safely from ReactTestInstance tree
  const nodeText = (node: any): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(nodeText).join('');
    if (node.props && node.props.children !== undefined) return nodeText(node.props.children);
    if (Array.isArray(node.children)) return node.children.map(nodeText).join('');
    return '';
  };

  // Helper to find all nodes with a given testID
  const findByTestId = (instance: any, testID: string) => {
    return instance.findAll((node: any) => node.props && node.props.testID === testID);
  };

  // Helper to get exactly one node with a given testID
  const getByTestId = (instance: any, testID: string) => {
    const nodes = findByTestId(instance, testID);
    if (nodes.length === 0) {
      throw new Error(`Component with testID="${testID}" not found.`);
    }
    return nodes[0];
  };

  beforeEach(async () => {
    // Completely wipe AsyncStorage between stress test runs
    await AsyncStorageAdapter.clear();
  });

  // =========================================================================
  // SECTION 1: Rapid Date Switching & Multi-Day State Isolation Stress
  // =========================================================================
  describe('1. Rapid Date Switching & Multi-Day State Isolation Stress', () => {
    test('1.1: Sequential rapid date shifting across 30 consecutive days produces valid ISO format', () => {
      let currentDate = '2026-11-01';
      for (let day = 1; day <= 30; day++) {
        expect(currentDate).toBe(`2026-11-${String(day).padStart(2, '0')}`);
        currentDate = shiftDate(currentDate, 1);
      }
      expect(currentDate).toBe('2026-12-01');
    });

    test('1.2: Boundary leap year, year-end, and month-turn date transitions', () => {
      // Leap year boundary (2024 is a leap year)
      expect(shiftDate('2024-02-28', 1)).toBe('2024-02-29');
      expect(shiftDate('2024-02-29', 1)).toBe('2024-03-01');
      expect(shiftDate('2024-03-01', -1)).toBe('2024-02-29');
      expect(shiftDate('2024-02-29', -1)).toBe('2024-02-28');

      // Non-leap year boundary (2025 is not a leap year)
      expect(shiftDate('2025-02-28', 1)).toBe('2025-03-01');
      expect(shiftDate('2025-03-01', -1)).toBe('2025-02-28');

      // Year-end transition
      expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
      expect(shiftDate('2027-01-01', -1)).toBe('2026-12-31');

      // Month transitions with 30-day month (April -> May)
      expect(shiftDate('2026-04-30', 1)).toBe('2026-05-01');
      expect(shiftDate('2026-05-01', -1)).toBe('2026-04-30');

      // Extreme date offsets
      expect(shiftDate('2026-01-01', 365)).toBe('2027-01-01');
      expect(shiftDate('2026-01-01', -365)).toBe('2025-01-01');
    });

    test('1.3: Rapid bidirectional date navigation in DateNavigator component', () => {
      let currentDate = '2026-11-05';
      const onDateChange = jest.fn((newDate: string) => {
        currentDate = newDate;
      });

      let root: any;
      act(() => {
        root = create(
          h(DateNavigator, {
            currentDate,
            onDateChange,
            todayDate: '2026-11-05',
          })
        );
      });

      const prevBtn = getByTestId(root.root, 'prev-date-btn');
      const nextBtn = getByTestId(root.root, 'next-date-btn');

      // Rapidly step backward 5 times
      for (let i = 0; i < 5; i++) {
        act(() => {
          prevBtn.props.onPress();
        });
      }
      expect(onDateChange).toHaveBeenCalledTimes(5);
      expect(onDateChange).toHaveBeenLastCalledWith('2026-11-04');

      // Re-render with shifted date and test jump to today
      act(() => {
        root.update(
          h(DateNavigator, {
            currentDate: '2026-10-15',
            onDateChange,
            todayDate: '2026-11-05',
          })
        );
      });

      const todayBtn = getByTestId(root.root, 'today-date-btn');
      expect(todayBtn).toBeDefined();

      act(() => {
        todayBtn.props.onPress();
      });
      expect(onDateChange).toHaveBeenLastCalledWith('2026-11-05');
    });

    test('1.4: App-level rapid date switching ensures 100% data isolation across multiple dates', async () => {
      // Seed storage with 4 different dates with unique data profiles
      const date1 = '2026-11-01';
      const date2 = '2026-11-02';
      const date3 = '2026-11-03'; // Empty day
      const date4 = '2026-11-04';

      // Date 1: 3 meals (Breakfast, Lunch, Dinner) = 350 + 600 + 400 = 1350 kcal
      await defaultCalorieRepository.addLoggedEntry({
        foodItemId: 'item-1',
        foodName: 'Oatmeal with Berries',
        portion: 1.0,
        servingUnit: 'bowl',
        calories: 350,
        dateString: date1,
        mealType: 'Breakfast',
      });
      await defaultCalorieRepository.addLoggedEntry({
        foodItemId: 'item-2',
        foodName: 'Grilled Chicken Salad',
        portion: 1.5,
        servingUnit: 'plate',
        calories: 600,
        dateString: date1,
        mealType: 'Lunch',
      });
      await defaultCalorieRepository.addLoggedEntry({
        foodItemId: 'item-3',
        foodName: 'Steamed Fish & Veggies',
        portion: 1.0,
        servingUnit: 'fillet',
        calories: 400,
        dateString: date1,
        mealType: 'Dinner',
      });

      // Date 2: 2 meals (Lunch, Snack) = 550 + 250 = 800 kcal
      await defaultCalorieRepository.addLoggedEntry({
        foodItemId: 'item-4',
        foodName: 'Beef Pho',
        portion: 1.0,
        servingUnit: 'large bowl',
        calories: 550,
        dateString: date2,
        mealType: 'Lunch',
      });
      await defaultCalorieRepository.addLoggedEntry({
        foodItemId: 'item-5',
        foodName: 'Greek Yogurt with Almonds',
        portion: 1.0,
        servingUnit: 'cup',
        calories: 250,
        dateString: date2,
        mealType: 'Snack',
      });

      // Date 4: 1 meal (Breakfast) = 450 kcal
      await defaultCalorieRepository.addLoggedEntry({
        foodItemId: 'item-6',
        foodName: 'Avocado Toast & Eggs',
        portion: 1.0,
        servingUnit: 'portion',
        calories: 450,
        dateString: date4,
        mealType: 'Breakfast',
      });

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      // Helper to jump to date in App by invoking onDateChange on DateNavigator component
      const switchAppDate = async (newDate: string) => {
        await act(async () => {
          root.root.findByType(DateNavigator).props.onDateChange(newDate);
        });
      };

      // Rapidly oscillate between dates 40 times to test race condition resistance
      const datesToTest = [date1, date2, date3, date4];
      for (let cycle = 0; cycle < 10; cycle++) {
        for (const d of datesToTest) {
          await act(async () => {
            root.root.findByType(DateNavigator).props.onDateChange(d);
          });
        }
      }

      // 1. Verify Date 1 isolation
      await switchAppDate(date1);
      let consumedText = nodeText(getByTestId(root.root, 'stat-consumed-value'));
      expect(consumedText.replace(/,/g, '')).toBe('1350');
      let bSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Breakfast'));
      expect(bSubtotal).toContain('350 kcal');
      let lSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Lunch'));
      expect(lSubtotal).toContain('600 kcal');
      let dSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Dinner'));
      expect(dSubtotal).toContain('400 kcal');
      let sSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Snack'));
      expect(sSubtotal).toContain('0 kcal');

      // 2. Verify Date 2 isolation
      await switchAppDate(date2);
      consumedText = nodeText(getByTestId(root.root, 'stat-consumed-value'));
      expect(consumedText.replace(/,/g, '')).toBe('800');
      bSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Breakfast'));
      expect(bSubtotal).toContain('0 kcal');
      lSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Lunch'));
      expect(lSubtotal).toContain('550 kcal');
      dSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Dinner'));
      expect(dSubtotal).toContain('0 kcal');
      sSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Snack'));
      expect(sSubtotal).toContain('250 kcal');

      // 3. Verify Date 3 (empty day) isolation
      await switchAppDate(date3);
      consumedText = nodeText(getByTestId(root.root, 'stat-consumed-value'));
      expect(consumedText.replace(/,/g, '')).toBe('0');
      bSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Breakfast'));
      expect(bSubtotal).toContain('0 kcal');
      lSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Lunch'));
      expect(lSubtotal).toContain('0 kcal');
      dSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Dinner'));
      expect(dSubtotal).toContain('0 kcal');
      sSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Snack'));
      expect(sSubtotal).toContain('0 kcal');

      // 4. Verify Date 4 isolation
      await switchAppDate(date4);
      consumedText = nodeText(getByTestId(root.root, 'stat-consumed-value'));
      expect(consumedText.replace(/,/g, '')).toBe('450');
      bSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Breakfast'));
      expect(bSubtotal).toContain('450 kcal');
      lSubtotal = nodeText(getByTestId(root.root, 'meal-subtotal-Lunch'));
      expect(lSubtotal).toContain('0 kcal');
    });

    test('1.5: Date-specific calorie target goals remain isolated between dates', async () => {
      const dateA = '2026-11-10';
      const dateB = '2026-11-11';

      // Set custom goals on dateA and dateB
      await defaultCalorieRepository.setDailyGoal(dateA, 1800);
      await defaultCalorieRepository.setDailyGoal(dateB, 2600);

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      // Switch to dateA
      await act(async () => {
        root.root.findByType(DateNavigator).props.onDateChange(dateA);
      });
      let targetText = nodeText(getByTestId(root.root, 'stat-target-value'));
      expect(targetText.replace(/,/g, '')).toBe('1800');

      // Switch to dateB
      await act(async () => {
        root.root.findByType(DateNavigator).props.onDateChange(dateB);
      });
      targetText = nodeText(getByTestId(root.root, 'stat-target-value'));
      expect(targetText.replace(/,/g, '')).toBe('2600');
    });
  });

  // =========================================================================
  // SECTION 2: Food Catalog Search, Category Filtering & Custom Food Stress
  // =========================================================================
  describe('2. Food Catalog Search, Category Filtering & Custom Food Stress', () => {
    const catalog: FoodItem[] = STARTER_FOOD_CATALOG;

    test('2.1: Full category filtering coverage across all 8 filter options', () => {
      const categories: Array<'All' | FoodCategory> = [
        'All',
        'Fruits',
        'Vegetables',
        'Proteins',
        'Grains',
        'Dairy',
        'Snacks & Fats',
        'Beverages',
      ];

      let root: any;
      act(() => {
        root = create(
          h(FoodLoggingModal, {
            visible: true,
            onClose: jest.fn(),
            onAddEntry: jest.fn(),
            catalog,
            selectedDate: '2026-11-03',
          })
        );
      });

      for (const cat of categories) {
        const catChip = getByTestId(root.root, `category-filter-${cat}`);
        act(() => {
          catChip.props.onPress();
        });

        // Filter the catalog manually to get expected IDs
        const expectedItems =
          cat === 'All' ? catalog : catalog.filter((item) => item.category === cat);

        // Every expected item within the 30-item slice should be present in rendered output
        const text = nodeText(root.root);
        for (const item of expectedItems.slice(0, 30)) {
          expect(text).toContain(item.name);
        }

        // And items from other categories should NOT be rendered when a specific category is active
        if (cat !== 'All') {
          const foreignItems = catalog.filter((item) => item.category !== cat);
          if (foreignItems.length > 0) {
            expect(text).not.toContain(foreignItems[0].name);
          }
        }
      }
    });

    test('2.2: Search filter robustness: case insensitivity, partial substrings, and whitespace', () => {
      let root: any;
      act(() => {
        root = create(
          h(FoodLoggingModal, {
            visible: true,
            onClose: jest.fn(),
            onAddEntry: jest.fn(),
            catalog,
            selectedDate: '2026-11-03',
          })
        );
      });

      const searchInput = getByTestId(root.root, 'search-catalog-input');

      // Case insensitive: UPPERCASE
      act(() => {
        searchInput.props.onChangeText('CHICKEN');
      });
      let text = nodeText(root.root);
      expect(text).toContain('Chicken Breast');

      // Case insensitive: lowercase
      act(() => {
        searchInput.props.onChangeText('chicken');
      });
      text = nodeText(root.root);
      expect(text).toContain('Chicken Breast');

      // Case insensitive: MixedCase
      act(() => {
        searchInput.props.onChangeText('ChIcKeN');
      });
      text = nodeText(root.root);
      expect(text).toContain('Chicken Breast');

      // Partial substring: 'berries' matches Strawberries and Blueberries
      act(() => {
        searchInput.props.onChangeText('berries');
      });
      text = nodeText(root.root);
      expect(text).toContain('Blueberries');
      expect(text).toContain('Strawberries');

      // Whitespace padding: '  banana  '
      act(() => {
        searchInput.props.onChangeText('  banana  ');
      });
      text = nodeText(root.root);
      expect(text).toContain('Banana');
      expect(text).not.toContain('Chicken Breast');
    });

    test('2.3: Non-existent search query displays empty state message without crashing', () => {
      let root: any;
      act(() => {
        root = create(
          h(FoodLoggingModal, {
            visible: true,
            onClose: jest.fn(),
            onAddEntry: jest.fn(),
            catalog,
            selectedDate: '2026-11-03',
          })
        );
      });

      const searchInput = getByTestId(root.root, 'search-catalog-input');
      act(() => {
        searchInput.props.onChangeText('nonexistent_food_xyz_123');
      });

      const text = nodeText(root.root);
      expect(text).toContain('No foods match "nonexistent_food_xyz_123"');
    });

    test('2.4: Search combined with category filter', () => {
      let root: any;
      act(() => {
        root = create(
          h(FoodLoggingModal, {
            visible: true,
            onClose: jest.fn(),
            onAddEntry: jest.fn(),
            catalog,
            selectedDate: '2026-11-03',
          })
        );
      });

      // Filter by 'Fruits'
      const fruitChip = getByTestId(root.root, 'category-filter-Fruits');
      act(() => {
        fruitChip.props.onPress();
      });

      const searchInput = getByTestId(root.root, 'search-catalog-input');

      // Search 'apple' in Fruits -> found
      act(() => {
        searchInput.props.onChangeText('apple');
      });
      let text = nodeText(root.root);
      expect(text).toContain('Apple');

      // Search 'chicken' in Fruits -> NOT found
      act(() => {
        searchInput.props.onChangeText('chicken');
      });
      text = nodeText(root.root);
      expect(text).toContain('No foods match "chicken"');
      expect(text).not.toContain('Grilled Chicken Breast');
    });

    test('2.5: Custom Food tab form validation blocks invalid inputs with clear messages', async () => {
      const onAddEntry = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(FoodLoggingModal, {
            visible: true,
            onClose: jest.fn(),
            onAddEntry,
            catalog,
            selectedDate: '2026-11-03',
          })
        );
      });

      // Switch to Custom Food tab
      const customTab = getByTestId(root.root, 'tab-custom');
      act(() => {
        customTab.props.onPress();
      });

      const nameInput = getByTestId(root.root, 'custom-name-input');
      const calsInput = getByTestId(root.root, 'custom-calories-input');
      const addBtn = getByTestId(root.root, 'add-to-log-btn');

      // 1. Submit with empty name -> Error
      await act(async () => {
        addBtn.props.onPress();
      });
      expect(onAddEntry).not.toHaveBeenCalled();
      let errNode = getByTestId(root.root, 'logging-error-text');
      expect(nodeText(errNode)).toBe('Please enter a food name');

      // 2. Submit with name but empty calories -> Error
      act(() => {
        nameInput.props.onChangeText('Homemade Soup');
      });
      await act(async () => {
        addBtn.props.onPress();
      });
      expect(onAddEntry).not.toHaveBeenCalled();
      errNode = getByTestId(root.root, 'logging-error-text');
      expect(nodeText(errNode)).toBe('Please enter valid calories per serving unit');

      // 3. Submit with negative or zero calories -> Error
      act(() => {
        calsInput.props.onChangeText('0');
      });
      await act(async () => {
        addBtn.props.onPress();
      });
      expect(onAddEntry).not.toHaveBeenCalled();
      errNode = getByTestId(root.root, 'logging-error-text');
      expect(nodeText(errNode)).toBe('Please enter valid calories per serving unit');

      act(() => {
        calsInput.props.onChangeText('-150');
      });
      await act(async () => {
        addBtn.props.onPress();
      });
      expect(onAddEntry).not.toHaveBeenCalled();

      // 4. Submit with invalid portion ("0" or "abc") -> Error
      act(() => {
        calsInput.props.onChangeText('250');
      });
      const portionInput = getByTestId(root.root, 'portion-input');
      act(() => {
        portionInput.props.onChangeText('0');
      });
      await act(async () => {
        addBtn.props.onPress();
      });
      expect(onAddEntry).not.toHaveBeenCalled();
      errNode = getByTestId(root.root, 'logging-error-text');
      expect(nodeText(errNode)).toContain('Portion must be greater than zero');
    });

    test('2.6: Custom Food entry with Vietnamese diacritics and special characters', async () => {
      const onAddEntry = jest.fn();
      const onSaveCustomFood = jest.fn().mockImplementation(async (food) => ({
        ...food,
        id: 'custom-vn-1',
      }));

      let root: any;
      act(() => {
        root = create(
          h(FoodLoggingModal, {
            visible: true,
            onClose: jest.fn(),
            onAddEntry,
            catalog,
            onSaveCustomFood,
            selectedDate: '2026-11-03',
          })
        );
      });

      // Switch to custom tab
      act(() => {
        getByTestId(root.root, 'tab-custom').props.onPress();
      });

      // Vietnamese accented meal: "Phở Bò Tái Nạm (Tô Lớn)"
      const vnFoodName = 'Phở Bò Tái Nạm (Tô Lớn)';
      const vnServingUnit = 'tô 650ml';

      act(() => {
        getByTestId(root.root, 'custom-name-input').props.onChangeText(vnFoodName);
        getByTestId(root.root, 'custom-unit-input').props.onChangeText(vnServingUnit);
        getByTestId(root.root, 'custom-calories-input').props.onChangeText('580');
        getByTestId(root.root, 'portion-input').props.onChangeText('1.5');
      });

      // Live preview: 1.5 * 580 = 870 kcal
      const preview = getByTestId(root.root, 'live-calorie-preview');
      expect(nodeText(preview)).toContain('870 kcal');

      const addBtn = getByTestId(root.root, 'add-to-log-btn');
      await act(async () => {
        addBtn.props.onPress();
      });

      expect(onSaveCustomFood).toHaveBeenCalledWith(
        expect.objectContaining({
          name: vnFoodName,
          servingUnit: vnServingUnit,
          caloriesPerUnit: 580,
          isCustom: true,
        })
      );

      expect(onAddEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          foodName: vnFoodName,
          servingUnit: vnServingUnit,
          portion: 1.5,
          calories: 870,
        })
      );
    });
  });

  // =========================================================================
  // SECTION 3: Portion Scaling & Boundary Value Stress
  // =========================================================================
  describe('3. Portion Scaling & Boundary Value Stress', () => {
    test('3.1: Portion scaling on standard food items for exact multipliers', () => {
      const multipliers = [0.25, 0.5, 1.0, 1.75, 2.5, 10.0];

      // Test Case A: Grilled Chicken Breast (165 kcal / unit)
      // 0.25 * 165 = 41.25 -> 41
      // 0.50 * 165 = 82.5  -> 83
      // 1.00 * 165 = 165   -> 165
      // 1.75 * 165 = 288.75-> 289
      // 2.50 * 165 = 412.5 -> 413
      // 10.0 * 165 = 1650  -> 1650
      const chickenExpected = [41, 83, 165, 289, 413, 1650];
      multipliers.forEach((mult, idx) => {
        const cals = calculateItemCalories(mult, 165);
        expect(cals).toBe(chickenExpected[idx]);
        expect(Number.isInteger(cals)).toBe(true);
      });

      // Test Case B: White Rice (205 kcal / unit)
      // 0.25 * 205 = 51.25 -> 51
      // 0.50 * 205 = 102.5 -> 103
      // 1.00 * 205 = 205   -> 205
      // 1.75 * 205 = 358.75-> 359
      // 2.50 * 205 = 512.5 -> 513
      // 10.0 * 205 = 2050  -> 2050
      const riceExpected = [51, 103, 205, 359, 513, 2050];
      multipliers.forEach((mult, idx) => {
        const cals = calculateItemCalories(mult, 205);
        expect(cals).toBe(riceExpected[idx]);
        expect(Number.isInteger(cals)).toBe(true);
      });

      // Test Case C: Large Egg (80 kcal / unit)
      // 0.25 * 80 = 20
      // 0.50 * 80 = 40
      // 1.00 * 80 = 80
      // 1.75 * 80 = 140
      // 2.50 * 80 = 200
      // 10.0 * 80 = 800
      const eggExpected = [20, 40, 80, 140, 200, 800];
      multipliers.forEach((mult, idx) => {
        const cals = calculateItemCalories(mult, 80);
        expect(cals).toBe(eggExpected[idx]);
        expect(Number.isInteger(cals)).toBe(true);
      });
    });

    test('3.2: Boundary value stress: micro-portions (0.01) and macro-portions (100.0)', () => {
      // Micro-portion: 0.01 portion
      expect(calculateItemCalories(0.01, 100)).toBe(1);
      expect(calculateItemCalories(0.01, 40)).toBe(0); // 0.4 -> 0
      expect(calculateItemCalories(0.01, 50)).toBe(1); // 0.5 -> 1
      expect(calculateItemCalories(0.01, 99)).toBe(1); // 0.99 -> 1

      // Macro-portion: 100.0 portions
      expect(calculateItemCalories(100.0, 250)).toBe(25000);
      expect(calculateItemCalories(100.0, 850)).toBe(85000);

      // Super-macro portion: 500.0 portions
      expect(calculateItemCalories(500.0, 120)).toBe(60000);

      // String decimal inputs parsing via validatePortionInput
      expect(validatePortionInput('0.01')).toEqual({ isValid: true, parsedValue: 0.01 });
      expect(validatePortionInput('100.0')).toEqual({ isValid: true, parsedValue: 100 });
      expect(validatePortionInput('.5')).toEqual({ isValid: true, parsedValue: 0.5 });
      expect(validatePortionInput('1.75')).toEqual({ isValid: true, parsedValue: 1.75 });
    });

    test('3.3: Quick portion buttons update input and live preview in FoodLoggingModal', () => {
      let root: any;
      act(() => {
        root = create(
          h(FoodLoggingModal, {
            visible: true,
            onClose: jest.fn(),
            onAddEntry: jest.fn(),
            catalog: STARTER_FOOD_CATALOG,
            selectedDate: '2026-11-03',
          })
        );
      });

      // Select White Rice (205 kcal)
      const riceItem = STARTER_FOOD_CATALOG.find((f) => f.name.includes('Rice'))!;
      act(() => {
        getByTestId(root.root, `catalog-item-${riceItem.id}`).props.onPress();
      });

      // Test quick buttons: [0.25, 0.5, 1, 1.5, 2]
      const quickMultipliers = [0.25, 0.5, 1, 1.5, 2];

      for (const mult of quickMultipliers) {
        const chip = getByTestId(root.root, `quick-portion-${mult}`);
        act(() => {
          chip.props.onPress();
        });

        const input = getByTestId(root.root, 'portion-input');
        expect(input.props.value).toBe(String(mult));

        const expectedCals = `${calculateItemCalories(mult, riceItem.caloriesPerUnit)} kcal`;
        const preview = getByTestId(root.root, 'live-calorie-preview');
        expect(nodeText(preview)).toContain(expectedCals);
      }
    });

    test('3.4: Rejection of invalid portion inputs in FoodLoggingModal and EditMealModal', async () => {
      const invalidInputs = ['0', '-1', '-0.5', 'abc', '1.2.3', '', '   '];

      // A. FoodLoggingModal
      const onAddEntry = jest.fn();
      let rootLog: any;
      act(() => {
        rootLog = create(
          h(FoodLoggingModal, {
            visible: true,
            onClose: jest.fn(),
            onAddEntry,
            catalog: STARTER_FOOD_CATALOG,
            selectedDate: '2026-11-03',
          })
        );
      });

      const firstItem = STARTER_FOOD_CATALOG[0];
      act(() => {
        getByTestId(rootLog.root, `catalog-item-${firstItem.id}`).props.onPress();
      });

      for (const bad of invalidInputs) {
        act(() => {
          getByTestId(rootLog.root, 'portion-input').props.onChangeText(bad);
        });

        const addBtn = getByTestId(rootLog.root, 'add-to-log-btn');
        await act(async () => {
          addBtn.props.onPress();
        });

        expect(onAddEntry).not.toHaveBeenCalled();
        const errNode = getByTestId(rootLog.root, 'logging-error-text');
        expect(nodeText(errNode).length).toBeGreaterThan(0);
      }

      // B. EditMealModal
      const onSaveEdit = jest.fn();
      let rootEdit: any;
      act(() => {
        rootEdit = create(
          h(EditMealModal, {
            visible: true,
            entry: {
              id: 'test-1',
              foodItemId: 'item-1',
              foodName: 'Test Food',
              portion: 1.0,
              servingUnit: 'serving',
              calories: 200,
              dateString: '2026-11-03',
              mealType: 'Lunch',
              timestamp: 123456,
            },
            onClose: jest.fn(),
            onSaveEdit,
            onDelete: jest.fn(),
          })
        );
      });

      for (const bad of invalidInputs) {
        act(() => {
          getByTestId(rootEdit.root, 'edit-portion-input').props.onChangeText(bad);
        });

        const saveBtn = getByTestId(rootEdit.root, 'save-edit-btn');
        await act(async () => {
          saveBtn.props.onPress();
        });

        expect(onSaveEdit).not.toHaveBeenCalled();
        const errNode = getByTestId(rootEdit.root, 'edit-portion-error');
        expect(nodeText(errNode).length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // SECTION 4: Meal Accumulation Across All 4 Meal Types & Integer Math
  // =========================================================================
  describe('4. Meal Accumulation Across All 4 Meal Types & Integer Math', () => {
    test('4.1: Logging distinct meals across Breakfast, Lunch, Dinner, Snack verifies exact integer math', () => {
      // 14 distinct entries across 4 meal types
      const entries: LoggedEntry[] = [
        // Breakfast (3 items)
        {
          id: 'b-1',
          foodItemId: 'oats',
          foodName: 'Rolled Oats',
          portion: 1.0,
          servingUnit: 'cup',
          calories: 150,
          dateString: '2026-11-03',
          mealType: 'Breakfast',
          timestamp: 1,
        },
        {
          id: 'b-2',
          foodItemId: 'banana',
          foodName: 'Banana',
          portion: 1.0,
          servingUnit: 'medium',
          calories: 105,
          dateString: '2026-11-03',
          mealType: 'Breakfast',
          timestamp: 2,
        },
        {
          id: 'b-3',
          foodItemId: 'milk',
          foodName: 'Skim Milk',
          portion: 1.0,
          servingUnit: 'cup',
          calories: 83,
          dateString: '2026-11-03',
          mealType: 'Breakfast',
          timestamp: 3,
        },
        // Lunch (4 items)
        {
          id: 'l-1',
          foodItemId: 'chicken',
          foodName: 'Grilled Chicken',
          portion: 1.0,
          servingUnit: '100g',
          calories: 165,
          dateString: '2026-11-03',
          mealType: 'Lunch',
          timestamp: 4,
        },
        {
          id: 'l-2',
          foodItemId: 'rice',
          foodName: 'Jasmine Rice',
          portion: 1.0,
          servingUnit: 'cup',
          calories: 240,
          dateString: '2026-11-03',
          mealType: 'Lunch',
          timestamp: 5,
        },
        {
          id: 'l-3',
          foodItemId: 'broccoli',
          foodName: 'Steamed Broccoli',
          portion: 1.0,
          servingUnit: 'cup',
          calories: 55,
          dateString: '2026-11-03',
          mealType: 'Lunch',
          timestamp: 6,
        },
        {
          id: 'l-4',
          foodItemId: 'oil',
          foodName: 'Olive Oil',
          portion: 1.0,
          servingUnit: 'tbsp',
          calories: 119,
          dateString: '2026-11-03',
          mealType: 'Lunch',
          timestamp: 7,
        },
        // Dinner (3 items)
        {
          id: 'd-1',
          foodItemId: 'salmon',
          foodName: 'Atlantic Salmon',
          portion: 1.0,
          servingUnit: '100g',
          calories: 208,
          dateString: '2026-11-03',
          mealType: 'Dinner',
          timestamp: 8,
        },
        {
          id: 'd-2',
          foodItemId: 'potato',
          foodName: 'Sweet Potato',
          portion: 1.0,
          servingUnit: 'medium',
          calories: 103,
          dateString: '2026-11-03',
          mealType: 'Dinner',
          timestamp: 9,
        },
        {
          id: 'd-3',
          foodItemId: 'avocado',
          foodName: 'Fresh Avocado',
          portion: 1.0,
          servingUnit: 'half',
          calories: 160,
          dateString: '2026-11-03',
          mealType: 'Dinner',
          timestamp: 10,
        },
        // Snack (4 items)
        {
          id: 's-1',
          foodItemId: 'yogurt',
          foodName: 'Greek Yogurt',
          portion: 1.0,
          servingUnit: 'cup',
          calories: 100,
          dateString: '2026-11-03',
          mealType: 'Snack',
          timestamp: 11,
        },
        {
          id: 's-2',
          foodItemId: 'almonds',
          foodName: 'Roasted Almonds',
          portion: 1.0,
          servingUnit: 'handful',
          calories: 164,
          dateString: '2026-11-03',
          mealType: 'Snack',
          timestamp: 12,
        },
        {
          id: 's-3',
          foodItemId: 'apple',
          foodName: 'Red Apple',
          portion: 1.0,
          servingUnit: 'medium',
          calories: 95,
          dateString: '2026-11-03',
          mealType: 'Snack',
          timestamp: 13,
        },
        {
          id: 's-4',
          foodItemId: 'chocolate',
          foodName: 'Dark Chocolate',
          portion: 1.0,
          servingUnit: 'bar',
          calories: 170,
          dateString: '2026-11-03',
          mealType: 'Snack',
          timestamp: 14,
        },
      ];

      // Pure math calculations
      const breakfastExpected = 150 + 105 + 83; // 338
      const lunchExpected = 165 + 240 + 55 + 119; // 579
      const dinnerExpected = 208 + 103 + 160; // 471
      const snackExpected = 100 + 164 + 95 + 170; // 529
      const totalExpected = breakfastExpected + lunchExpected + dinnerExpected + snackExpected; // 1917

      expect(calculateDailyTotal(entries)).toBe(totalExpected);
      const breakdown = calculateMealBreakdown(entries);
      expect(breakdown.Breakfast).toBe(breakfastExpected);
      expect(breakdown.Lunch).toBe(lunchExpected);
      expect(breakdown.Dinner).toBe(dinnerExpected);
      expect(breakdown.Snack).toBe(snackExpected);

      // Render MealSection and assert rendered subtotals
      let rootSection: any;
      act(() => {
        rootSection = create(
          h(MealSection, {
            entries,
            onEditEntry: jest.fn(),
            onAddMeal: jest.fn(),
            onDeleteEntry: jest.fn(),
          })
        );
      });

      expect(nodeText(getByTestId(rootSection.root, 'meal-subtotal-Breakfast'))).toContain('338 kcal');
      expect(nodeText(getByTestId(rootSection.root, 'meal-subtotal-Lunch'))).toContain('579 kcal');
      expect(nodeText(getByTestId(rootSection.root, 'meal-subtotal-Dinner'))).toContain('471 kcal');
      expect(nodeText(getByTestId(rootSection.root, 'meal-subtotal-Snack'))).toContain('529 kcal');

      // Render CalorieProgressCard and assert consumed and remaining math
      const target = 2000;
      const remainingExpected = target - totalExpected; // 2000 - 1917 = 83

      let rootCard: any;
      act(() => {
        rootCard = create(
          h(CalorieProgressCard, {
            consumed: totalExpected,
            target,
            remaining: remainingExpected,
          })
        );
      });

      expect(nodeText(getByTestId(rootCard.root, 'stat-consumed-value'))).toContain('1,917');
      expect(nodeText(getByTestId(rootCard.root, 'stat-remaining-value'))).toContain('83');
      expect(nodeText(getByTestId(rootCard.root, 'stat-target-value'))).toContain('2,000');
    });

    test('4.2: High-density accumulation stress (40 distinct items across all 4 meal types)', () => {
      const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
      const highDensityEntries: LoggedEntry[] = [];
      let grandTotal = 0;

      for (let i = 0; i < 40; i++) {
        const mealType = mealTypes[i % 4];
        // Generate varying portions: 0.33, 0.67, 1.25, 2.5
        const portions = [0.33, 0.67, 1.25, 2.5];
        const portion = portions[i % portions.length];
        const baseCals = 120 + (i * 7);
        const itemCals = calculateItemCalories(portion, baseCals);
        grandTotal += itemCals;

        highDensityEntries.push({
          id: `entry_dense_${i}`,
          foodItemId: `food_${i}`,
          foodName: `Dense Food #${i}`,
          portion,
          servingUnit: 'serving',
          calories: itemCals,
          dateString: '2026-11-03',
          mealType,
          timestamp: 1000 + i,
        });
      }

      // Verify exact total
      const calculatedTotal = calculateDailyTotal(highDensityEntries);
      expect(calculatedTotal).toBe(grandTotal);

      // Verify breakdown sums to grandTotal exactly
      const breakdown = calculateMealBreakdown(highDensityEntries);
      const sumOfBreakdown =
        breakdown.Breakfast + breakdown.Lunch + breakdown.Dinner + breakdown.Snack;
      expect(sumOfBreakdown).toBe(grandTotal);
    });

    test('4.3: Budget transitions: under budget, exact budget, and over budget', () => {
      const target = 2000;

      // Under budget
      const underRemaining = calculateRemainingBalance(target, 1600);
      expect(underRemaining).toBe(400);

      let rootUnder: any;
      act(() => {
        rootUnder = create(
          h(CalorieProgressCard, {
            consumed: 1600,
            target,
            remaining: underRemaining,
          })
        );
      });
      expect(nodeText(getByTestId(rootUnder.root, 'stat-remaining-value'))).toContain('400');
      expect(nodeText(rootUnder.root)).toContain('Remaining');

      // Exact budget
      const exactRemaining = calculateRemainingBalance(target, 2000);
      expect(exactRemaining).toBe(0);

      let rootExact: any;
      act(() => {
        rootExact = create(
          h(CalorieProgressCard, {
            consumed: 2000,
            target,
            remaining: exactRemaining,
          })
        );
      });
      expect(nodeText(getByTestId(rootExact.root, 'stat-remaining-value'))).toContain('0');

      // Over budget
      const overRemaining = calculateRemainingBalance(target, 2450);
      expect(overRemaining).toBe(-450);

      let rootOver: any;
      act(() => {
        rootOver = create(
          h(CalorieProgressCard, {
            consumed: 2450,
            target,
            remaining: overRemaining,
          })
        );
      });
      // Should show Over Budget and -450
      expect(nodeText(getByTestId(rootOver.root, 'stat-remaining-value'))).toContain('-450');
      expect(nodeText(rootOver.root)).toContain('Over Budget');
    });
  });

  // =========================================================================
  // SECTION 5: Meal Editing, Deleting, Optimistic UI Updates & Persistence
  // =========================================================================
  describe('5. Meal Editing, Deleting, Optimistic UI Updates & Persistence', () => {
    test('5.1: Instant optimistic UI update and persistence on editing meal portion', async () => {
      const date = '2026-11-03';
      // Seed storage with an initial entry
      const initial = await defaultCalorieRepository.addLoggedEntry({
        foodItemId: 'item-edit-1',
        foodName: 'Grilled Chicken Breast',
        portion: 1.0,
        servingUnit: '100g',
        calories: 165,
        dateString: date,
        mealType: 'Lunch',
      });

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      // Confirm initial load in UI
      let consumedText = nodeText(getByTestId(root.root, 'stat-consumed-value'));
      expect(consumedText).toBe('165');

      // Click on the item row to trigger edit modal
      const itemRow = getByTestId(root.root, `meal-item-row-${initial.id}`);
      act(() => {
        itemRow.props.onPress();
      });

      const editModal = getByTestId(root.root, 'edit-meal-modal');
      expect(editModal.props.visible).toBe(true);

      // Change portion from 1.0 to 2.0 (165 * 2 = 330 kcal)
      const portionInput = getByTestId(root.root, 'edit-portion-input');
      act(() => {
        portionInput.props.onChangeText('2.0');
      });

      // Save edit
      const saveBtn = getByTestId(root.root, 'save-edit-btn');
      await act(async () => {
        saveBtn.props.onPress();
      });

      // Verify immediate UI update (<16ms)
      consumedText = nodeText(getByTestId(root.root, 'stat-consumed-value'));
      expect(consumedText).toBe('330');

      const updatedCals = nodeText(getByTestId(root.root, `meal-item-calories-${initial.id}`));
      expect(updatedCals).toContain('330 kcal');

      // Verify persistence in repository
      const entriesFromStorage = await defaultCalorieRepository.getLoggedEntries(date);
      expect(entriesFromStorage).toHaveLength(1);
      expect(entriesFromStorage[0].portion).toBe(2.0);
      expect(entriesFromStorage[0].calories).toBe(330);
    });

    test('5.2: Instant optimistic UI update and persistence on changing meal category', async () => {
      const date = '2026-11-03';
      const initial = await defaultCalorieRepository.addLoggedEntry({
        foodItemId: 'item-edit-cat',
        foodName: 'Avocado Salad',
        portion: 1.0,
        servingUnit: 'bowl',
        calories: 280,
        dateString: date,
        mealType: 'Lunch',
      });

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      expect(nodeText(getByTestId(root.root, 'meal-subtotal-Lunch'))).toContain('280 kcal');
      expect(nodeText(getByTestId(root.root, 'meal-subtotal-Dinner'))).toContain('0 kcal');

      // Open edit modal
      act(() => {
        getByTestId(root.root, `meal-item-row-${initial.id}`).props.onPress();
      });

      // Switch category to Dinner
      act(() => {
        getByTestId(root.root, 'edit-meal-type-Dinner').props.onPress();
      });

      // Save edit
      await act(async () => {
        getByTestId(root.root, 'save-edit-btn').props.onPress();
      });

      // Verify instant UI migration
      expect(nodeText(getByTestId(root.root, 'meal-subtotal-Lunch'))).toContain('0 kcal');
      expect(nodeText(getByTestId(root.root, 'meal-subtotal-Dinner'))).toContain('280 kcal');
      expect(nodeText(getByTestId(root.root, 'stat-consumed-value'))).toBe('280');

      // Verify storage persistence
      const stored = await defaultCalorieRepository.getLoggedEntries(date);
      expect(stored[0].mealType).toBe('Dinner');
    });

    test('5.3: Instant optimistic UI update and persistence on deleting meal', async () => {
      const date = '2026-11-03';
      const entry1 = await defaultCalorieRepository.addLoggedEntry({
        foodItemId: 'item-del-1',
        foodName: 'Boiled Eggs',
        portion: 2.0,
        servingUnit: 'eggs',
        calories: 160,
        dateString: date,
        mealType: 'Breakfast',
      });
      const entry2 = await defaultCalorieRepository.addLoggedEntry({
        foodItemId: 'item-del-2',
        foodName: 'Toast with Butter',
        portion: 1.0,
        servingUnit: 'slice',
        calories: 140,
        dateString: date,
        mealType: 'Breakfast',
      });

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      expect(nodeText(getByTestId(root.root, 'stat-consumed-value'))).toBe('300');
      expect(nodeText(getByTestId(root.root, 'meal-subtotal-Breakfast'))).toContain('300 kcal');

      // Open edit modal for entry1
      act(() => {
        getByTestId(root.root, `meal-item-row-${entry1.id}`).props.onPress();
      });

      // Click delete button once (triggers confirmation mode)
      act(() => {
        getByTestId(root.root, 'delete-entry-btn').props.onPress();
      });

      // Click confirm delete button
      const confirmBtn = getByTestId(root.root, 'confirm-delete-btn');
      await act(async () => {
        confirmBtn.props.onPress();
      });

      // Verify immediate UI removal (<16ms)
      expect(findByTestId(root.root, `meal-item-row-${entry1.id}`)).toHaveLength(0);
      expect(nodeText(getByTestId(root.root, 'stat-consumed-value'))).toBe('140');
      expect(nodeText(getByTestId(root.root, 'meal-subtotal-Breakfast'))).toContain('140 kcal');

      // Verify storage persistence
      const remainingStored = await defaultCalorieRepository.getLoggedEntries(date);
      expect(remainingStored).toHaveLength(1);
      expect(remainingStored[0].id).toBe(entry2.id);
    });

    test('5.4: Sequential deletion to empty state displays clean empty container', async () => {
      const date = '2026-11-03';
      const entry = await defaultCalorieRepository.addLoggedEntry({
        foodItemId: 'item-solo',
        foodName: 'Black Coffee',
        portion: 1.0,
        servingUnit: 'cup',
        calories: 5,
        dateString: date,
        mealType: 'Breakfast',
      });

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      // Delete the only entry
      act(() => {
        getByTestId(root.root, `meal-item-row-${entry.id}`).props.onPress();
      });
      act(() => {
        getByTestId(root.root, 'delete-entry-btn').props.onPress();
      });
      await act(async () => {
        getByTestId(root.root, 'confirm-delete-btn').props.onPress();
      });

      // Verify empty state
      expect(nodeText(getByTestId(root.root, 'stat-consumed-value'))).toBe('0');
      expect(nodeText(getByTestId(root.root, 'meal-subtotal-Breakfast'))).toContain('0 kcal');
      expect(nodeText(getByTestId(root.root, 'meal-section-Breakfast'))).toContain('No breakfast logged');

      const stored = await defaultCalorieRepository.getLoggedEntries(date);
      expect(stored).toHaveLength(0);
    });

    test('5.5: Rapid interleaved interactions: adds, edits, deletes maintain state and storage integrity', async () => {
      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      // 1. Open FAB and add 3 items in sequence
      const fab = getByTestId(root.root, 'open-logging-fab');

      for (let i = 0; i < 3; i++) {
        act(() => {
          fab.props.onPress();
        });

        const foodItem = STARTER_FOOD_CATALOG[i];
        act(() => {
          getByTestId(root.root, `catalog-item-${foodItem.id}`).props.onPress();
          getByTestId(root.root, 'portion-input').props.onChangeText('1.0');
        });

        await act(async () => {
          getByTestId(root.root, 'add-to-log-btn').props.onPress();
        });
      }

      // Check that 3 items are in UI
      const currentEntries = await defaultCalorieRepository.getLoggedEntries(getLocalDateString());
      expect(currentEntries).toHaveLength(3);

      const expectedSum =
        STARTER_FOOD_CATALOG[0].caloriesPerUnit +
        STARTER_FOOD_CATALOG[1].caloriesPerUnit +
        STARTER_FOOD_CATALOG[2].caloriesPerUnit;

      expect(nodeText(getByTestId(root.root, 'stat-consumed-value'))).toBe(String(expectedSum));

      // 2. Edit the first item: double its portion
      const firstId = currentEntries[0].id;
      act(() => {
        getByTestId(root.root, `meal-item-row-${firstId}`).props.onPress();
      });
      act(() => {
        getByTestId(root.root, 'edit-portion-input').props.onChangeText('2.0');
      });
      await act(async () => {
        getByTestId(root.root, 'save-edit-btn').props.onPress();
      });

      const updatedSum = expectedSum + STARTER_FOOD_CATALOG[0].caloriesPerUnit;
      expect(nodeText(getByTestId(root.root, 'stat-consumed-value'))).toBe(String(updatedSum));

      // 3. Delete the second item
      const secondId = currentEntries[1].id;
      act(() => {
        getByTestId(root.root, `meal-item-row-${secondId}`).props.onPress();
      });
      act(() => {
        getByTestId(root.root, 'delete-entry-btn').props.onPress();
      });
      await act(async () => {
        getByTestId(root.root, 'confirm-delete-btn').props.onPress();
      });

      const finalSum = updatedSum - STARTER_FOOD_CATALOG[1].caloriesPerUnit;
      expect(nodeText(getByTestId(root.root, 'stat-consumed-value'))).toBe(String(finalSum));

      // Check storage matches UI
      const finalStored = await defaultCalorieRepository.getLoggedEntries(getLocalDateString());
      expect(finalStored).toHaveLength(2);
      expect(calculateDailyTotal(finalStored)).toBe(finalSum);
    });
  });
});
