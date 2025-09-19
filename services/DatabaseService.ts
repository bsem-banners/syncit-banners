import { db } from '@/config/firebase';
import { Event, Group } from '@/contexts/GroupContext';
import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

// Contact user interface
interface ContactUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  initials: string;
  isFromContacts: boolean;
}

class DatabaseService {
  // Groups
  static async createGroup(group: Group): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', group.id.toString());
      await setDoc(groupRef, {
        name: group.name,
        description: group.description,
        admin: group.admin,
        members: group.members.map(member => ({
          id: member.id,
          name: member.name,
          initials: member.initials,
          phone: member.phone,
          role: member.role,
          joinedAt: member.joinedAt.toISOString(),
          isOnline: member.isOnline,
          status: member.status
        })),
        events: group.events || [],
        createdAt: group.createdAt.toISOString(),
        silentNotifications: group.silentNotifications || false,
        creatorBlocked: group.creatorBlocked || false
      });
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  static async getUserGroups(userId: string): Promise<Group[]> {
    try {
      console.log(`Getting groups for user: ${userId}`);
      
      const groups: Group[] = [];
      
      // Query 1: Get groups where user is admin
      try {
        const adminQuery = query(
          collection(db, 'groups'), 
          where('admin', '==', userId)
        );
        const adminSnapshot = await getDocs(adminQuery);
        
        adminSnapshot.forEach((doc) => {
          const data = doc.data() as DocumentData;
          groups.push(this.formatGroupData(doc.id, data));
        });
        
        console.log(`Found ${adminSnapshot.size} admin groups`);
      } catch (adminError) {
        console.error('Error fetching admin groups:', adminError);
      }
      
      // Query 2: Get all groups and filter for membership (since Firestore array queries are limited)
      try {
        const allGroupsQuery = query(collection(db, 'groups'));
        const allSnapshot = await getDocs(allGroupsQuery);
        
        let memberGroupCount = 0;
        allSnapshot.forEach((doc) => {
          const data = doc.data() as DocumentData;
          
          // Skip if already added as admin
          if (data.admin === userId) return;
          
          // Check if user is in members array
          const isMember = data.members?.some((member: any) => member.id === userId);
          
          if (isMember) {
            groups.push(this.formatGroupData(doc.id, data));
            memberGroupCount++;
          }
        });
        
        console.log(`Found ${memberGroupCount} member groups`);
      } catch (memberError) {
        console.error('Error fetching member groups:', memberError);
        // This might fail due to security rules, but admin groups should still work
      }
      
      console.log(`Returning ${groups.length} total groups for user ${userId}`);
      return groups;
      
    } catch (error) {
      console.error('Error in getUserGroups:', error);
      return [];
    }
  }

  // PUBLIC method to format group data consistently (needed for real-time listeners)
  static formatGroupData(docId: string, data: DocumentData | any): Group {
    return {
      id: parseInt(docId),
      name: data.name || '',
      description: data.description || '',
      admin: data.admin || '',
      members: (data.members || []).map((member: any) => ({
        id: member.id || '',
        name: member.name || '',
        initials: member.initials || '',
        phone: member.phone || '',
        role: member.role || 'member',
        joinedAt: new Date(member.joinedAt || Date.now()),
        isOnline: member.isOnline || false,
        status: member.status || 'accepted'
      })),
      events: data.events || [],
      createdAt: new Date(data.createdAt || Date.now()),
      silentNotifications: data.silentNotifications || false,
      creatorBlocked: data.creatorBlocked || false
    };
  }

