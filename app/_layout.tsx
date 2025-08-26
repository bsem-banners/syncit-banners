import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GroupProvider } from '@/contexts/GroupContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import NotificationService from '@/services/NotificationService';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import 'react-native-reanimated';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AuthNavigator() {
  const { user, userProfile, loading } = useAuth();

  // Request notification permission with proper handling for denied permissions
  useEffect(() => {
    const handleNotificationPermission = async () => {
      try {
        await NotificationService.checkAndRequestPermissions();
      } catch (error) {
        console.error('Failed to handle notification permission:', error);
      }
    };

    handleNotificationPermission();
  }, []); // Run once when app starts

  // Navigate immediately when auth is ready - moved before early return
  useEffect(() => {
    if (loading) return; // Don't navigate while loading
    
    if (!user) {
      router.replace('/' as any);
    } else if (!user.emailVerified) {
      router.replace('/' as any);
    } else if (!userProfile?.profileCompleted) {
      router.replace('/profile-setup' as any);
    } else {
      router.replace('/groups' as any);
    }
  }, [user, userProfile, loading]);

  // Initialize notifications when user is authenticated and profile is complete
  useEffect(() => {
    if (user && userProfile?.profileCompleted) {
      console.log('Initializing notifications for authenticated user');
      NotificationService.initialize();
    }
  }, [user, userProfile?.profileCompleted]);

  // Show loading while auth is determining
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

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <GroupProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthNavigator />
        </ThemeProvider>
      </GroupProvider>
    </AuthProvider>
  );
}