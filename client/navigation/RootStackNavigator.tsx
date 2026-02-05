import React, { useEffect } from "react";
import * as SplashScreen from 'expo-splash-screen';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import LoginScreen from "@/screens/LoginScreen";
import SignupScreen from "@/screens/SignupScreen";
import ProfileCompletionScreen from "@/screens/ProfileCompletionScreen";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Signup: undefined;
  ProfileCompletion: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { session, loading: authLoading } = useAuth();
  const { isInitialized, profile } = useData();
  const { theme } = useTheme();

  const isReady = !authLoading && (!session || isInitialized);

  // Check if profile is complete (has required fields)
  const isProfileComplete = profile &&
    profile.name &&
    profile.age &&
    profile.height &&
    profile.weight;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null; // Native Splash Screen is still visible
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {session ? (
        // User is authenticated
        isProfileComplete ? (
          // Profile is complete - show main app
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          // Profile incomplete (likely OAuth user first time) - force profile completion
          <Stack.Screen
            name="ProfileCompletion"
            component={ProfileCompletionScreen}
            options={{ headerShown: false }}
          />
        )
      ) : (
        // Not authenticated - show auth screens
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
