import { Platform } from "react-native";

/** Loaded via `useFonts` in App.tsx (`NotoSerifKR_400Regular`, `NotoSerifKR_500Medium`). Web stacks fall back to system serif if custom font fails. */
export const FONTS = {
  regular: "Pretendard-Regular",
  medium: "Pretendard-Medium",
  semibold: "Pretendard-SemiBold",
  bold: "Pretendard-Bold",
  serif: Platform.select({
    ios: "NotoSerifKR_400Regular",
    android: "NotoSerifKR_400Regular",
    web: "NotoSerifKR_400Regular, 'Noto Serif KR', Georgia, 'Times New Roman', serif",
    default: "NotoSerifKR_400Regular",
  })!,
  serifMd: Platform.select({
    ios: "NotoSerifKR_500Medium",
    android: "NotoSerifKR_500Medium",
    web: "NotoSerifKR_500Medium, 'Noto Serif KR', Georgia, serif",
    default: "NotoSerifKR_500Medium",
  })!,
};
