import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function OnboardingScreen() {
  const { user, userProfile, loading } = useAuth();

  // Redirect authenticated users immediately
  useFocusEffect(
    React.useCallback(() => {
      if (!loading && user) {
        if (userProfile?.profileCompleted) {
          router.replace('/groups');
        } else {
          router.replace('/profile-setup');
        }
      }
    }, [user, userProfile?.profileCompleted, loading])
  );

  // Don't render the screen if user is authenticated
  if (!loading && user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#8B5CF6']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Image 
            source={require('../assets/images/syncit_small.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>SynciT</Text>        
          <View style={styles.features}>
            <View style={styles.feature}>
              <View style={styles.featureIcon} />
              <Text style={styles.featureText}>Shared calendars for groups</Text>
            </View>
            
            <View style={styles.feature}>
              <View style={styles.featureIcon} />
              <Text style={styles.featureText}>Smart notifications</Text>
            </View>
            
            <View style={styles.feature}>
              <View style={styles.featureIcon} />
              <Text style={styles.featureText}>Easy group management</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.getStartedButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 0,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 150,
  },
  features: {
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  featureIcon: {
    width: 12,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 60,
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
  },
  getStartedButton: {
    backgroundColor: '#3b83f624',
    paddingVertical: 16,
    borderRadius: 8,
  },
  getStartedButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
});