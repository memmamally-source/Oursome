import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSession } from '@/features/session/store';
import { useSettings } from '@/features/settings/store';
import { useAppFonts } from '@/hooks/useAppFonts';
import { useHydrated } from '@/hooks/useHydrated';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Last-resort screen for render errors. On web a missing code chunk (left over
 * from an older deploy) triggers a one-time reload to fetch the new version.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    if (Platform.OS === 'web') (globalThis as { __oursomeRecoverChunk?: (m: string) => void }).__oursomeRecoverChunk?.(error.message);
  }, [error]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#FFF9F2', gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#242632' }}>Something went wrong</Text>
      <Text style={{ fontSize: 16, color: '#6B6D7B', textAlign: 'center' }}>Your information is safe. Let’s try that again.</Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={{ marginTop: 8, backgroundColor: '#FF7468', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#242632' }}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const fontsReady = useAppFonts();
  const hydrated = useHydrated();
  const ready = fontsReady && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const { palette, isDark } = useTheme();
  const signedIn = useSession((s) => s.signedIn);
  const hasOnboarded = useSettings((s) => s.hasOnboarded);
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      primary: palette.accents.coral.base,
    },
  };
  const sheet = {
    presentation: 'formSheet' as const,
    sheetAllowedDetents: [0.6, 1],
    sheetGrabberVisible: true,
    sheetCornerRadius: 28,
    contentStyle: { backgroundColor: palette.background },
  };

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}>
        <Stack.Protected guard={signedIn} redirectTo={hasOnboarded ? '/sign-in' : '/onboarding'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="event/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="quick-add" options={sheet} />
          <Stack.Screen name="assistant" />
          <Stack.Screen name="person/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="shopping/[id]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="import" options={{ presentation: 'modal' }} />
          <Stack.Screen name="space-create" options={{ presentation: 'modal' }} />
          <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  );
}
