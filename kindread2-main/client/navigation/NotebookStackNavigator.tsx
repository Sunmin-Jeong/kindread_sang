import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import NotebookScreen from "@/screens/NotebookScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type NotebookStackParamList = {
  Notebook: undefined;
};

const Stack = createNativeStackNavigator<NotebookStackParamList>();

export default function NotebookStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Notebook"
        component={NotebookScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
