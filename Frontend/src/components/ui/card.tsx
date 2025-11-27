import React from "react";
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";

/**
 * 💳 ShadCN-style Card Component for Expo
 * Works 100% in Expo Go (no Android Studio required)
 *
 * Structure:
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Subtitle</CardDescription>
 *   </CardHeader>
 *   <CardContent>...</CardContent>
 *   <CardFooter>...</CardFooter>
 * </Card>
 */

interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface CardTextProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

/** 🧱 Base Card container */
export const Card: React.FC<CardProps> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

/** 🏷️ Card header section */
export const CardHeader: React.FC<CardProps> = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

/** 🧾 Card title (bold heading) */
export const CardTitle: React.FC<CardTextProps> = ({ children, style }) => (
  <Text style={[styles.title, style]}>{children}</Text>
);

/** 🪶 Card subtitle or secondary text */
export const CardDescription: React.FC<CardTextProps> = ({
  children,
  style,
}) => <Text style={[styles.description, style]}>{children}</Text>;

/** 📦 Card main body */
export const CardContent: React.FC<CardProps> = ({ children, style }) => (
  <View style={[styles.content, style]}>{children}</View>
);

/** 🔻 Card footer (for buttons or actions) */
export const CardFooter: React.FC<CardProps> = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB", // gray-200
    backgroundColor: "#FFFFFF",
    marginVertical: 8,
    marginHorizontal: 4,

    // ✅ Cross-platform shadow (Expo-safe)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  header: {
    padding: 16,
    paddingBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827", // gray-900
  },
  description: {
    fontSize: 14,
    color: "#6B7280", // gray-500
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});

export default Card;
