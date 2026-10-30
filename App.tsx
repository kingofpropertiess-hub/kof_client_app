import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { AuthProvider } from './src/auth/AuthProvider';
import { WishlistProvider } from './src/context/WishlistProvider';

/**
 * King of Properties - Main App Entry Point
 * Uses React Navigation (bare workflow) with proper providers.
 *
 * NOTE: the single <NavigationContainer> lives inside RootNavigator so it can
 * pick up the app theme. Do not add another one here — nesting containers
 * breaks navigation state.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            <RootNavigator />
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}