import { Platform } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

// Re-export for convenience
export { wp, hp };

const primaryGreen = "#22C55E";
const primaryBlue = "#3B82F6";
const errorRed = "#FF4D4F";
const warningYellow = "#F5C842";
const warningOrange = "#F59E0B";

export const Colors = {
  light: {
    text: "#FFFFFF",
    textSecondary: "#9CA3AF",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B7280",
    tabIconSelected: primaryGreen,
    link: primaryGreen,
    primary: primaryGreen,
    secondary: primaryBlue,
    success: primaryGreen,
    warning: warningYellow,
    error: errorRed,
    backgroundRoot: "#000000",
    backgroundDefault: "#1A1A1A",
    backgroundSecondary: "#262626",
    backgroundTertiary: "#333333",
    progressTrack: "#374151",
    progressFill: primaryGreen,
    border: "#374151",
    cardShadow: "rgba(0,0,0,0.3)",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#9CA3AF",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B7280",
    tabIconSelected: primaryGreen,
    link: primaryGreen,
    primary: primaryGreen,
    secondary: primaryBlue,
    success: primaryGreen,
    warning: warningYellow,
    error: errorRed,
    backgroundRoot: "#000000",
    backgroundDefault: "#1A1A1A",
    backgroundSecondary: "#262626",
    backgroundTertiary: "#333333",
    progressTrack: "#374151",
    progressFill: primaryGreen,
    border: "#374151",
    cardShadow: "rgba(0,0,0,0.3)",
  },
};

export function getScoreColor(score: number): string {
  if (score > 80) return primaryGreen;
  if (score > 60) return warningYellow;
  return errorRed;
}

// Base width: 375px (Standard iPhone width, good baseline)
// We scale spacing based on width to maintain proportions
const scaleW = (px: number) => wp(`${(px / 375) * 100}%`);
// For things that must scale vertically specifically (rare for general spacing, but options exist in components)
const scaleH = (px: number) => hp(`${(px / 812) * 100}%`);

export const Spacing = {
  xs: scaleW(4),
  sm: scaleW(8),
  md: scaleW(12),
  lg: scaleW(16),
  xl: scaleW(20),
  "2xl": scaleW(24),
  "3xl": scaleW(32),
  "4xl": scaleW(40),
  "5xl": scaleW(48),
  inputHeight: scaleH(48), // Height often safer with scaleH or minHeight
  buttonHeight: scaleH(52),
};

export const BorderRadius = {
  xs: scaleW(8),
  sm: scaleW(12),
  md: scaleW(16),
  lg: scaleW(20),
  xl: scaleW(24),
  "2xl": scaleW(32),
  "3xl": scaleW(40),
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: scaleW(32),
    lineHeight: scaleW(40),
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: scaleW(28),
    lineHeight: scaleW(36),
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: scaleW(24),
    lineHeight: scaleW(32),
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: scaleW(20),
    lineHeight: scaleW(28),
    fontWeight: "600" as const,
  },
  body: {
    fontSize: scaleW(16),
    lineHeight: scaleW(24),
    fontWeight: "400" as const,
  },
  small: {
    fontSize: scaleW(14),
    lineHeight: scaleW(20),
    fontWeight: "400" as const,
  },
  label: {
    fontSize: scaleW(12),
    lineHeight: scaleW(16),
    fontWeight: "500" as const,
  },
  link: {
    fontSize: scaleW(16),
    lineHeight: scaleW(24),
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});


