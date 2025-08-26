import { db } from '@/config/firebase';
import DatabaseService from '@/services/DatabaseService';
import NotificationService from '@/services/NotificationService';
import {
  collection,
  onSnapshot,
  query,
} from 'firebase/firestore';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

// Enhanced Member interface with status
interface Member {
  id: string;
  name: string;
  initials: string;
  phone: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  isOnline: boolean;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
}

interface Event {
  id: number;
  date: string;
  time: string;
  notes: string;
  type: 'morning' | 'afternoon' | 'evening' | 'all-day';
  user: string;
  userInitials: string;
  createdBy: string;
  isNewForUser?: Record<string, boolean>; // NEW: Track which users haven't seen this event
  createdAt?: Date; // NEW: Track when event was created
}

interface Group {
  id: number;
  name: string;
  description: string;
  admin: string;
  members: Member[];
  events: Event[];
  createdAt: Date;
  silentNotifications: boolean;
  creatorBlocked?: boolean;
}

interface GroupContextType {
  groups: Group[];
  loading: boolean;
  addEventToGroup: (groupId: number, events: Event[]) => Promise<void>;
  deleteEventFromGroup: (groupId: number, eventId: number) => Promise<void>;
  addMemberToGroup: (groupId: number, newMembers: Member[]) => Promise<void>;
  removeMemberFromGroup: (groupId: number, memberId: string) => Promise<void>;
  promoteMemberToAdmin: (groupId: number, memberId: string) => Promise<void>;
  createGroup: (groupData: Omit<Group, 'id' | 'createdAt'>) => Promise<void>;
  getGroup: (groupId: number) => Group | undefined;
  updateMemberStatus: (groupId: number, memberId: string, status: 'accepted' | 'declined' | 'blocked') => Promise<void>;
  blockGroupCreator: (groupId: number) => Promise<void>;
  deleteGroupForUser: (groupId: number) => Promise<void>;
  refreshGroups: () => Promise<void>;
  updateGroup: (groupId: number, updates: Partial<Group>) => Promise<void>;
  markEventAsViewed: (groupId: number, eventId: number) => Promise<void>; // NEW
  isEventNewForUser: (event: Event) => boolean; // NEW
}

export type { Event, Group, Member };

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const useGroups = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroups must be used within a GroupProvider');
  }
  return context;
};

export { GroupContext };

