import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  NotoSerifKR_400Regular,
  NotoSerifKR_500Medium,
} from "@expo-google-fonts/noto-serif-kr";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import RootStackNavigator from "@/navigation/RootStackNavigator";
import AuthScreen from "@/screens/AuthScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { ThemedView } from "@/components/ThemedView";

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingIndicator message="Loading..." />
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer>
      <RootStackNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  /** Pretendard + Noto Serif KR (`FONTS.serif` / `fonts.ts`); web fallbacks in `fonts.ts` if a face fails to load. */
  const [fontsLoaded, fontError] = useFonts({
    "Pretendard-Regular":  require("../assets/fonts/Pretendard-Regular.otf"),
    "Pretendard-Medium":   require("../assets/fonts/Pretendard-Medium.otf"),
    "Pretendard-SemiBold": require("../assets/fonts/Pretendard-SemiBold.otf"),
    "Pretendard-Bold":     require("../assets/fonts/Pretendard-Bold.otf"),
    NotoSerifKR_400Regular,
    NotoSerifKR_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
              <StatusBar style="dark" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
