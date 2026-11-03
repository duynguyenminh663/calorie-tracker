import React, { useEffect, useState } from 'react';
import {
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

interface GoalSettingsModalProps {
  visible: boolean;
  currentTarget: number;
  onClose: () => void;
  onSaveGoal: (newTarget: number) => void | Promise<void>;
}

const PRESET_GOALS = [1500, 1800, 2000, 2200, 2500];

export const GoalSettingsModal: React.FC<GoalSettingsModalProps> = ({
  visible,
  currentTarget,
  onClose,
  onSaveGoal,
}) => {
  const [targetText, setTargetText] = useState(String(currentTarget || 2000));
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setTargetText(String(currentTarget || 2000));
      setErrorMessage('');
    }
  }, [visible, currentTarget]);

  const handleSelectPreset = (preset: number) => {
    setTargetText(String(preset));
    setErrorMessage('');
  };

  const handleSave = async () => {
    const val = parseInt(targetText.trim(), 10);
    if (isNaN(val) || val <= 0) {
      setErrorMessage('Please enter a valid positive number');
      return;
    }
    if (val < 500 || val > 10000) {
      setErrorMessage('Daily calorie target must be between 500 and 10,000 kcal');
      return;
    }

    setErrorMessage('');
    await onSaveGoal(val);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID="goal-settings-modal"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalContent}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Daily Calorie Target</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  testID="cancel-goal-btn"
                  accessibilityLabel="Close goal settings"
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                Set your personal daily calorie intake goal. Your remaining balance and progress
                will update instantly on device.
              </Text>

              {/* Quick Preset Buttons */}
              <Text style={styles.sectionLabel}>Quick Presets</Text>
              <View style={styles.presetsRow}>
                {PRESET_GOALS.map((preset) => {
                  const isSelected = targetText.trim() === String(preset);
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                      onPress={() => handleSelectPreset(preset)}
                      testID={`preset-goal-${preset}`}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected && styles.presetChipTextSelected,
                        ]}
                      >
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Input */}
              <Text style={styles.sectionLabel}>Target (kcal / day)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={targetText}
                  onChangeText={(text) => {
                    setTargetText(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  keyboardType="numeric"
                  placeholder="e.g. 2000"
                  placeholderTextColor="#94a3b8"
                  testID="goal-input"
                  maxLength={5}
                />
                <Text style={styles.inputUnit}>kcal</Text>
              </View>

              {errorMessage !== '' && (
                <Text style={styles.errorText} testID="goal-error-text">
                  {errorMessage}
                </Text>
              )}

              {/* Actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  testID="save-goal-btn"
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveBtnText}>Save Target</Text>
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChipSelected: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  presetChipTextSelected: {
    color: '#ffffff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 12,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
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

export default GoalSettingsModal;