export const GroupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Setup real-time listener when user changes
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      setGroups([]);
      return;
    }

    setLoading(true);
    console.log('Setting up real-time listener for user:', user.uid);

    // Listen to all groups collection for real-time updates
    const groupsQuery = query(collection(db, 'groups'));
    
    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      console.log('Real-time update received, processing groups...');
      const userGroups: Group[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if user is admin
        if (data.admin === user.uid) {
          userGroups.push(DatabaseService.formatGroupData(doc.id, data));
          return;
        }

        // Check if user is member
        const isMember = data.members?.some((member: any) => member.id === user.uid);
        if (isMember) {
          userGroups.push(DatabaseService.formatGroupData(doc.id, data));
        }
      });

      console.log(`Real-time update: Found ${userGroups.length} groups for user`);
      setGroups(userGroups);
      setLoading(false);
    }, (error) => {
      console.error('Real-time listener error:', error);
      setLoading(false);
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up groups listener');
      unsubscribe();
    };
  }, [user?.uid]);

  // Manual refresh (for pull-to-refresh or error recovery)
  const refreshGroups = useCallback(async () => {
    if (!user?.uid) return;
    
    console.log('Manual refresh requested');
    try {
      setLoading(true);
      const userGroups = await DatabaseService.getUserGroups(user.uid);
      setGroups(userGroups);
    } catch (error) {
      console.error('Error during manual refresh:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Create group
  const createGroup = useCallback(async (groupData: Omit<Group, 'id' | 'createdAt'>) => {
    const newGroup: Group = {
      ...groupData,
      id: Date.now(),
      createdAt: new Date(),
    };
    
    try {
      await DatabaseService.createGroup(newGroup);
      // Real-time listener will handle the update automatically
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  }, []);

  // Update group
  const updateGroup = useCallback(async (groupId: number, updates: Partial<Group>) => {
    try {
      await DatabaseService.updateGroup(groupId, updates);
      // Real-time listener will handle the update automatically
    } catch (error) {
      console.error('Failed to update group:', error);
      throw error;
    }
  }, []);

  // Add event to group
  const addEventToGroup = useCallback(async (groupId: number, events: Event[]) => {
    try {
      // Get group to determine who should see red dots
      const currentGroup = groups.find(g => g.id === groupId);
      if (!currentGroup) return;

      // Mark event as new for all other group members
      const eventsWithNotifications = events.map(event => {
        const isNewForUser: Record<string, boolean> = {};
        currentGroup.members.forEach(member => {
          if (member.id !== user?.uid) {
            isNewForUser[member.id] = true; // Show red dot for other members
          }
        });

        return {
          ...event,
          isNewForUser,
          createdAt: new Date()
        };
      });

      for (const event of eventsWithNotifications) {
        await DatabaseService.addEventToGroup(groupId, event);
      }
      // Real-time listener will handle updates automatically
    } catch (error) {
      console.error('Failed to add events:', error);
      // Fall back to local state update with red dot logic
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? { ...group, events: [...group.events, ...events] }
            : group
        )
      );
    }
  }, [groups, user?.uid]);

  // Add member to group
  const addMemberToGroup = useCallback(async (groupId: number, newMembers: Member[]) => {
    try {
      for (const member of newMembers) {
        await DatabaseService.addMemberToGroup(groupId, member);
      }
      // Real-time listener will handle updates automatically
    } catch (error) {
      console.error('Failed to add members:', error);
      // Fall back to local state update
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? { ...group, members: [...group.members, ...newMembers] }
            : group
        )
      );
    }
  }, []);

  // Remove member from group
  const removeMemberFromGroup = useCallback(async (groupId: number, memberId: string) => {
    try {
      // Get group and member info for notification
      const currentGroup = groups.find(g => g.id === groupId);
      const memberToRemove = currentGroup?.members.find(m => m.id === memberId);
      const adminMember = currentGroup?.members.find(m => m.id === user?.uid);
      
      await DatabaseService.removeMemberFromGroup(groupId, memberId);
      
      // Send notification to remaining group members (admin removed member)
      if (currentGroup && memberToRemove && adminMember) {
        await NotificationService.sendMemberRemovedNotification(
          groupId.toString(),
          currentGroup.name,
          memberToRemove.name,
          adminMember.name
        );
      }
      
      // Real-time listener will handle updates automatically
    } catch (error) {
      console.error('Failed to remove member:', error);
      // Fall back to local state update
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? { ...group, members: group.members.filter(member => member.id !== memberId) }
            : group
        )
      );
    }
  }, [groups, user?.uid]);

  // Promote member to admin
  const promoteMemberToAdmin = useCallback(async (groupId: number, memberId: string) => {
    try {
      // Get current group
      const currentGroup = groups.find(g => g.id === groupId);
      if (!currentGroup) return;

      // Update member role
      const updatedMembers = currentGroup.members.map(member => 
        member.id === memberId 
          ? { ...member, role: 'admin' as const }
          : member
      );

      await DatabaseService.updateGroup(groupId, { members: updatedMembers });
      // Real-time listener will handle updates automatically
    } catch (error) {
      console.error('Failed to promote member:', error);
      // Fall back to local state update
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? {
                ...group,
                members: group.members.map(member => 
                  member.id === memberId 
                    ? { ...member, role: 'admin' as const }
                    : member
                )
              }
            : group
        )
      );
    }
  }, [groups]);

  // Delete event from group
  const deleteEventFromGroup = useCallback(async (groupId: number, eventId: number) => {
    try {
      await DatabaseService.removeEventFromGroup(groupId, eventId);
      // Real-time listener will handle updates automatically
    } catch (error) {
      console.error('Failed to delete event:', error);
      // Fall back to local state update
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? { ...group, events: group.events.filter(event => event.id !== eventId) }
            : group
        )
      );
    }
  }, []);

  // Update member status
  const updateMemberStatus = useCallback(async (groupId: number, memberId: string, status: 'accepted' | 'declined' | 'blocked') => {
    try {
      await DatabaseService.updateMemberStatus(groupId, memberId, status);
      // Real-time listener will handle updates automatically
    } catch (error) {
      console.error('Failed to update member status:', error);
      // Fall back to local state update
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? {
                ...group,
                members: group.members.map(member => 
                  member.id === memberId 
                    ? { ...member, status }
                    : member
                )
              }
            : group
        )
      );
    }
  }, []);

  // Block group creator
  const blockGroupCreator = useCallback(async (groupId: number) => {
    try {
      // Update group to mark creator as blocked
      await DatabaseService.updateGroup(groupId, { creatorBlocked: true });
      // Real-time listener will handle updates automatically
    } catch (error) {
      console.error('Failed to block creator:', error);
      // Fall back to local state update
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? { ...group, creatorBlocked: true }
            : group
        )
      );
    }
  }, []);

  // Delete group for user
  const deleteGroupForUser = useCallback(async (groupId: number) => {
    try {
      const currentGroup = groups.find(g => g.id === groupId);
      if (!currentGroup) return;

      // If user is admin, delete the entire group from Firestore
      if (currentGroup.admin === user?.uid) {
        await DatabaseService.deleteGroup(groupId);
        console.log('Admin deleted group from Firestore');
      } else {
        // If user is member, just remove them from the group
        await DatabaseService.removeMemberFromGroup(groupId, user?.uid || '');
        console.log('Member removed themselves from group');
        
        // Send notification to remaining group members
        const memberWhoLeft = currentGroup.members.find(m => m.id === user?.uid);
        if (memberWhoLeft) {
          await NotificationService.sendMemberLeftNotification(
            groupId.toString(),
            currentGroup.name,
            memberWhoLeft.name
          );
        }
      }
      
      // Real-time listener will handle updates automatically
    } catch (error) {
      console.error('Failed to delete group:', error);
      // Fall back to local state update
      setGroups(prevGroups => 
        prevGroups.filter(group => group.id !== groupId)
      );
    }
  }, [groups, user?.uid]);

  // Get specific group
  const getGroup = useCallback((groupId: number) => {
    return groups.find(group => group.id === groupId);
  }, [groups]);

  // Mark event as viewed for current user
  const markEventAsViewed = useCallback(async (groupId: number, eventId: number) => {
    if (!user?.uid) return;
    
    try {
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? {
                ...group,
                events: group.events.map(event => 
                  event.id === eventId 
                    ? {
                        ...event,
                        isNewForUser: {
                          ...event.isNewForUser,
                          [user.uid]: false
                        }
                      }
                    : event
                )
              }
            : group
        )
      );
    } catch (error) {
      console.error('Failed to mark event as viewed:', error);
    }
  }, [user?.uid]);

  // Check if event is new for current user
  const isEventNewForUser = useCallback((event: Event): boolean => {
    if (!user?.uid || event.createdBy === user?.uid) return false;
    return event.isNewForUser?.[user.uid] !== false;
  }, [user?.uid]);

  return (
    <GroupContext.Provider value={{
      groups, 
      loading,
      addEventToGroup, 
      deleteEventFromGroup, 
      addMemberToGroup,
      removeMemberFromGroup,
      promoteMemberToAdmin,
      createGroup,
      getGroup,
      updateMemberStatus,
      blockGroupCreator,
      deleteGroupForUser,
      refreshGroups,
      updateGroup,
      markEventAsViewed,
      isEventNewForUser,
     }}>
        {children}
      </GroupContext.Provider>
  );
};