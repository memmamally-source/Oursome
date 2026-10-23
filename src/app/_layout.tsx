import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { NunitoSans_400Regular } from '@expo-google-fonts/nunito-sans/400Regular';
import { NunitoSans_600SemiBold } from '@expo-google-fonts/nunito-sans/600SemiBold';
import { NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSession } from '@/features/session/store';
import { useSettings } from '@/features/settings/store';
import { useHydrated } from '@/hooks/useHydrated';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });
  const hydrated = useHydrated();
  const ready = (fontsLoaded || !!fontError) && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
