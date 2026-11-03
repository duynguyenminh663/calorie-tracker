import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CalorieProgressCardProps {
  consumed: number;
  target: number;
  remaining: number;
  onEditGoal?: () => void;
}

export const CalorieProgressCard: React.FC<CalorieProgressCardProps> = ({
  consumed,
  target,
  remaining,
  onEditGoal,
}) => {
  const isOver = remaining < 0;
  const safeTarget = target > 0 ? target : 2000;
  const progressRatio = consumed / safeTarget;
  const progressPercent = Math.min(100, Math.max(0, Math.round(progressRatio * 100)));

  const barColor = isOver ? '#ef4444' : progressPercent === 100 ? '#0284c7' : '#10b981';
  const remainingColor = isOver ? '#ef4444' : '#059669';

  return (
    <View style={styles.card} testID="calorie-progress-card">
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Daily Calorie Budget</Text>
        {onEditGoal && (
          <TouchableOpacity
            style={styles.editGoalBtn}
            onPress={onEditGoal}
            testID="edit-goal-btn"
            accessibilityLabel="Edit daily calorie target"
            activeOpacity={0.7}
          >
            <Text style={styles.editGoalText}>Edit Goal ⚙️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%`, backgroundColor: barColor },
            ]}
            testID="progress-bar-fill"
          />
        </View>
        <Text style={[styles.progressPercentText, { color: barColor }]} testID="progress-percent-label">
          {progressPercent}%
        </Text>
      </View>

      {/* 3 Metrics Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Consumed</Text>
          <Text style={styles.statValue} testID="stat-consumed-value">
            {consumed.toLocaleString()}
          </Text>
          <Text style={styles.statUnit}>kcal</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{isOver ? 'Over Budget' : 'Remaining'}</Text>
          <Text
            style={[styles.statValue, { color: remainingColor }]}
            testID="stat-remaining-value"
          >
            {isOver ? `-${Math.abs(remaining).toLocaleString()}` : remaining.toLocaleString()}
          </Text>
          <Text style={styles.statUnit}>kcal</Text>
        </View>

        <View style={styles.statDivider} />

        <TouchableOpacity
          style={styles.statBox}
          onPress={onEditGoal}
          activeOpacity={onEditGoal ? 0.7 : 1}
        >
          <Text style={styles.statLabel}>Target</Text>
          <Text style={styles.statValue} testID="stat-target-value">
            {safeTarget.toLocaleString()}
          </Text>
          <Text style={styles.statUnit}>kcal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editGoalBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editGoalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  statUnit: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#f1f5f9',
  },
});

export default CalorieProgressCard;
