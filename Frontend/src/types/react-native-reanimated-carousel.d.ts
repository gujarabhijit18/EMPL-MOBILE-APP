import type React from "react";

interface CarouselRenderItemInfo<T> {
  index: number;
  item: T;
}

export interface CarouselScrollToOptions {
  index: number;
  animated?: boolean;
}

export interface CarouselProps<T> {
  data: T[];
  width?: number;
  height?: number;
  loop?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  renderItem: (info: CarouselRenderItemInfo<T>) => React.ReactElement | null;
  scrollAnimationDuration?: number;
  vertical?: boolean;
  onProgressChange?: (offsetProgress: number, absoluteProgress: number) => void;
  onScrollEnd?: () => void;
}

export interface CarouselHandle {
  scrollTo: (options: CarouselScrollToOptions) => void;
}

declare const Carousel: <T = any>(props: CarouselProps<T> & React.RefAttributes<CarouselHandle>) => React.ReactElement | null;

export default Carousel;
