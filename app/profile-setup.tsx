import '@/config/firebase'; // Ensure Firebase is initialized
import { useAuth } from '@/contexts/AuthContext';
import NotificationService from '@/services/NotificationService';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileSetupScreen() {
  const { user, saveUserProfile, userProfile } = useAuth();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleContactsPermission = async () => {
      try {
        console.log('📇 Requesting contacts permission...');
        
        // Use the new smart contacts permission method
        await NotificationService.checkAndRequestContactsPermission();
        
      } catch (error) {
        console.error('🚫 Permission request failed:', error);
      }
    };

    // Check contacts permission after a short delay
    const timer = setTimeout(handleContactsPermission, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Prevent rendering if profile is already completed
  if (userProfile?.profileCompleted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#3B82F6' }} />
    );
  }

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isValidProfile = () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return name.trim().length >= 2 && cleanPhone.length >= 10;
  };

  const handleContinue = async () => {
    if (!isValidProfile()) {
      Alert.alert('Incomplete Profile', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      await saveUserProfile({
        name: name.trim(),
        phone: cleanPhone,
        countryCode: '+44',
        initials: getInitials(name.trim()),
        profileCompleted: true
      });

      Alert.alert(
        'Profile Complete!',
        'Welcome to SynciT! You can now start creating and joining groups.',
        [
          {
            text: 'Get Started',
            onPress: () => {
              // Let AuthNavigator handle navigation automatically
            }
          }
        ]
      );
    } catch (error) {
      console.error('Profile setup error:', error);
      Alert.alert(
        'Profile Setup Failed',
        'There was an error saving your profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.welcomeSection}>
              <Text style={styles.title}>Welcome to SynciT! 👋</Text>
              <Text style={styles.subtitle}>
                Let&apos;s set up your profile so group members can recognize and contact you easily.
              </Text>
            </View>

            <View style={styles.userInfoSection}>
              <Text style={styles.userInfoLabel}>Signed in as:</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            
            {name.length > 0 && (
              <View style={styles.previewContainer}>
                <View style={styles.initialsPreview}>
                  <Text style={styles.initialsText}>
                    {getInitials(name) || '?'}
                  </Text>
                </View>
                <Text style={styles.previewLabel}>Your initials will appear like this in groups</Text>
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <Text style={styles.inputDescription}>
                Your name will be displayed to other group members
              </Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <Text style={styles.inputDescription}>
                Used for group invitations and easy contact by group members (UK numbers only)
              </Text>
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={14}
              />
            </View>

            <View style={styles.privacyNotice}>
              <Text style={styles.privacyText}>
                🔒 Your phone number will only be visible to members of groups you join. 
                We never share your information with third parties.
              </Text>
              <Text style={[styles.privacyText, { marginTop: 12 }]}>
                🔔 Notifications and contacts access help you stay connected with your groups. 
                These features can be managed in Settings.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.continueButton, 
                (!isValidProfile() || loading) && styles.continueButtonDisabled
              ]}
              onPress={handleContinue}
              disabled={!isValidProfile() || loading}
            >
              <Text style={styles.continueButtonText}>
                {loading ? 'Setting up your profile...' : 'Complete Profile & Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 40,
    position: 'relative',
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  userInfoSection: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  userInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  permissionInfo: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0C4A6E',
    marginBottom: 8,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#0C4A6E',
    lineHeight: 20,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  initialsPreview: {
    width: 80,
    height: 80,
    backgroundColor: '#3B82F6',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  initialsText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  previewLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  inputDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  nameInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  phoneInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  privacyNotice: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  privacyText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  continueButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    height: 30,
    backgroundColor: '#F9FAFB',
  },
});