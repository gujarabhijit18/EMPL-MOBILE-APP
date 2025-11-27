import React, { useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

const { width: screenWidth } = Dimensions.get("window");

interface CarouselProps {
  data: any[];
  renderItem: ({ item, index }: { item: any; index: number }) => React.ReactElement;
  width?: number;
  height?: number;
  loop?: boolean;
  autoPlay?: boolean;
  orientation?: "horizontal" | "vertical";
  onScrollEnd?: () => void;
}

interface IconProps {
  color?: string;
  size?: number;
}

/**
 * 🎠 Carousel Component — Expo Compatible
 * Works perfectly in Expo Go (no Android Studio required)
 */
export const CarouselComponent: React.FC<CarouselProps> = ({
  data,
  renderItem,
  width = screenWidth * 0.85,
  height = 200,
  loop = true,
  autoPlay = false,
  orientation = "horizontal",
  onScrollEnd,
}) => {
  const carouselRef = useRef<any>(null);
  const [index, setIndex] = useState(0);

  const scrollPrev = () => {
    if (carouselRef.current && data.length > 0) {
      carouselRef.current.scrollTo({ index: index - 1, animated: true });
    }
  };

  const scrollNext = () => {
    if (carouselRef.current && data.length > 0) {
      carouselRef.current.scrollTo({ index: index + 1, animated: true });
    }
  };

  const LucideIconWrapper: React.FC<IconProps & { icon: React.ComponentType<IconProps> }> = ({
    icon: Icon,
    color,
    size,
  }) => <Icon color={color} size={size} />;

  return (
    <View style={[styles.container, { height }]}>
      <Carousel
        ref={carouselRef}
        width={width}
        height={height}
        loop={loop}
        autoPlay={autoPlay}
        autoPlayInterval={3500}
        data={data}
        renderItem={renderItem}
        scrollAnimationDuration={800}
        vertical={orientation === "vertical"}
        onProgressChange={(_, absoluteProgress: number) => {
          setIndex(Math.round(absoluteProgress));
        }}
        onScrollEnd={onScrollEnd}
      />

      {/* Left / Up Arrow */}
      <TouchableOpacity
        onPress={scrollPrev}
        activeOpacity={0.8}
        style={[
          styles.arrowButton,
          orientation === "horizontal"
            ? { left: -20, top: "45%" }
            : { top: -20, left: "45%", transform: [{ rotate: "90deg" }] },
        ]}
      >
        <LucideIconWrapper icon={ChevronLeft} color="#FFFFFF" size={18} />
      </TouchableOpacity>

      {/* Right / Down Arrow */}
      <TouchableOpacity
        onPress={scrollNext}
        activeOpacity={0.8}
        style={[
          styles.arrowButton,
          orientation === "horizontal"
            ? { right: -20, top: "45%" }
            : { bottom: -20, left: "45%", transform: [{ rotate: "90deg" }] },
        ]}
      >
        <LucideIconWrapper icon={ChevronRight} color="#FFFFFF" size={18} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  arrowButton: {
    position: "absolute",
    backgroundColor: "#1E40AF", // blue-800
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default CarouselComponent;
