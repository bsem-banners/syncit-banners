import { Event, Group } from '@/contexts/GroupContext';
import DatabaseService from '@/services/DatabaseService';

export class TestingUtils {
  // Create test group with real-time events
  static async createTestGroup(): Promise<Group> {
    const testGroup: Group = {
      id: Date.now(),
      name: 'Test Group',
      description: 'For testing real-time features',
      admin: 'you',
      members: [
        { 
          id: 'you', 
          name: 'You',
          initials: 'ME',
          phone: '+1234567890',
          role: 'admin',
          joinedAt: new Date(),
          isOnline: true,
          status: 'accepted'
        },
        { 
          id: 'test_user_1', 
          name: 'Alice Test',
          initials: 'AT',
          phone: '+1234567001',
          role: 'member',
          joinedAt: new Date(),
          isOnline: false,
          status: 'pending'
        },
        { 
          id: 'test_user_2', 
          name: 'Bob Test',
          initials: 'BT',
          phone: '+1234567002',
          role: 'member',
          joinedAt: new Date(),
          isOnline: true,
          status: 'accepted'
        }
      ],
      events: [],
      createdAt: new Date(),
      silentNotifications: false
    };
    
    await DatabaseService.createGroup(testGroup);
    return testGroup;
  }
  
  // Test notification token retrieval
  static async testNotification() {
    try {
      // For now, just log that we're testing notifications
      // Will implement actual notification service later
      console.log('Testing notifications - FCM Token would be retrieved here');
      return 'test-fcm-token';
    } catch (error) {
      console.error('Notification test failed:', error);
      throw error;
    }
  }
  
  // Simulate real-time events
  static async simulateEventCreation(groupId: number) {
    const testEvent: Event = {
      id: Date.now(), // Add missing id
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      notes: 'Test Event - Real-time!',
      type: 'evening', // Cast to proper type
      user: 'Test User',
      userInitials: 'TU', // Add missing userInitials
      createdBy: 'you'
    };
    
    await DatabaseService.addEventToGroup(groupId, testEvent);
    return testEvent;
  }

  // Create multiple test groups for comprehensive testing
  static async createMultipleTestGroups() {
    const groups = [];
    
    // Group 1: Family group (user is admin)
    const familyGroup: Group = {
      id: Date.now(),
      name: 'Test Family',
      description: 'Family coordination testing',
      admin: 'you',
      members: [
        { 
          id: 'you', 
          name: 'You',
          initials: 'ME',
          phone: '+1234567890',
          role: 'admin',
          joinedAt: new Date(),
          isOnline: true,
          status: 'accepted'
        }
      ],
      events: [],
      createdAt: new Date(),
      silentNotifications: false
    };
    
    // Group 2: Friends group (user is member with pending status)
    const friendsGroup: Group = {
      id: Date.now() + 1,
      name: 'Test Friends',
      description: 'Friends group with pending invitation',
      admin: 'friend_admin',
      members: [
        { 
          id: 'you', 
          name: 'You',
          initials: 'ME',
          phone: '+1234567890',
          role: 'member',
          joinedAt: new Date(),
          isOnline: true,
          status: 'pending'
        },
        { 
          id: 'friend_admin', 
          name: 'Friend Admin',
          initials: 'FA',
          phone: '+1234567100',
          role: 'admin',
          joinedAt: new Date(),
          isOnline: true,
          status: 'accepted'
        }
      ],
      events: [],
      createdAt: new Date(),
      silentNotifications: true
    };

    await DatabaseService.createGroup(familyGroup);
    await DatabaseService.createGroup(friendsGroup);
    
    groups.push(familyGroup, friendsGroup);
    return groups;
  }

  // Clear all test data
  static async clearTestData() {
    console.log('Test data clearing - would remove test groups from database');
    // This would need a DatabaseService method to delete groups
  }
}