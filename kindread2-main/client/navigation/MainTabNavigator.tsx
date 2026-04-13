import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, Search, BookOpen, Users, User } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FeedStackNavigator from "@/navigation/FeedStackNavigator";
import SearchStackNavigator from "@/navigation/SearchStackNavigator";
import NotebookStackNavigator from "@/navigation/NotebookStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { IconSize } from "@/constants/theme";
import { COLORS } from "@/constants/colors";
import { FONTS } from "@/constants/fonts";

export type MainTabParamList = {
  FeedTab: undefined;
  SearchTab: undefined;
  NotebookTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_BAR_HEIGHT = 50;

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="FeedTab"
      screenOptions={{
        tabBarActiveTintColor: COLORS.greenDark,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: FONTS.medium,
          fontSize: 10,
          marginTop: -2,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
            web: theme.backgroundRoot,
          }),
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
          elevation: 0,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedStackNavigator}
        options={{
          tabBarLabel: "Feed",
          tabBarIcon: ({ color }) => (
            <Home size={IconSize.md} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStackNavigator}
        options={{
          tabBarLabel: "Discover",
          tabBarIcon: ({ color }) => (
            <Search size={IconSize.md} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tab.Screen
        name="NotebookTab"
        component={NotebookStackNavigator}
        options={{
          tabBarLabel: "Me",
          tabBarIcon: ({ color }) => (
            <User size={IconSize.md} color={color} strokeWidth={1.5} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
