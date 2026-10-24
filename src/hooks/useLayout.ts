import { useWindowDimensions } from 'react-native';

/** Breakpoints: phones get a bottom bar; tablets and desktops a sidebar and wider layouts. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, isWide: width >= 900, isTablet: width >= 640 };
}

export const SIDEBAR_WIDTH = 248;
