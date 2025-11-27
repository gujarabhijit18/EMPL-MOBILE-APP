/**
 * Current Time Display Component
 * Shows real-time clock in IST timezone
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatAttendanceDate, getCurrentISTTime, getDayOfWeek } from '../../utils/dateTime';

interface CurrentTimeDisplayProps {
  showDate?: boolean;
  showDay?: boolean;
  showSeconds?: boolean;
  style?: any;
  timeStyle?: any;
  dateStyle?: any;
  dayStyle?: any;
}

export const CurrentTimeDisplay: React.FC<CurrentTimeDisplayProps> = ({
  showDate = true,
  showDay = true,
  showSeconds = false,
  style,
  timeStyle,
  dateStyle,
  dayStyle,
}) => {
  const [currentTime, setCurrentTime] = useState(getCurrentISTTime());

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(getCurrentISTTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    const timeStr = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    if (showSeconds) {
      return `${timeStr}:${seconds.toString().padStart(2, '0')} ${ampm}`;
    }
    
    return `${timeStr} ${ampm}`;
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.time, timeStyle]}>
        {formatTime(currentTime)}
      </Text>
      {showDate && (
        <Text style={[styles.date, dateStyle]}>
          {formatAttendanceDate(currentTime)}
        </Text>
      )}
      {showDay && (
        <Text style={[styles.day, dayStyle]}>
          {getDayOfWeek(currentTime)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  time: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  day: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
});

export default CurrentTimeDisplay;
