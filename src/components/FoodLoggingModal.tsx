import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { FoodCategory, FoodItem, LoggedEntry, MealType } from '../types';
import { calculateItemCalories, validatePortionInput } from '../utils/calorieMath';
import {
  estimateNutritionWithAI,
  MacroResult,
  normalizeWeightUnit,
} from '../services/aiNutrientService';

interface FoodLoggingModalProps {
  visible: boolean;
  onClose: () => void;
  onAddEntry: (entry: Omit<LoggedEntry, 'id' | 'timestamp'>) => void | Promise<void>;
  catalog: FoodItem[];
  onSaveCustomFood?: (food: Omit<FoodItem, 'id'>) => Promise<FoodItem>;
  defaultMealType?: MealType;
  selectedDate: string;
}

const CATEGORIES: Array<'All' | FoodCategory> = [
  'All',
  'Fruits',
  'Vegetables',
  'Proteins',
  'Grains',
  'Dairy',
  'Snacks & Fats',
  'Beverages',
];

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const QUICK_PORTIONS = [0.25, 0.5, 1, 1.5, 2];

export const FoodLoggingModal: React.FC<FoodLoggingModalProps> = ({
  visible,
  onClose,
  onAddEntry,
  catalog,
  onSaveCustomFood,
  defaultMealType = 'Breakfast',
  selectedDate,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | FoodCategory>('All');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  // Portion & Meal Type
  const [portionText, setPortionText] = useState('1');
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [errorMessage, setErrorMessage] = useState('');

  // Custom Food Form
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('100g');
  const [selectedWeightUnit, setSelectedWeightUnit] = useState<'g' | 'ml'>('g');
  const [customCaloriesText, setCustomCaloriesText] = useState('');
  const [customCategory, setCustomCategory] = useState<FoodCategory>('Proteins');

  // AI Macro Estimator State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMacro, setAiMacro] = useState<MacroResult | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchesCat =
        selectedCategory === 'All' || item.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [catalog, searchQuery, selectedCategory]);

  const portionValidation = validatePortionInput(portionText);

  // Dynamic preview calculation
  const previewCalories = useMemo(() => {
    if (!portionValidation.isValid) return 0;
    if (activeTab === 'catalog') {
      if (!selectedFood) return 0;
      return calculateItemCalories(portionValidation.parsedValue, selectedFood.caloriesPerUnit);
    } else {
      const cals = parseInt(customCaloriesText.trim(), 10);
      if (isNaN(cals) || cals <= 0) return 0;
      return calculateItemCalories(portionValidation.parsedValue, cals);
    }
  }, [activeTab, portionValidation, selectedFood, customCaloriesText]);

  const resetForm = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedFood(null);
    setPortionText('1');
    setMealType(defaultMealType);
    setErrorMessage('');
    setCustomName('');
    setCustomUnit('100g');
    setSelectedWeightUnit('g');
    setCustomCaloriesText('');
    setCustomCategory('Proteins');
    setIsAiLoading(false);
    setAiMacro(null);
  };

  const handleEstimateWithAI = async () => {
    if (!customName.trim()) {
      setErrorMessage('Vui lòng nhập tên món ăn trước');
      return;
    }
    setErrorMessage('');
    setIsAiLoading(true);
    try {
      const effectiveUnit = normalizeWeightUnit(customUnit, selectedWeightUnit);
      const res = await estimateNutritionWithAI(customName, effectiveUnit, apiKeyInput, selectedWeightUnit);
      if (res.success && res.data) {
        setCustomCaloriesText(String(res.data.calories));
        setCustomUnit(res.data.unit || effectiveUnit);
        setAiMacro(res.data);
      } else {
        if (res.error?.includes('API Key')) {
          setShowApiKeyInput(true);
        }
        setErrorMessage(res.error || 'Không thể ước tính dinh dưỡng');
      }
    } catch (err: any) {
      setErrorMessage('Lỗi xử lý yêu cầu: ' + (err?.message || 'Vui lòng thử lại'));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setErrorMessage('');
  };

  const handleQuickPortion = (mult: number) => {
    setPortionText(String(mult));
    setErrorMessage('');
  };

  const handleLogMeal = async () => {
    if (!portionValidation.isValid) {
      setErrorMessage(portionValidation.error || 'Please enter a valid portion');
      return;
    }

    if (activeTab === 'catalog') {
      if (!selectedFood) {
        setErrorMessage('Please select a food item from the catalog');
        return;
      }

      await onAddEntry({
        foodItemId: selectedFood.id,
        foodName: selectedFood.name,
        portion: portionValidation.parsedValue,
        servingUnit: selectedFood.servingUnit,
        calories: previewCalories,
        dateString: selectedDate,
        mealType,
      });
      handleClose();
    } else {
      // Custom food validation
      const trimmedName = customName.trim();
      if (!trimmedName) {
        setErrorMessage('Please enter a food name');
        return;
      }
      const cals = parseInt(customCaloriesText.trim(), 10);
      if (isNaN(cals) || cals <= 0) {
        setErrorMessage('Please enter valid calories per serving unit');
        return;
      }

      const effectiveUnit = normalizeWeightUnit(customUnit, selectedWeightUnit);
      let savedFoodId = `custom_${Date.now()}`;
      if (onSaveCustomFood) {
        try {
          const saved = await onSaveCustomFood({
            name: trimmedName,
            servingUnit: effectiveUnit,
            caloriesPerUnit: cals,
            category: customCategory,
            isCustom: true,
            protein: aiMacro?.protein,
            carbs: aiMacro?.carbs,
            fat: aiMacro?.fat,
          });
          savedFoodId = saved.id;
        } catch {
          // Fall back gracefully to local ID
        }
      }

      await onAddEntry({
        foodItemId: savedFoodId,
        foodName: trimmedName,
        portion: portionValidation.parsedValue,
        servingUnit: effectiveUnit,
        calories: previewCalories,
        dateString: selectedDate,
        mealType,
        protein: aiMacro?.protein,
        carbs: aiMacro?.carbs,
        fat: aiMacro?.fat,
        notes: aiMacro?.notes,
      });
      handleClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      testID="food-logging-modal"
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalContent}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Log Food Intake</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeBtn}
                  testID="close-logging-modal-btn"
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Segmented Tabs */}
              <View style={styles.tabsRow}>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'catalog' && styles.tabBtnActive]}
                  onPress={() => {
                    setActiveTab('catalog');
                    setErrorMessage('');
                  }}
                  testID="tab-catalog"
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      activeTab === 'catalog' && styles.tabBtnTextActive,
                    ]}
                  >
                    Starter Catalog ({catalog.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'custom' && styles.tabBtnActive]}
                  onPress={() => {
                    setActiveTab('custom');
                    setErrorMessage('');
                  }}
                  testID="tab-custom"
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      activeTab === 'custom' && styles.tabBtnTextActive,
                    ]}
                  >
                    + Custom Food
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.bodyScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {activeTab === 'catalog' ? (
                  <View style={styles.catalogSection}>
                    {/* Search Bar */}
                    <View style={styles.searchBar}>
                      <Text style={styles.searchIcon}>🔍</Text>
                      <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search chicken, rice, banana..."
                        placeholderTextColor="#94a3b8"
                        testID="search-catalog-input"
                      />
                      {searchQuery !== '' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                          <Text style={styles.clearSearch}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Category Filter Chips */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.categoryScroll}
                      contentContainerStyle={styles.categoryScrollContent}
                    >
                      {CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.catChip,
                              isSelected && styles.catChipSelected,
                            ]}
                            onPress={() => setSelectedCategory(cat)}
                            testID={`category-filter-${cat}`}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.catChipText,
                                isSelected && styles.catChipTextSelected,
                              ]}
                            >
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Food Items List */}
                    <View style={styles.foodListContainer}>
                      {filteredCatalog.length === 0 ? (
                        <View style={styles.emptyFoodList}>
                          <Text style={styles.emptyFoodText}>
                            No foods match "{searchQuery}"
                          </Text>
                        </View>
                      ) : (
                        filteredCatalog.slice(0, 30).map((item) => {
                          const isSelected = selectedFood?.id === item.id;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[
                                styles.foodItemRow,
                                isSelected && styles.foodItemRowSelected,
                              ]}
                              onPress={() => handleSelectFood(item)}
                              testID={`catalog-item-${item.id}`}
                              activeOpacity={0.7}
                            >
                              <View style={styles.foodItemMain}>
                                <Text
                                  style={[
                                    styles.foodItemName,
                                    isSelected && styles.foodItemNameSelected,
                                  ]}
                                >
                                  {item.name}
                                </Text>
                                <Text style={styles.foodItemSub}>
                                  {item.category} • {item.servingUnit}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.foodItemCals,
                                  isSelected && styles.foodItemCalsSelected,
                                ]}
                              >
                                {item.caloriesPerUnit} kcal
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  </View>
                ) : (
                  /* Custom Food Entry Tab */
                  <View style={styles.customSection}>
                    <Text style={styles.inputLabel}>Food Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={customName}
                      onChangeText={setCustomName}
                      placeholder="e.g. Homemade Pho"
                      placeholderTextColor="#94a3b8"
                      testID="custom-name-input"
                    />

                    <View style={styles.formRow}>
                      <View style={styles.formCol}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.inputLabel}>Khối lượng / Thể tích</Text>
                          <View style={styles.unitPillsRow}>
                            <TouchableOpacity
                              style={[styles.unitPillBtn, selectedWeightUnit === 'g' && styles.unitPillBtnActive]}
                              onPress={() => setSelectedWeightUnit('g')}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.unitPillText, selectedWeightUnit === 'g' && styles.unitPillTextActive]}>
                                gam (g)
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.unitPillBtn, selectedWeightUnit === 'ml' && styles.unitPillBtnActive]}
                              onPress={() => setSelectedWeightUnit('ml')}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.unitPillText, selectedWeightUnit === 'ml' && styles.unitPillTextActive]}>
                                ml
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          value={customUnit}
                          onChangeText={setCustomUnit}
                          placeholder={selectedWeightUnit === 'g' ? 'VD: 100g, 250...' : 'VD: 150ml, 300...'}
                          placeholderTextColor="#94a3b8"
                          testID="custom-unit-input"
                        />
                      </View>

                      <View style={styles.formCol}>
                        <Text style={styles.inputLabel}>Calories / Đơn vị *</Text>
                        <TextInput
                          style={styles.textInput}
                          value={customCaloriesText}
                          onChangeText={setCustomCaloriesText}
                          keyboardType="numeric"
                          placeholder="VD: 350"
                          placeholderTextColor="#94a3b8"
                          testID="custom-calories-input"
                        />
                      </View>
                    </View>

                    {/* AI Macro Estimator Card */}
                    <View style={styles.aiCard}>
                      <View style={styles.aiHeader}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.aiTitle}>✨ AI Macro Estimator</Text>
                          <Text style={styles.aiSubtitle}>Tự tính Calo & Macro từ tên và khối lượng</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.aiBtn, isAiLoading && styles.aiBtnDisabled]}
                          onPress={handleEstimateWithAI}
                          disabled={isAiLoading}
                          testID="ai-estimate-btn"
                          activeOpacity={0.8}
                        >
                          {isAiLoading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.aiBtnText}>✨ Tính bằng AI</Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      {showApiKeyInput && (
                        <View style={styles.apiKeyRow}>
                          <Text style={styles.apiKeyLabel}>Gemini API Key:</Text>
                          <TextInput
                            style={styles.apiKeyInput}
                            value={apiKeyInput}
                            onChangeText={setApiKeyInput}
                            placeholder="Nhập Gemini API Key (AIza...)"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry
                          />
                        </View>
                      )}

                      {aiMacro && (
                        <View style={styles.macroPillsRow}>
                          <View style={[styles.macroPill, { backgroundColor: '#eff6ff' }]}>
                            <Text style={[styles.macroPillLabel, { color: '#1d4ed8' }]}>Protein</Text>
                            <Text style={[styles.macroPillVal, { color: '#1d4ed8' }]}>{aiMacro.protein}g</Text>
                          </View>
                          <View style={[styles.macroPill, { backgroundColor: '#fef3c7' }]}>
                            <Text style={[styles.macroPillLabel, { color: '#b45309' }]}>Carbs</Text>
                            <Text style={[styles.macroPillVal, { color: '#b45309' }]}>{aiMacro.carbs}g</Text>
                          </View>
                          <View style={[styles.macroPill, { backgroundColor: '#fdf2f8' }]}>
                            <Text style={[styles.macroPillLabel, { color: '#be185d' }]}>Fat</Text>
                            <Text style={[styles.macroPillVal, { color: '#be185d' }]}>{aiMacro.fat}g</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Common Inputs: Portion & Meal Type */}
                <View style={styles.portionSection}>
                  <Text style={styles.inputLabel}>Portion Multiplier</Text>
                  <View style={styles.portionControls}>
                    <TextInput
                      style={styles.portionInput}
                      value={portionText}
                      onChangeText={(t) => {
                        setPortionText(t);
                        if (errorMessage) setErrorMessage('');
                      }}
                      keyboardType="decimal-pad"
                      placeholder="1.0"
                      placeholderTextColor="#94a3b8"
                      testID="portion-input"
                    />
                    <View style={styles.quickChips}>
                      {QUICK_PORTIONS.map((q) => (
                        <TouchableOpacity
                          key={q}
                          style={styles.quickChip}
                          onPress={() => handleQuickPortion(q)}
                          testID={`quick-portion-${q}`}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.quickChipText}>{q}x</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Meal Type</Text>
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
                          testID={`meal-type-select-${type}`}
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

                  {/* Live Calorie Preview Card */}
                  <View style={styles.previewCard} testID="live-calorie-preview">
                    <Text style={styles.previewTitle}>Live Energy Preview:</Text>
                    <Text style={styles.previewValue}>
                      {previewCalories} kcal
                    </Text>
                  </View>

                  {errorMessage !== '' && (
                    <Text style={styles.errorText} testID="logging-error-text">
                      {errorMessage}
                    </Text>
                  )}
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleLogMeal}
                  testID="add-to-log-btn"
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitBtnText}>Add to Log</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#0f172a',
  },
  bodyScroll: {
    maxHeight: 400,
  },
  catalogSection: {
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  clearSearch: {
    fontSize: 14,
    color: '#94a3b8',
    padding: 4,
  },
  categoryScroll: {
    marginBottom: 10,
  },
  categoryScrollContent: {
    gap: 6,
  },
  catChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipSelected: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  catChipTextSelected: {
    color: '#ffffff',
  },
  foodListContainer: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyFoodList: {
    padding: 20,
    alignItems: 'center',
  },
  emptyFoodText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  foodItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  foodItemRowSelected: {
    backgroundColor: '#e0f2fe',
  },
  foodItemMain: {
    flex: 1,
    paddingRight: 8,
  },
  foodItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  foodItemNameSelected: {
    color: '#0369a1',
  },
  foodItemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  foodItemCals: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  foodItemCalsSelected: {
    color: '#0284c7',
  },
  customSection: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formCol: {
    flex: 1,
  },
  portionSection: {
    paddingTop: 4,
  },
  portionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  portionInput: {
    width: 80,
    height: 42,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  quickChips: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
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
  previewCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 10,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803d',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  unitPillsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  unitPillBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unitPillBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  unitPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  unitPillTextActive: {
    color: '#ffffff',
  },
  aiCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  aiSubtitle: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 2,
  },
  aiBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBtnDisabled: {
    opacity: 0.6,
  },
  aiBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  apiKeyRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#bbf7d0',
  },
  apiKeyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  apiKeyInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0f172a',
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  macroPill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  macroPillLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  macroPillVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
});

export default FoodLoggingModal;
