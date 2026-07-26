import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/src/store/authStore';
import { startSyncWatcher } from '@/src/sync/syncEngine';
import { colors } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void hydrate().finally(() => SplashScreen.hideAsync());
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const inAuth = segments[0] === '(auth)';
    if (!token && !inAuth) {
      router.replace('/(auth)/login');
    } else if (token && inAuth) {
      router.replace('/(tabs)');
    }
  }, [hydrated, token, segments, router]);

  useEffect(() => {
    return startSyncWatcher(() => useAuthStore.getState().token);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="product/[id]"
          options={{ headerShown: true, title: 'Product', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}
        />
        <Stack.Screen
          name="checkout"
          options={{ headerShown: true, title: 'Checkout', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}
        />
        <Stack.Screen
          name="receipt"
          options={{ headerShown: true, title: 'Receipt', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}
        />
        <Stack.Screen
          name="po/create"
          options={{ headerShown: true, title: 'New PO', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}
        />
        <Stack.Screen
          name="po/[id]"
          options={{ headerShown: true, title: 'Purchase order', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
