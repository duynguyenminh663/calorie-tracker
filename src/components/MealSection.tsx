import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LoggedEntry, MealType } from '../types';

interface MealSectionProps {
  entries: LoggedEntry[];
  onEditEntry: (entry: LoggedEntry) => void;
  onAddMeal?: (mealType: MealType) => void;
  onDeleteEntry?: (id: string) => void;
}

const MEAL_TYPES: Array<{ type: MealType; label: string; icon: string }> = [
  { type: 'Breakfast', label: 'Breakfast', icon: '🍳' },
  { type: 'Lunch', label: 'Lunch', icon: '🥗' },
  { type: 'Dinner', label: 'Dinner', icon: '🍽️' },
  { type: 'Snack', label: 'Snack', icon: '🍎' },
];

export const MealSection: React.FC<MealSectionProps> = ({
  entries,
  onEditEntry,
  onAddMeal,
  onDeleteEntry,
}) => {
  return (
    <View style={styles.container} testID="meal-sections-container">
      {MEAL_TYPES.map(({ type, label, icon }) => {
        const mealEntries = entries.filter((e) => e.mealType === type);
        const mealSubtotal = mealEntries.reduce((sum, e) => sum + (e.calories || 0), 0);

        return (
          <View
            key={type}
            style={styles.sectionCard}
            testID={`meal-section-${type}`}
          >
            {/* Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.mealIcon}>{icon}</Text>
                <Text style={styles.mealTitle}>{label}</Text>
                <Text
                  style={styles.mealSubtotal}
                  testID={`meal-subtotal-${type}`}
                >
                  {mealSubtotal} kcal
                </Text>
              </View>

              {onAddMeal && (
                <TouchableOpacity
                  style={styles.addMealButton}
                  onPress={() => onAddMeal(type)}
                  testID={`add-to-meal-btn-${type}`}
                  accessibilityLabel={`Add food to ${label}`}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addMealButtonText}>+ Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Meal Items */}
            {mealEntries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No {label.toLowerCase()} logged</Text>
              </View>
            ) : (
              <View style={styles.itemList}>
                {mealEntries.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemRow}
                    onPress={() => onEditEntry(item)}
                    testID={`meal-item-row-${item.id}`}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemMain}>
                      <Text
                        style={styles.itemName}
                        testID={`meal-item-name-${item.id}`}
                        numberOfLines={1}
                      >
                        {item.foodName}
                      </Text>
                      <Text style={styles.itemPortion}>
                        {item.portion} × {item.servingUnit}
                        {item.protein !== undefined && item.protein !== null ? ` • P:${item.protein}g C:${item.carbs}g F:${item.fat}g` : ''}
                      </Text>
                    </View>

                    <View style={styles.itemRight}>
                      <Text
                        style={styles.itemCalories}
                        testID={`meal-item-calories-${item.id}`}
                      >
                        {item.calories} kcal
                      </Text>
                      <TouchableOpacity
                        style={styles.editIconBtn}
                        onPress={() => onEditEntry(item)}
                        testID={`edit-entry-btn-${item.id}`}
                        accessibilityLabel={`Edit ${item.foodName}`}
                      >
                        <Text style={styles.editIconText}>✏️</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 10,
  },
  mealSubtotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addMealButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  addMealButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  emptyContainer: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  itemList: {
    paddingTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemMain: {
    flex: 1,
    paddingRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  itemPortion: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 8,
  },
  editIconBtn: {
    padding: 4,
  },
  editIconText: {
    fontSize: 13,
  },
});

export default MealSection;
