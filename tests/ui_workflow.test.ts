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
} from '../src/components';
import App from '../src/App';
import { STARTER_FOOD_CATALOG } from '../src/data/starterCatalog';
import { FoodItem, LoggedEntry } from '../src/types';

// Declare react-test-renderer module typings for strict TypeScript typechecking
const renderer = require('react-test-renderer');
const { create, act } = renderer;
const h = React.createElement;

describe('Mobile Interface & Offline Tracking UI Workflow Tests', () => {
  // Helper to extract text from ReactTestInstance or React elements safely without circular JSON errors
  const nodeText = (node: any): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(nodeText).join('');
    if (node.props && node.props.children !== undefined) return nodeText(node.props.children);
    if (Array.isArray(node.children)) return node.children.map(nodeText).join('');
    return '';
  };

  // Helper to find nodes by testID
  const findByTestId = (instance: any, testID: string) => {
    return instance.findAll((node: any) => node.props && node.props.testID === testID);
  };

  const getByTestId = (instance: any, testID: string) => {
    const nodes = findByTestId(instance, testID);
    if (nodes.length === 0) {
      throw new Error(`Component with testID="${testID}" not found.`);
    }
    return nodes[0];
  };

  describe('1. StandaloneBadge Component', () => {
    test('renders default standalone on-device badge text', () => {
      let root: any;
      act(() => {
        root = create(h(StandaloneBadge, null));
      });

      const badgeNode = getByTestId(root.root, 'standalone-badge');
      expect(badgeNode).toBeDefined();

      const text = nodeText(badgeNode);
      expect(text).toContain('⚡ Standalone • On-Device');
    });

    test('supports custom label', () => {
      let root: any;
      act(() => {
        root = create(h(StandaloneBadge, { label: '100% Offline Active' }));
      });

      const badgeNode = getByTestId(root.root, 'standalone-badge');
      expect(nodeText(badgeNode)).toContain('100% Offline Active');
    });
  });

  describe('2. ErrorBoundary Component', () => {
    const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test boundary crash');
      }
      return h(React.Fragment, null, 'Normal Safe Child');
    };

    test('renders children safely when no error occurs', () => {
      let root: any;
      act(() => {
        root = create(
          h(
            ErrorBoundary,
            null,
            h(ThrowingComponent, { shouldThrow: false })
          )
        );
      });

      const json = root.toJSON();
      expect(JSON.stringify(json)).toContain('Normal Safe Child');
    });

    test('catches child crash and displays friendly fallback with recovery button', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      let root: any;
      act(() => {
        root = create(
          h(
            ErrorBoundary,
            null,
            h(ThrowingComponent, { shouldThrow: true })
          )
        );
      });

      const fallbackNode = getByTestId(root.root, 'error-boundary-fallback');
      expect(fallbackNode).toBeDefined();

      const resetButton = getByTestId(root.root, 'error-boundary-reset-button');
      expect(resetButton).toBeDefined();

      const text = nodeText(fallbackNode);
      expect(text).toContain('Something went wrong');
      expect(text).toContain('Test boundary crash');

      consoleSpy.mockRestore();
    });
  });

  describe('3. DateNavigator Component', () => {
    const baseDate = '2026-11-03';

    test('renders current date string and friendly label', () => {
      let root: any;
      act(() => {
        root = create(
          h(DateNavigator, {
            currentDate: baseDate,
            onDateChange: jest.fn(),
            todayDate: baseDate,
          })
        );
      });

      const labelNode = getByTestId(root.root, 'current-date-label');
      expect(nodeText(labelNode)).toContain(baseDate);

      const friendlyNode = getByTestId(root.root, 'current-date-friendly');
      expect(nodeText(friendlyNode)).toContain('Today');
    });

    test('previous day button shifts date back by 1 day', () => {
      const onDateChange = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(DateNavigator, {
            currentDate: baseDate,
            onDateChange,
            todayDate: baseDate,
          })
        );
      });

      const prevBtn = getByTestId(root.root, 'prev-date-btn');
      act(() => {
        prevBtn.props.onPress();
      });

      expect(onDateChange).toHaveBeenCalledWith('2026-11-02');
    });

    test('next day button shifts date forward by 1 day', () => {
      const onDateChange = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(DateNavigator, {
            currentDate: baseDate,
            onDateChange,
            todayDate: baseDate,
          })
        );
      });

      const nextBtn = getByTestId(root.root, 'next-date-btn');
      act(() => {
        nextBtn.props.onPress();
      });

      expect(onDateChange).toHaveBeenCalledWith('2026-11-04');
    });

    test('shows jump-to-today button when viewing past or future date', () => {
      const onDateChange = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(DateNavigator, {
            currentDate: '2026-11-01',
            onDateChange,
            todayDate: baseDate,
          })
        );
      });

      const todayBtn = getByTestId(root.root, 'today-date-btn');
      expect(todayBtn).toBeDefined();

      act(() => {
        todayBtn.props.onPress();
      });

      expect(onDateChange).toHaveBeenCalledWith(baseDate);
    });

    test('date utility functions work correctly on leap years and month boundaries', () => {
      expect(shiftDate('2024-02-28', 1)).toBe('2024-02-29');
      expect(shiftDate('2024-02-29', 1)).toBe('2024-03-01');
      expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
      expect(formatFriendlyDate('2026-11-03', '2026-11-03')).toBe('Today');
      expect(formatFriendlyDate('2026-11-02', '2026-11-03')).toBe('Yesterday');
      expect(formatFriendlyDate('2026-11-04', '2026-11-03')).toBe('Tomorrow');
    });
  });

  describe('4. CalorieProgressCard Component', () => {
    test('renders consumed, target, and remaining balance when under budget', () => {
      let root: any;
      act(() => {
        root = create(
          h(CalorieProgressCard, {
            consumed: 1450,
            target: 2000,
            remaining: 550,
            onEditGoal: jest.fn(),
          })
        );
      });

      const consumedVal = getByTestId(root.root, 'stat-consumed-value');
      const targetVal = getByTestId(root.root, 'stat-target-value');
      const remainingVal = getByTestId(root.root, 'stat-remaining-value');

      expect(nodeText(consumedVal)).toContain('1,450');
      expect(nodeText(targetVal)).toContain('2,000');
      expect(nodeText(remainingVal)).toContain('550');

      const percentLabel = getByTestId(root.root, 'progress-percent-label');
      expect(nodeText(percentLabel)).toContain('73%');
    });

    test('renders over budget indicator with negative calories and red cues', () => {
      let root: any;
      act(() => {
        root = create(
          h(CalorieProgressCard, {
            consumed: 2300,
            target: 2000,
            remaining: -300,
            onEditGoal: jest.fn(),
          })
        );
      });

      const remainingVal = getByTestId(root.root, 'stat-remaining-value');
      expect(nodeText(remainingVal)).toContain('-300');

      const cardJson = root.toJSON();
      expect(JSON.stringify(cardJson)).toContain('Over Budget');
    });

    test('triggers onEditGoal callback when clicking edit goal button', () => {
      const onEditGoal = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(CalorieProgressCard, {
            consumed: 1000,
            target: 2000,
            remaining: 1000,
            onEditGoal,
          })
        );
      });

      const editBtn = getByTestId(root.root, 'edit-goal-btn');
      act(() => {
        editBtn.props.onPress();
      });

      expect(onEditGoal).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. MealSection Component', () => {
    const mockEntries: LoggedEntry[] = [
      {
        id: 'e1',
        foodItemId: 'item-1',
        foodName: 'Rolled Oats',
        portion: 1.0,
        servingUnit: 'bowl (50g)',
        calories: 180,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
        timestamp: 1000,
      },
      {
        id: 'e2',
        foodItemId: 'item-2',
        foodName: 'Whole Milk',
        portion: 1.0,
        servingUnit: 'cup (240ml)',
        calories: 150,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
        timestamp: 1001,
      },
      {
        id: 'e3',
        foodItemId: 'item-3',
        foodName: 'Grilled Chicken Breast',
        portion: 1.5,
        servingUnit: '100g',
        calories: 248,
        dateString: '2026-11-03',
        mealType: 'Lunch',
        timestamp: 1002,
      },
    ];

    test('groups entries by meal type and computes accurate subtotals', () => {
      let root: any;
      act(() => {
        root = create(
          h(MealSection, {
            entries: mockEntries,
            onEditEntry: jest.fn(),
            onAddMeal: jest.fn(),
          })
        );
      });

      // Breakfast subtotal: 180 + 150 = 330 kcal
      const breakfastSub = getByTestId(root.root, 'meal-subtotal-Breakfast');
      expect(nodeText(breakfastSub)).toContain('330 kcal');

      // Lunch subtotal: 248 kcal
      const lunchSub = getByTestId(root.root, 'meal-subtotal-Lunch');
      expect(nodeText(lunchSub)).toContain('248 kcal');

      // Dinner subtotal: 0 kcal (empty)
      const dinnerSub = getByTestId(root.root, 'meal-subtotal-Dinner');
      expect(nodeText(dinnerSub)).toContain('0 kcal');
    });

    test('clicking item row or edit button invokes onEditEntry', () => {
      const onEditEntry = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(MealSection, {
            entries: mockEntries,
            onEditEntry,
            onAddMeal: jest.fn(),
          })
        );
      });

      const editBtn = getByTestId(root.root, 'edit-entry-btn-e1');
      act(() => {
        editBtn.props.onPress();
      });

      expect(onEditEntry).toHaveBeenCalledWith(mockEntries[0]);
    });

    test('clicking "+ Add" invokes onAddMeal with target meal type', () => {
      const onAddMeal = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(MealSection, {
            entries: mockEntries,
            onEditEntry: jest.fn(),
            onAddMeal,
          })
        );
      });

      const addDinnerBtn = getByTestId(root.root, 'add-to-meal-btn-Dinner');
      act(() => {
        addDinnerBtn.props.onPress();
      });

      expect(onAddMeal).toHaveBeenCalledWith('Dinner');
    });
  });

  describe('6. GoalSettingsModal Component', () => {
    test('renders preset options and custom input', () => {
      let root: any;
      act(() => {
        root = create(
          h(GoalSettingsModal, {
            visible: true,
            currentTarget: 2000,
            onClose: jest.fn(),
            onSaveGoal: jest.fn(),
          })
        );
      });

      const input = getByTestId(root.root, 'goal-input');
      expect(input.props.value).toBe('2000');

      const preset1800 = getByTestId(root.root, 'preset-goal-1800');
      expect(preset1800).toBeDefined();
    });

    test('tapping preset updates input value', () => {
      let root: any;
      act(() => {
        root = create(
          h(GoalSettingsModal, {
            visible: true,
            currentTarget: 2000,
            onClose: jest.fn(),
            onSaveGoal: jest.fn(),
          })
        );
      });

      const preset2500 = getByTestId(root.root, 'preset-goal-2500');
      act(() => {
        preset2500.props.onPress();
      });

      const input = getByTestId(root.root, 'goal-input');
      expect(input.props.value).toBe('2500');
    });

    test('validates out-of-range target and prevents saving', async () => {
      const onSaveGoal = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(GoalSettingsModal, {
            visible: true,
            currentTarget: 2000,
            onClose: jest.fn(),
            onSaveGoal,
          })
        );
      });

      const input = getByTestId(root.root, 'goal-input');
      act(() => {
        input.props.onChangeText('100'); // < 500
      });

      const saveBtn = getByTestId(root.root, 'save-goal-btn');
      await act(async () => {
        saveBtn.props.onPress();
      });

      expect(onSaveGoal).not.toHaveBeenCalled();
      const errorText = getByTestId(root.root, 'goal-error-text');
      expect(nodeText(errorText)).toContain('between 500 and 10,000');
    });

    test('saves valid target and calls onClose', async () => {
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

      const input = getByTestId(root.root, 'goal-input');
      act(() => {
        input.props.onChangeText('2200');
      });

      const saveBtn = getByTestId(root.root, 'save-goal-btn');
      await act(async () => {
        saveBtn.props.onPress();
      });

      expect(onSaveGoal).toHaveBeenCalledWith(2200);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('7. EditMealModal Component', () => {
    const sampleEntry: LoggedEntry = {
      id: 'entry-123',
      foodItemId: 'item-rice',
      foodName: 'Jasmine Rice',
      portion: 1.0,
      servingUnit: 'cup (150g)',
      calories: 240,
      dateString: '2026-11-03',
      mealType: 'Lunch',
      timestamp: 12345,
    };

    test('displays food details, pre-filled portion, and live preview', () => {
      let root: any;
      act(() => {
        root = create(
          h(EditMealModal, {
            visible: true,
            entry: sampleEntry,
            onClose: jest.fn(),
            onSaveEdit: jest.fn(),
            onDelete: jest.fn(),
          })
        );
      });

      const portionInput = getByTestId(root.root, 'edit-portion-input');
      expect(portionInput.props.value).toBe('1');

      const liveCalories = getByTestId(root.root, 'edit-live-calories');
      expect(nodeText(liveCalories)).toContain('240 kcal');
    });

    test('updating portion text recalculates live calories immediately', () => {
      let root: any;
      act(() => {
        root = create(
          h(EditMealModal, {
            visible: true,
            entry: sampleEntry,
            onClose: jest.fn(),
            onSaveEdit: jest.fn(),
            onDelete: jest.fn(),
          })
        );
      });

      const portionInput = getByTestId(root.root, 'edit-portion-input');
      act(() => {
        portionInput.props.onChangeText('1.5');
      });

      // 1.5 * 240 = 360 kcal
      const liveCalories = getByTestId(root.root, 'edit-live-calories');
      expect(nodeText(liveCalories)).toContain('360 kcal');
    });

    test('switches meal type and saves changes', async () => {
      const onSaveEdit = jest.fn();
      const onClose = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(EditMealModal, {
            visible: true,
            entry: sampleEntry,
            onClose,
            onSaveEdit,
            onDelete: jest.fn(),
          })
        );
      });

      // Switch to Dinner
      const dinnerChip = getByTestId(root.root, 'edit-meal-type-Dinner');
      act(() => {
        dinnerChip.props.onPress();
      });

      // Change portion to 2
      const portionInput = getByTestId(root.root, 'edit-portion-input');
      act(() => {
        portionInput.props.onChangeText('2.0');
      });

      const saveBtn = getByTestId(root.root, 'save-edit-btn');
      await act(async () => {
        saveBtn.props.onPress();
      });

      expect(onSaveEdit).toHaveBeenCalledWith('entry-123', {
        portion: 2.0,
        calories: 480,
        mealType: 'Dinner',
      });
      expect(onClose).toHaveBeenCalled();
    });

    test('delete button requires confirmation then invokes onDelete', () => {
      const onDelete = jest.fn();
      const onClose = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(EditMealModal, {
            visible: true,
            entry: sampleEntry,
            onClose,
            onSaveEdit: jest.fn(),
            onDelete,
          })
        );
      });

      // First click: sets confirmation mode
      const deleteBtn = getByTestId(root.root, 'delete-entry-btn');
      act(() => {
        deleteBtn.props.onPress();
      });

      // Second click on confirmed button
      const confirmBtn = getByTestId(root.root, 'confirm-delete-btn');
      expect(confirmBtn).toBeDefined();

      act(() => {
        confirmBtn.props.onPress();
      });

      expect(onDelete).toHaveBeenCalledWith('entry-123');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('8. FoodLoggingModal Component', () => {
    const catalog: FoodItem[] = STARTER_FOOD_CATALOG;

    test('filters catalog items via search query', () => {
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
        searchInput.props.onChangeText('apple');
      });

      const json = root.toJSON();
      expect(JSON.stringify(json)).toContain('Apple');
      expect(JSON.stringify(json)).not.toContain('Grilled Chicken Breast');
    });

    test('selecting item, fractional portion 1.5, and logging food entry', async () => {
      const onAddEntry = jest.fn();
      let root: any;
      act(() => {
        root = create(
          h(FoodLoggingModal, {
            visible: true,
            onClose: jest.fn(),
            onAddEntry,
            catalog,
            defaultMealType: 'Lunch',
            selectedDate: '2026-11-03',
          })
        );
      });

      // Find Grilled Chicken Breast (165 kcal / 100g)
      const chickenItem = catalog.find((f) => f.name.includes('Chicken Breast'));
      expect(chickenItem).toBeDefined();

      const itemRow = getByTestId(root.root, `catalog-item-${chickenItem!.id}`);
      act(() => {
        itemRow.props.onPress();
      });

      // Set portion to 1.5
      const portionInput = getByTestId(root.root, 'portion-input');
      act(() => {
        portionInput.props.onChangeText('1.5');
      });

      // Live preview: 1.5 * 165 = 247.5 -> rounded 248 kcal
      const livePreview = getByTestId(root.root, 'live-calorie-preview');
      expect(nodeText(livePreview)).toContain('248 kcal');

      // Tap Add to Log
      const addBtn = getByTestId(root.root, 'add-to-log-btn');
      await act(async () => {
        addBtn.props.onPress();
      });

      expect(onAddEntry).toHaveBeenCalledWith({
        foodItemId: chickenItem!.id,
        foodName: chickenItem!.name,
        portion: 1.5,
        servingUnit: chickenItem!.servingUnit,
        calories: 248,
        dateString: '2026-11-03',
        mealType: 'Lunch',
      });
    });

    test('switching to custom food tab logs custom meal', async () => {
      const onAddEntry = jest.fn();
      const onSaveCustomFood = jest.fn().mockResolvedValue({
        id: 'custom-pho-1',
        name: 'Homemade Beef Pho',
        servingUnit: 'large bowl',
        caloriesPerUnit: 520,
        category: 'Proteins',
      });

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

      // Switch to Custom Food tab
      const customTab = getByTestId(root.root, 'tab-custom');
      act(() => {
        customTab.props.onPress();
      });

      // Fill custom food form
      const nameInput = getByTestId(root.root, 'custom-name-input');
      const unitInput = getByTestId(root.root, 'custom-unit-input');
      const calsInput = getByTestId(root.root, 'custom-calories-input');

      act(() => {
        nameInput.props.onChangeText('Homemade Beef Pho');
        unitInput.props.onChangeText('large bowl');
        calsInput.props.onChangeText('520');
      });

      // Set portion to 1.25
      const portionInput = getByTestId(root.root, 'portion-input');
      act(() => {
        portionInput.props.onChangeText('1.25');
      });

      // Preview: 1.25 * 520 = 650 kcal
      const livePreview = getByTestId(root.root, 'live-calorie-preview');
      expect(nodeText(livePreview)).toContain('650 kcal');

      // Submit custom food
      const addBtn = getByTestId(root.root, 'add-to-log-btn');
      await act(async () => {
        addBtn.props.onPress();
      });

      expect(onSaveCustomFood).toHaveBeenCalledWith({
        name: 'Homemade Beef Pho',
        servingUnit: 'large bowl',
        caloriesPerUnit: 520,
        category: 'Proteins',
        isCustom: true,
      });

      expect(onAddEntry).toHaveBeenCalledWith({
        foodItemId: 'custom-pho-1',
        foodName: 'Homemade Beef Pho',
        portion: 1.25,
        servingUnit: 'large bowl',
        calories: 650,
        dateString: '2026-11-03',
        mealType: 'Breakfast',
      });
    });
  });

  describe('9. Root App Integration & Optimistic Updates', () => {
    test('renders root dashboard with StandaloneBadge, DateNavigator, and ProgressCard', async () => {
      let root: any;
      await act(async () => {
        root = create(h(App, null));
      });

      const badge = getByTestId(root.root, 'standalone-badge');
      expect(badge).toBeDefined();

      const dateNav = getByTestId(root.root, 'date-navigator');
      expect(dateNav).toBeDefined();

      const fab = getByTestId(root.root, 'open-logging-fab');
      expect(fab).toBeDefined();

      // Open logging modal via FAB
      act(() => {
        fab.props.onPress();
      });

      const loggingModal = getByTestId(root.root, 'food-logging-modal');
      expect(loggingModal.props.visible).toBe(true);
    });
  });
});
