import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import {
  AuthModal,
  CalorieProgressCard,
  DateNavigator,
  EditMealModal,
  ErrorBoundary,
  FoodLoggingModal,
  GoalSettingsModal,
  getLocalDateString,
  MealSection,
  StandaloneBadge,
} from './components';
import { defaultAuthService, GUEST_USER } from './services/authService';
import { defaultCalorieRepository } from './services/storageService';
import { FoodItem, LoggedEntry, MealType, UserProfile } from './types';
import {
  calculateDailyTotal,
  calculateRemainingBalance,
} from './utils/calorieMath';

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [entries, setEntries] = useState<LoggedEntry[]>([]);
  const [calorieTarget, setCalorieTarget] = useState<number>(2000);
  const [catalog, setCatalog] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<UserProfile>(GUEST_USER);

  // Modals state
  const [isLoggingModalVisible, setIsLoggingModalVisible] = useState<boolean>(false);
  const [isGoalModalVisible, setIsGoalModalVisible] = useState<boolean>(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<LoggedEntry | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('Breakfast');

  // Load catalog & user session on mount
  useEffect(() => {
    let isMounted = true;
    defaultCalorieRepository
      .getFoodCatalog()
      .then((cat) => {
        if (isMounted) setCatalog(cat);
      })
      .catch((err) => console.error('Failed to load food catalog:', err));

    defaultAuthService
      .getCurrentUser()
      .then((usr) => {
        if (isMounted) setCurrentUser(usr);
      })
      .catch((err) => console.error('Failed to load user session:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Load entries and goal for selected date
  const loadDateData = useCallback(async (dateStr: string) => {
    try {
      setIsLoading(true);
      const summary = await defaultCalorieRepository.getDailySummary(dateStr);
      setEntries(summary.entries || []);
      setCalorieTarget(summary.calorieTarget || 2000);
    } catch (err) {
      console.error('Failed to load date summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDateData(selectedDate);
  }, [selectedDate, loadDateData]);

  // Derived calculations via pure math engine
  const totalCalories = calculateDailyTotal(entries);
  const remainingCalories = calculateRemainingBalance(calorieTarget, totalCalories);

  // Optimistic handler: Add food entry
  const handleAddEntry = async (newEntryData: Omit<LoggedEntry, 'id' | 'timestamp'>) => {
    const tempId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticEntry: LoggedEntry = {
      ...newEntryData,
      id: tempId,
      timestamp: Date.now(),
    };

    // 1. Instant optimistic update (<16ms)
    setEntries((prev) => [...prev, optimisticEntry]);

    // 2. Asynchronous background persistence
    try {
      const persisted = await defaultCalorieRepository.addLoggedEntry(newEntryData);
      // Replace optimistic entry with persisted record
      setEntries((prev) => prev.map((e) => (e.id === tempId ? persisted : e)));
    } catch (err) {
      console.error('Failed to persist logged entry:', err);
      // Rollback on storage failure
      setEntries((prev) => prev.filter((e) => e.id !== tempId));
    }
  };

  // Optimistic handler: Edit entry
  const handleSaveEdit = async (id: string, updates: Partial<LoggedEntry>) => {
    const previousEntries = [...entries];

    // 1. Instant optimistic update
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );

    // 2. Asynchronous background persistence
    try {
      await defaultCalorieRepository.updateLoggedEntry(id, updates);
    } catch (err) {
      console.error('Failed to update logged entry:', err);
      setEntries(previousEntries);
    }
  };

  // Optimistic handler: Delete entry
  const handleDeleteEntry = async (id: string) => {
    const previousEntries = [...entries];

    // 1. Instant optimistic update
    setEntries((prev) => prev.filter((e) => e.id !== id));

    // 2. Asynchronous background persistence
    try {
      await defaultCalorieRepository.deleteLoggedEntry(id);
    } catch (err) {
      console.error('Failed to delete logged entry:', err);
      setEntries(previousEntries);
    }
  };

  // Optimistic handler: Save daily calorie target
  const handleSaveGoal = async (newTarget: number) => {
    const previousTarget = calorieTarget;

    // 1. Instant optimistic update
    setCalorieTarget(newTarget);

    // 2. Asynchronous background persistence
    try {
      await defaultCalorieRepository.setDailyGoal(selectedDate, newTarget);
    } catch (err) {
      console.error('Failed to update daily goal:', err);
      setCalorieTarget(previousTarget);
    }
  };

  // Handler: Custom food saving to catalog
  const handleSaveCustomFood = async (customFood: Omit<FoodItem, 'id'>): Promise<FoodItem> => {
    const saved = await defaultCalorieRepository.saveCustomFood(customFood);
    setCatalog((prev) => [...prev, saved]);
    return saved;
  };

  // Open food logger for a specific meal category
  const handleOpenAddForMeal = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setIsLoggingModalVisible(true);
  };

  const handleDateChange = useCallback((newDate: string) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {
      // In case LayoutAnimation isn't supported in test environment
    }
    setSelectedDate(newDate);
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <StandaloneBadge style={styles.badge} />
            <TouchableOpacity
              style={styles.userPill}
              onPress={() => setIsAuthModalVisible(true)}
              testID="open-auth-btn"
              activeOpacity={0.7}
            >
              <Text style={styles.userPillText}>
                {currentUser.provider === 'guest'
                  ? '👤 Đăng nhập'
                  : `👤 ${currentUser.name}`}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.appTitle}>Calorie Tracker</Text>
          <Text style={styles.appSubtitle}>
            100% on-device standalone tracking • Works offline without host PC
          </Text>
        </View>

        {/* Date Navigator */}
        <View style={styles.navWrapper}>
          <DateNavigator
            currentDate={selectedDate}
            onDateChange={handleDateChange}
          />
        </View>

        {/* Main Content Area */}
        {isLoading && entries.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0f172a" />
            <Text style={styles.loadingText}>Loading on-device log...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Calorie Progress Card */}
            <CalorieProgressCard
              consumed={totalCalories}
              target={calorieTarget}
              remaining={remainingCalories}
              onEditGoal={() => setIsGoalModalVisible(true)}
            />

            {/* Meal Sections Breakdown */}
            <MealSection
              entries={entries}
              onEditEntry={(entry) => setEditingEntry(entry)}
              onAddMeal={handleOpenAddForMeal}
              onDeleteEntry={handleDeleteEntry}
            />

            {/* Offline Storage Notice Footer */}
            <View style={styles.footerNotice}>
              <Text style={styles.footerNoticeText}>
                ⚡ Standalone Mode • Flash Storage Active • No Server Required
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Floating Action Button (FAB) */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setSelectedMealType('Breakfast');
            setIsLoggingModalVisible(true);
          }}
          testID="open-logging-fab"
          accessibilityLabel="Log new food"
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {/* Food Logging Modal */}
        <FoodLoggingModal
          visible={isLoggingModalVisible}
          onClose={() => setIsLoggingModalVisible(false)}
          onAddEntry={handleAddEntry}
          catalog={catalog}
          onSaveCustomFood={handleSaveCustomFood}
          defaultMealType={selectedMealType}
          selectedDate={selectedDate}
        />

        {/* Daily Goal Settings Modal */}
        <GoalSettingsModal
          visible={isGoalModalVisible}
          currentTarget={calorieTarget}
          onClose={() => setIsGoalModalVisible(false)}
          onSaveGoal={handleSaveGoal}
        />

        {/* Edit / Delete Meal Modal */}
        <EditMealModal
          visible={editingEntry !== null}
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaveEdit={handleSaveEdit}
          onDelete={handleDeleteEntry}
        />

        {/* User Authentication Modal (Google / Apple / Email / Guest) */}
        <AuthModal
          visible={isAuthModalVisible}
          currentUser={currentUser}
          onClose={() => setIsAuthModalVisible(false)}
          onUserChange={setCurrentUser}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    alignItems: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  userPill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    marginBottom: 0,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
    maxWidth: 340,
  },
  navWrapper: {
    paddingHorizontal: 16,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  footerNotice: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  footerNoticeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '300',
    marginTop: -2,
  },
});
