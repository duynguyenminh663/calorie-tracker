import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LoggedEntry, MealType } from '../types';
import { calculateItemCalories, validatePortionInput } from '../utils/calorieMath';

interface EditMealModalProps {
  visible: boolean;
  entry: LoggedEntry | null;
  onClose: () => void;
  onSaveEdit: (id: string, updates: Partial<LoggedEntry>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const QUICK_PORTIONS = [0.5, 1, 1.5, 2];

export const EditMealModal: React.FC<EditMealModalProps> = ({
  visible,
  entry,
  onClose,
  onSaveEdit,
  onDelete,
}) => {
  const [portionText, setPortionText] = useState('1');
  const [mealType, setMealType] = useState<MealType>('Breakfast');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (visible && entry) {
      setPortionText(String(entry.portion || 1));
      setMealType(entry.mealType);
      setErrorMessage('');
      setConfirmDelete(false);
    }
  }, [visible, entry]);

  if (!entry) return null;

  const baseCalories =
    entry.portion > 0 ? entry.calories / entry.portion : entry.calories;

  const validation = validatePortionInput(portionText);
  const liveCalories = validation.isValid
    ? calculateItemCalories(validation.parsedValue, baseCalories)
    : 0;

  const handleQuickPortion = (mult: number) => {
    setPortionText(String(mult));
    setErrorMessage('');
  };

  const handleSave = async () => {
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Please enter a valid portion');
      return;
    }

    setErrorMessage('');
    await onSaveEdit(entry.id, {
      portion: validation.parsedValue,
      calories: liveCalories,
      mealType,
    });
    onClose();
  };

  const handleDelete = () => {
    // If running in test or headless, confirmDelete inline state handles it cleanly
    if (confirmDelete) {
      onDelete(entry.id);
      onClose();
    } else {
      // Also show Alert for native mobile UX
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Delete Food Item',
          `Are you sure you want to remove "${entry.foodName}" from your log?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                onDelete(entry.id);
                onClose();
              },
            },
          ]
        );
      }
      setConfirmDelete(true);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID="edit-meal-modal"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalContent}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleCol}>
                  <Text style={styles.title}>Edit Logged Food</Text>
                  <Text style={styles.foodNameSubtitle} numberOfLines={1}>
                    {entry.foodName} ({entry.servingUnit})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  testID="close-edit-modal-btn"
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Meal Category Selection */}
              <Text style={styles.label}>Meal Type</Text>
              <View style={styles.mealTypeRow}>
                {MEAL_TYPES.map((type) => {
                  const isSelected = mealType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.mealTypeChip,
                        isSelected && styles.mealTypeChipSelected,
                      ]}
                      onPress={() => setMealType(type)}
                      testID={`edit-meal-type-${type}`}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.mealTypeChipText,
                          isSelected && styles.mealTypeChipTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Portion Input & Quick Multipliers */}
              <Text style={styles.label}>Portion Multiplier</Text>
              <View style={styles.portionRow}>
                <TextInput
                  style={styles.portionInput}
                  value={portionText}
                  onChangeText={(text) => {
                    setPortionText(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  keyboardType="decimal-pad"
                  placeholder="1.0"
                  placeholderTextColor="#94a3b8"
                  testID="edit-portion-input"
                />
                <View style={styles.quickChips}>
                  {QUICK_PORTIONS.map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={styles.quickChip}
                      onPress={() => handleQuickPortion(q)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickChipText}>{q}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {errorMessage !== '' && (
                <Text style={styles.errorText} testID="edit-portion-error">
                  {errorMessage}
                </Text>
              )}

              {/* Live Calorie Preview */}
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Calculated Energy:</Text>
                <Text style={styles.previewCalories} testID="edit-live-calories">
                  {validation.isValid ? `${liveCalories} kcal` : 'Invalid portion'}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.deleteBtn,
                    confirmDelete && styles.deleteBtnConfirm,
                  ]}
                  onPress={handleDelete}
                  testID={confirmDelete ? 'confirm-delete-btn' : 'delete-entry-btn'}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteBtnText}>
                    {confirmDelete ? 'Confirm Delete 🗑️' : 'Delete'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  testID="save-edit-btn"
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  foodNameSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0284c7',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  mealTypeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mealTypeChipSelected: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  mealTypeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  mealTypeChipTextSelected: {
    color: '#ffffff',
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  portionInput: {
    width: 90,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  quickChips: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  previewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 14,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  previewCalories: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803d',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    alignItems: 'center',
  },
  deleteBtnConfirm: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default EditMealModal;
