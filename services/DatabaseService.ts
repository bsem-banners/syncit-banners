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

  // NEW: Contact-based user discovery
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
      const contactPhones = new Set<string>();
      
      // Extract and normalize phone numbers from contacts
      contacts.forEach(contact => {
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          contact.phoneNumbers.forEach(phoneObj => {
            // Normalize phone number (remove spaces, dashes, etc.)
            const normalizedPhone = phoneObj.number.replace(/\D/g, '');
            if (normalizedPhone.length >= 10) {
              contactPhones.add(normalizedPhone);
            }
          });
        }
      });

      // Get all app users
      const allAppUsers = await this.getAllAppUsers();
      
      // Filter app users who are in contacts
      const contactAppUsers = allAppUsers.filter(user => {
        const userPhone = user.phone.replace(/\D/g, '');
        return contactPhones.has(userPhone);
      });

      // Add isFromContacts flag
      return contactAppUsers.map(user => ({
        ...user,
        isFromContacts: true
      }));

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

  static async searchUserByPhoneNumber(phoneNumber: string): Promise<ContactUser | null> {
    try {
      // Normalize phone number
      const normalizedPhone = phoneNumber.replace(/\D/g, '');
      
      if (normalizedPhone.length < 10) {
        return null;
      }

      // Search for user with this phone number
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let foundUser = null;
      snapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        const userPhone = data.phone?.replace(/\D/g, '') || '';
        
        if (userPhone === normalizedPhone) {
          foundUser = {
            id: doc.id,
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            initials: data.initials || '',
            isFromContacts: false
          };
        }
      });
      
      return foundUser;
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