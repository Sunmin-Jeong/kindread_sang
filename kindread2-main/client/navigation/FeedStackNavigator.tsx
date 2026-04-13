import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Bell } from "lucide-react-native";

import FeedScreen from "@/screens/FeedScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { getUnreadNotificationCount } from "@/lib/club-storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

export type FeedStackParamList = {
  Feed: undefined;
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

function BellButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [unread, setUnread] = useState(0);

  const refresh = async () => {
    if (user?.id) {
      const count = await getUnreadNotificationCount(user.id);
      setUnread(count);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [user?.id])
  );

  return (
    <Pressable
      style={styles.bellBtn}
      onPress={() => navigation.navigate("Notifications")}
      hitSlop={8}
    >
      <Bell size={20} color={theme.text} strokeWidth={1.5} />
      {unread > 0 ? <View style={styles.bellBadge} /> : null}
    </Pressable>
  );
}

export default function FeedStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Kindread" />,
          headerRight: () => <BellButton />,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  bellBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
});
