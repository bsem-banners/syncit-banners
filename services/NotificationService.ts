import { db } from '@/config/firebase';
import ErrorHandler from '@/utils/ErrorHandler';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

interface NotificationData {
  type: 'event_added' | 'group_invite' | 'invite_accepted' | 'user_joined' | 'new_event' | 'member_joined' | 'event_deleted';
  groupId?: string;
  groupName?: string;
  eventTitle?: string;
  senderName?: string;
  userId?: string;
}

class NotificationService {
  static currentUserId: string | null = null;

  static async setupNotificationChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('group-invites', {
        name: 'Group Invites',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('events', {
        name: 'Events',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    }
  }

  static async initialize(userId: string) {
    console.log('Starting NotificationService.initialize()...');
    this.currentUserId = userId;
    
    // Setup notification channels first
    await this.setupNotificationChannel();
    
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    
    const hasPermission = await this.checkPermission();
    console.log('Has notification permission:', hasPermission);
    
    if (!hasPermission) {
      console.log('Permission denied - requesting...');
      const requested = await this.requestPermission();
      console.log('Permission request result:', requested);
      
      if (!requested) {
        console.log('Permission still denied after request');
        return;
      }
    }
    
    console.log('Getting FCM token...');
    const token = await this.getToken();
    console.log('FCM Token result:', token ? 'SUCCESS' : 'FAILED');
    
    if (token) {
      console.log('FCM Token:', token);
      await this.storeTokenInDatabase(token, userId);
      console.log('Setting up notification handlers...');
      this.setupNotificationHandlers();
      console.log('NotificationService initialization complete!');
    } else {
      console.log('Failed to get FCM token - notification setup aborted');
    }
  }

  static async checkPermission() {
    try {
      const authStatus = await messaging().hasPermission();
      
      const result = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return result;
    } catch (error) {
      console.error('Error checking messaging permission:', error);
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
      const hasNotificationPermission = await this.checkPermission();
      
      if (!hasNotificationPermission) {
        const granted = await this.requestPermission();
        
        if (!granted) {
          // Silent handling - no alerts in production
          ErrorHandler.handleSilentError(
            new Error('Notifications permission denied'),
            { 
              action: 'permission_check', 
              additionalData: { feature: 'notifications' } 
            }
          );
          return false;
        }
      }

      return hasNotificationPermission || true;
    } catch (error) {
      console.error('Error in checkAndRequestPermissions:', error);
      ErrorHandler.handleSilentError(error, {
        action: 'check_permissions',
        additionalData: { feature: 'notifications' }
      });
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
      ErrorHandler.handleSilentError(error, {
        action: 'request_contacts_permission'
      });
      return false;
    }
  }

  static async checkAndRequestContactsPermission() {
    try {
      const granted = await this.requestContactsPermission();
      console.log('Contacts permission result:', granted);
      
      if (!granted) {
        ErrorHandler.handleSilentError(
          new Error('Contacts permission denied'),
          { 
            action: 'permission_check', 
            additionalData: { feature: 'contacts' } 
          }
        );
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      ErrorHandler.handleSilentError(error, {
        action: 'check_contacts_permission'
      });
      return false;
    }
  }

  static async openSettings() {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'open_settings'
      });
    }
  }

  static async getToken() {
    try {
      return await messaging().getToken();
    } catch (error) {
      console.error('Error getting FCM token:', error);
      ErrorHandler.handleSilentError(error, {
        action: 'get_fcm_token'
      });
      return null;
    }
  }

