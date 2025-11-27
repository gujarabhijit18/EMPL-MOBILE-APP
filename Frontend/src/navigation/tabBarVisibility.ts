import React from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

export const TAB_BAR_HEIGHT = 64;

type TabBarVisibilityContextValue = {
  showTabBar: () => void;
  hideTabBar: () => void;
  tabBarVisible: boolean;
  tabBarHeight: number;
};

export const TabBarVisibilityContext =
  React.createContext<TabBarVisibilityContextValue | null>(null);

export const useTabBarVisibility = () => {
  const context = React.useContext(TabBarVisibilityContext);

  if (!context) {
    throw new Error(
      "useTabBarVisibility must be used within a TabBarVisibilityContext provider."
    );
  }

  return context;
};

type AutoHideOptions = {
  threshold?: number;
  overscrollMargin?: number;
};

const DEFAULT_THRESHOLD = 16;
const DEFAULT_OVERSCROLL_MARGIN = 24;

export const useAutoHideTabBarOnScroll = (options?: AutoHideOptions) => {
  const { hideTabBar, showTabBar, tabBarVisible, tabBarHeight } =
    useTabBarVisibility();
  const lastOffset = React.useRef(0);
  const hiddenByScroll = React.useRef(false);

  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
  const overscrollMargin =
    options?.overscrollMargin ?? DEFAULT_OVERSCROLL_MARGIN;

  const reset = React.useCallback(() => {
    showTabBar();
    hiddenByScroll.current = false;
    lastOffset.current = 0;
  }, [showTabBar]);

  useFocusEffect(
    React.useCallback(() => {
      reset();
      return () => reset();
    }, [reset])
  );

  const handleScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentOffset = event.nativeEvent.contentOffset.y;
      const diff = currentOffset - lastOffset.current;

      if (currentOffset <= overscrollMargin) {
        if (hiddenByScroll.current) {
          reset();
        }
        lastOffset.current = currentOffset;
        return;
      }

      if (Math.abs(diff) < threshold) {
        return;
      }

      if (diff > 0) {
        if (!hiddenByScroll.current) {
          hideTabBar();
          hiddenByScroll.current = true;
        }
      } else if (hiddenByScroll.current) {
        showTabBar();
        hiddenByScroll.current = false;
      }

      lastOffset.current = currentOffset;
    },
    [hideTabBar, showTabBar, threshold, overscrollMargin, reset]
  );

  return {
    onScroll: handleScroll,
    scrollEventThrottle: 16 as const,
    reset,
    tabBarVisible,
    tabBarHeight,
  };
};
