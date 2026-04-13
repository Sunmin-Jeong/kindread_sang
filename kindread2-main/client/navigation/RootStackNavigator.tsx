import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import CreateBookmarkScreen from "@/screens/CreateBookmarkScreen";
import BookDetailScreen from "@/screens/BookDetailScreen";
import BookmarkDetailScreen from "@/screens/BookmarkDetailScreen";
import EditBookmarkScreen from "@/screens/EditBookmarkScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import ClubHomeScreen from "@/screens/ClubHomeScreen";
import CreateClubScreen from "@/screens/CreateClubScreen";
import ClubManagementScreen from "@/screens/ClubManagementScreen";
import CreateMeetupScreen from "@/screens/CreateMeetupScreen";
import JoinClubScreen from "@/screens/JoinClubScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import StreakScreen from "@/screens/StreakScreen";
import BooksThisMonthScreen from "@/screens/BooksThisMonthScreen";
import ClubsListScreen from "@/screens/ClubsListScreen";
import CreateClubFlowScreen from "@/screens/CreateClubFlowScreen";
import SessionDetailScreen from "@/screens/SessionDetailScreen";
import UserProfileScreen from "@/screens/UserProfileScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import type { Book, Bookmark } from "@/types";

export type RootStackParamList = {
  Main: undefined;
  CreateBookmark: { book?: Book; clubId?: string } | undefined;
  BookDetail: { book: Book };
  BookmarkDetail: { bookmark: Bookmark; focusComment?: boolean };
  EditBookmark: { bookmark: Bookmark };
  EditProfile: undefined;
  ClubHome: { clubId: string; showWelcome?: boolean };
  CreateClub: undefined;
  ClubManagement: { clubId: string };
  CreateMeetup: { clubId: string };
  JoinClub: { clubId: string; clubName: string; joinQuestions: string[] };
  Notifications: undefined;
  StreakStats: { streakDays: number };
  BooksThisMonth: { booksThisMonth: number };
  ClubsList: undefined;
  CreateClubFlow: undefined;
  SessionDetail: { clubId: string };
  UserProfile: { userId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateBookmark"
        component={CreateBookmarkScreen}
        options={{ presentation: "modal", headerTitle: "New Bookmark" }}
      />
      <Stack.Screen
        name="BookDetail"
        component={BookDetailScreen}
        options={{ headerTitle: "" }}
      />
      <Stack.Screen
        name="BookmarkDetail"
        component={BookmarkDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditBookmark"
        component={EditBookmarkScreen}
        options={{ presentation: "modal", headerTitle: "Edit Bookmark" }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ presentation: "modal", headerTitle: "Edit Profile" }}
      />
      <Stack.Screen
        name="ClubHome"
        component={ClubHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateClub"
        component={CreateClubScreen}
        options={{ presentation: "modal", headerTitle: "New Club" }}
      />
      <Stack.Screen
        name="ClubManagement"
        component={ClubManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateMeetup"
        component={CreateMeetupScreen}
        options={{ presentation: "modal", headerTitle: "New Meetup" }}
      />
      <Stack.Screen
        name="JoinClub"
        component={JoinClubScreen}
        options={{ presentation: "modal", headerTitle: "Join Club" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StreakStats"
        component={StreakScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BooksThisMonth"
        component={BooksThisMonthScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClubsList"
        component={ClubsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateClubFlow"
        component={CreateClubFlowScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
