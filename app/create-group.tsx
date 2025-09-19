import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/contexts/GroupContext';
import DatabaseService from '@/services/DatabaseService';
import NotificationService from '@/services/NotificationService';
import ErrorHandler from '@/utils/ErrorHandler';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, MessageCircle, Phone, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AppUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  initials: string;
  isFromContacts?: boolean;
  countryCode?: string;
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
  const { id, mode } = useLocalSearchParams();
  const isEditMode = mode === 'edit' && id;
  const groupId = id ? parseInt(id as string) : null;

  const { user, userProfile } = useAuth();
  const { createGroup, updateGroup, getGroup } = useGroups();
  const [groupName, setGroupName] = useState<string>('');
  const [groupDescription, setGroupDescription] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<AppUser[]>([]);
  const [creating, setCreating] = useState(false);

  const [currentGroup, setCurrentGroup] = useState<any>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [existingMembers, setExistingMembers] = useState<Member[]>([]);

  const [contactUsers, setContactUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const [phoneSearchResult, setPhoneSearchResult] = useState<AppUser | null>(null);
  const [phoneSearching, setPhoneSearching] = useState(false);
  const [phoneSearched, setPhoneSearched] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (isEditMode && groupId) {
        const group = getGroup(groupId);
        if (group) {
          setCurrentGroup(group);
          setGroupName(group.name);
          setGroupDescription(group.description || '');
          setExistingMembers(group.members);
          setIsUserAdmin(group.admin === user?.uid);
        }
      }
      
      try {
        setLoadingUsers(true);
        const users = await DatabaseService.getContactsAppUsers();
        
        if (isEditMode && currentGroup) {
          const existingMemberIds = currentGroup.members.map((m: Member) => m.id);
          const filteredUsers = users.filter((user: any) => !existingMemberIds.includes(user.id));
          setContactUsers(filteredUsers);
        } else {
          setContactUsers(users);
        }
      } catch (error) {
        ErrorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
          action: 'load_contacts',
          screen: 'create_group',
          userId: user?.uid
        });
        setErrorMessage('Failed to load contacts');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadData();
  }, [isEditMode, groupId, getGroup, user?.uid, currentGroup]);

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

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
    
    const member = existingMembers.find(m => m.id === memberId);
    if (member) {
      setExistingMembers(prev => prev.filter(m => m.id !== memberId));
      setSuccessMessage(`${member.name} removed from group`);
    }
  };

  const searchByPhoneNumber = async () => {
    if (!phoneSearchQuery.trim()) {
      setErrorMessage('Please enter a phone number');
      return;
    }

    try {
      setPhoneSearching(true);
      setPhoneSearched(false);
      setPhoneSearchResult(null);
      clearMessages();

      const normalizedSearchQuery = phoneSearchQuery.replace(/\D/g, '');
      let user: any = null;
      
      user = await DatabaseService.searchUserByPhoneNumber(phoneSearchQuery);
      
      if (!user && normalizedSearchQuery.length >= 10) {
        user = await DatabaseService.searchUserByPhoneNumber(normalizedSearchQuery);
      }

      setPhoneSearchResult(user as AppUser | null);
      setPhoneSearched(true);
      
      ErrorHandler.logEvent('phone_search_success', {
        hasResult: !!user,
        searchQuery: normalizedSearchQuery.substring(0, 5) + 'XXX'
      });
      
    } catch (error) {
      ErrorHandler.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          action: 'search_phone_number',
          userId: user?.uid
        }
      );
      setErrorMessage('Failed to search phone number');
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
      const inviteMessage = `Hey! I'm using SynciT to coordinate events with friends and family. Download SynciT and join my groups!`;

      const result = await Share.share({
        message: inviteMessage,
        title: 'Join me on SynciT!',
        url: appStoreLink,
      });
      
      if (result.action === Share.sharedAction) {
        ErrorHandler.logEvent('app_invitation_shared');
        setSuccessMessage('Invitation shared! You can add them to groups once they join the app.');
        setPhoneSearchQuery('');
        setPhoneSearchResult(null);
        setPhoneSearched(false);
      }
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'share_app_invitation',
        userId: user?.uid
      });
      setSuccessMessage('Share this message with your friends to invite them to SynciT!');
    }
  };

  const handleSaveGroup = async () => {
    clearMessages();
    
    if (!groupName.trim()) {
      setErrorMessage('Please enter a group name');
      return;
    }

    if (!userProfile) {
      setErrorMessage('User profile not found');
      return;
    }

    if (!isEditMode && selectedUsers.length === 0) {
      setErrorMessage('Please select at least one member');
      return;
    }

    try {
      setCreating(true);

      if (isEditMode && currentGroup) {
        if (!isUserAdmin) {
          setErrorMessage('Only group admin can modify group settings');
          return;
        }

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

        if (selectedUsers.length > 0) {
          await NotificationService.sendGroupInviteNotification(
            updatedGroupData.name,
            userProfile.name,
            selectedUsers.map(user => user.id)
          );
        }

        setSuccessMessage(`"${updatedGroupData.name}" has been updated.`);
        setTimeout(() => router.back(), 2000);

      } else {
        const members: Member[] = [
          {
            id: user?.uid || 'current-user',
            name: userProfile.name,
            initials: getInitials(userProfile.name),
            phone: userProfile.phone,
            role: 'admin' as const,
            joinedAt: new Date(),
            isOnline: true,
            status: 'accepted' as const
          },
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

        if (selectedUsers.length > 0) {
          await NotificationService.sendGroupInviteNotification(
            groupData.name,
            userProfile.name,
            selectedUsers.map(user => user.id)
          );
        }

        setSuccessMessage(`"${groupData.name}" has been created.`);
        setTimeout(() => router.back(), 2000);
      }
    } catch (error) {
      ErrorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
        action: isEditMode ? 'update_group' : 'create_group',
        screen: 'create_group',
        userId: user?.uid
      });
      setErrorMessage(`Failed to ${isEditMode ? 'update' : 'create'} group. Please try again.`);
    } finally {
      setCreating(false);
    }
  };

  const handleCall = async (phoneNumber: string) => {
    try {
      const cleanPhone = phoneNumber.replace(/\s/g, '');
      await Linking.openURL(`tel:${cleanPhone}`);
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'make_call',
        userId: user?.uid
      });
      setErrorMessage('Unable to make phone call.');
    }
  };

  const handleMessage = async (phoneNumber: string) => {
    try {
      const cleanPhone = phoneNumber.replace(/\s/g, '');
      await Linking.openURL(`sms:${cleanPhone}`);
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'send_message',
        userId: user?.uid
      });
      setErrorMessage('Unable to send message.');
    }
  };

  const renderUserItem = ({ item: user }: { item: AppUser }) => {
    const isSelected = selectedUsers.find(u => u.id === user.id);
    
    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(user)}
      >
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>
              {user.initials || getInitials(user.name || '')}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user.name || 'Unknown'}</Text>
            <View style={styles.userMeta}>
              <Text style={styles.userPhone}>{user.phone || ''}</Text>
              <Text style={styles.hasAppIndicator}>• On SynciT</Text>
            </View>
          </View>
        </View>
        {isSelected && <Check size={20} color="#3B82F6" />}
      </TouchableOpacity>
    );
  };

  const renderSelectedMember = ({ item: user }: { item: AppUser }) => (
    <View style={styles.selectedMember}>
      <View style={styles.selectedMemberAvatar}>
        <Text style={styles.selectedMemberInitials}>
          {user.initials || getInitials(user.name || '')}
        </Text>
      </View>
      <Text style={styles.selectedMemberName}>{user.name || 'Unknown'}</Text>
      <TouchableOpacity
        style={styles.removeMemberButton}
        onPress={() => toggleUserSelection(user)}
      >
        <Text style={styles.removeMemberText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  // Member-only view for non-admin users in edit mode
  if (isEditMode && !isUserAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
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
                      <View style={[styles.userAvatar, member.role === 'admin' && styles.adminAvatar]}>
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
                    {member.id !== user?.uid && (
                      <View style={styles.memberActions}>
                        <TouchableOpacity style={styles.actionIcon} onPress={() => handleCall(member.phone)}>
                          <Phone size={16} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionIcon} onPress={() => handleMessage(member.phone)}>
                          <MessageCircle size={16} color="#3B82F6" />
                        </TouchableOpacity>
                      </View>
                    )}
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Group Details' : 'Create New Group'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Error Display */}
      {errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={clearMessages} style={styles.messageDismiss}>
            <Text style={styles.errorDismissText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Success Display */}
      {successMessage && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{successMessage}</Text>
          <TouchableOpacity onPress={clearMessages} style={styles.messageDismiss}>
            <Text style={styles.successDismissText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.section}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.textInput}
            value={groupName}
            onChangeText={(text) => {
              setGroupName(text);
              clearMessages();
            }}
            placeholder="Enter group name"
            placeholderTextColor="#9CA3AF"
            maxLength={50}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Group Description (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={groupDescription}
            onChangeText={(text) => {
              setGroupDescription(text);
              clearMessages();
            }}
            placeholder="What's this group for?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
        </View>

        {isEditMode && existingMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Current Members ({existingMembers.length})</Text>
            <View style={styles.usersList}>
              {existingMembers.map((member, index) => (
                <View key={member.id}>
                  <View style={styles.memberItem}>
                    <View style={styles.userInfo}>
                      <View style={[styles.userAvatar, member.role === 'admin' && styles.adminAvatar]}>
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
                    
                    {member.id !== user?.uid && (
                      <View style={styles.memberActions}>
                        <TouchableOpacity style={styles.actionIcon} onPress={() => handleCall(member.phone)}>
                          <Phone size={16} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionIcon} onPress={() => handleMessage(member.phone)}>
                          <MessageCircle size={16} color="#3B82F6" />
                        </TouchableOpacity>
                        {isUserAdmin && member.role !== 'admin' && (
                          <TouchableOpacity style={styles.actionIcon} onPress={() => removeMember(member.id)}>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isEditMode ? 'Add More Members' : 'Add Members'}
          </Text>
          
          <View style={styles.subsection}>
            <Text style={styles.sublabel}>Find SynciT users by their phone number</Text>
            
            <View style={styles.phoneSearchContainer}>
              <TextInput
                style={styles.phoneSearchInput}
                value={phoneSearchQuery}
                onChangeText={(text) => {
                  setPhoneSearchQuery(text);
                  clearMessages();
                }}
                placeholder="Enter phone number..."
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.searchButton, (!phoneSearchQuery.trim() || phoneSearching) && styles.searchButtonDisabled]}
                onPress={searchByPhoneNumber}
                disabled={!phoneSearchQuery.trim() || phoneSearching}
              >
                <Text style={styles.searchButtonText}>
                  {phoneSearching ? 'Searching...' : 'Search'}
                </Text>
              </TouchableOpacity>
            </View>

            {phoneSearched && (
              <View style={styles.phoneSearchResults}>
                {phoneSearchResult ? (
                  <View style={styles.foundUserContainer}>
                    <View style={styles.foundUserInfo}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userInitials}>
                          {phoneSearchResult.initials || getInitials(phoneSearchResult.name || '')}
                        </Text>
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>{phoneSearchResult.name || 'Unknown'}</Text>
                        <Text style={styles.userPhone}>{phoneSearchResult.phone || ''}</Text>
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
                    <Text style={styles.notFoundText}>No SynciT user found with this phone number</Text>
                    <TouchableOpacity style={styles.inviteButton} onPress={sendInvitation}>
                      <Text style={styles.inviteButtonText}>Send App Invitation</Text>
                    </TouchableOpacity>
                    <Text style={styles.helpText}>Members can also be added later in the group</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.subsection}>
            <Text style={styles.sublabel}>People in your contacts who use SynciT</Text>
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
                  <Text style={styles.emptyStateSubtext}>Use phone search above to find users</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

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
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    flex: 1,
  },
  errorDismissText: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successContainer: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    flex: 1,
  },
  successDismissText: {
    color: '#059669',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageDismiss: {
    padding: 4,
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
  scrollContainer: {
    paddingBottom: 100,
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