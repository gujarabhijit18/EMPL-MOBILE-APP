import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import Modal from "react-native-modal";
import { Calendar } from "lucide-react-native";
import { CalendarList, DateData } from "react-native-calendars";
import { format } from "date-fns";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: object;
}

/**
 * 📅 DatePicker — Expo Compatible
 * - Uses react-native-calendars and react-native-modal (Expo-safe)
 * - No native linking required
 * - Works on iOS, Android, and Web
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  style,
}) => {
  const [visible, setVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date);

  // Sync external date prop
  useEffect(() => {
    if (date) setSelectedDate(date);
  }, [date]);

  const handleSelectDate = (day: DateData) => {
    const newDate = new Date(day.dateString);
    setSelectedDate(newDate);
    onDateChange?.(newDate);
    setVisible(false);
  };

  const formattedDate = selectedDate ? format(selectedDate, "PPP") : placeholder;

  return (
    <>
      {/* 🟢 Date Trigger Button */}
      <TouchableOpacity
        disabled={disabled}
        activeOpacity={0.8}
        style={[styles.button, disabled && { opacity: 0.6 }, style]}
        onPress={() => setVisible(true)}
      >
        <Calendar size={18} color="#2563EB" style={styles.icon} />
        <Text
          style={[
            styles.text,
            !selectedDate && { color: "#9CA3AF" },
          ]}
        >
          {formattedDate}
        </Text>
      </TouchableOpacity>

      {/* 📅 Calendar Modal */}
      <Modal
        isVisible={visible}
        onBackdropPress={() => setVisible(false)}
        backdropOpacity={0.25}
        useNativeDriver
        animationIn="zoomIn"
        animationOut="zoomOut"
        style={styles.modal}
        hideModalContentWhileAnimating
      >
        <View style={styles.calendarContainer}>
          <CalendarList
            pastScrollRange={12}
            futureScrollRange={12}
            scrollEnabled
            horizontal
            pagingEnabled
            current={
              selectedDate ? selectedDate.toISOString().split("T")[0] : undefined
            }
            onDayPress={handleSelectDate}
            markedDates={
              selectedDate
                ? {
                    [selectedDate.toISOString().split("T")[0]]: {
                      selected: true,
                      selectedColor: "#2563EB",
                      selectedTextColor: "#FFFFFF",
                    },
                  }
                : {}
            }
            theme={{
              backgroundColor: "#FFFFFF",
              calendarBackground: "#FFFFFF",
              selectedDayBackgroundColor: "#2563EB",
              todayTextColor: "#059669",
              arrowColor: "#2563EB",
              monthTextColor: "#111827",
              textSectionTitleColor: "#6B7280",
              textDisabledColor: "#D1D5DB",
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12,
            }}
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: "flex-start",
    width: "100%",
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 15,
    color: "#111827",
  },
  modal: {
    justifyContent: "center",
    alignItems: "center",
    margin: 0,
  },
  calendarContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    padding: 10,
    width: "90%",
    maxHeight: "80%",
    // ✅ Expo-safe shadow (no elevation)
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default DatePicker;