  static async updateGroup(groupId: number, updates: Partial<Group>): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId.toString());
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.description = updates.description;
      if (updates.admin) updateData.admin = updates.admin;
      if (updates.silentNotifications !== undefined) updateData.silentNotifications = updates.silentNotifications;
      if (updates.creatorBlocked !== undefined) updateData.creatorBlocked = updates.creatorBlocked;
      
      if (updates.members) {
        updateData.members = updates.members.map(member => ({
          id: member.id,
          name: member.name,
          initials: member.initials,
          phone: member.phone,
          role: member.role,
          joinedAt: member.joinedAt.toISOString(),
          isOnline: member.isOnline,
          status: member.status
        }));
      }
      
      if (updates.events) updateData.events = updates.events;
      
      await updateDoc(groupRef, updateData);
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }

  static async deleteGroup(groupId: number): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId.toString());
      await deleteDoc(groupRef);
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }

  // Users - Original methods
  static async getAllAppUsers(): Promise<any[]> {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const users: any[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        users.push({
          id: doc.id,
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          initials: data.initials || '',
          countryCode: data.countryCode || '',
          profileCompleted: data.profileCompleted || false
        });
      });
      
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  static async getUserById(userId: string): Promise<any | null> {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let foundUser = null;
      snapshot.forEach((doc) => {
        if (doc.id === userId) {
          const data = doc.data() as DocumentData;
          foundUser = {
            id: doc.id,
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            initials: data.initials || '',
            countryCode: data.countryCode || '',
            profileCompleted: data.profileCompleted || false
          };
        }
      });
      
      return foundUser;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  static async searchUsersByPhone(phoneNumber: string): Promise<any | null> {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let foundUser = null;
      snapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        if (data.phone === phoneNumber) {
          foundUser = {
            id: doc.id,
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            initials: data.initials || '',
            countryCode: data.countryCode || '',
            profileCompleted: data.profileCompleted || false
          };
        }
      });
      
      return foundUser;
    } catch (error) {
      console.error('Error searching users by phone:', error);
      return null;
    }
  }

  // Helper function to normalize phone numbers and generate all possible formats
  static normalizePhoneNumber(phoneNumber: string): Set<string> {
    const normalized = phoneNumber.replace(/\D/g, '');
    const formats = new Set<string>();
    
    // Add original normalized number
    formats.add(normalized);
    
    // UK number conversions
    if (normalized.startsWith('0') && normalized.length === 11) {
      // 07926111222 -> 447926111222
      formats.add('44' + normalized.substring(1));
    }
    
    if (normalized.startsWith('44') && normalized.length === 12) {
      // 447926111222 -> 07926111222
      formats.add('0' + normalized.substring(2));
    }
    
    // US number conversions (optional - add if needed)
    if (normalized.startsWith('1') && normalized.length === 11) {
      // 17123456789 -> 7123456789
      formats.add(normalized.substring(1));
    }
    
    if (normalized.length === 10 && !normalized.startsWith('0')) {
      // 7123456789 -> 17123456789 (US format)
      formats.add('1' + normalized);
    }
    
    return formats;
  }

  static async getContactsAppUsers(): Promise<ContactUser[]> {
    try {
      // Check permission first
      const hasPermission = await this.checkContactsPermission();
      if (!hasPermission) {
        console.log('Contacts permission denied');
        return [];
      }

      // Get device contacts
      const contacts = await Contacts.getAll();
      const contactPhoneMap = new Map<string, string>(); // normalized -> original display
      
      // Extract and normalize phone numbers from contacts, keeping original format
      contacts.forEach(contact => {
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          contact.phoneNumbers.forEach(phoneObj => {
            // Get all possible normalized formats for matching
            const phoneFormats = this.normalizePhoneNumber(phoneObj.number);
            phoneFormats.forEach(format => {
              if (format.length >= 10) {
                // Map normalized format to original display format
                contactPhoneMap.set(format, phoneObj.number);
              }
            });
          });
        }
      });

      // Get all app users
      const allAppUsers = await this.getAllAppUsers();
      
      // Filter app users who are in contacts with comprehensive format matching
      const contactAppUsers = allAppUsers.filter(user => {
        // Create full phone number from user data
        const userFullPhone = (user.countryCode + user.phone).replace(/\D/g, '');
        const userPhoneFormats = this.normalizePhoneNumber(userFullPhone);
        
        // Check if any user format matches any contact phone format
        for (const userFormat of userPhoneFormats) {
          if (contactPhoneMap.has(userFormat)) {
            return true;
          }
        }
        
        return false;
      });

      // Return with original contact phone format for display
      return contactAppUsers.map(user => {
        // Find the original contact phone format for this user
        const userFullPhone = (user.countryCode + user.phone).replace(/\D/g, '');
        const userPhoneFormats = this.normalizePhoneNumber(userFullPhone);
        
        let originalContactPhone = user.countryCode + ' ' + user.phone; // fallback
        
        // Find the matching contact phone format
        for (const userFormat of userPhoneFormats) {
          if (contactPhoneMap.has(userFormat)) {
            originalContactPhone = contactPhoneMap.get(userFormat)!;
            break;
          }
        }
        
        return {
          ...user,
          phone: originalContactPhone, // Display exactly as saved in contacts
          isFromContacts: true
        };
      });

    } catch (error) {
      console.error('Error getting contacts app users:', error);
      return [];
    }
  }

  static async checkContactsPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const permission = await Contacts.checkPermission();
        return permission === 'authorized';
      } else {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS
        );
        return granted;
      }
    } catch (error) {
      console.error('Error checking contacts permission:', error);
      return false;
    }
  }

  // UPDATED: Phone number search with comprehensive format matching
  static async searchUserByPhoneNumber(phoneNumber: string): Promise<ContactUser | null> {
    try {
      // Normalize the search input and get all possible formats
      const searchFormats = this.normalizePhoneNumber(phoneNumber);
      
      // Need at least 10 digits for a valid phone number
      const hasValidFormat = Array.from(searchFormats).some(format => format.length >= 10);
      if (!hasValidFormat) {
        return null;
      }

      // Get all app users
      const allAppUsers = await this.getAllAppUsers();
      
      // Search through all users for a match
      for (const user of allAppUsers) {
        if (!user.phone || !user.countryCode) continue;
        
        // Create full phone number from user data
        const userFullPhone = (user.countryCode + user.phone).replace(/\D/g, '');
        const userPhoneFormats = this.normalizePhoneNumber(userFullPhone);
        
        // Check if any search format matches any user format
        for (const searchFormat of searchFormats) {
          if (userPhoneFormats.has(searchFormat)) {
            return {
              id: user.id,
              name: user.name,
              phone: user.countryCode + ' ' + user.phone, // Display formatted
              email: user.email || '',
              initials: user.initials || '',
              isFromContacts: false
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error searching user by phone number:', error);
      return null;
    }
  }

  // Member Management
  static async updateMemberStatus(groupId: number, userId: string, status: 'pending' | 'accepted' | 'declined' | 'blocked'): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId.toString());
      const groupSnapshot = await getDocs(query(collection(db, 'groups'), where('__name__', '==', groupId.toString())));
      
      if (!groupSnapshot.empty) {
        const groupDoc = groupSnapshot.docs[0];
        const groupData = groupDoc.data() as DocumentData;
        const members = groupData.members || [];
        
        const updatedMembers = members.map((member: any) => {
          if (member.id === userId) {
            return { ...member, status };
          }
          return member;
        });
        
        await updateDoc(groupRef, { members: updatedMembers });
      }
    } catch (error) {
      console.error('Error updating member status:', error);
      throw error;
    }
  }

  static async addMemberToGroup(groupId: number, newMember: any): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId.toString());
      const groupSnapshot = await getDocs(query(collection(db, 'groups'), where('__name__', '==', groupId.toString())));
      
      if (!groupSnapshot.empty) {
        const groupDoc = groupSnapshot.docs[0];
        const groupData = groupDoc.data() as DocumentData;
        const members = groupData.members || [];
        
        const memberToAdd = {
          id: newMember.id,
          name: newMember.name,
          initials: newMember.initials,
          phone: newMember.phone,
          role: newMember.role || 'member',
          joinedAt: new Date().toISOString(),
          isOnline: newMember.isOnline || false,
          status: newMember.status || 'pending'
        };
        
        const updatedMembers = [...members, memberToAdd];
        await updateDoc(groupRef, { members: updatedMembers });
      }
    } catch (error) {
      console.error('Error adding member to group:', error);
      throw error;
    }
  }

  static async removeMemberFromGroup(groupId: number, userId: string): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId.toString());
      const groupSnapshot = await getDocs(query(collection(db, 'groups'), where('__name__', '==', groupId.toString())));
      
      if (!groupSnapshot.empty) {
        const groupDoc = groupSnapshot.docs[0];
        const groupData = groupDoc.data() as DocumentData;
        const members = groupData.members || [];
        
        const updatedMembers = members.filter((member: any) => member.id !== userId);
        await updateDoc(groupRef, { members: updatedMembers });
      }
    } catch (error) {
      console.error('Error removing member from group:', error);
      throw error;
    }
  }

  // Events (using Firestore instead of Realtime Database)
  static async addEventToGroup(groupId: number, event: Event): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId.toString());
      const groupSnapshot = await getDocs(query(collection(db, 'groups'), where('__name__', '==', groupId.toString())));
      
      if (!groupSnapshot.empty) {
        const groupDoc = groupSnapshot.docs[0];
        const groupData = groupDoc.data() as DocumentData;
        const events = groupData.events || [];
        
        const newEvent = {
          id: Date.now(), // Simple ID generation
          date: event.date,
          time: event.time,
          notes: event.notes,
          type: event.type,
          user: event.user,
          userInitials: event.userInitials,
          createdBy: event.createdBy
        };
        
        const updatedEvents = [...events, newEvent];
        await updateDoc(groupRef, { events: updatedEvents });
      }
    } catch (error) {
      console.error('Error adding event to group:', error);
      throw error;
    }
  }

  static async removeEventFromGroup(groupId: number, eventId: number): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId.toString());
      const groupSnapshot = await getDocs(query(collection(db, 'groups'), where('__name__', '==', groupId.toString())));
      
      if (!groupSnapshot.empty) {
        const groupDoc = groupSnapshot.docs[0];
        const groupData = groupDoc.data() as DocumentData;
        const events = groupData.events || [];
        
        const updatedEvents = events.filter((event: any) => event.id !== eventId);
        await updateDoc(groupRef, { events: updatedEvents });
      }
    } catch (error) {
      console.error('Error removing event from group:', error);
      throw error;
    }
  }
}

export default DatabaseService;