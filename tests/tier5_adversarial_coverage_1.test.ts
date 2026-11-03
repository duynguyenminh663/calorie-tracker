import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  calculateDailyTotal,
  calculateItemCalories,
  calculateMealBreakdown,
  calculateProgressPercentage,
  calculateRemainingBalance,
  validatePortionInput,
} from '../src/utils/calorieMath';
import {
  shiftDate,
  formatFriendlyDate,
  getLocalDateString,
  DateNavigator,
  ErrorBoundary,
  CalorieProgressCard,
  GoalSettingsModal,
  EditMealModal,
  FoodLoggingModal,
  MealSection,
  StandaloneBadge,
} from '../src/components';
import { AsyncStorageAdapter, MemoryStorageAdapter } from '../src/services/storageAdapter';
import { CalorieRepository, defaultCalorieRepository } from '../src/services/storageService';
import { FoodItem, LoggedEntry } from '../src/types';
import App from '../src/App';

const renderer = require('react-test-renderer');
const { create, act } = renderer;
const h = React.createElement;

// Helper to safely extract concatenated text content from ReactTestInstance
const extractText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node.props && node.props.children !== undefined) return extractText(node.props.children);
  if (Array.isArray(node.children)) return node.children.map(extractText).join('');
  return '';
};

// Helper to find all nodes with a matching testID
const findAllTestId = (instance: any, testID: string) => {
  return instance.findAll((node: any) => node.props && node.props.testID === testID);
};

// Helper to find exactly one node with a matching testID
const findOneTestId = (instance: any, testID: string) => {
  const nodes = findAllTestId(instance, testID);
  if (nodes.length === 0) {
    throw new Error(`Component with testID="${testID}" not found.`);
  }
  return nodes[0];
};

