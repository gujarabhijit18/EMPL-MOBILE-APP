import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react-native";

/**
 * 📱 Pagination Component (Expo Compatible)
 * ✅ Works perfectly in Expo Go (iOS, Android, Web)
 * - Uses lucide-react-native icons
 * - Expo-safe shadows (no elevation)
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pages = generatePages(currentPage, totalPages);

  return (
    <View style={styles.paginationContainer}>
      {/* ◀️ Previous Button */}
      <TouchableOpacity
        style={[styles.button, currentPage === 1 && styles.disabled]}
        disabled={currentPage === 1}
        onPress={() => onPageChange(currentPage - 1)}
        activeOpacity={0.7}
      >
        <ChevronLeft size={18} color="#1E3A8A" />
        <Text style={styles.buttonText}>Previous</Text>
      </TouchableOpacity>

      {/* 🔢 Page Numbers */}
      <View style={styles.pageGroup}>
        {pages.map((page, index) => (
          <React.Fragment key={index}>
            {page === "..." ? (
              <View style={styles.ellipsis}>
                <MoreHorizontal size={18} color="#6B7280" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => onPageChange(page)}
                style={[
                  styles.pageButton,
                  currentPage === page && styles.pageButtonActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pageText,
                    currentPage === page && styles.pageTextActive,
                  ]}
                >
                  {page}
                </Text>
              </TouchableOpacity>
            )}
          </React.Fragment>
        ))}
      </View>

      {/* ▶️ Next Button */}
      <TouchableOpacity
        style={[styles.button, currentPage === totalPages && styles.disabled]}
        disabled={currentPage === totalPages}
        onPress={() => onPageChange(currentPage + 1)}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>Next</Text>
        <ChevronRight size={18} color="#1E3A8A" />
      </TouchableOpacity>
    </View>
  );
};

/* 🔢 Generate Page Numbers with Ellipsis */
const generatePages = (current: number, total: number): (number | "...")[] => {
  const delta = 2;
  const range: (number | "...")[] = [];
  const rangeWithDots: (number | "...")[] = [];
  let last: number | undefined;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (let i of range) {
    if (last !== undefined && typeof i === "number") {
      if (i - last === 2) rangeWithDots.push(last + 1);
      else if (i - last !== 1) rangeWithDots.push("...");
    }
    rangeWithDots.push(i);
    if (typeof i === "number") last = i;
  }

  return rangeWithDots;
};

/* --------------------------------------------
 * 🎨 Styles (Expo-safe)
 * -------------------------------------------- */
const styles = StyleSheet.create({
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    flexWrap: "wrap",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    marginHorizontal: 4,
    // ✅ Expo-safe shadow instead of Android elevation
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#1E3A8A",
    fontWeight: "500",
    marginHorizontal: 4,
  },
  pageGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginHorizontal: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  pageButtonActive: {
    backgroundColor: "#1E40AF",
    borderColor: "#1E40AF",
  },
  pageText: {
    fontSize: 14,
    color: "#1E3A8A",
    fontWeight: "500",
  },
  pageTextActive: {
    color: "#FFFFFF",
  },
  ellipsis: {
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Pagination;
