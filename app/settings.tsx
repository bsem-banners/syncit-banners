import { useAuth } from '@/contexts/AuthContext';
import NotificationService from '@/services/NotificationService';
import { router } from 'expo-router';
import {
  Alert,
  Share as RNShare,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SettingsScreen() {
  const { userProfile, signOut, deleteAccount } = useAuth();

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
        console.log('Successfully shared invite');
      }
    } catch {
      Alert.alert(
        'Invite Friends',
        'Share this message with your friends:\n\n' + message,
        [
          {
            text: 'Copy Message',
            onPress: async () => {
              try {
                Alert.alert('Message copied!', 'Paste it in your messaging app');
              } catch {
                Alert.alert('Error', 'Could not copy message');
              }
            }
          },
          { text: 'Close', style: 'cancel' }
        ]
      );
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      `⚠️ WARNING: This will permanently delete:

- Your profile and login details
- All groups you created
- All events you created
- All your app data

This action CANNOT be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Starting account deletion...');
              await deleteAccount();
              console.log('Account deletion completed');
              
              Alert.alert(
                'Account Deleted',
                'Your account and all data have been permanently deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/');
                    }
                  }
                ]
              );
            } catch (error: any) {
              console.error('Delete account error:', error);
              Alert.alert(
                'Deletion Failed',
                error.message || 'There was an error deleting your account. Please try again.'
              );
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will need to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'default',
          onPress: async () => {
            try {
              await signOut();
              // Navigation will be handled automatically by AuthNavigator
            } catch {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
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
                <Text style={styles.profilePhone}>{userProfile?.phone || 'No phone'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionItem} onPress={handleInviteFriends}>
            <Text style={styles.actionTitle}>Invite Friends</Text>
            <Text style={styles.actionSubtitle}>Share SynciT with friends and family</Text>
          </TouchableOpacity>

          {/* Notification Settings */}
          <TouchableOpacity style={styles.actionItem} onPress={() => NotificationService.openSettings()}>
            <Text style={styles.actionTitle}>Notifications and Contacts Permission</Text>
            <Text style={styles.actionSubtitle}>Ensure both settings are enabled for correct app functioning</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerItem} onPress={handleLogout}>
            <Text style={styles.actionTitle}>Logout</Text>
            <Text style={styles.actionSubtitle}>Sign out of your account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
            <Text style={styles.dangerTitle}>Delete Account</Text>
            <Text style={styles.dangerSubtitle}>Permanently delete your account and all data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  actionsSection: {
    marginBottom: 24,
  },
  actionItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  dangerSection: {
    marginTop: -22,
  },
  dangerItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  dangerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
});