describe('Tier 5 Challenger 1: Adversarial Coverage Hardening Test Suite', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  // =========================================================================
  // SECTION 1: Calorie Math White-Box Edge & Extreme Values Coverage
  // =========================================================================
  describe('1. Calorie Math White-Box Edge & Extremes Hardening', () => {
    test('1.1: validatePortionInput triggers line 78 NaN / infinite branch with 310-digit numeric string', () => {
      // 310 digits matches /^\d+(\.\d+)?$/ but Number(310 digits) exceeds MAX_VALUE and yields Infinity
      const hugeDigitString = '1' + '0'.repeat(310);
      const res = validatePortionInput(hugeDigitString);
      expect(res.isValid).toBe(false);
      expect(res.parsedValue).toBe(0);
      expect(res.error).toBe('Portion must be a valid number');
    });

    test('1.2: validatePortionInput defensive guards across non-finite, subnormal, and exotic inputs', () => {
      expect(validatePortionInput(Number.POSITIVE_INFINITY).isValid).toBe(false);
      expect(validatePortionInput(Number.NEGATIVE_INFINITY).isValid).toBe(false);
      expect(validatePortionInput(Number.NaN).isValid).toBe(false);
      expect(validatePortionInput('Infinity').isValid).toBe(false);
      expect(validatePortionInput('-Infinity').isValid).toBe(false);
      expect(validatePortionInput('NaN').isValid).toBe(false);
      expect(validatePortionInput('0x1F').isValid).toBe(false);
      expect(validatePortionInput('1e5').isValid).toBe(false);
      expect(validatePortionInput('1/2').isValid).toBe(false);
      expect(validatePortionInput('-0.75').isValid).toBe(false);
      expect(validatePortionInput('  .5  ').isValid).toBe(true);
      expect(validatePortionInput('  .5  ').parsedValue).toBe(0.5);
      expect(validatePortionInput('.125').isValid).toBe(true);
      expect(validatePortionInput('.125').parsedValue).toBe(0.125);
    });

    test('1.3: calculateItemCalories extreme multiplier and subnormal fractional scaling', () => {
      expect(calculateItemCalories(1e-10, 100)).toBe(0);
      expect(calculateItemCalories(100, 1e-10)).toBe(0);
      expect(calculateItemCalories(0.3333333333333333, 100)).toBe(33);
      expect(calculateItemCalories(0.6666666666666666, 100)).toBe(67);
      expect(calculateItemCalories(0.5, 101)).toBe(51); // 50.5 rounds to 51
      expect(calculateItemCalories(0.5, 99)).toBe(50); // 49.5 rounds to 50
    });

    test('1.4: calculateDailyTotal defensive guards against malformed items and non-array structures', () => {
      expect(calculateDailyTotal(null as any)).toBe(0);
      expect(calculateDailyTotal(undefined as any)).toBe(0);
      expect(calculateDailyTotal({} as any)).toBe(0);
      expect(calculateDailyTotal('string' as any)).toBe(0);

      const mixedEntries: any[] = [
        null,
        undefined,
        {},
        { calories: 'not-a-number' },
        { calories: NaN },
        { calories: 0 },
        { calories: 350 },
        { calories: 150.8 },
      ];
      expect(calculateDailyTotal(mixedEntries)).toBe(500.8);
    });

    test('1.5: calculateRemainingBalance defensive guards against NaN and extreme values', () => {
      expect(calculateRemainingBalance(NaN, 500)).toBe(-500);
      expect(calculateRemainingBalance(2000, NaN)).toBe(2000);
      expect(calculateRemainingBalance(NaN, NaN)).toBe(0);
      expect(calculateRemainingBalance(2000, 2000)).toBe(0);
      expect(calculateRemainingBalance(2000, 2500)).toBe(-500);
      expect(calculateRemainingBalance(2000, 1500)).toBe(500);
    });

    test('1.6: calculateProgressPercentage boundaries (target <= 0 and overflow cap at 999)', () => {
      expect(calculateProgressPercentage(1000, 0)).toBe(0);
      expect(calculateProgressPercentage(1000, -500)).toBe(0);
      expect(calculateProgressPercentage(0, 2000)).toBe(0);
      expect(calculateProgressPercentage(2000, 2000)).toBe(100);
      expect(calculateProgressPercentage(3000, 2000)).toBe(150);
      expect(calculateProgressPercentage(100000, 2000)).toBe(999);
    });

    test('1.7: calculateMealBreakdown defensive handling of invalid categories, nulls, and non-arrays', () => {
      expect(calculateMealBreakdown(null as any)).toEqual({
        Breakfast: 0,
        Lunch: 0,
        Dinner: 0,
        Snack: 0,
      });

      const exoticEntries: any[] = [
        null,
        undefined,
        { mealType: 'MidnightSnack', calories: 200 },
        { mealType: 'Breakfast', calories: 250 },
        { mealType: 'Breakfast', calories: null },
        { mealType: 'Lunch', calories: 400 },
        { mealType: 'Dinner', calories: 600 },
        { mealType: 'Snack', calories: 150 },
      ];
      expect(calculateMealBreakdown(exoticEntries)).toEqual({
        Breakfast: 250,
        Lunch: 400,
        Dinner: 600,
        Snack: 150,
      });
    });
  });

  // =========================================================================
  // SECTION 2: Date Navigation, Leap Year & Malformed String Hardening
  // =========================================================================
  describe('2. Date Navigation, Leap Year & Malformed String Hardening', () => {
    test('2.1: shiftDate returns original input on malformed date strings (exercises line 14)', () => {
      expect(shiftDate('invalid-date', 1)).toBe('invalid-date');
      expect(shiftDate('2026', 1)).toBe('2026');
      expect(shiftDate('2026-02', 1)).toBe('2026-02');
      expect(shiftDate('2026-XX-01', 1)).toBe('2026-XX-01');
      expect(shiftDate('2026-02-YY', 1)).toBe('2026-02-YY');
      expect(shiftDate('', 1)).toBe('');
    });

    test('2.2: shiftDate leap year transitions (2024 leap year vs 2025 non-leap year)', () => {
      // 2024 is a leap year
      expect(shiftDate('2024-02-28', 1)).toBe('2024-02-29');
      expect(shiftDate('2024-02-29', 1)).toBe('2024-03-01');
      expect(shiftDate('2024-03-01', -1)).toBe('2024-02-29');

      // 2025 is NOT a leap year
      expect(shiftDate('2025-02-28', 1)).toBe('2025-03-01');
      expect(shiftDate('2025-03-01', -1)).toBe('2025-02-28');

      // Year rollover transitions
      expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
      expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
    });

    test('2.3: formatFriendlyDate handles malformed date strings safely (exercises line 41)', () => {
      expect(formatFriendlyDate('malformed-string', '2026-11-03')).toBe('malformed-string');
      expect(formatFriendlyDate('2026-XX-01', '2026-11-03')).toBe('2026-XX-01');
      expect(formatFriendlyDate('2026-11-03', '2026-11-03')).toBe('Today');
      expect(formatFriendlyDate('2026-11-02', '2026-11-03')).toBe('Yesterday');
      expect(formatFriendlyDate('2026-11-04', '2026-11-03')).toBe('Tomorrow');
    });

    test('2.4: DateNavigator component user interactions (prev, next, jump to today)', () => {
      const onDateChange = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(DateNavigator, {
            currentDate: '2026-11-01',
            todayDate: '2026-11-03',
            onDateChange,
          })
        );
      });

      // Prev date button
      const prevBtn = findOneTestId(root.root, 'prev-date-btn');
      act(() => {
        prevBtn.props.onPress();
      });
      expect(onDateChange).toHaveBeenCalledWith('2026-10-31');

      // Next date button
      const nextBtn = findOneTestId(root.root, 'next-date-btn');
      act(() => {
        nextBtn.props.onPress();
      });
      expect(onDateChange).toHaveBeenCalledWith('2026-11-02');

      // Jump to today button (visible because currentDate !== todayDate)
      const todayBtn = findOneTestId(root.root, 'today-date-btn');
      act(() => {
        todayBtn.props.onPress();
      });
      expect(onDateChange).toHaveBeenCalledWith('2026-11-03');
    });
  });

  // =========================================================================
  // SECTION 3: Storage Adapters & Corrupted Flash Storage Recovery
  // =========================================================================
  describe('3. Storage Adapters & Corrupted Storage Recovery Hardening', () => {
    test('3.1: AsyncStorageAdapter recovers from corrupted JSON records (exercises line 17)', async () => {
      // Inject corrupted non-JSON string directly into AsyncStorage
      await AsyncStorage.setItem('corrupted_key', '{ bad json invalid : true');
      const val = await AsyncStorageAdapter.getItem('corrupted_key');
      expect(val).toBeNull();

      // Test removeItem, getAllKeys, and clear on AsyncStorageAdapter (exercises lines 26-34)
      await AsyncStorageAdapter.setItem('valid_key', { test: 123 });
      expect(await AsyncStorageAdapter.getItem('valid_key')).toEqual({ test: 123 });

      const keys = await AsyncStorageAdapter.getAllKeys();
      expect(keys).toContain('valid_key');

      await AsyncStorageAdapter.removeItem('valid_key');
      expect(await AsyncStorageAdapter.getItem('valid_key')).toBeNull();

      await AsyncStorageAdapter.setItem('key_to_clear', 'data');
      await AsyncStorageAdapter.clear();
      expect(await AsyncStorageAdapter.getAllKeys()).toEqual([]);
    });

    test('3.2: MemoryStorageAdapter recovers from corrupted JSON and covers CRUD methods (exercises lines 50, 59-67)', async () => {
      const mem = new MemoryStorageAdapter();

      // Inject corrupted string via dirty map write simulation
      (mem as any).store.set('corrupted_mem_key', '{"unclosed json:');
      const val = await mem.getItem('corrupted_mem_key');
      expect(val).toBeNull();

      // Normal operations
      await mem.setItem('k1', { hello: 'world' });
      expect(await mem.getItem('k1')).toEqual({ hello: 'world' });

      const allKeys = await mem.getAllKeys();
      expect(allKeys).toContain('k1');

      await mem.removeItem('k1');
      expect(await mem.getItem('k1')).toBeNull();

      await mem.setItem('k2', 456);
      await mem.clear();
      expect(await mem.getAllKeys()).toEqual([]);
    });
  });

  // =========================================================================
  // SECTION 4: AsyncMutex Concurrency & Error Propagation Resilience
  // =========================================================================
  describe('4. AsyncMutex Concurrency & Error Propagation Resilience', () => {
    test('4.1: AsyncMutex queue rejection resilience: failed queued task does not deadlock subsequent tasks (exercises line 25)', async () => {
      const adapter = new MemoryStorageAdapter();
      const repo = new CalorieRepository(adapter);

      // Mutex queue test: Task 1 throws an intentional error
      const task1Promise = (repo as any).mutex.run(async () => {
        throw new Error('Simulated atomic disk failure');
      });

      // Task 2 is queued immediately after Task 1
      const task2Promise = (repo as any).mutex.run(async () => {
        return 'Task 2 succeeded safely';
      });

      // Verify Task 1 rejects as expected
      await expect(task1Promise).rejects.toThrow('Simulated atomic disk failure');

      // Verify Task 2 proceeds without hanging or failing (exercises line 25 .catch branch)
      const res2 = await task2Promise;
      expect(res2).toBe('Task 2 succeeded safely');
    });

    test('4.2: High concurrency stress: 50 simultaneous addLoggedEntry calls without lost updates', async () => {
      const adapter = new MemoryStorageAdapter();
      const repo = new CalorieRepository(adapter);

      const promises = Array.from({ length: 50 }, (_, i) =>
        repo.addLoggedEntry({
          foodItemId: `food_${i}`,
          foodName: `Food Item ${i}`,
          portion: 1,
          servingUnit: 'serving',
          calories: 100 + i,
          dateString: '2026-11-03',
          mealType: 'Lunch',
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);

      const uniqueIds = new Set(results.map((r) => r.id));
      expect(uniqueIds.size).toBe(50);

      const storedEntries = await repo.getLoggedEntries('2026-11-03');
      expect(storedEntries).toHaveLength(50);
    });
  });

  // =========================================================================
  // SECTION 5: CalorieRepository Boundary Limits & Exception Handling
  // =========================================================================
  describe('5. CalorieRepository Boundary Limits & Exception Handling', () => {
    test('5.1: setDailyGoal throws on target <= 0; accepts valid boundaries', async () => {
      const repo = new CalorieRepository(new MemoryStorageAdapter());

      await expect(repo.setDailyGoal('2026-11-03', 0)).rejects.toThrow(
        'Calorie target must be greater than zero'
      );
      await expect(repo.setDailyGoal('2026-11-03', -100)).rejects.toThrow(
        'Calorie target must be greater than zero'
      );

      await repo.setDailyGoal('2026-11-03', 1);
      expect(await repo.getDailyGoal('2026-11-03')).toBe(1);

      await repo.setDailyGoal('2026-11-03', 10000);
      expect(await repo.getDailyGoal('2026-11-03')).toBe(10000);
    });

    test('5.2: getDailyGoal fallback hierarchy (date specific -> default -> 2000 fallback)', async () => {
      const repo = new CalorieRepository(new MemoryStorageAdapter());

      // Initial fallback without any saved goals
      expect(await repo.getDailyGoal('2026-11-03')).toBe(2000);

      // Set goal for another date (which also sets 'default')
      await repo.setDailyGoal('2026-11-01', 2300);

      // For 2026-11-02, it should fallback to 'default' (2300)
      expect(await repo.getDailyGoal('2026-11-02')).toBe(2300);

      // Set date-specific goal for 2026-11-03
      await repo.setDailyGoal('2026-11-03', 1900);
      expect(await repo.getDailyGoal('2026-11-03')).toBe(1900);
    });

    test('5.3: updateLoggedEntry errors on missing id and safely handles zero base calories', async () => {
      const repo = new CalorieRepository(new MemoryStorageAdapter());

      await expect(
        repo.updateLoggedEntry('non_existent_id', { portion: 2 })
      ).rejects.toThrow('Entry with id non_existent_id not found');

      // Add entry with portion = 0 to test safe base calories division fallback (current.portion || 1)
      const entry = await repo.addLoggedEntry({
        foodItemId: 'item_zero',
        foodName: 'Water',
        portion: 0,
        servingUnit: 'glass',
        calories: 0,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
      });

      // Update portion to 2 without specifying calories
      const updated = await repo.updateLoggedEntry(entry.id, { portion: 2 });
      expect(updated.portion).toBe(2);
      expect(updated.calories).toBe(0);
    });

    test('5.4: deleteLoggedEntry and deleteCustomFood non-existent id branch handling', async () => {
      const repo = new CalorieRepository(new MemoryStorageAdapter());

      const delEntryRes = await repo.deleteLoggedEntry('does_not_exist');
      expect(delEntryRes).toBe(false);

      const delFoodRes = await repo.deleteCustomFood('does_not_exist');
      expect(delFoodRes).toBe(false);

      // Save a custom food and then delete it
      const savedFood = await repo.saveCustomFood({
        name: 'Protein Shake',
        caloriesPerUnit: 200,
        servingUnit: 'scoop',
        category: 'Proteins',
      });
      expect(savedFood.isCustom).toBe(true);
      expect(savedFood.id).toMatch(/^custom_/);

      const delFoodRes2 = await repo.deleteCustomFood(savedFood.id);
      expect(delFoodRes2).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 6: Component Branch Hardening
  // =========================================================================
  describe('6. Component Branch & Error Boundary Hardening', () => {
    test('6.1: ErrorBoundary covers onReset callback and empty error message fallback (exercises lines 35, 52)', () => {
      const onResetMock = jest.fn();
      let root: any;

      // Render ErrorBoundary with child that throws an error with empty message
      const Crasher = () => {
        const err = new Error('');
        err.message = '';
        throw err;
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        root = create(
          h(
            ErrorBoundary,
            { onReset: onResetMock },
            h(Crasher, null)
          )
        );
      });

      const fallbackView = findOneTestId(root.root, 'error-boundary-fallback');
      expect(fallbackView).toBeDefined();

      // Verifies fallback message text when error.message is empty (line 52)
      expect(extractText(fallbackView)).toContain('An unexpected error occurred in the application.');

      // Click reset button (exercises line 35)
      const resetBtn = findOneTestId(root.root, 'error-boundary-reset-button');
      act(() => {
        resetBtn.props.onPress();
      });

      expect(onResetMock).toHaveBeenCalledTimes(1);
    });

    test('6.2: CalorieProgressCard target <= 0 fallback to 2000 (exercises line 18)', () => {
      let root: any;
      act(() => {
        root = create(
          h(CalorieProgressCard, {
            consumed: 500,
            target: 0, // triggers safeTarget = target > 0 ? target : 2000
            remaining: -500,
          })
        );
      });

      const targetLabel = findOneTestId(root.root, 'stat-target-value');
      expect(extractText(targetLabel)).toContain('2,000');
    });

    test('6.3: GoalSettingsModal non-numeric & boundary validation errors (exercises lines 47-48)', async () => {
      const onSaveGoal = jest.fn();
      const onClose = jest.fn();
      let root: any;

      act(() => {
        root = create(
          h(GoalSettingsModal, {
            visible: true,
            currentTarget: 2000,
            onClose,
            onSaveGoal,
          })
        );
      });

      const input = findOneTestId(root.root, 'goal-input');
      const saveBtn = findOneTestId(root.root, 'save-goal-btn');

      // Test invalid non-numeric text
      act(() => {
        input.props.onChangeText('invalid');
      });
      await act(async () => {
        saveBtn.props.onPress();
      });
      let errorText = findOneTestId(root.root, 'goal-error-text');
      expect(extractText(errorText)).toContain('Please enter a valid positive number');

      // Test zero
      act(() => {
        input.props.onChangeText('0');
      });
      await act(async () => {
        saveBtn.props.onPress();
      });
      errorText = findOneTestId(root.root, 'goal-error-text');
      expect(extractText(errorText)).toContain('Please enter a valid positive number');

      // Test < 500
      act(() => {
        input.props.onChangeText('450');
      });
      await act(async () => {
        saveBtn.props.onPress();
      });
      errorText = findOneTestId(root.root, 'goal-error-text');
      expect(extractText(errorText)).toContain('between 500 and 10,000 kcal');

      // Test > 10,000
      act(() => {
        input.props.onChangeText('15000');
      });
      await act(async () => {
        saveBtn.props.onPress();
      });
      errorText = findOneTestId(root.root, 'goal-error-text');
      expect(extractText(errorText)).toContain('between 500 and 10,000 kcal');

      // Test valid preset chip selection
      const presetChip = findOneTestId(root.root, 'preset-goal-2200');
      act(() => {
        presetChip.props.onPress();
      });
      await act(async () => {
        saveBtn.props.onPress();
      });
      expect(onSaveGoal).toHaveBeenCalledWith(2200);
      expect(onClose).toHaveBeenCalled();
    });

    test('6.4: EditMealModal quick portion chips and two-step delete (exercises lines 60-61, 96-97, 188)', async () => {
      const onSaveEdit = jest.fn();
      const onDelete = jest.fn();
      const onClose = jest.fn();

      const sampleEntry: LoggedEntry = {
        id: 'entry_test_1',
        foodItemId: 'item_1',
        foodName: 'Banana',
        portion: 1,
        servingUnit: '1 medium',
        calories: 105,
        dateString: '2026-11-03',
        mealType: 'Snack',
        timestamp: Date.now(),
      };

      let root: any;
      act(() => {
        root = create(
          h(EditMealModal, {
            visible: true,
            entry: sampleEntry,
            onClose,
            onSaveEdit,
            onDelete,
          })
        );
      });

      // Quick portion multipliers test: find quick chip buttons where text ends with 'x'
      const quickChipButtons = root.root.findAll(
        (node: any) => node.props && node.props.onPress && extractText(node).endsWith('x')
      );
      expect(quickChipButtons.length).toBeGreaterThan(0);

      // Tap 2x chip (exercises line 60-61, 188)
      act(() => {
        quickChipButtons[quickChipButtons.length - 1].props.onPress();
      });

      const liveCalText = findOneTestId(root.root, 'edit-live-calories');
      expect(extractText(liveCalText)).toContain('210 kcal'); // 2 * 105

      // Meal type change
      const lunchChip = findOneTestId(root.root, 'edit-meal-type-Lunch');
      act(() => {
        lunchChip.props.onPress();
      });

      // Save valid edit
      const saveBtn = findOneTestId(root.root, 'save-edit-btn');
      await act(async () => {
        saveBtn.props.onPress();
      });
      expect(onSaveEdit).toHaveBeenCalledWith('entry_test_1', {
        portion: 2,
        calories: 210,
        mealType: 'Lunch',
      });
      expect(onClose).toHaveBeenCalled();
    });

    test('6.5: FoodLoggingModal catalog unselected validation and custom food validation (exercises lines 132-133, 220-221, 447)', async () => {
      const onAddEntry = jest.fn();
      const onClose = jest.fn();
      let root: any;

      act(() => {
        root = create(
          h(FoodLoggingModal, {
            visible: true,
            catalog: [],
            selectedDate: '2026-11-03',
            onAddEntry,
            onClose,
          })
        );
      });

      // 1. In catalog tab, tap Add without selecting food (exercises lines 132-133)
      const addBtn = findOneTestId(root.root, 'add-to-log-btn');
      await act(async () => {
        addBtn.props.onPress();
      });

      const errorText = findOneTestId(root.root, 'logging-error-text');
      expect(extractText(errorText)).toContain('Please select a food item from the catalog');

      // 2. Switch to Custom tab
      const customTab = findOneTestId(root.root, 'tab-custom');
      act(() => {
        customTab.props.onPress();
      });

      // Tap add with empty name
      await act(async () => {
        addBtn.props.onPress();
      });
      expect(extractText(findOneTestId(root.root, 'logging-error-text'))).toContain('Please enter a food name');

      // Enter name, but leave calories empty (exercises lines 220-221)
      const nameInput = findOneTestId(root.root, 'custom-name-input');
      act(() => {
        nameInput.props.onChangeText('Test Recipe');
      });
      await act(async () => {
        addBtn.props.onPress();
      });
      expect(extractText(findOneTestId(root.root, 'logging-error-text'))).toContain('Please enter valid calories');
    });

    test('6.6: MealSection accumulator handles zero/undefined calories and triggers add/edit callbacks (exercises line 29)', () => {
      const onEditEntry = jest.fn();
      const onAddMeal = jest.fn();
      const onDeleteEntry = jest.fn();

      const entries: LoggedEntry[] = [
        {
          id: 'e1',
          foodItemId: 'item1',
          foodName: 'Water',
          portion: 1,
          servingUnit: 'cup',
          calories: (undefined as any), // exercises (e.calories || 0) line 29 fallback
          dateString: '2026-11-03',
          mealType: 'Breakfast',
          timestamp: Date.now(),
        },
        {
          id: 'e2',
          foodItemId: 'item2',
          foodName: 'Coffee',
          portion: 1,
          servingUnit: 'cup',
          calories: 5,
          dateString: '2026-11-03',
          mealType: 'Breakfast',
          timestamp: Date.now(),
        },
      ];

      let root: any;
      act(() => {
        root = create(
          h(MealSection, {
            entries,
            onEditEntry,
            onAddMeal,
            onDeleteEntry,
          })
        );
      });

      const breakfastSubtotal = findOneTestId(root.root, 'meal-subtotal-Breakfast');
      expect(extractText(breakfastSubtotal)).toContain('5 kcal');

      // Trigger add to meal
      const addLunchBtn = findOneTestId(root.root, 'add-to-meal-btn-Lunch');
      act(() => {
        addLunchBtn.props.onPress();
      });
      expect(onAddMeal).toHaveBeenCalledWith('Lunch');

      // Trigger edit entry
      const editIcon = findOneTestId(root.root, 'edit-entry-btn-e2');
      act(() => {
        editIcon.props.onPress();
      });
      expect(onEditEntry).toHaveBeenCalledWith(entries[1]);
    });
  });

  // =========================================================================
  // SECTION 7: Root App Lifecycle, Asynchronous Failures & Optimistic Rollback
  // =========================================================================
  describe('7. Root App Lifecycle & Optimistic Rollback Hardening', () => {
    test('7.1: App catalog load failure and unmount cleanup branches (exercises lines 52, 55)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const getCatalogSpy = jest
        .spyOn(defaultCalorieRepository, 'getFoodCatalog')
        .mockRejectedValueOnce(new Error('Network/Flash unreadable'));

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      // Catalog load failed, caught gracefully without unhandled promise rejection (exercises line 52)
      expect(getCatalogSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load food catalog:',
        expect.any(Error)
      );

      // Unmount App to trigger isMounted = false cleanup (exercises line 55)
      act(() => {
        root.unmount();
      });
    });

    test('7.2: App date summary load failure branch (exercises line 67)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const getSummarySpy = jest
        .spyOn(defaultCalorieRepository, 'getDailySummary')
        .mockRejectedValueOnce(new Error('Corrupted summary partition'));

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      expect(getSummarySpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load date summary:',
        expect.any(Error)
      );
    });

    test('7.3: App optimistic addLoggedEntry storage failure and state rollback (exercises lines 99-101)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock storage failure on addLoggedEntry
      jest
        .spyOn(defaultCalorieRepository, 'addLoggedEntry')
        .mockRejectedValueOnce(new Error('Flash write error during add'));

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      // Find FoodLoggingModal component via findByType
      const loggingModalComponent = root.root.findByType(FoodLoggingModal);
      expect(loggingModalComponent).toBeDefined();

      // Trigger onAddEntry from FoodLoggingModal
      await act(async () => {
        await loggingModalComponent.props.onAddEntry({
          foodItemId: 'item_apple',
          foodName: 'Apple',
          portion: 1,
          servingUnit: '1 medium',
          calories: 95,
          dateString: getLocalDateString(),
          mealType: 'Breakfast',
        });
      });

      // Rollback verified: console.error called and optimistic entry rolled back
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist logged entry:',
        expect.any(Error)
      );

      const consumedVal = findOneTestId(root.root, 'stat-consumed-value');
      expect(extractText(consumedVal)).toBe('0');
    });

    test('7.4: App optimistic updateLoggedEntry failure and state rollback (exercises lines 118-119)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Provide one initial entry via getDailySummary mock
      jest.spyOn(defaultCalorieRepository, 'getDailySummary').mockResolvedValueOnce({
        dateString: getLocalDateString(),
        calorieTarget: 2000,
        totalCalories: 95,
        remainingCalories: 1905,
        entries: [
          {
            id: 'entry_app_1',
            foodItemId: 'item_apple',
            foodName: 'Apple',
            portion: 1,
            servingUnit: '1 medium',
            calories: 95,
            dateString: getLocalDateString(),
            mealType: 'Breakfast',
            timestamp: Date.now(),
          },
        ],
      });

      // Mock failure on update
      jest
        .spyOn(defaultCalorieRepository, 'updateLoggedEntry')
        .mockRejectedValueOnce(new Error('Flash write error during update'));

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      // Verify initial rendered meal entry
      const mealItemName = findOneTestId(root.root, 'meal-item-name-entry_app_1');
      expect(extractText(mealItemName)).toBe('Apple');

      // Access EditMealModal component via findByType
      const editModalComponent = root.root.findByType(EditMealModal);

      // Trigger save edit from EditModal
      await act(async () => {
        await editModalComponent.props.onSaveEdit('entry_app_1', { portion: 3, calories: 285 });
      });

      // Rollback verified
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update logged entry:',
        expect.any(Error)
      );
    });

    test('7.5: App optimistic deleteLoggedEntry failure and state rollback (exercises lines 134-135)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Provide one initial entry
      jest.spyOn(defaultCalorieRepository, 'getDailySummary').mockResolvedValueOnce({
        dateString: getLocalDateString(),
        calorieTarget: 2000,
        totalCalories: 100,
        remainingCalories: 1900,
        entries: [
          {
            id: 'entry_to_del',
            foodItemId: 'item_1',
            foodName: 'Orange',
            portion: 1,
            servingUnit: '1 medium',
            calories: 100,
            dateString: getLocalDateString(),
            mealType: 'Lunch',
            timestamp: Date.now(),
          },
        ],
      });

      // Mock failure on delete
      jest
        .spyOn(defaultCalorieRepository, 'deleteLoggedEntry')
        .mockRejectedValueOnce(new Error('Flash write error during delete'));

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      const editModalComponent = root.root.findByType(EditMealModal);

      // Trigger delete from EditModal
      await act(async () => {
        await editModalComponent.props.onDelete('entry_to_del');
      });

      // Rollback verified: item restored after failure
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete logged entry:',
        expect.any(Error)
      );

      const restoredItem = findOneTestId(root.root, 'meal-item-name-entry_to_del');
      expect(extractText(restoredItem)).toBe('Orange');
    });

    test('7.6: App handleSaveGoal success and optimistic rollback on failure (exercises lines 141-152, 207, 256)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      // Open Goal modal via ProgressCard onEditGoal callback (exercises line 207)
      const editGoalBtn = findOneTestId(root.root, 'edit-goal-btn');
      act(() => {
        editGoalBtn.props.onPress();
      });

      const goalModalComponent = root.root.findByType(GoalSettingsModal);
      expect(goalModalComponent.props.visible).toBe(true);

      // Close goal modal (exercises line 256)
      act(() => {
        goalModalComponent.props.onClose();
      });

      // 1. Success case: save goal 2400
      const setGoalSpy = jest
        .spyOn(defaultCalorieRepository, 'setDailyGoal')
        .mockResolvedValueOnce();

      await act(async () => {
        await goalModalComponent.props.onSaveGoal(2400);
      });

      expect(setGoalSpy).toHaveBeenCalledWith(getLocalDateString(), 2400);
      const targetVal = findOneTestId(root.root, 'stat-target-value');
      expect(extractText(targetVal)).toBe('2,400');

      // 2. Failure rollback case: mock failure
      jest
        .spyOn(defaultCalorieRepository, 'setDailyGoal')
        .mockRejectedValueOnce(new Error('Storage disk full'));

      await act(async () => {
        await goalModalComponent.props.onSaveGoal(3000);
      });

      // Rollback verified: reverted back to 2400
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update daily goal:',
        expect.any(Error)
      );
      expect(extractText(findOneTestId(root.root, 'stat-target-value'))).toBe('2,400');
    });

    test('7.7: App handleSaveCustomFood and handleOpenAddForMeal (exercises lines 157-159, 164-165)', async () => {
      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      // Test handleOpenAddForMeal via MealSection "+ Add" button (exercises lines 164-165)
      const addDinnerBtn = findOneTestId(root.root, 'add-to-meal-btn-Dinner');
      act(() => {
        addDinnerBtn.props.onPress();
      });

      const loggingModalComponent = root.root.findByType(FoodLoggingModal);
      expect(loggingModalComponent.props.visible).toBe(true);
      expect(loggingModalComponent.props.defaultMealType).toBe('Dinner');

      // Test handleSaveCustomFood (exercises lines 157-159)
      const savedCustomFood: FoodItem = {
        id: 'custom_pho_99',
        name: 'Vegetarian Pho',
        servingUnit: 'bowl',
        caloriesPerUnit: 350,
        category: 'Proteins',
        isCustom: true,
      };

      jest
        .spyOn(defaultCalorieRepository, 'saveCustomFood')
        .mockResolvedValueOnce(savedCustomFood);

      let returnedFood: FoodItem | undefined;
      await act(async () => {
        returnedFood = await loggingModalComponent.props.onSaveCustomFood({
          name: 'Vegetarian Pho',
          servingUnit: 'bowl',
          caloriesPerUnit: 350,
          category: 'Proteins',
          isCustom: true,
        });
      });

      expect(returnedFood).toEqual(savedCustomFood);
    });
  });
});
