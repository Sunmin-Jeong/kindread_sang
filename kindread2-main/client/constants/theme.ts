import { Platform } from "react-native";

export const KindreadColors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  textPrimary: "#0A0A0A", // 더 진하고 선명하게 수정
  textSecondary: "#2D2D2D", // 가독성 향상
  accent: "#2A7A52", // 요청하신 쿨톤 포레스트 그린
  border: "#EBEBEB",
  buttonText: "#FFFFFF",
};

const tintColorLight = KindreadColors.accent;
const tintColorDark = "#4A8A42";

export const Colors = {
  light: {
    text: KindreadColors.textPrimary,
    textSecondary: KindreadColors.textSecondary,
    textTertiary: "#777777", // 3단계 대비용 연한 회색
    buttonText: KindreadColors.buttonText,
    tabIconDefault: "#777777",
    tabIconSelected: KindreadColors.accent,
    link: KindreadColors.accent,
    accent: KindreadColors.accent,
    backgroundRoot: KindreadColors.background,
    backgroundDefault: KindreadColors.surface,
    backgroundSecondary: "#FFFFFF", // 보더로 구분하므로 배경은 화이트로 통일
    backgroundTertiary: "#FFFFFF", // 화이트로 통일
    border: KindreadColors.border,
    surface: KindreadColors.surface,
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    textTertiary: "#6B7280",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    link: tintColorDark,
    accent: tintColorDark,
    backgroundRoot: "#1A1A1A",
    backgroundDefault: "#2A2C2E",
    backgroundSecondary: "#353739",
    backgroundTertiary: "#404244",
    border: "#3A3A3A",
    surface: "#2A2C2E",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 44,
  buttonHeight: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  "2xl": 22,
  "3xl": 28,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
};

export const IconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
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

export const Shadows = {
  card: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  cardHover: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

export const Borders = {
  card: {
    borderWidth: 0.75,
    borderColor: "#EBEBEB",
  },
  section: {
    borderWidth: 0.75,
    borderColor: "#EBEBEB",
  },
};

export const BookCover = {
  tiny: { width: 36, height: 54 },
  small: { width: 50, height: 75 },
  medium: { width: 70, height: 105 },
  large: { width: 100, height: 150 },
  xlarge: { width: 140, height: 210 },
};

export const Avatar = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};
