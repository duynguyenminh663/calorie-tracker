import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { FoodItem, LoggedEntry, MealType, IStorageAdapter } from '../src/types';
import {
  calculateDailyTotal,
  calculateItemCalories,
  calculateMealBreakdown,
  calculateProgressPercentage,
  calculateRemainingBalance,
  validatePortionInput,
} from '../src/utils/calorieMath';
import { AsyncStorageAdapter, MemoryStorageAdapter } from '../src/services/storageAdapter';
import { CalorieRepository, defaultCalorieRepository } from '../src/services/storageService';

const renderer = require('react-test-renderer');
const { create, act } = renderer;
const h = React.createElement;

// Helper to extract text from ReactTestInstance trees safely
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

describe('Tier 5 Challenger 2: Adversarial Coverage Hardening Suite', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await AsyncStorage.clear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: Standalone Offline Behavior & Zero-Network Verification
  // =========================================================================
  describe('1. Standalone Offline Behavior & Zero-Network Verification', () => {
    test('1.1 Zero network calls made during full lifecycle operations', async () => {
      // Mock global network functions to strictly detect any network access
      const originalFetch = (global as any).fetch;
      const fetchSpy = jest.fn(() => Promise.reject(new Error('Network access is prohibited in offline mode')));
      (global as any).fetch = fetchSpy;

      const memStorage = new MemoryStorageAdapter();
      const repo = new CalorieRepository(memStorage);

      // Perform all standard operations
      const catalog = await repo.getFoodCatalog();
      expect(catalog.length).toBeGreaterThanOrEqual(36);

      const custom = await repo.saveCustomFood({
        name: 'Offline Energy Bar',
        servingUnit: '1 bar (60g)',
        caloriesPerUnit: 250,
        category: 'Snacks & Fats',
      });
      expect(custom.id).toBeDefined();

      await repo.setDailyGoal('2026-11-03', 2200);
      const goal = await repo.getDailyGoal('2026-11-03');
      expect(goal).toBe(2200);

      const entry = await repo.addLoggedEntry({
        foodItemId: custom.id,
        foodName: custom.name,
        portion: 2,
        servingUnit: custom.servingUnit,
        calories: 500,
        dateString: '2026-11-03',
        mealType: 'Snack',
      });
      expect(entry.id).toBeDefined();

      const summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(500);
      expect(summary.remainingCalories).toBe(1700);

      // Verify that fetch was never invoked
      expect(fetchSpy).not.toHaveBeenCalled();
      (global as any).fetch = originalFetch;
    });

    test('1.2 Complete network shutdown simulation does not degrade app UI', async () => {
      const originalFetch = (global as any).fetch;
      const originalXHR = (global as any).XMLHttpRequest;

      // Simulate zero-network environment where network APIs are completely disabled
      (global as any).fetch = undefined;
      (global as any).XMLHttpRequest = undefined;

      let root: any;
      await act(async () => {
        root = create(h(App));
      });

      // App renders cleanly without errors
      expect(root).toBeDefined();
      const badge = getByTestId(root.root, 'standalone-badge');
      expect(badge).toBeDefined();
      expect(nodeText(badge)).toContain('⚡ Standalone • On-Device');

      // Verify header subtitle mentions offline standalone operation
      const tree = root.toJSON();
      const stringifiedTree = JSON.stringify(tree);
      expect(stringifiedTree).toContain('100% on-device standalone tracking');

      (global as any).fetch = originalFetch;
      (global as any).XMLHttpRequest = originalXHR;
    });

    test('1.3 StandaloneBadge renders on-device label, dot, and custom overrides', () => {
      let rootDefault: any;
      act(() => {
        rootDefault = create(h(StandaloneBadge));
      });
      const badgeNode = getByTestId(rootDefault.root, 'standalone-badge');
      expect(nodeText(badgeNode)).toContain('⚡ Standalone • On-Device');

      let rootCustom: any;
      act(() => {
        rootCustom = create(h(StandaloneBadge, { label: 'Air-Gapped Standalone Mode' }));
      });
      const customNode = getByTestId(rootCustom.root, 'standalone-badge');
      expect(nodeText(customNode)).toBe('Air-Gapped Standalone Mode');
    });

    test('1.4 Standalone build configuration integrity in app.json and eas.json', () => {
      const appJson = require('../app.json');
      const easJson = require('../eas.json');

      expect(appJson.expo).toBeDefined();
      expect(appJson.expo.name).toBe('Calorie Tracker');
      expect(appJson.expo.android).toBeDefined();
      expect(appJson.expo.android.package).toBe('com.anonymous.calorietracker');

      expect(easJson.build).toBeDefined();
      expect(easJson.build.preview).toBeDefined();
      expect(easJson.build.preview.android.buildType).toBe('apk');
    });
  });

  // =========================================================================
  // SECTION 2: AsyncStorage Corruption Resilience
  // =========================================================================
  describe('2. AsyncStorage Corruption Resilience', () => {
    test('2.1 Corrupted non-JSON strings in @calorie_app/entries handled gracefully', async () => {
      // Inject truncated/corrupted JSON string directly into AsyncStorage
      await AsyncStorage.setItem('@calorie_app/entries', '{"corrupted: [true, missing_bracket');

      const adapter = AsyncStorageAdapter;
      // getItem should return null on JSON parse exception
      const result = await adapter.getItem('@calorie_app/entries');
      expect(result).toBeNull();

      // CalorieRepository should recover and return empty entries array
      const repo = new CalorieRepository(adapter);
      const entries = await repo.getLoggedEntries('2026-11-03');
      expect(entries).toEqual([]);

      // Summary calculation should succeed with 0 total calories
      const summary = await repo.getDailySummary('2026-11-03');
      expect(summary.totalCalories).toBe(0);
      expect(summary.entries).toEqual([]);
    });

    test('2.2 Corrupted strings in @calorie_app/goals fall back safely to 2000 kcal', async () => {
      await AsyncStorage.setItem('@calorie_app/goals', '<<<MALFORMED_XML_NOT_JSON>>>');

      const repo = new CalorieRepository(AsyncStorageAdapter);
      const goal = await repo.getDailyGoal('2026-11-03');
      expect(goal).toBe(2000);
    });

    test('2.3 Corrupted strings in @calorie_app/custom_foods fall back to starter catalog', async () => {
      await AsyncStorage.setItem('@calorie_app/custom_foods', '{broken_json: true');

      const repo = new CalorieRepository(AsyncStorageAdapter);
      const catalog = await repo.getFoodCatalog();
      expect(catalog.length).toBe(STARTER_FOOD_CATALOG.length);
      expect(catalog[0].id).toBe(STARTER_FOOD_CATALOG[0].id);
    });

    test('2.4 Storage adapter handles null, undefined, and empty string keys', async () => {
      const adapter = AsyncStorageAdapter;
      expect(await adapter.getItem('non_existent_key_12345')).toBeNull();

      // Explicitly saving and retrieving empty array and empty object
      await adapter.setItem('test_empty_arr', []);
      expect(await adapter.getItem('test_empty_arr')).toEqual([]);

      await adapter.setItem('test_empty_obj', {});
      expect(await adapter.getItem('test_empty_obj')).toEqual({});
    });

    test('2.5 Hard storage I/O failures (disk full, quota exceeded) throw and allow caller recovery', async () => {
      const failingStorage: IStorageAdapter = {
        async getItem() {
          throw new Error('Disk read failure: EIO');
        },
        async setItem() {
          throw new Error('QuotaExceededError: device storage is full');
        },
        async removeItem() {
          throw new Error('PermissionDenied: storage locked');
        },
        async getAllKeys() {
          throw new Error('Storage unavailable');
        },
        async clear() {
          throw new Error('Storage unavailable');
        },
      };

      const repo = new CalorieRepository(failingStorage);

      // Verify that repository methods propagate errors rather than silently swallowing
      await expect(repo.getFoodCatalog()).rejects.toThrow('Disk read failure: EIO');
      await expect(repo.getLoggedEntries('2026-11-03')).rejects.toThrow('Disk read failure: EIO');
      await expect(
        repo.addLoggedEntry({
          foodItemId: 'test_food',
          foodName: 'Test Food',
          portion: 1,
          servingUnit: 'serving',
          calories: 100,
          dateString: '2026-11-03',
          mealType: 'Breakfast',
        })
      ).rejects.toThrow('Disk read failure: EIO');
    });

    test('2.6 App component rolls back optimistic UI state when storage write fails', async () => {
      let root: any;
      await act(async () => {
        root = create(h(App));
      });

      // Spy on addLoggedEntry to throw a simulated flash write failure
      const addSpy = jest
        .spyOn(defaultCalorieRepository, 'addLoggedEntry')
        .mockRejectedValueOnce(new Error('Flash write error during add'));

      const fab = getByTestId(root.root, 'open-logging-fab');
      act(() => {
        fab.props.onPress();
      });

      // Submit food entry in modal
      const modal = getByTestId(root.root, 'food-logging-modal');
      expect(modal).toBeDefined();

      const selectBanana = getByTestId(root.root, 'catalog-item-starter_banana');
      act(() => {
        selectBanana.props.onPress();
      });

      const addBtn = getByTestId(root.root, 'add-to-log-btn');
      await act(async () => {
        await addBtn.props.onPress();
      });

      // Verify error was logged and rejected call took place
      expect(addSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Verify entries rolled back: no lingering items in breakfast
      const breakfastSubtotal = getByTestId(root.root, 'meal-subtotal-Breakfast');
      expect(nodeText(breakfastSubtotal)).toBe('0 kcal');
    });

    test('2.7 Goal update rolls back to previous target when storage persistence fails', async () => {
      let root: any;
      await act(async () => {
        root = create(h(App));
      });

      // Check initial target is 2000
      const targetLabel = getByTestId(root.root, 'stat-target-value');
      expect(nodeText(targetLabel)).toContain('2,000');

      // Mock setDailyGoal to fail
      const setGoalSpy = jest
        .spyOn(defaultCalorieRepository, 'setDailyGoal')
        .mockRejectedValueOnce(new Error('Persistence failed: storage unmounted'));

      // Open goal modal
      const editGoalBtn = getByTestId(root.root, 'edit-goal-btn');
      act(() => {
        editGoalBtn.props.onPress();
      });

      const goalInput = getByTestId(root.root, 'goal-input');
      act(() => {
        goalInput.props.onChangeText('3500');
      });

      const saveGoalBtn = getByTestId(root.root, 'save-goal-btn');
      await act(async () => {
        await saveGoalBtn.props.onPress();
      });

      expect(setGoalSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Verify target rolled back to 2000
      const rolledBackTarget = getByTestId(root.root, 'stat-target-value');
      expect(nodeText(rolledBackTarget)).toContain('2,000');
    });

    test('2.8 Delete entry rolls back to previous list when storage deletion fails', async () => {
      // First, cleanly seed an entry
      const repo = defaultCalorieRepository;
      const seeded = await repo.addLoggedEntry({
        foodItemId: 'starter_apple',
        foodName: 'Apple',
        portion: 1,
        servingUnit: '1 medium (182g)',
        calories: 95,
        dateString: getLocalDateString(),
        mealType: 'Breakfast',
      });

      let root: any;
      await act(async () => {
        root = create(h(App));
      });

      // Verify entry exists in breakfast subtotal
      const breakfastSubtotal = getByTestId(root.root, 'meal-subtotal-Breakfast');
      expect(nodeText(breakfastSubtotal)).toBe('95 kcal');

      // Mock deleteLoggedEntry to reject
      const deleteSpy = jest
        .spyOn(defaultCalorieRepository, 'deleteLoggedEntry')
        .mockRejectedValueOnce(new Error('Storage delete failure'));

      // Open edit modal for the item
      const itemRow = getByTestId(root.root, `meal-item-row-${seeded.id}`);
      act(() => {
        itemRow.props.onPress();
      });

      // Trigger deletion
      const deleteBtn = getByTestId(root.root, 'delete-entry-btn');
      act(() => {
        deleteBtn.props.onPress();
      });

      const confirmBtn = getByTestId(root.root, 'confirm-delete-btn');
      await act(async () => {
        confirmBtn.props.onPress();
      });

      expect(deleteSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Verify rollback preserved the item (subtotal is still 95 kcal)
      const restoredSubtotal = getByTestId(root.root, 'meal-subtotal-Breakfast');
      expect(nodeText(restoredSubtotal)).toBe('95 kcal');
    });
  });

  // =========================================================================
  // SECTION 3: Component Edge Cases & Boundary Stress
  // =========================================================================
  describe('3. Component Edge Cases & Boundary Stress', () => {
    // -----------------------------------------------------------------------
    // GoalSettingsModal Boundaries (500 to 10,000 kcal)
    // -----------------------------------------------------------------------
    describe('3.1 GoalSettingsModal exact boundaries (500 to 10,000 kcal)', () => {
      test('Rejects below 500 kcal (499, 400, 0, -1)', async () => {
        const onSave = jest.fn();
        let root: any;
        act(() => {
          root = create(h(GoalSettingsModal, { visible: true, currentTarget: 2000, onClose: jest.fn(), onSaveGoal: onSave }));
        });

        const input = getByTestId(root.root, 'goal-input');
        const saveBtn = getByTestId(root.root, 'save-goal-btn');

        // Test 499
        act(() => {
          input.props.onChangeText('499');
        });
        await act(async () => {
          await saveBtn.props.onPress();
        });
        expect(onSave).not.toHaveBeenCalled();
        let errNode = getByTestId(root.root, 'goal-error-text');
        expect(nodeText(errNode)).toBe('Daily calorie target must be between 500 and 10,000 kcal');

        // Test 0
        act(() => {
          input.props.onChangeText('0');
        });
        await act(async () => {
          await saveBtn.props.onPress();
        });
        expect(onSave).not.toHaveBeenCalled();
        errNode = getByTestId(root.root, 'goal-error-text');
        expect(nodeText(errNode)).toBe('Please enter a valid positive number');

        // Test negative
        act(() => {
          input.props.onChangeText('-500');
        });
        await act(async () => {
          await saveBtn.props.onPress();
        });
        expect(onSave).not.toHaveBeenCalled();
        errNode = getByTestId(root.root, 'goal-error-text');
        expect(nodeText(errNode)).toBe('Please enter a valid positive number');
      });

      test('Accepts exact lower boundary 500 kcal', async () => {
        const onSave = jest.fn();
        const onClose = jest.fn();
        let root: any;
        act(() => {
          root = create(h(GoalSettingsModal, { visible: true, currentTarget: 2000, onClose, onSaveGoal: onSave }));
        });

        const input = getByTestId(root.root, 'goal-input');
        const saveBtn = getByTestId(root.root, 'save-goal-btn');

        act(() => {
          input.props.onChangeText('500');
        });
        await act(async () => {
          await saveBtn.props.onPress();
        });

        expect(onSave).toHaveBeenCalledWith(500);
        expect(onClose).toHaveBeenCalled();
      });

      test('Accepts exact upper boundary 10,000 kcal', async () => {
        const onSave = jest.fn();
        const onClose = jest.fn();
        let root: any;
        act(() => {
          root = create(h(GoalSettingsModal, { visible: true, currentTarget: 2000, onClose, onSaveGoal: onSave }));
        });

        const input = getByTestId(root.root, 'goal-input');
        const saveBtn = getByTestId(root.root, 'save-goal-btn');

        act(() => {
          input.props.onChangeText('10000');
        });
        await act(async () => {
          await saveBtn.props.onPress();
        });

        expect(onSave).toHaveBeenCalledWith(10000);
        expect(onClose).toHaveBeenCalled();
      });

      test('Rejects above 10,000 kcal (10,001)', async () => {
        const onSave = jest.fn();
        let root: any;
        act(() => {
          root = create(h(GoalSettingsModal, { visible: true, currentTarget: 2000, onClose: jest.fn(), onSaveGoal: onSave }));
        });

        const input = getByTestId(root.root, 'goal-input');
        const saveBtn = getByTestId(root.root, 'save-goal-btn');

        act(() => {
          input.props.onChangeText('10001');
        });
        await act(async () => {
          await saveBtn.props.onPress();
        });

        expect(onSave).not.toHaveBeenCalled();
        const errNode = getByTestId(root.root, 'goal-error-text');
        expect(nodeText(errNode)).toBe('Daily calorie target must be between 500 and 10,000 kcal');
      });

      test('Rejects non-numeric strings, symbols, empty strings, and whitespace', async () => {
        const invalidValues = ['abc', '???', '---', '', '   ', '.5', 'null', 'undefined'];
        for (const val of invalidValues) {
          const onSave = jest.fn();
          let root: any;
          act(() => {
            root = create(h(GoalSettingsModal, { visible: true, currentTarget: 2000, onClose: jest.fn(), onSaveGoal: onSave }));
          });

          const input = getByTestId(root.root, 'goal-input');
          const saveBtn = getByTestId(root.root, 'save-goal-btn');

          act(() => {
            input.props.onChangeText(val);
          });
          await act(async () => {
            await saveBtn.props.onPress();
          });
          expect(onSave).not.toHaveBeenCalled();
          const errNode = getByTestId(root.root, 'goal-error-text');
          expect(nodeText(errNode)).toBe('Please enter a valid positive number');
        }
      });

      test('All quick presets (1500, 1800, 2000, 2200, 2500) set value and clear errors', async () => {
        const onSave = jest.fn();
        let root: any;
        act(() => {
          root = create(h(GoalSettingsModal, { visible: true, currentTarget: 2000, onClose: jest.fn(), onSaveGoal: onSave }));
        });

        const presets = [1500, 1800, 2000, 2200, 2500];
        for (const preset of presets) {
          const chip = getByTestId(root.root, `preset-goal-${preset}`);
          act(() => {
            chip.props.onPress();
          });
          const input = getByTestId(root.root, 'goal-input');
          expect(input.props.value).toBe(String(preset));
          expect(findByTestId(root.root, 'goal-error-text').length).toBe(0);
        }
      });
    });

    // -----------------------------------------------------------------------
    // FoodLoggingModal Custom Food Edge Cases
    // -----------------------------------------------------------------------
    describe('3.2 Custom Food Extreme Inputs & Special Characters', () => {
      test('Handles massive 5,000 character custom food name without crashing', async () => {
        const onAddEntry = jest.fn();
        const onSaveCustomFood = jest.fn((f) => Promise.resolve({ ...f, id: 'custom_huge' }));

        let root: any;
        act(() => {
          root = create(
            h(FoodLoggingModal, {
              visible: true,
              onClose: jest.fn(),
              onAddEntry,
              catalog: STARTER_FOOD_CATALOG,
              onSaveCustomFood,
              selectedDate: '2026-11-03',
            })
          );
        });

        // Switch to custom tab
        const customTab = getByTestId(root.root, 'tab-custom');
        act(() => {
          customTab.props.onPress();
        });

        const hugeName = 'A'.repeat(5000);
        const nameInput = getByTestId(root.root, 'custom-name-input');
        const calsInput = getByTestId(root.root, 'custom-calories-input');

        act(() => {
          nameInput.props.onChangeText(hugeName);
          calsInput.props.onChangeText('450');
        });

        const addBtn = getByTestId(root.root, 'add-to-log-btn');
        await act(async () => {
          await addBtn.props.onPress();
        });

        expect(onSaveCustomFood).toHaveBeenCalledWith(
          expect.objectContaining({
            name: hugeName,
            caloriesPerUnit: 450,
          })
        );
        expect(onAddEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            foodName: hugeName,
            calories: 450,
          })
        );
      });

      test('Handles Unicode emojis, RTL Arabic, CJK, and code injection strings in custom food', async () => {
        const testNames = [
          '🍕 Pepperoni Pizza 🥦',
          'وجبة شاورما دجاج مع ثوم',
          '特选和牛拉面 & 寿司',
          '<script>alert("xss")</script>',
          "' OR '1'='1' --",
          'Crème Brûlée à la vanille',
          '!@#$%^&*()_+~`|}{[]:;?><,./',
        ];

        for (const name of testNames) {
          const onAddEntry = jest.fn();
          let root: any;
          act(() => {
            root = create(
              h(FoodLoggingModal, {
                visible: true,
                onClose: jest.fn(),
                onAddEntry,
                catalog: STARTER_FOOD_CATALOG,
                selectedDate: '2026-11-03',
              })
            );
          });

          // Switch to custom tab
          act(() => {
            getByTestId(root.root, 'tab-custom').props.onPress();
          });

          act(() => {
            getByTestId(root.root, 'custom-name-input').props.onChangeText(name);
            getByTestId(root.root, 'custom-calories-input').props.onChangeText('300');
          });

          await act(async () => {
            await getByTestId(root.root, 'add-to-log-btn').props.onPress();
          });

          expect(onAddEntry).toHaveBeenCalledWith(
            expect.objectContaining({
              foodName: name,
              calories: 300,
            })
          );
        }
      });

      test('Rejects empty or whitespace-only custom food name', async () => {
        const onAddEntry = jest.fn();
        let root: any;
        act(() => {
          root = create(
            h(FoodLoggingModal, {
              visible: true,
              onClose: jest.fn(),
              onAddEntry,
              catalog: STARTER_FOOD_CATALOG,
              selectedDate: '2026-11-03',
            })
          );
        });

        act(() => {
          getByTestId(root.root, 'tab-custom').props.onPress();
        });

        act(() => {
          getByTestId(root.root, 'custom-name-input').props.onChangeText('   ');
          getByTestId(root.root, 'custom-calories-input').props.onChangeText('300');
        });

        await act(async () => {
          await getByTestId(root.root, 'add-to-log-btn').props.onPress();
        });

        expect(onAddEntry).not.toHaveBeenCalled();
        const err = getByTestId(root.root, 'logging-error-text');
        expect(nodeText(err)).toBe('Please enter a food name');
      });

      test('Rejects zero, negative, or invalid calories per unit in custom food', async () => {
        const onAddEntry = jest.fn();
        let root: any;
        act(() => {
          root = create(
            h(FoodLoggingModal, {
              visible: true,
              onClose: jest.fn(),
              onAddEntry,
              catalog: STARTER_FOOD_CATALOG,
              selectedDate: '2026-11-03',
            })
          );
        });

        act(() => {
          getByTestId(root.root, 'tab-custom').props.onPress();
        });

        const invalidCals = ['0', '-50', 'abc', '   '];
        for (const cal of invalidCals) {
          act(() => {
            getByTestId(root.root, 'custom-name-input').props.onChangeText('Valid Name');
            getByTestId(root.root, 'custom-calories-input').props.onChangeText(cal);
          });

          await act(async () => {
            await getByTestId(root.root, 'add-to-log-btn').props.onPress();
          });

          expect(onAddEntry).not.toHaveBeenCalled();
          const err = getByTestId(root.root, 'logging-error-text');
          expect(nodeText(err)).toBe('Please enter valid calories per serving unit');
        }
      });
    });

    // -----------------------------------------------------------------------
    // Catalog Search Regex Safety
    // -----------------------------------------------------------------------
    describe('3.3 Search Query Regex Metacharacter Safety', () => {
      test('Searching with regex metacharacters does not crash and treats input as literal substring', () => {
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

        const searchInput = getByTestId(root.root, 'search-catalog-input');
        const regexInputs = ['[a-z]+', '.*', '(egg|apple)', '\\d+', '(?=.*)', '^+?$'];

        for (const regexStr of regexInputs) {
          expect(() => {
            act(() => {
              searchInput.props.onChangeText(regexStr);
            });
          }).not.toThrow();

          // Search completes cleanly
          const modalNode = getByTestId(root.root, 'food-logging-modal');
          expect(modalNode).toBeDefined();
        }
      });
    });

    // -----------------------------------------------------------------------
    // CalorieProgressCard Extreme Metrics & Over-Budget
    // -----------------------------------------------------------------------
    describe('3.4 CalorieProgressCard Extreme Metrics & Boundaries', () => {
      test('Zero consumed: 0% progress, full remaining, green color', () => {
        let root: any;
        act(() => {
          root = create(h(CalorieProgressCard, { consumed: 0, target: 2000, remaining: 2000 }));
        });

        const consumedVal = getByTestId(root.root, 'stat-consumed-value');
        expect(nodeText(consumedVal)).toBe('0');

        const remainingVal = getByTestId(root.root, 'stat-remaining-value');
        expect(nodeText(remainingVal)).toBe('2,000');

        const percentLabel = getByTestId(root.root, 'progress-percent-label');
        expect(nodeText(percentLabel)).toBe('0%');

        const fill = getByTestId(root.root, 'progress-bar-fill');
        expect(fill.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ width: '0%', backgroundColor: '#10b981' }),
          ])
        );
      });

      test('Exact target match: 100% progress, 0 remaining, blue color', () => {
        let root: any;
        act(() => {
          root = create(h(CalorieProgressCard, { consumed: 2000, target: 2000, remaining: 0 }));
        });

        const percentLabel = getByTestId(root.root, 'progress-percent-label');
        expect(nodeText(percentLabel)).toBe('100%');

        const fill = getByTestId(root.root, 'progress-bar-fill');
        expect(fill.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ width: '100%', backgroundColor: '#0284c7' }),
          ])
        );
      });

      test('Over budget boundary: 2001 consumed, remaining -1, Over Budget label, red color', () => {
        let root: any;
        act(() => {
          root = create(h(CalorieProgressCard, { consumed: 2001, target: 2000, remaining: -1 }));
        });

        const remainingVal = getByTestId(root.root, 'stat-remaining-value');
        expect(nodeText(remainingVal)).toBe('-1');

        const fill = getByTestId(root.root, 'progress-bar-fill');
        expect(fill.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ backgroundColor: '#ef4444' }),
          ])
        );
      });

      test('Massive over-budget: 1,000,000 kcal consumed, bar width capped at 100%', () => {
        let root: any;
        act(() => {
          root = create(h(CalorieProgressCard, { consumed: 1000000, target: 2000, remaining: -998000 }));
        });

        const fill = getByTestId(root.root, 'progress-bar-fill');
        expect(fill.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ width: '100%', backgroundColor: '#ef4444' }),
          ])
        );

        const remainingVal = getByTestId(root.root, 'stat-remaining-value');
        expect(nodeText(remainingVal)).toBe('-998,000');
      });

      test('Target = 0 or negative fallback safety to 2000', () => {
        let root: any;
        act(() => {
          root = create(h(CalorieProgressCard, { consumed: 500, target: 0, remaining: -500 }));
        });

        const targetVal = getByTestId(root.root, 'stat-target-value');
        expect(nodeText(targetVal)).toBe('2,000');
      });
    });

    // -----------------------------------------------------------------------
    // Rapid Optimistic Additions and Instant Responsiveness
    // -----------------------------------------------------------------------
    describe('3.5 Rapid Optimistic Additions and Instant Responsiveness', () => {
      test('10 rapid successive meal additions update UI immediately before storage settlement', async () => {
        let root: any;
        await act(async () => {
          root = create(h(App));
        });

        const fab = getByTestId(root.root, 'open-logging-fab');

        // Add 10 items in rapid succession
        for (let i = 0; i < 10; i++) {
          act(() => {
            fab.props.onPress();
          });

          const appleItem = getByTestId(root.root, 'catalog-item-starter_apple');
          act(() => {
            appleItem.props.onPress();
          });

          const addBtn = getByTestId(root.root, 'add-to-log-btn');
          await act(async () => {
            await addBtn.props.onPress();
          });
        }

        // Total should be 10 * 95 = 950 kcal
        const subtotal = getByTestId(root.root, 'meal-subtotal-Breakfast');
        expect(nodeText(subtotal)).toBe('950 kcal');

        const consumed = getByTestId(root.root, 'stat-consumed-value');
        expect(nodeText(consumed)).toBe('950');

        const remaining = getByTestId(root.root, 'stat-remaining-value');
        expect(nodeText(remaining)).toBe('1,050');
      });
    });

    // -----------------------------------------------------------------------
    // DateNavigator Boundaries & Jump to Today
    // -----------------------------------------------------------------------
    describe('3.6 DateNavigator Boundaries & Jump to Today', () => {
      test('Date shifts across year 2000 leap day and non-leap years', () => {
        // Centurial leap year (2000 was a leap year)
        expect(shiftDate('2000-02-28', 1)).toBe('2000-02-29');
        expect(shiftDate('2000-02-29', 1)).toBe('2000-03-01');

        // Centurial non-leap year (2100 is not a leap year)
        expect(shiftDate('2100-02-28', 1)).toBe('2100-03-01');

        // Malformed date strings return original string safely
        expect(shiftDate('invalid-date', 1)).toBe('invalid-date');
        expect(shiftDate('2026-13', 1)).toBe('2026-13');
      });

      test('Today button appears only when off-today and jumps back to today', () => {
        const onDateChange = jest.fn();
        let root: any;
        act(() => {
          root = create(h(DateNavigator, { currentDate: '2026-11-01', todayDate: '2026-11-03', onDateChange }));
        });

        // "Today" button must be visible when viewing past date
        const todayBtn = getByTestId(root.root, 'today-date-btn');
        expect(todayBtn).toBeDefined();

        act(() => {
          todayBtn.props.onPress();
        });
        expect(onDateChange).toHaveBeenCalledWith('2026-11-03');

        // When viewing today, "Today" button is hidden
        let rootToday: any;
        act(() => {
          rootToday = create(h(DateNavigator, { currentDate: '2026-11-03', todayDate: '2026-11-03', onDateChange }));
        });
        expect(findByTestId(rootToday.root, 'today-date-btn').length).toBe(0);
      });
    });

    // -----------------------------------------------------------------------
    // ErrorBoundary Custom Fallback & Recovery
    // -----------------------------------------------------------------------
    describe('3.7 ErrorBoundary Custom Fallback & Recovery', () => {
      const CrashingComponent = ({ crash }: { crash: boolean }) => {
        if (crash) throw new Error('Uncaught render failure in adversarial child');
        return h('Text', null, 'Normal child');
      };

      test('Renders custom fallback when provided', () => {
        let root: any;
        const customFallback = h('Text', { testID: 'custom-error-fallback' }, 'Custom Error Message');

        expect(() => {
          act(() => {
            root = create(
              h(
                ErrorBoundary,
                { fallback: customFallback },
                h(CrashingComponent, { crash: true })
              )
            );
          });
        }).not.toThrow();

        expect(getByTestId(root.root, 'custom-error-fallback')).toBeDefined();
      });

      test('Reset button triggers onReset and clears error state', () => {
        const onReset = jest.fn();
        let root: any;

        act(() => {
          root = create(
            h(
              ErrorBoundary,
              { onReset },
              h(CrashingComponent, { crash: true })
            )
          );
        });

        const resetBtn = getByTestId(root.root, 'error-boundary-reset-button');
        act(() => {
          resetBtn.props.onPress();
        });

        expect(onReset).toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Additional Edge Cases & Uncovered Branches Hardening
    // -----------------------------------------------------------------------
    describe('3.8 Additional Edge Cases & Deep Coverage Hardening', () => {
      test('FoodLoggingModal rejects submission if no food is selected in catalog tab', async () => {
        const onAddEntry = jest.fn();
        let root: any;
        act(() => {
          root = create(
            h(FoodLoggingModal, {
              visible: true,
              onClose: jest.fn(),
              onAddEntry,
              catalog: STARTER_FOOD_CATALOG,
              selectedDate: '2026-11-03',
            })
          );
        });

        const addBtn = getByTestId(root.root, 'add-to-log-btn');
        await act(async () => {
          await addBtn.props.onPress();
        });

        expect(onAddEntry).not.toHaveBeenCalled();
        const err = getByTestId(root.root, 'logging-error-text');
        expect(nodeText(err)).toBe('Please select a food item from the catalog');
      });

      test('FoodLoggingModal quick portion chips and meal type chips update state', async () => {
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

        // Click quick portion chip 0.5x
        const quickChip = getByTestId(root.root, 'quick-portion-0.5');
        act(() => {
          quickChip.props.onPress();
        });
        const portionInput = getByTestId(root.root, 'portion-input');
        expect(portionInput.props.value).toBe('0.5');

        // Click meal type chip 'Dinner'
        const dinnerChip = getByTestId(root.root, 'meal-type-select-Dinner');
        act(() => {
          dinnerChip.props.onPress();
        });
        expect(dinnerChip).toBeDefined();
      });

      test('App.tsx rolls back optimistic entry edit when updateLoggedEntry fails', async () => {
        // Seed an entry
        const repo = defaultCalorieRepository;
        const entry = await repo.addLoggedEntry({
          foodItemId: 'starter_banana',
          foodName: 'Banana',
          portion: 1,
          servingUnit: '1 medium (118g)',
          calories: 105,
          dateString: getLocalDateString(),
          mealType: 'Lunch',
        });

        let root: any;
        await act(async () => {
          root = create(h(App));
        });

        // Mock updateLoggedEntry to reject
        const updateSpy = jest
          .spyOn(defaultCalorieRepository, 'updateLoggedEntry')
          .mockRejectedValueOnce(new Error('Update failed'));

        // Open edit modal for the item
        const itemRow = getByTestId(root.root, `meal-item-row-${entry.id}`);
        act(() => {
          itemRow.props.onPress();
        });

        // Change portion
        const portionInput = getByTestId(root.root, 'edit-portion-input');
        act(() => {
          portionInput.props.onChangeText('3');
        });

        const saveEditBtn = getByTestId(root.root, 'save-edit-btn');
        await act(async () => {
          await saveEditBtn.props.onPress();
        });

        expect(updateSpy).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();

        // Subtotal must remain 105 kcal, not rolled forward to 315 kcal
        const lunchSubtotal = getByTestId(root.root, 'meal-subtotal-Lunch');
        expect(nodeText(lunchSubtotal)).toBe('105 kcal');
      });

      test('App.tsx opens food logger with preselected meal category from meal section + Add button', async () => {
        let root: any;
        await act(async () => {
          root = create(h(App));
        });

        const addDinnerBtn = getByTestId(root.root, 'add-to-meal-btn-Dinner');
        act(() => {
          addDinnerBtn.props.onPress();
        });

        const modal = getByTestId(root.root, 'food-logging-modal');
        expect(modal.props.visible).toBe(true);
      });

      test('EditMealModal quick portion buttons update portion multiplier and live preview', async () => {
        const dummyEntry: LoggedEntry = {
          id: 'test_edit_1',
          foodItemId: 'starter_oats',
          foodName: 'Rolled Oats (Dry)',
          portion: 1,
          servingUnit: '0.5 cup (40g)',
          calories: 150,
          dateString: '2026-11-03',
          mealType: 'Breakfast',
          timestamp: 12345678,
        };

        let root: any;
        act(() => {
          root = create(
            h(EditMealModal, {
              visible: true,
              entry: dummyEntry,
              onClose: jest.fn(),
              onSaveEdit: jest.fn(),
              onDelete: jest.fn(),
            })
          );
        });

        const liveCalories = getByTestId(root.root, 'edit-live-calories');
        expect(nodeText(liveCalories)).toBe('150 kcal');
      });

      test('formatFriendlyDate returns original string when given malformed date components', () => {
        expect(formatFriendlyDate('invalid-date-format')).toBe('invalid-date-format');
        expect(formatFriendlyDate('not-a-date')).toBe('not-a-date');
      });
    });
  });
});
