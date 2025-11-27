import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  ScrollViewProps,
} from "react-native";

/**
 * 📜 ScrollArea (Expo Compatible)
 * ✅ Works on iOS, Android, and Web (Expo Go)
 *
 * Features:
 * - Vertical or Horizontal Scroll
 * - Custom Smooth Scrollbar
 * - Expo-safe Animated implementation
 */

interface ScrollAreaProps extends ScrollViewProps {
  children: React.ReactNode;
  horizontal?: boolean;
  style?: any;
  contentContainerStyle?: any;
  thumbColor?: string;
  trackColor?: string;
  showScrollbar?: boolean;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({
  children,
  horizontal = false,
  style,
  contentContainerStyle,
  thumbColor = "#9CA3AF", // Tailwind gray-400
  trackColor = "#E5E7EB", // Tailwind gray-200
  showScrollbar = true,
  ...scrollProps
}) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;

  const [contentWidth, setContentWidth] = useState(1);
  const [contentHeight, setContentHeight] = useState(1);
  const [containerWidth, setContainerWidth] = useState(1);
  const [containerHeight, setContainerHeight] = useState(1);

  const scrollRatio =
    horizontal && contentWidth > containerWidth
      ? containerWidth / contentWidth
      : !horizontal && contentHeight > containerHeight
      ? containerHeight / contentHeight
      : 1;

  const thumbSize = Math.max(
    20,
    scrollRatio * (horizontal ? containerWidth : containerHeight)
  );

  const scrollTranslate = horizontal
    ? Animated.divide(scrollX, contentWidth / containerWidth)
    : Animated.divide(scrollY, contentHeight / containerHeight);

  return (
    <View
      style={[
        styles.container,
        horizontal ? styles.horizontalContainer : styles.verticalContainer,
        style,
      ]}
    >
      {/* Scrollable Area */}
      <Animated.ScrollView
        horizontal={horizontal}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: horizontal
                  ? { x: scrollX }
                  : { y: scrollY },
              },
            },
          ],
          { useNativeDriver: false }
        )}
        onContentSizeChange={(w, h) => {
          setContentWidth(w || 1);
          setContentHeight(h || 1);
        }}
        onLayout={(e: LayoutChangeEvent) => {
          setContainerWidth(e.nativeEvent.layout.width || 1);
          setContainerHeight(e.nativeEvent.layout.height || 1);
        }}
        contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
        {...scrollProps}
      >
        {children}
      </Animated.ScrollView>

      {/* Custom Scrollbar */}
      {showScrollbar && (
        <View
          style={[
            horizontal ? styles.trackHorizontal : styles.trackVertical,
            { backgroundColor: trackColor },
          ]}
        >
          <Animated.View
            style={[
              horizontal
                ? {
                    width: thumbSize,
                    transform: [
                      {
                        translateX: scrollTranslate.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, containerWidth - thumbSize],
                          extrapolate: "clamp",
                        }),
                      },
                    ],
                  }
                : {
                    height: thumbSize,
                    transform: [
                      {
                        translateY: scrollTranslate.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, containerHeight - thumbSize],
                          extrapolate: "clamp",
                        }),
                      },
                    ],
                  },
              styles.thumb,
              { backgroundColor: thumbColor },
            ]}
          />
        </View>
      )}
    </View>
  );
};

/* ✅ Expo-Safe Styling (No Native Shadows or Elevation) */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  verticalContainer: {
    width: "100%",
  },
  horizontalContainer: {
    height: "100%",
  },
  contentContainer: {
    flexGrow: 1,
  },
  trackVertical: {
    position: "absolute",
    right: 2,
    top: 2,
    bottom: 2,
    width: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  trackHorizontal: {
    position: "absolute",
    left: 2,
    right: 2,
    bottom: 2,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  thumb: {
    borderRadius: 3,
    opacity: 0.7,
  },
});

export default ScrollArea;
