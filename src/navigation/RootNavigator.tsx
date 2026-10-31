import React, { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth } from "../auth/AuthProvider";
import { SplashScreen } from "../screens/splash/SplashScreen";
import { BottomTabBar } from "../components/BottomTabBar";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { WelcomeScreen } from "../screens/auth/WelcomeScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { HomeScreen } from "../screens/tabs/HomeScreen";
import { ExploreScreen } from "../screens/tabs/ExploreScreen";
import { StaysScreen } from "../screens/tabs/StaysScreen";
import { BookingsScreen } from "../screens/tabs/BookingsScreen";
import { ProfileScreen } from "../screens/tabs/ProfileScreen";
import { PropertyDetailScreen } from "../screens/detail/PropertyDetailScreen";
import { StayDetailScreen } from "../screens/detail/StayDetailScreen";
import { BookingDetailScreen } from "../screens/detail/BookingDetailScreen";
import { WishlistScreen } from "../screens/account/WishlistScreen";
import { NotificationsScreen } from "../screens/account/NotificationsScreen";
import { MyInquiriesScreen } from "../screens/account/MyInquiriesScreen";
import { EditProfileScreen } from "../screens/account/EditProfileScreen";
import { ExpertsScreen } from "../screens/misc/ExpertsScreen";
import { ExpertDetailScreen } from "../screens/detail/ExpertDetailScreen";
import { AiChatScreen } from "../screens/misc/AiChatScreen";
import { PrivacyPolicyScreen } from "../screens/misc/PrivacyPolicyScreen";

import type { AuthStackParamList, TabParamList, MainStackParamList } from "./types";

const Tabs = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();
const AuthStackNavigator = createNativeStackNavigator<AuthStackParamList>();

const renderTabBar = (props: BottomTabBarProps) => <BottomTabBar {...props} />;

function MainTabs() {
  return (
    <Tabs.Navigator tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
      {/* The five footer destinations, matching the web app */}
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Style" component={ExpertsScreen} initialParams={{ tab: true }} />
      <Tabs.Screen
        name="ToLet"
        component={ExploreScreen}
        initialParams={{ purpose: "to-let", lockedPurpose: true }}
      />
      <Tabs.Screen name="Profile" component={ProfileScreen} />

      {/* Reachable from Home / cards, but not shown in the footer */}
      <Tabs.Screen name="Explore" component={ExploreScreen} />
      <Tabs.Screen name="Stays" component={StaysScreen} />
      <Tabs.Screen name="Bookings" component={BookingsScreen} />
    </Tabs.Navigator>
  );
}

function AuthStack() {
  return (
    <AuthStackNavigator.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNavigator.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStackNavigator.Screen name="Login" component={LoginScreen} />
      <AuthStackNavigator.Screen name="Register" component={RegisterScreen} />
      <AuthStackNavigator.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </AuthStackNavigator.Navigator>
  );
}

/** Minimum time the premium splash stays visible for brand impact. */
const SPLASH_MIN_MS = 2600;
/** Fade-out duration before the navigator content is revealed. */
const SPLASH_FADE_MS = 400;

export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { status, guestMode } = useAuth();

  const authReady = status !== "loading";
  const [minElapsed, setMinElapsed] = useState(false);
  const [splashMounted, setSplashMounted] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);

  // Enforce a minimum splash dwell time so the brand moment never feels rushed.
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  // Once the session is resolved AND the minimum dwell time has passed,
  // play the splash outro and then unmount it.
  useEffect(() => {
    if (!authReady || !minElapsed || !splashMounted) return;
    setSplashExiting(true);
    const t = setTimeout(() => setSplashMounted(false), SPLASH_FADE_MS);
    return () => clearTimeout(t);
  }, [authReady, minElapsed, splashMounted]);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      primary: colors.primary,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: (isDark ? DarkTheme.fonts : DefaultTheme.fonts) as never,
  };

  return (
    <View style={styles.root}>
      <NavigationContainer theme={navTheme}>
        {status === "guest" && !guestMode ? (
          <AuthStack />
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="PropertyDetail"
              component={PropertyDetailScreen}
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="StayDetail"
              component={StayDetailScreen}
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="BookingDetail"
              component={BookingDetailScreen}
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen name="Wishlist" component={WishlistScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="MyInquiries" component={MyInquiriesScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Experts" component={ExpertsScreen} />
            <Stack.Screen
              name="ExpertDetail"
              component={ExpertDetailScreen}
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen name="AiChat" component={AiChatScreen} options={{ animation: "slide_from_bottom" }} />
            {/* Guests can sign in without leaving the app, then land back where they were. */}
            <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>

      {/* Premium splash overlays the app while it boots, then fades out. */}
      {splashMounted && <SplashScreen exiting={splashExiting} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
