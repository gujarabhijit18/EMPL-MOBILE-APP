import React, { useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import {
  Calendar as RNCalendar,
  type DateData,
} from "react-native-calendars";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

interface CalendarProps {
  onDayPress?: (day: DateData) => void;
  selectedDate?: string;
  minDate?: string;
  maxDate?: string;
  markedDates?: Record<string, any>;
  themeColor?: string;
  showArrows?: boolean;
}

/**
 * 📅 Calendar Component (Expo-Compatible)
 * Works perfectly inside Expo Go (no Android Studio required)
 */
export const Calendar: React.FC<CalendarProps> = ({
  onDayPress,
  selectedDate,
  minDate,
  maxDate,
  markedDates = {},
  themeColor = "#2563EB",
  showArrows = true,
}) => {
  const [current, setCurrent] = useState<string | undefined>(selectedDate);

  return (
    <View style={styles.container}>
      <RNCalendar
        current={current}
        onDayPress={(day) => {
          setCurrent(day.dateString);
          onDayPress?.(day);
        }}
        minDate={minDate}
        maxDate={maxDate}
        markedDates={{
          ...(selectedDate
            ? {
                [selectedDate]: {
                  selected: true,
                  selectedColor: themeColor,
                  textColor: "#FFFFFF",
                },
              }
            : {}),
          ...markedDates,
        }}
        renderArrow={(direction) =>
          showArrows ? (
            <View style={styles.arrow}>
              <Icon
                name={
                  direction === "left" ? "chevron-left" : "chevron-right"
                }
                size={20}
                color="#374151"
              />
            </View>
          ) : null
        }
        theme={{
          backgroundColor: "#FFFFFF",
          calendarBackground: "#FFFFFF",
          textSectionTitleColor: "#6B7280",
          selectedDayBackgroundColor: themeColor,
          selectedDayTextColor: "#FFFFFF",
          todayTextColor: "#10B981",
          dayTextColor: "#111827",
          textDisabledColor: "#9CA3AF",
          arrowColor: themeColor,
          monthTextColor: "#111827",
          textMonthFontWeight: "bold",
          textDayFontSize: 14,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 12,
          // Expo-compatible font handling
          ...(Platform.OS === "android" && {
            textDayFontFamily: "System",
            textMonthFontFamily: "System",
            textDayHeaderFontFamily: "System",
          }),
        }}
        enableSwipeMonths
        style={styles.calendar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    // ✅ Cross-platform shadow (Expo-safe)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  calendar: {
    padding: 8,
    borderRadius: 12,
  },
  arrow: {
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Calendar;
