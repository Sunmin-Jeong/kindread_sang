import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";
import { FONTS } from "@/constants/fonts";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "h1" | "h2" | "h3" | "h4" | "body" | "small" | "caption" | "link";
  serif?: boolean;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  serif = false,
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) return darkColor;
    if (!isDark && lightColor) return lightColor;
    if (type === "link") return theme.link;
    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "h1": return Typography.h1;
      case "h2": return Typography.h2;
      case "h3": return Typography.h3;
      case "h4": return Typography.h4;
      case "body": return Typography.body;
      case "small": return Typography.small;
      case "caption": return Typography.caption;
      case "link": return Typography.link;
      default: return Typography.body;
    }
  };

  const getFontFamily = () => {
    if (serif) return FONTS.serif;
    if (type === "h1" || type === "h2") return FONTS.bold;
    if (type === "h3" || type === "h4") return FONTS.semibold;
    return FONTS.regular;
  };

  return (
    <Text
      style={[
        { color: getColor(), fontFamily: getFontFamily() },
        getTypeStyle(),
        style,
      ]}
      {...rest}
    />
  );
}
