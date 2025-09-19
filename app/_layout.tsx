import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GroupProvider } from '@/contexts/GroupContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import NotificationService from '@/services/NotificationService';
import ErrorHandler from '@/utils/ErrorHandler';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

// Initialize error handling and Crashlytics
ErrorHandler.initialize();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AuthNavigator() {
  const { user, userProfile, loading } = useAuth();

  // Handle notification permissions
  useEffect(() => {
    const handleNotificationPermission = async () => {
      try {
        await NotificationService.checkAndRequestPermissions();
      } catch (error) {
        ErrorHandler.handleSilentError(error, {
          action: 'request_notification_permission'
        });
      }
    };

    handleNotificationPermission();
  }, []);

  // Navigate based on auth state
  useEffect(() => {
    if (loading) return;
    
    try {
      if (!user) {
        router.replace('/' as any);
      } else if (!user.emailVerified) {
        router.replace('/' as any);
      } else if (!userProfile?.profileCompleted) {
        router.replace('/profile-setup' as any);
      } else {
        router.replace('/groups' as any);
      }
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'navigation_error',
        screen: 'auth_navigator',
        userId: user?.uid
      });
    }
  }, [user, userProfile, loading]);

  // Initialize notifications for authenticated users
  useEffect(() => {
    if (user && userProfile?.profileCompleted) {
      try {
        ErrorHandler.logEvent('notification_init_trigger', { userId: user.uid });
        NotificationService.initialize(user.uid);
      } catch (error) {
        ErrorHandler.handleSilentError(error, {
          action: 'notification_init_error',
          userId: user.uid
        });
      }
    }
  }, [user, userProfile?.profileCompleted]);

  // Show loading screen
  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: '#3B82F6', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <Text style={{ 
          color: 'white', 
          fontSize: 28, 
          fontWeight: 'bold'
        }}>
          SynciT
        </Text>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
      <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
      <Stack.Screen name="groups" options={{ headerShown: false }} />
      <Stack.Screen name="group-detail" options={{ headerShown: false }} />
      <Stack.Screen name="add-event" options={{ headerShown: false }} />
      <Stack.Screen name="create-group" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Handle any critical app-level errors
  useEffect(() => {
    const handleAppError = (error: ErrorEvent) => {
      ErrorHandler.handleSilentError(new Error(error.message), {
        action: 'app_level_error',
        screen: 'root_layout'
      });
    };

    // Only in development - production console is suppressed
    if (__DEV__) {
      window.addEventListener?.('error', handleAppError);
      return () => window.removeEventListener?.('error', handleAppError);
    }
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <GroupProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AuthNavigator />
          </ThemeProvider>
        </GroupProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}