  static async storeTokenInDatabase(token: string, userId: string) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        fcmToken: token
      });
      console.log('FCM token stored in Firestore');
    } catch (error) {
      console.error('Error storing FCM token:', error);
      ErrorHandler.handleSilentError(error, {
        action: 'store_fcm_token',
        userId
      });
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

  static async showLocalNotification(title: string, body: string, data?: any) {
    try {
      console.log('📱 showLocalNotification called with:', { title, body, data });
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
        identifier: `notification_${Date.now()}`,
      });
      
      console.log('✅ Notification scheduled successfully');
    } catch (error) {
      console.error('❌ Error in showLocalNotification:', error);
      ErrorHandler.handleSilentError(error, {
        action: 'show_local_notification'
      });
    }
  }

  static setupNotificationHandlers() {
    console.log('Setting up notification handlers...');
    
    // Foreground messages - show system notification
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground notification received:', remoteMessage);
      console.log('🔔 Attempting to show local notification...');
      
      const data = this.parseNotificationData(remoteMessage.data);
      
      try {
        // Show as system notification
        await this.showLocalNotification(
          remoteMessage.notification?.title || 'SynciT',
          remoteMessage.notification?.body || 'New notification',
          data
        );
        console.log('✅ Local notification scheduled successfully');
      } catch (error) {
        console.error('❌ Error showing local notification:', error);
        ErrorHandler.handleSilentError(error, {
          action: 'handle_foreground_message'
        });
      }
    });

    // Handle notification responses (when user taps notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      const data = response.notification.request.content.data;
      if (data) {
        const parsedData = this.parseNotificationData(data as { [key: string]: string | object });
        if (parsedData) {
          this.handleNotificationPress(parsedData);
        }
      }
    });

    // Background/quit messages - app opened from notification
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Background notification opened app:', remoteMessage);
      const data = this.parseNotificationData(remoteMessage.data);
      if (data) this.handleNotificationPress(data);
    });

    // App opened from quit state via notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Initial notification (app was quit):', remoteMessage);
          const data = this.parseNotificationData(remoteMessage.data);
          if (data) this.handleNotificationPress(data);
        }
      });

    // Token refresh handler
    messaging().onTokenRefresh(async token => {
      console.log('FCM token refreshed');
      if (this.currentUserId) {
        await this.storeTokenInDatabase(token, this.currentUserId);
      }
    });
  }

  static handleNotificationPress(data: NotificationData) {
    console.log('Handling notification press:', data);
    
    switch (data.type) {
      case 'group_invite':
        console.log('Navigate to group invitation:', data.groupId);
        // TODO: Add navigation logic to group invitation
        break;
      case 'event_added':
      case 'new_event':
        console.log('Navigate to group with new event:', data.groupId);
        // TODO: Add navigation logic to group details
        break;
      case 'event_deleted':
        console.log('Navigate to group - event was deleted:', data.groupId);
        // TODO: Add navigation logic to group details
        break;
      case 'invite_accepted':
      case 'member_joined':
        console.log('Navigate to group details:', data.groupId);
        // TODO: Add navigation logic to group details
        break;
      case 'user_joined':
        console.log('User joined app:', data.userId);
        // TODO: Add navigation logic or refresh logic
        break;
    }
  }

  static async debugNotificationStatus() {
    console.log('=== NOTIFICATION DEBUG ===');
    
    try {
      // Check expo-notifications permissions
      const expoPermissions = await Notifications.getPermissionsAsync();
      console.log('Expo notification permissions:', expoPermissions);
      
      // Check FCM permissions
      const fcmPermissions = await messaging().hasPermission();
      console.log('FCM permissions:', fcmPermissions);
      
      // Check Android version
      console.log('Platform version:', Platform.Version);
      
      // Check if channels exist (Android only)
      if (Platform.OS === 'android') {
        try {
          const channels = await Notifications.getNotificationChannelsAsync();
          console.log('Notification channels:', channels);
        } catch (error) {
          console.log('Error getting channels:', error);
        }
      }
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'debug_notification_status'
      });
    }
    
    console.log('=== END DEBUG ===');
  }

  // Silent notification methods for production
  static async sendGroupInviteNotification(groupName: string, senderName: string, userIds: string[]) {
    try {
      console.log('Sending group invite notification...', { groupName, senderName, userIds });
      // Notification sending logic would go here in production
    } catch (error) {
      console.error('Error sending group invite notification:', error);
      ErrorHandler.handleSilentError(error, {
        action: 'send_group_invite_notification',
        additionalData: { groupName, senderName }
      });
    }
  }

  static async sendInviteAcceptedNotification(groupId: string, acceptedUserName: string) {
    try {
      console.log('Sending invite accepted notification...', { groupId, acceptedUserName });
      // Notification sending logic would go here in production
    } catch (error) {
      console.error('Error sending invite accepted notification:', error);
      ErrorHandler.handleSilentError(error, {
        action: 'send_invite_accepted_notification',
        groupId,
        additionalData: { acceptedUserName }
      });
    }
  }

  static async sendEventNotification(groupId: string, eventTitle: string, senderName: string) {
    try {
      console.log('Sending event notification...', { groupId, eventTitle, senderName });
      // Notification sending logic would go here in production
    } catch (error) {
      console.error('Error sending event notification:', error);
      ErrorHandler.handleSilentError(error, {
        action: 'send_event_notification',
        groupId,
        additionalData: { eventTitle, senderName }
      });
    }
  }

  static async sendMemberLeftNotification(groupId: string, groupName: string, memberName: string) {
    try {
      console.log('Sending member left notification...', { groupId, groupName, memberName });
      // Notification sending logic would go here in production
    } catch (error) {
      console.error('Error sending member left notification:', error);
      ErrorHandler.handleSilentError(error, {
        action: 'send_member_left_notification',
        groupId,
        additionalData: { groupName, memberName }
      });
    }
  }

  static async sendMemberRemovedNotification(groupId: string, groupName: string, memberName: string, adminName: string) {
    try {
      console.log('Sending member removed notification...', { groupId, groupName, memberName, adminName });
      // Notification sending logic would go here in production
    } catch (error) {
      console.error('Error sending member removed notification:', error);
      ErrorHandler.handleSilentError(error, {
        action: 'send_member_removed_notification',
        groupId,
        additionalData: { groupName, memberName, adminName }
      });
    }
  }
}

export default NotificationService;