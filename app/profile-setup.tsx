import '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import NotificationService from '@/services/NotificationService';
import { useEffect, useState } from 'react';
import {
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

// International Phone Number Input Component
interface PhoneNumberInputProps {
  value: string;
  onChangeText: (value: string) => void;
}

const PhoneNumberInput = ({ value, onChangeText }: PhoneNumberInputProps) => {
  const [countryCode, setCountryCode] = useState('44');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    // Parse existing value if provided
    if (value && value.startsWith('+')) {
      const withoutPlus = value.substring(1);
      if (withoutPlus.startsWith('44')) {
        setCountryCode('44');
        setPhoneNumber(withoutPlus.substring(2));
      } else {
        // Find country code (up to 3 digits)
        const match = withoutPlus.match(/^(\d{1,3})(.*)$/);
        if (match) {
          setCountryCode(match[1]);
          setPhoneNumber(match[2]);
        }
      }
    }
  }, [value]);

  const handleCountryCodeChange = (text: string) => {
    // Only allow digits, max 3 characters
    const digits = text.replace(/\D/g, '').slice(0, 3);
    setCountryCode(digits);
    updateFullNumber(digits, phoneNumber);
  };

  const handlePhoneNumberChange = (text: string) => {
    let digits = text.replace(/\D/g, '');
    
    // For UK (44), remove leading 0 if present
    if (countryCode === '44' && digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    
    // Limit phone number length
    digits = digits.slice(0, 12);
    setPhoneNumber(digits);
    updateFullNumber(countryCode, digits);
  };

  const updateFullNumber = (code: string, number: string) => {
    if (code && number) {
      onChangeText(`+${code}${number}`);
    } else {
      onChangeText('');
    }
  };

  return (
    <View style={styles.phoneInputContainer}>
      <View style={styles.prefixContainer}>
        <Text style={styles.fixedPrefix}>00</Text>
        <TextInput
          style={styles.countryCodeInput}
          value={countryCode}
          onChangeText={handleCountryCodeChange}
          placeholder="44"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          maxLength={3}
        />
      </View>
      <TextInput
        style={styles.phoneMainInput}
        value={phoneNumber}
        onChangeText={handlePhoneNumberChange}
        placeholder={countryCode === '44' ? '7123456789' : 'Phone number'}
        placeholderTextColor="#9CA3AF"
        keyboardType="phone-pad"
      />
    </View>
  );
};

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
    if (!phoneNumber || !phoneNumber.startsWith('+')) return false;
    const withoutPlus = phoneNumber.substring(1);
    const cleanPhone = withoutPlus.replace(/\D/g, '');
    return name.trim().length >= 2 && cleanPhone.length >= 10;
  };

  const handleContinue = async () => {
    if (!isValidProfile()) {
      console.warn('Incomplete profile data');
      return;
    }

    setLoading(true);
    try {
      // Extract country code and phone number
      const withoutPlus = phoneNumber.substring(1);
      let countryCode = '';
      let cleanPhone = '';

      // For UK numbers (44), handle specifically
      if (withoutPlus.startsWith('44')) {
        countryCode = '+44';
        cleanPhone = withoutPlus.substring(2); // Remove the '44' part
      } else {
        // For other countries, find country code (up to 3 digits)
        const match = withoutPlus.match(/^(\d{1,3})(.*)$/);
        if (match) {
          countryCode = `+${match[1]}`;
          cleanPhone = match[2];
        }
      }
      
      await saveUserProfile({
        name: name.trim(),
        phone: cleanPhone,
        countryCode: countryCode,
        initials: getInitials(name.trim()),
        profileCompleted: true
      });

      console.log('Profile setup completed successfully');
    } catch (error) {
      console.error('Profile setup error:', error);
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
                Used for group invitations and easy contact by group members only
              </Text>
              <PhoneNumberInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
              <View style={styles.phoneWarningContainer}>
                <Text style={styles.phoneWarningText}>
                  ⚠️ Please make sure your phone number is correct. Once set, it can’t be changed. To update it, you’ll need to delete your account and sign up again.
                </Text>
              </View>
            </View>

            <View style={styles.privacyNotice}>
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
  },
  fixedPrefix: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  countryCodeInput: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
    padding: 0,
  },
  phoneMainInput: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    height: 52,
  },
  phoneWarningContainer: {
    backgroundColor: '#FEF3C7',
    padding: 15,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  phoneWarningText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    textAlign: 'center',
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