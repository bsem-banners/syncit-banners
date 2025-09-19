import { useAuth } from '@/contexts/AuthContext';
import NotificationService from '@/services/NotificationService';
import ErrorHandler from '@/utils/ErrorHandler';
import { router } from 'expo-router';
import {
  Linking,
  Share as RNShare,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SettingsScreen() {
  const { user, userProfile, signOut, deleteAccount } = useAuth();

  const formatPhoneForDisplay = (phone: string, countryCode: string) => {
    if (!phone || !countryCode) return phone;
    
    // Clean the phone number (remove any existing spaces or formatting)
    const cleanPhone = phone.replace(/\s/g, '');
    
    // For all numbers, show: country code + space + first 4 digits + space + rest
    if (cleanPhone.length >= 4) {
      const first4 = cleanPhone.substring(0, 4);
      const rest = cleanPhone.substring(4);
      return `${countryCode} ${first4} ${rest}`;
    }
    
    // If less than 4 digits, just show country code + phone
    return `${countryCode} ${cleanPhone}`;
  };

  const handleInviteFriends = async () => {
    const appStoreLink = 'https://apps.apple.com/app/syncit';
    const playStoreLink = 'https://play.google.com/store/apps/details?id=com.syncit';
    
    const message = `Hey! I'm using SynciT to coordinate events with friends and family. It's super easy to plan group activities together! 

📱 Download SynciT:
iOS: ${appStoreLink}
Android: ${playStoreLink}

Join my groups and let's start planning!`;
    
    try {
      const result = await RNShare.share({
        message: message,
        title: 'Join me on SynciT!',
        url: appStoreLink,
      });
      
      if (result.action === RNShare.sharedAction) {
        ErrorHandler.logEvent('app_invitation_shared_from_settings', {
          userId: user?.uid
        });
      }
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'share_app_invitation_from_settings',
        userId: user?.uid
      });
    }
  };

  const handleContactUs = async () => {
    const email = 'syncit.mobileapp@gmail.com';
    const subject = 'SynciT App Support';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        ErrorHandler.logEvent('contact_us_email_opened', {
          userId: user?.uid
        });
      } else {
        ErrorHandler.logEvent('contact_us_email_unavailable', {
          userId: user?.uid
        });
      }
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'open_contact_email',
        userId: user?.uid
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      router.replace('/');
    } catch (error: any) {
      ErrorHandler.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          action: 'delete_account',
          userId: user?.uid
        }
      );
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      ErrorHandler.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          action: 'logout',
          userId: user?.uid
        }
      );
    }
  };

  const handleOpenNotificationSettings = () => {
    try {
      ErrorHandler.logEvent('notification_settings_opened', {
        userId: user?.uid
      });
      NotificationService.openSettings();
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'open_notification_settings',
        userId: user?.uid
      });
    }
  };

  const handlePrivacyPolicyOpen = () => {
    ErrorHandler.logEvent('privacy_policy_opened', {
      userId: user?.uid
    });
    router.push('/privacy-policy' as any);
  };

  const handleTermsOfServiceOpen = () => {
    ErrorHandler.logEvent('terms_of_service_opened', {
      userId: user?.uid
    });
    router.push('/terms-of-service' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitials}>
                  {userProfile?.initials || 'U'}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.profileName}>{userProfile?.name || 'User'}</Text>
                <Text style={styles.profilePhone}>
                  {userProfile?.phone ? formatPhoneForDisplay(userProfile.phone, userProfile.countryCode) : 'No phone'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem} onPress={handleOpenNotificationSettings}>
            <Text style={styles.settingTitle}>Notifications and Contacts Permission</Text>
            <Text style={styles.settingSubtitle}>Ensure both settings are enabled for correct app functioning</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handlePrivacyPolicyOpen}>
            <Text style={styles.settingTitle}>Privacy Policy</Text>
            <Text style={styles.settingSubtitle}>Learn how we protect your data and privacy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleTermsOfServiceOpen}>
            <Text style={styles.settingTitle}>Terms of Service</Text>
            <Text style={styles.settingSubtitle}>Read our terms and conditions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleContactUs}>
            <Text style={styles.settingTitle}>Contact Us</Text>
            <Text style={styles.settingSubtitle}>syncit.mobileapp@gmail.com</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleInviteFriends}>
            <Text style={styles.settingTitle}>Invite Friends</Text>
            <Text style={styles.settingSubtitle}>Share SynciT with friends and family</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <Text style={styles.settingTitle}>Logout</Text>
            <Text style={styles.settingSubtitle}>Sign out of your account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
            <Text style={styles.dangerTitle}>Delete Account</Text>
            <Text style={styles.settingSubtitle}>Permanently delete your account and all data</Text>
          </TouchableOpacity>

          <View style={styles.footer} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileSection: {
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    backgroundColor: '#3B82F6',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInitials: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingsList: {
    flex: 1,
  },
  settingItem: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  footer: {
    height: 80,
  },
});