import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import {
  Modal,
  Portal,
  Button,
  TextInput,
  useTheme,
  Divider,
} from "react-native-paper";
import Icon from "react-native-vector-icons/Feather";

// ✅ Interface for Rating Data
export interface EmployeeRating {
  employeeId: string;
  productivityRating: number;
  productivityDescription: string;
  qualityRating: number;
  qualityDescription: string;
  month: string;
  year: number;
  ratedBy: string;
  ratedAt: string;
}

interface RatingDialogProps {
  visible: boolean;
  onDismiss: () => void;
  employeeId: string;
  employeeName: string;
  onSave: (ratings: EmployeeRating) => void;
  currentRatings?: EmployeeRating;
}

export default function RatingDialog({
  visible,
  onDismiss,
  employeeId,
  employeeName,
  onSave,
  currentRatings,
}: RatingDialogProps) {
  const theme = useTheme();

  const [productivityRating, setProductivityRating] = useState(0);
  const [productivityDescription, setProductivityDescription] = useState("");
  const [qualityRating, setQualityRating] = useState(0);
  const [qualityDescription, setQualityDescription] = useState("");
  const [hoverProd, setHoverProd] = useState(0);
  const [hoverQual, setHoverQual] = useState(0);

  // ✅ Load existing ratings when dialog opens
  useEffect(() => {
    if (currentRatings) {
      setProductivityRating(currentRatings.productivityRating);
      setProductivityDescription(currentRatings.productivityDescription);
      setQualityRating(currentRatings.qualityRating);
      setQualityDescription(currentRatings.qualityDescription);
    } else {
      setProductivityRating(0);
      setProductivityDescription("");
      setQualityRating(0);
      setQualityDescription("");
    }
  }, [currentRatings, visible]);

  // ✅ Rating labels
  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1:
        return "Poor";
      case 2:
        return "Below Average";
      case 3:
        return "Average";
      case 4:
        return "Good";
      case 5:
        return "Excellent";
      default:
        return "Not Rated";
    }
  };

  // ✅ Save locally (no API)
  const handleSave = () => {
    if (productivityRating === 0 || qualityRating === 0) {
      Alert.alert(
        "Incomplete Ratings",
        "Please provide ratings for both Productivity and Quality."
      );
      return;
    }
    if (!productivityDescription.trim() || !qualityDescription.trim()) {
      Alert.alert("Incomplete Feedback", "Please provide comments for both ratings.");
      return;
    }

    const now = new Date();
    const rating: EmployeeRating = {
      employeeId,
      productivityRating,
      productivityDescription: productivityDescription.trim(),
      qualityRating,
      qualityDescription: qualityDescription.trim(),
      month: now.toLocaleString("default", { month: "long" }),
      year: now.getFullYear(),
      ratedBy: "Current User", // static for demo
      ratedAt: now.toISOString(),
    };

    // Just local callback — no API
    onSave(rating);
    Alert.alert("✅ Success", `Ratings saved for ${employeeName}`);
    onDismiss();
  };

  // ✅ Star rendering (Expo-safe)
  const renderStars = (
    rating: number,
    setRating: (r: number) => void,
    hovered: number,
    setHovered: (r: number) => void
  ) => (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => setRating(star)}
          onPressIn={() => setHovered(star)}
          onPressOut={() => setHovered(0)}
          activeOpacity={0.7}
        >
          <Icon
            name="star"
            size={30}
            color={star <= (hovered || rating) ? "#FACC15" : "#D1D5DB"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Rate Employee Performance</Text>
            <Text style={styles.subtitle}>
              Provide performance ratings for {employeeName}
            </Text>
          </View>

          {/* Productivity Section */}
          <View style={styles.section}>
            <Text style={styles.label}>Productivity</Text>
            <View style={styles.starRow}>
              {renderStars(
                productivityRating,
                setProductivityRating,
                hoverProd,
                setHoverProd
              )}
              <Text style={styles.ratingText}>
                {getRatingText(productivityRating)}
              </Text>
            </View>

            <TextInput
              label="Description / Comments"
              value={productivityDescription}
              onChangeText={setProductivityDescription}
              mode="outlined"
              multiline
              maxLength={500}
              style={styles.textArea}
            />
            <Text style={styles.counter}>
              {productivityDescription.length}/500
            </Text>
          </View>

          <Divider style={{ marginVertical: 10 }} />

          {/* Quality Section */}
          <View style={styles.section}>
            <Text style={styles.label}>Quality Score</Text>
            <View style={styles.starRow}>
              {renderStars(
                qualityRating,
                setQualityRating,
                hoverQual,
                setHoverQual
              )}
              <Text style={styles.ratingText}>
                {getRatingText(qualityRating)}
              </Text>
            </View>

            <TextInput
              label="Description / Comments"
              value={qualityDescription}
              onChangeText={setQualityDescription}
              mode="outlined"
              multiline
              maxLength={500}
              style={styles.textArea}
            />
            <Text style={styles.counter}>{qualityDescription.length}/500</Text>
          </View>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={styles.button}
              textColor={theme.colors.primary}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
            >
              Save Ratings
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

// ✅ Styles
const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    margin: 20,
    borderRadius: 16,
    elevation: 5,
    maxHeight: "90%",
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontWeight: "700",
    fontSize: 18,
    color: "#111827",
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    marginTop: 12,
  },
  label: {
    fontWeight: "600",
    marginBottom: 4,
    fontSize: 15,
    color: "#111827",
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 8,
  },
  textArea: {
    backgroundColor: "#F9FAFB",
  },
  counter: {
    textAlign: "right",
    color: "#9CA3AF",
    fontSize: 11,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    marginBottom: 10,
  },
  button: {
    borderRadius: 10,
    marginLeft: 10,
  },
});
