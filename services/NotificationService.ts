import messaging from '@react-native-firebase/messaging';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

interface NotificationData {
  type: 'event_added' | 'group_invite' | 'invite_accepted' | 'user_joined';
  groupId?: string;
  groupName?: string;
  eventTitle?: string;
  senderName?: string;
  userId?: string;
}

class NotificationService {
  static async initialize() {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      console.log('Notification permission denied');
      return;
    }
    
    const token = await this.getToken();
    if (token) {
      console.log('FCM Token:', token);
      await this.storeTokenInDatabase(token);
    }
    
    this.setupNotificationHandlers();
  }

  static async checkPermission() {
    try {
      console.log('🔍 DEBUG: checkPermission() called...');
      const authStatus = await messaging().hasPermission();
      console.log('🔍 DEBUG: messaging().hasPermission() returned:', authStatus);
      
      if (Platform.OS === 'android') {
        console.log('🔍 DEBUG: Android authorization status constants:', {
          DENIED: messaging.AuthorizationStatus.DENIED,
          NOT_DETERMINED: messaging.AuthorizationStatus.NOT_DETERMINED,
          AUTHORIZED: messaging.AuthorizationStatus.AUTHORIZED,
          PROVISIONAL: messaging.AuthorizationStatus.PROVISIONAL
        });
      }
      
      const result = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      console.log('🔍 DEBUG: checkPermission() returning:', result);
      return result;
    } catch (error) {
      console.error('🔍 DEBUG: Error checking messaging permission:', error);
      return false;
    }
  }

  static async requestPermission() {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
               authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      } else {
        // Android - handle different API levels
        const androidVersion = typeof Platform.Version === 'string' 
          ? parseInt(Platform.Version, 10) 
          : Platform.Version;
          
        if (androidVersion >= 33) {
          // Android 13+ (API 33+) - Use POST_NOTIFICATIONS permission
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'SynciT Notifications',
              message: 'SynciT needs notification access to send you group invites and event updates.',
              buttonNegative: 'Cancel',
              buttonPositive: 'Allow',
            }
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // Android 12 and earlier (API < 33) - Use Firebase messaging
          const authStatus = await messaging().requestPermission();
          return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                 authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  static async checkAndRequestPermissions() {
    try {
      console.log('🔍 DEBUG: Starting permission check process...');
      console.log('🔍 DEBUG: Platform:', Platform.OS);
      
      // Check current notification permission status
      const hasNotificationPermission = await this.checkPermission();
      console.log('🔍 DEBUG: checkPermission() returned:', hasNotificationPermission);
      
      // Get raw permission status for debugging
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().hasPermission();
        console.log('🔍 DEBUG: Raw iOS permission status:', authStatus);
        console.log('🔍 DEBUG: AuthorizationStatus values:', {
          DENIED: messaging.AuthorizationStatus.DENIED,
          NOT_DETERMINED: messaging.AuthorizationStatus.NOT_DETERMINED,
          AUTHORIZED: messaging.AuthorizationStatus.AUTHORIZED,
          PROVISIONAL: messaging.AuthorizationStatus.PROVISIONAL
        });
      }

      if (!hasNotificationPermission) {
        console.log('🔍 DEBUG: Permission not granted, requesting...');
        // Try to request permission
        const granted = await this.requestPermission();
        console.log('🔍 DEBUG: Permission request result:', granted);
        
        if (!granted) {
          // Permission denied - show alert to go to settings
          Alert.alert(
            'Notifications Disabled',
            'To receive group invites and event updates, please enable notifications in your device settings.\\n\\nGo to Settings > SynciT > Notifications > Allow Notifications',
            [
              { text: 'Later', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: () => this.openSettings() 
              }
            ]
          );
          return false;
        }
      } else {
        console.log('🔍 DEBUG: Permission already granted, skipping request');
      }

      return hasNotificationPermission || true;
    } catch (error) {
      console.error('🔍 DEBUG: Error in checkAndRequestPermissions:', error);
      return false;
    }
  }

  static async requestContactsPermission() {
    try {
      if (Platform.OS === 'ios') {
        const permission = await Contacts.requestPermission();
        return permission === 'authorized';
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'SynciT Contacts Access',
            message: 'SynciT needs access to your contacts to help you find friends and invite them to groups. You can change your settings in Notifications and Permissions within your Profile',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  }

  static async checkAndRequestContactsPermission() {
    try {
      // For contacts, we'll try to request directly since there's no separate check method
      const granted = await this.requestContactsPermission();
      console.log('Contacts permission result:', granted);
      
      if (!granted) {
        Alert.alert(
          'Contacts Access Disabled',
          'To find friends easily, please enable contacts access in your device settings.\n\nGo to Settings > SynciT > Contacts > Allow',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => this.openSettings() 
            }
          ]
        );
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  }

  static async openSettings() {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  static async getToken() {
    try {
      return await messaging().getToken();
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  static async storeTokenInDatabase(token: string) {
    try {
      console.log('TODO: Store FCM token in database:', token);
      // TODO: Implement DatabaseService.updateUserFCMToken(token) later
    } catch (error) {
      console.error('Error storing FCM token:', error);
    }
  }

  static parseNotificationData(data: { [key: string]: string | object } | undefined): NotificationData | null {
    if (!data || typeof data.type !== 'string') {
      return null;
    }
    
    return {
      type: data.type as NotificationData['type'],
      groupId: typeof data.groupId === 'string' ? data.groupId : undefined,
      groupName: typeof data.groupName === 'string' ? data.groupName : undefined,
      eventTitle: typeof data.eventTitle === 'string' ? data.eventTitle : undefined,
      senderName: typeof data.senderName === 'string' ? data.senderName : undefined,
      userId: typeof data.userId === 'string' ? data.userId : undefined,
    };
  }

  static setupNotificationHandlers() {
    // Foreground messages
    messaging().onMessage(async remoteMessage => {
      const data = this.parseNotificationData(remoteMessage.data);
      
      Alert.alert(
        remoteMessage.notification?.title || 'SynciT',
        remoteMessage.notification?.body || 'New notification',
        [
          {
            text: 'View',
            onPress: () => {
              if (data) this.handleNotificationPress(data);
            }
          },
          { text: 'Dismiss', style: 'cancel' }
        ]
      );
    });

    // Background/quit messages - app opened from notification
    messaging().onNotificationOpenedApp(remoteMessage => {
      const data = this.parseNotificationData(remoteMessage.data);
      if (data) this.handleNotificationPress(data);
    });

    // App opened from quit state via notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          const data = this.parseNotificationData(remoteMessage.data);
          if (data) this.handleNotificationPress(data);
        }
      });

    // Token refresh handler
    messaging().onTokenRefresh(token => {
      this.storeTokenInDatabase(token);
    });
  }

  static handleNotificationPress(data: NotificationData) {
    switch (data.type) {
      case 'group_invite':
        console.log('Navigate to group invitation:', data.groupId);
        // TODO: Add navigation logic
        break;
      case 'event_added':
        console.log('Navigate to group with new event:', data.groupId);
        // TODO: Add navigation logic
        break;
      case 'invite_accepted':
        console.log('Navigate to group details:', data.groupId);
        // TODO: Add navigation logic
        break;
      case 'user_joined':
        console.log('User joined app:', data.userId);
        // TODO: Add navigation logic
        break;
    }
  }

  // Future notification sending methods
  static async sendEventNotification(groupId: string, eventTitle: string, senderName: string) {
    try {
      console.log('TODO: Send event notification:', { groupId, eventTitle, senderName });
      // TODO: Implement DatabaseService.sendNotificationToGroup later
    } catch (error) {
      console.error('Error sending event notification:', error);
    }
  }

  static async sendGroupInviteNotification(userIds: string[], groupName: string, senderName: string) {
    try {
      console.log('TODO: Send group invite notification:', { userIds, groupName, senderName });
      // TODO: When implementing the actual notification, use this format:
      // `${senderName} invited you to join ${groupName}`
    } catch (error) {
      console.error('Error sending group invite notification:', error);
    }
  }

  static async sendInviteAcceptedNotification(groupId: string, acceptedUserName: string) {
    try {
      console.log('TODO: Send invite accepted notification:', { groupId, acceptedUserName });
      // TODO: Implement DatabaseService.sendNotificationToGroupAdmin later
    } catch (error) {
      console.error('Error sending invite accepted notification:', error);
    }
  }

  static async sendMemberLeftNotification(groupId: string, groupName: string, memberName: string) {
    try {
      console.log('TODO: Send member left notification:', { groupId, groupName, memberName });
      // TODO: Implement DatabaseService.sendNotificationToGroup later
    } catch (error) {
      console.error('Error sending member left notification:', error);
    }
  }

  static async sendMemberRemovedNotification(groupId: string, groupName: string, memberName: string, adminName: string) {
    try {
      console.log('TODO: Send member removed notification:', { groupId, groupName, memberName, adminName });
      // TODO: Implement DatabaseService.sendNotificationToGroup later
    } catch (error) {
      console.error('Error sending member removed notification:', error);
    }
  }
}

export default NotificationService;