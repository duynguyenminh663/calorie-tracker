import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface StandaloneBadgeProps {
  style?: ViewStyle;
  label?: string;
}

export const StandaloneBadge: React.FC<StandaloneBadgeProps> = ({
  style,
  label = '⚡ Standalone • On-Device',
}) => {
  return (
    <View style={[styles.badge, style]} testID="standalone-badge">
      <View style={styles.badgeDot} />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 9999,
    alignSelf: 'center',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 7,
  },
  badgeText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default StandaloneBadge;
