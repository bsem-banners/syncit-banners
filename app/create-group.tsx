import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/contexts/GroupContext';
import DatabaseService from '@/services/DatabaseService';
import NotificationService from '@/services/NotificationService';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, MessageCircle, Phone, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Alert, // ADD THIS
  FlatList,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Type definitions
interface AppUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  initials: string;
  isFromContacts?: boolean;
}

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

export default function CreateGroupScreen() {
  // Get route parameters
  const { id, mode } = useLocalSearchParams();
  const isEditMode = mode === 'edit' && id;
  const groupId = id ? parseInt(id as string) : null;

  // Form state
  const { user, userProfile } = useAuth();
  const { createGroup, updateGroup, getGroup } = useGroups();
  const [groupName, setGroupName] = useState<string>('');
  const [groupDescription, setGroupDescription] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<AppUser[]>([]);
  const [creating, setCreating] = useState(false);

  // Edit mode states
  const [currentGroup, setCurrentGroup] = useState<any>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [existingMembers, setExistingMembers] = useState<Member[]>([]);

  // Contact-based users
  const [contactUsers, setContactUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Phone search
  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const [phoneSearchResult, setPhoneSearchResult] = useState<AppUser | null>(null);
  const [phoneSearching, setPhoneSearching] = useState(false);
  const [phoneSearched, setPhoneSearched] = useState(false);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (isEditMode && groupId) {
        // Load group for edit
        const group = getGroup(groupId);
        if (group) {
          setCurrentGroup(group);
          setGroupName(group.name);
          setGroupDescription(group.description || '');
          setExistingMembers(group.members);
          setIsUserAdmin(group.admin === user?.uid);
        }
      }
      
      // Load contact users
      try {
        setLoadingUsers(true);
        const users = await DatabaseService.getContactsAppUsers();
        
        // In edit mode, filter out existing members
        if (isEditMode && currentGroup) {
          const existingMemberIds = currentGroup.members.map((m: Member) => m.id);
          const filteredUsers = users.filter(user => !existingMemberIds.includes(user.id));
          setContactUsers(filteredUsers);
        } else {
          setContactUsers(users);
        }
      } catch (error) {
        console.error('Error loading contact users:', error);
        Alert.alert('Error', 'Failed to load contacts');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadData();
  }, [isEditMode, groupId, getGroup, user?.uid, currentGroup]);

  // Helper functions
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleUserSelection = (user: AppUser) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const removeMember = (memberId: string) => {
    if (!isUserAdmin) return;
    
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setExistingMembers(prev => prev.filter(m => m.id !== memberId));
          }
        }
      ]
    );
  };

  const searchByPhoneNumber = async () => {
    if (!phoneSearchQuery.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    try {
      setPhoneSearching(true);
      setPhoneSearched(false);
      setPhoneSearchResult(null);

      const user = await DatabaseService.searchUserByPhoneNumber(phoneSearchQuery);
      setPhoneSearchResult(user);
      setPhoneSearched(true);
    } catch (error) {
      console.error('Error searching phone number:', error);
      Alert.alert('Error', 'Failed to search phone number');
    } finally {
      setPhoneSearching(false);
    }
  };

  const sendInvitation = async () => {
    if (!phoneSearchQuery.trim() || !userProfile) {
      return;
    }

    try {
      const appStoreLink = 'https://apps.apple.com/app/syncit';
      const playStoreLink = 'https://play.google.com/store/apps/details?id=com.syncit';
      
      const inviteMessage = `Hey! I'm using SynciT to coordinate events with friends and family. It's super easy to plan group activities together! 

📱 Download SynciT:
iOS: ${appStoreLink}
Android: ${playStoreLink}

Join my groups and let's start planning!`;

      const result = await Share.share({
        message: inviteMessage,
        title: 'Join me on SynciT!',
        url: appStoreLink,
      });
      
      if (result.action === Share.sharedAction) {
        console.log('Successfully shared invite');
        Alert.alert(
          'Invitation Shared!', 
          `Invitation to join SynciT has been shared. You can add them to groups once they join the app.`,
          [{ text: 'OK' }]
        );
        setPhoneSearchQuery('');
        setPhoneSearchResult(null);
        setPhoneSearched(false);
      }
    } catch (error) {
      console.error('Error sharing invitation:', error);
      
      const appStoreLink = 'https://apps.apple.com/app/syncit';
      const playStoreLink = 'https://play.google.com/store/apps/details?id=com.syncit';
      
      const fallbackMessage = `Hey! I'm using SynciT to coordinate events with friends and family. It's super easy to plan group activities together! 

📱 Download SynciT:
iOS: ${appStoreLink}
Android: ${playStoreLink}

Join my groups and let's start planning!`;

      Alert.alert(
        'Invite Friends',
        'Share this message with your friends:\n\n' + fallbackMessage,
        [
          {
            text: 'Copy Message',
            onPress: () => {
              Alert.alert('Message copied!', 'Paste it in your messaging app');
            }
          },
          { text: 'Close', style: 'cancel' }
        ]
      );
    }
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (!userProfile) {
      Alert.alert('Error', 'User profile not found');
      return;
    }

    // For create mode, require at least one member
    if (!isEditMode && selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    try {
      setCreating(true);

      if (isEditMode && currentGroup) {
        // UPDATE MODE
        if (!isUserAdmin) {
          Alert.alert('Error', 'Only group admin can modify group settings');
          return;
        }

        // Combine existing members with new selected users
        const newMembers = selectedUsers.map(selectedUser => ({
          id: selectedUser.id,
          name: selectedUser.name,
          initials: getInitials(selectedUser.name),
          phone: selectedUser.phone,
          role: 'member' as const,
          joinedAt: new Date(),
          isOnline: true,
          status: 'pending' as const
        }));

        const updatedMembers = [...existingMembers, ...newMembers];

        const updatedGroupData = {
          ...currentGroup,
          name: groupName.trim(),
          description: groupDescription.trim(),
          members: updatedMembers,
        };

        await updateGroup(currentGroup.id, updatedGroupData);

        // Send notifications to newly added members
        if (selectedUsers.length > 0) {
          const invitedUserIds = selectedUsers.map(user => user.id);
          await NotificationService.sendGroupInviteNotification(
            invitedUserIds, 
            updatedGroupData.name, 
            userProfile.name
          );
        }

        Alert.alert(
          'Group Updated!',
          `"${updatedGroupData.name}" has been updated.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );

      } else {
        // CREATE MODE
        const members: Member[] = [
          // Add current user as admin with accepted status
          {
            id: user?.uid || 'current-user',
            name: userProfile.name,
            initials: getInitials(userProfile.name),
            phone: userProfile.phone,
            role: 'admin',
            joinedAt: new Date(),
            isOnline: true,
            status: 'accepted'
          },
          // Add selected users as members with PENDING status
          ...selectedUsers.map(selectedUser => ({
            id: selectedUser.id,
            name: selectedUser.name,
            initials: getInitials(selectedUser.name),
            phone: selectedUser.phone,
            role: 'member' as const,
            joinedAt: new Date(),
            isOnline: true,
            status: 'pending' as const
          }))
        ];

        const groupData = {
          name: groupName.trim(),
          description: groupDescription.trim(),
          admin: user?.uid || 'current-user',
          members,
          events: [],
          silentNotifications: false,
        };

        await createGroup(groupData);

        // Send notifications to invited members
        if (selectedUsers.length > 0) {
          const invitedUserIds = selectedUsers.map(user => user.id);
          await NotificationService.sendGroupInviteNotification(
            invitedUserIds, 
            groupData.name, 
            userProfile.name
          );
        }

        Alert.alert(
          'Group Created!',
          `"${groupData.name}" has been created with ${groupData.members.length} members.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Error saving group:', error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} group. Please try again.`);
    } finally {
      setCreating(false);
    }
  };

  // For non-admin users in edit mode, show read-only view
  if (isEditMode && !isUserAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Members</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{currentGroup?.name}</Text>
            {currentGroup?.description && (
              <Text style={styles.groupDescription}>{currentGroup.description}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Members ({existingMembers.length})</Text>
            <View style={styles.usersList}>
              {existingMembers.map((member, index) => (
                <View key={member.id}>
                  <View style={styles.memberItem}>
                    <View style={styles.userInfo}>
                      <View style={[
                        styles.userAvatar,
                        member.role === 'admin' && styles.adminAvatar
                      ]}>
                        <Text style={styles.userInitials}>{member.initials}</Text>
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>
                          {member.name} {member.id === user?.uid && '(You)'}
                        </Text>
                        <Text style={styles.userRole}>
                          {member.role === 'admin' ? 'Group Admin' : 'Member'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.contactActions}>
                      <TouchableOpacity style={styles.contactButton}>
                        <Text style={styles.contactButtonText}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.contactButton}>
                        <Text style={styles.contactButtonText}>Message</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {index < existingMembers.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const handleCall = async (phoneNumber: string) => {
    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch (error) {
      console.error('Failed to make call:', error);
      Alert.alert('Error', 'Unable to make phone call');
    }
  };

  const handleMessage = async (phoneNumber: string) => {
    try {
      await Linking.openURL(`sms:${phoneNumber}`);
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Unable to send message');
    }
  };

  const renderUserItem = ({ item: user }: { item: AppUser }) => {
    const isSelected = selectedUsers.find(u => u.id === user.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          isSelected && styles.userItemSelected
        ]}
        onPress={() => toggleUserSelection(user)}
      >
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>
              {user.initials || getInitials(user.name)}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user.name}</Text>
            <View style={styles.userMeta}>
              <Text style={styles.userPhone}>{user.phone}</Text>
              <Text style={styles.hasAppIndicator}>• On SynciT</Text>
            </View>
          </View>
        </View>
        {isSelected && (
          <Check size={20} color="#3B82F6" />
        )}
      </TouchableOpacity>
    );
  };

  const renderSelectedMember = ({ item: user }: { item: AppUser }) => (
    <View style={styles.selectedMember}>
      <View style={styles.selectedMemberAvatar}>
        <Text style={styles.selectedMemberInitials}>
          {user.initials || getInitials(user.name)}
        </Text>
      </View>
      <Text style={styles.selectedMemberName}>{user.name}</Text>
      <TouchableOpacity
        style={styles.removeMemberButton}
        onPress={() => toggleUserSelection(user)}
      >
        <Text style={styles.removeMemberText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit Group' : 'Create New Group'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.textInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter group name"
            placeholderTextColor="#9CA3AF"
            maxLength={50}
          />
        </View>

        {/* Group Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Group Description (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={groupDescription}
            onChangeText={setGroupDescription}
            placeholder="What's this group for?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
        </View>

        {/* Existing Members (Edit Mode) */}
        {isEditMode && existingMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Current Members ({existingMembers.length})</Text>
            <View style={styles.usersList}>
              {existingMembers.map((member, index) => (
                <View key={member.id}>
                  <View style={styles.memberItem}>
                    <View style={styles.userInfo}>
                      <View style={[
                        styles.userAvatar,
                        member.role === 'admin' && styles.adminAvatar
                      ]}>
                        <Text style={styles.userInitials}>{member.initials}</Text>
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>
                          {member.name} {member.id === user?.uid && '(You)'}
                        </Text>
                        <Text style={styles.userRole}>
                          {member.role === 'admin' ? 'Group Admin' : 'Member'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Action Icons - Show for all members except current user */}
                    {member.id !== user?.uid && (
                      <View style={styles.memberActions}>
                        {/* Call Icon */}
                        <TouchableOpacity
                          style={styles.actionIcon}
                          onPress={() => handleCall(member.phone)}
                        >
                          <Phone size={16} color="#3B82F6" />
                        </TouchableOpacity>
                        
                        {/* Message Icon */}
                        <TouchableOpacity
                          style={styles.actionIcon}
                          onPress={() => handleMessage(member.phone)}
                        >
                          <MessageCircle size={16} color="#3B82F6" />
                        </TouchableOpacity>
                        
                        {/* Remove Icon - Only show if admin can remove this member */}
                        {isUserAdmin && member.role !== 'admin' && (
                          <TouchableOpacity
                            style={styles.actionIcon}
                            onPress={() => removeMember(member.id)}
                          >
                            <Trash2 size={16} color="#DC2626" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                  {index < existingMembers.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Selected Members Preview */}
        {selectedUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>
              {isEditMode ? 'Adding Members' : 'Selected Members'} ({selectedUsers.length})
            </Text>
            <FlatList
              data={selectedUsers}
              renderItem={renderSelectedMember}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectedMembersList}
            />
          </View>
        )}

        {/* Add Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isEditMode ? 'Add More Members' : 'Add Members'}
          </Text>
          
          {/* Phone Number Search */}
          <View style={styles.subsection}>
            <Text style={styles.sublabel}>
              Find SynciT users by their phone number
            </Text>
            
            <View style={styles.phoneSearchContainer}>
              <TextInput
                style={styles.phoneSearchInput}
                value={phoneSearchQuery}
                onChangeText={setPhoneSearchQuery}
                placeholder="Enter phone number..."
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[
                  styles.searchButton,
                  (!phoneSearchQuery.trim() || phoneSearching) && styles.searchButtonDisabled
                ]}
                onPress={searchByPhoneNumber}
                disabled={!phoneSearchQuery.trim() || phoneSearching}
              >
                <Text style={styles.searchButtonText}>
                  {phoneSearching ? 'Searching...' : 'Search'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Phone Search Results */}
            {phoneSearched && (
              <View style={styles.phoneSearchResults}>
                {phoneSearchResult ? (
                  <View style={styles.foundUserContainer}>
                    <View style={styles.foundUserInfo}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userInitials}>
                          {phoneSearchResult.initials || getInitials(phoneSearchResult.name)}
                        </Text>
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>{phoneSearchResult.name}</Text>
                        <Text style={styles.userPhone}>{phoneSearchResult.phone}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.addUserButton}
                      onPress={() => toggleUserSelection(phoneSearchResult)}
                    >
                      <Text style={styles.addUserButtonText}>
                        {selectedUsers.find(u => u.id === phoneSearchResult.id) ? 'Remove' : 'Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.notFoundContainer}>
                    <Text style={styles.notFoundText}>
                      No SynciT user found with this phone number
                    </Text>
                    <TouchableOpacity
                      style={styles.inviteButton}
                      onPress={sendInvitation}
                    >
                      <Text style={styles.inviteButtonText}>Send App Invitation</Text>
                    </TouchableOpacity>
                    <Text style={styles.helpText}>
                      Members can also be added later in the group
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* From Contacts */}
          <View style={styles.subsection}>
            <Text style={styles.sublabel}>
              People in your contacts who use SynciT
            </Text>

            <View style={styles.usersList}>
              {loadingUsers ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading contacts...</Text>
                </View>
              ) : contactUsers.length > 0 ? (
                <FlatList
                  data={contactUsers}
                  renderItem={renderUserItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {isEditMode ? 'No additional contacts using SynciT found' : 'No contacts using SynciT found'}
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Use phone search above to find users
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            ((!groupName.trim() || (!isEditMode && selectedUsers.length === 0)) || creating) && styles.createButtonDisabled
          ]}
          onPress={handleSaveGroup}
          disabled={!groupName.trim() || (!isEditMode && selectedUsers.length === 0) || creating}
        >
          <Text style={styles.createButtonText}>
            {creating 
              ? (isEditMode ? 'Updating Group...' : 'Creating Group...') 
              : (isEditMode ? 'Update Group' : 'Create Group')
            }
          </Text>
        </TouchableOpacity>
      </View>
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
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  subsection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  adminAvatar: {
    backgroundColor: '#F59E0B',
  },
  userRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  removeButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  removeButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  contactButtonText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '500',
  },
  phoneSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneSearchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  phoneSearchResults: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  foundUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foundUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addUserButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addUserButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  notFoundContainer: {
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  inviteButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  inviteButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  selectedMembersList: {
    marginTop: 8,
  },
  selectedMember: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  selectedMemberAvatar: {
    width: 48,
    height: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedMemberInitials: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectedMemberName: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 60,
  },
  removeMemberButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMemberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  usersList: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  userItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitials: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  hasAppIndicator: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
 });  