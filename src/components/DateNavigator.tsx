import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDate(dateString: string, deltaDays: number): string {
  const parts = dateString.split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    return dateString;
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + deltaDays);
  return getLocalDateString(date);
}

export function formatFriendlyDate(dateString: string, todayStr: string = getLocalDateString()): string {
  if (dateString === todayStr) {
    return 'Today';
  }
  const yesterdayStr = shiftDate(todayStr, -1);
  if (dateString === yesterdayStr) {
    return 'Yesterday';
  }
  const tomorrowStr = shiftDate(todayStr, 1);
  if (dateString === tomorrowStr) {
    return 'Tomorrow';
  }

  const parts = dateString.split('-').map((p) => parseInt(p, 10));
  if (parts.length === 3 && !parts.some(isNaN)) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    return `${weekday}, ${month} ${parts[2]}`;
  }
  return dateString;
}

interface DateNavigatorProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  todayDate?: string;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  currentDate,
  onDateChange,
  todayDate = getLocalDateString(),
}) => {
  const friendlyLabel = formatFriendlyDate(currentDate, todayDate);
  const isToday = currentDate === todayDate;

  const handlePrevDay = () => {
    onDateChange(shiftDate(currentDate, -1));
  };

  const handleNextDay = () => {
    onDateChange(shiftDate(currentDate, 1));
  };

  const handleJumpToday = () => {
    onDateChange(todayDate);
  };

  return (
    <View style={styles.container} testID="date-navigator">
      <TouchableOpacity
        style={styles.navButton}
        onPress={handlePrevDay}
        testID="prev-date-btn"
        accessibilityLabel="Previous day"
        activeOpacity={0.65}
      >
        <Text style={styles.navButtonText}>◀</Text>
      </TouchableOpacity>

      <View style={styles.centerSection}>
        <Text style={styles.friendlyText} testID="current-date-friendly">
          {friendlyLabel}
        </Text>
        <Text style={styles.dateSubtext} testID="current-date-label">
          {currentDate}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.navButton}
        onPress={handleNextDay}
        testID="next-date-btn"
        accessibilityLabel="Next day"
        activeOpacity={0.65}
      >
        <Text style={styles.navButtonText}>▶</Text>
      </TouchableOpacity>

      {!isToday && (
        <TouchableOpacity
          style={styles.todayButton}
          onPress={handleJumpToday}
          testID="today-date-btn"
          accessibilityLabel="Jump to today"
          activeOpacity={0.75}
        >
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  navButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  friendlyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  dateSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  todayButton: {
    position: 'absolute',
    right: -4,
    top: -10,
    backgroundColor: '#0f172a',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  todayButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default DateNavigator;
