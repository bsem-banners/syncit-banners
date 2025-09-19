import DynamicImageBanner from '@/components/DynamicImageBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/contexts/GroupContext';
import NotificationService from '@/services/NotificationService';
import ErrorHandler from '@/utils/ErrorHandler';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  Bell,
  Plus,
  Settings,
  Shield,
  Trash2,
  Users,
  X
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupsListScreen() {
  const { user, userProfile } = useAuth();
  const { groups, updateMemberStatus, deleteGroupForUser, isEventNewForUser } = useGroups();
  const [selectedGroupForAction, setSelectedGroupForAction] = useState<any>(null);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );
  
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef<boolean>(false);
  const touchStartTimeRef = useRef<number>(0);

  const getCurrentUserStatus = (group: any) => {
    const currentUser = group.members.find((member: any) => member.id === user?.uid);
    return currentUser?.status || 'accepted';
  };

  const isGroupAccessible = (group: any) => {
    const userStatus = getCurrentUserStatus(group);
    return userStatus === 'accepted' || group.admin === user?.uid;
  };

  const hasNewEvents = (group: any) => {
    if (!group.events || !isEventNewForUser) return false;
    return group.events.some((event: any) => isEventNewForUser(event));
  };

  const handleStart = (group: any) => {
    if (selectedGroupForAction) {
      setSelectedGroupForAction(null);
      return;
    }

    const userStatus = getCurrentUserStatus(group);
    
    if (userStatus === 'pending') {
      setSelectedInvitation(group);
      setShowInvitationModal(true);
      return;
    }

    isLongPressRef.current = false;
    touchStartTimeRef.current = Date.now();
    
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setSelectedGroupForAction(group);
      
      if (Platform.OS === 'ios') {
        Vibration.vibrate(50);
      } else {
        Vibration.vibrate(50);
      }
    }, 500);
  };

  const handleEnd = (group: any) => {
    const pressDuration = Date.now() - touchStartTimeRef.current;
    const wasLongPress = isLongPressRef.current;
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const userStatus = getCurrentUserStatus(group);

    if (userStatus === 'pending' && !wasLongPress && pressDuration < 500) {
      setSelectedInvitation(group);
      setShowInvitationModal(true);
      return;
    }

    if (userStatus === 'declined') {
      return;
    }

    if (selectedGroupForAction && selectedGroupForAction.id === group.id && !wasLongPress && pressDuration < 500) {
      if (isGroupAccessible(group)) {
        router.push(`/group-detail?id=${group.id}` as any);
      }
      setSelectedGroupForAction(null);
      return;
    }

    if (wasLongPress) {
      return;
    }

    if (!selectedGroupForAction && pressDuration < 500 && isGroupAccessible(group)) {
      router.push(`/group-detail?id=${group.id}` as any);
    }
  };

  const handleCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressRef.current = false;
  };

  const handleAcceptInvitation = async () => {
    if (!selectedInvitation || !userProfile) return;
    
    try {
      await updateMemberStatus(selectedInvitation.id, user?.uid || 'unknown', 'accepted');
     
      await NotificationService.sendInviteAcceptedNotification(
        selectedInvitation.id.toString(),
        userProfile.name
      );
     
      setShowInvitationModal(false);
      setSelectedInvitation(null);
      setSuccessMessage('Invitation accepted successfully');
      
      ErrorHandler.logEvent('invitation_accepted', {
        groupId: selectedInvitation.id,
        userId: user?.uid
      });
     
    } catch (error) {
      ErrorHandler.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          action: 'accept_invitation',
          groupId: selectedInvitation.id,
          userId: user?.uid
        }
      );
      setErrorMessage('Failed to accept invitation. Please try again.');
    }
  };

  const handleDeclineInvitation = () => {
    if (!selectedInvitation) return;
    
    try {
      updateMemberStatus(selectedInvitation.id, user?.uid || 'unknown', 'declined');
      setShowInvitationModal(false);
      setSelectedInvitation(null);
      setSuccessMessage(`You've declined the invitation to "${selectedInvitation.name}"`);
      
      ErrorHandler.logEvent('invitation_declined', {
        groupId: selectedInvitation.id,
        userId: user?.uid
      });
      
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'decline_invitation',
        groupId: selectedInvitation.id,
        userId: user?.uid
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupForAction) return;
    
    const userStatus = getCurrentUserStatus(selectedGroupForAction);
    const isAdmin = selectedGroupForAction.admin === user?.uid;
    
    try {
      await deleteGroupForUser(selectedGroupForAction.id);
      setSelectedGroupForAction(null);
      
      if (userStatus === 'declined') {
        setSuccessMessage(`"${selectedGroupForAction.name}" removed from your list`);
        ErrorHandler.logEvent('group_removed_from_list', {
          groupId: selectedGroupForAction.id,
          userId: user?.uid
        });
      } else if (isAdmin) {
        setSuccessMessage('Group deleted successfully');
        ErrorHandler.logEvent('group_deleted_by_admin', {
          groupId: selectedGroupForAction.id,
          userId: user?.uid
        });
      } else {
        setSuccessMessage('You have left the group');
        ErrorHandler.logEvent('group_left_by_member', {
          groupId: selectedGroupForAction.id,
          userId: user?.uid
        });
      }
      
    } catch (error) {
      ErrorHandler.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          action: isAdmin ? 'delete_group_as_admin' : 'leave_group_as_member',
          groupId: selectedGroupForAction.id,
          userId: user?.uid
        }
      );
      setErrorMessage('Failed to perform action. Please try again.');
    }
  };

  const handleSilentNotification = () => {
    if (!selectedGroupForAction) return;
    
    try {
      ErrorHandler.logEvent('notification_settings_changed', {
        groupId: selectedGroupForAction.id,
        userId: user?.uid,
        silentMode: !selectedGroupForAction.silentNotifications
      });
      
      setSuccessMessage('Group notification settings updated');
      setSelectedGroupForAction(null);
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'change_notification_settings',
        groupId: selectedGroupForAction.id,
        userId: user?.uid
      });
    }
  };

  const renderGroupItem = ({ item: group }: { item: any }) => {
    const isSelected = selectedGroupForAction && selectedGroupForAction.id === group.id;
    const userStatus = getCurrentUserStatus(group);
    const groupHasNewEvents = hasNewEvents(group);
    
    return (
      <Pressable
        onPressIn={() => handleStart(group)}
        onPressOut={() => handleEnd(group)}
        onTouchCancel={handleCancel}
        style={[
          styles.groupItem,
          isSelected && styles.groupItemSelected,
          userStatus === 'declined' && styles.groupItemDeclined,
          userStatus === 'pending' && styles.groupItemPending
        ]}
      >
        <View style={[
          styles.groupIcon,
          userStatus === 'declined' && styles.groupIconDeclined
        ]}>
          <Users size={12} color="white" />
          <Text style={styles.memberCount}>{group.members?.length || 0}</Text>
          
          {/* SINGLE notification badge for both silent notifications AND new events */}
          {(group.silentNotifications || (groupHasNewEvents && userStatus === 'accepted')) && (
            <View style={styles.notificationBadge}>
              {group.silentNotifications ? (
                <Bell size={8} color="white" />
              ) : null}
            </View>
          )}
        </View>
        
        <View style={styles.groupInfo}>
          <View style={styles.groupHeader}>
            <Text style={[
              styles.groupName,
              userStatus === 'declined' && styles.groupNameDeclined
            ]}>
              {group.name}
            </Text>
            
            {userStatus === 'pending' && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>NEW</Text>
              </View>
            )}
            {group.admin === user?.uid && <Shield size={14} color="#3B82F6" />}
            {group.silentNotifications && (
              <View style={styles.silentIcon}>
                <Bell size={12} color="#9CA3AF" />
                <View style={styles.silentStrike} />
              </View>
            )}
            {isSelected && <View style={styles.selectedIndicator} />}
          </View>
          {group.description && (
            <Text style={[
              styles.groupDescription,
              userStatus === 'declined' && styles.groupDescriptionDeclined
            ]}>
              {group.description}
            </Text>
          )}
          {userStatus === 'pending' && (
            <Text style={styles.statusLabel}>Tap to respond to invitation</Text>
          )}
          {userStatus === 'declined' && (
            <Text style={styles.statusLabel}>Invitation declined</Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        
        {selectedGroupForAction ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDeleteGroup}
            >
              <Trash2 size={20} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSilentNotification}
            >
              <View style={styles.bellContainer}>
                <Bell size={20} color="white" />
                {selectedGroupForAction.silentNotifications && (
                  <View style={styles.bellStrike} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        ) : (
           <View style={styles.headerButtonsContainer}>
             <TouchableOpacity
               style={styles.headerButtonContainer}
               onPress={() => router.push('/create-group')}
             >
               <View style={styles.circularButton}>
                 <Plus size={24} color="white" strokeWidth={3} />
               </View>
               <Text style={styles.headerButtonHint}>Add Group</Text>
             </TouchableOpacity>

             <TouchableOpacity
               style={styles.headerButtonContainer}
               onPress={() => router.push('/settings')}
             >
               <View style={styles.circularButton}>
                 <Settings size={24} color="white" strokeWidth={3} />
               </View>
               <Text style={styles.headerButtonHint}>Settings</Text>
             </TouchableOpacity>
           </View>
        )}
      </View>

      {/* Error/Success Message Display */}
      {(errorMessage || successMessage) && (
        <View style={styles.messageContainer}>
          <Text style={[
            styles.messageText,
            errorMessage ? styles.errorText : styles.successText
          ]}>
            {errorMessage || successMessage}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              setErrorMessage('');
              setSuccessMessage('');
            }} 
            style={styles.messageDismiss}
          >
            <Text style={styles.messageDismissText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={item => item.id.toString()}
        style={styles.groupsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Users size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No groups yet</Text>
            <Text style={styles.emptyStateSubtitle}>Create your first group to get started</Text>
          </View>
        }
      />

      <Modal
        visible={showInvitationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInvitationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Invitation</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowInvitationModal(false)}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.invitationText}>
                You&apos;ve been invited by
              </Text>
              <Text style={styles.creatorNameLarge}>
                {selectedInvitation?.members.find((m: any) => m.id === selectedInvitation?.admin)?.name || 'Someone'}
              </Text>
              <Text style={styles.invitationText}>
                to join
              </Text>
              <Text style={styles.groupNameLarge}>
                {selectedInvitation?.name}
              </Text>
              {selectedInvitation?.description && (
                <Text style={styles.groupDescriptionLarge}>
                  {selectedInvitation.description}
                </Text>
              )}
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.acceptButton]}
                onPress={handleAcceptInvitation}
              >
                <Text style={styles.modalButtonText}>Accept</Text>
              </TouchableOpacity>

              <View style={styles.buttonSeparator} />
              
              <TouchableOpacity
                style={[styles.modalButton, styles.declineButton]}
                onPress={handleDeclineInvitation}
              >
                <Text style={styles.modalButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
     <DynamicImageBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfeffff',
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
  headerButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  circularButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 58, 138, 1)',
  },
  bellContainer: {
    position: 'relative',
  },
  bellStrike: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'white',
    transform: [{ rotate: '45deg' }],
  },
  buttonSeparator: {
    height: 10,
  },
  messageContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#DC2626',
  },
  successText: {
    color: '#059669',
  },
  messageDismiss: {
    padding: 8,
    backgroundColor: 'transparent',
  },
  messageDismissText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  groupsList: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  groupItem: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupItemSelected: {
    backgroundColor: '#EFF6FF',
    borderBottomColor: '#DBEAFE',
  },
  groupItemPending: {
    backgroundColor: 'white',
  },
  groupItemDeclined: {
    backgroundColor: '#F3F4F6',
    borderBottomColor: '#D1D5DB',
    opacity: 0.7,
  },
  groupIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  groupIconDeclined: {
    backgroundColor: '#9CA3AF',
  },
  memberCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  groupNameDeclined: {
    color: '#9CA3AF',
  },
  silentIcon: {
    position: 'relative',
    marginLeft: 4,
  },
  silentStrike: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#9CA3AF',
    transform: [{ rotate: '45deg' }],
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    marginLeft: 8,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  groupDescriptionDeclined: {
    color: '#9CA3AF',
  },
  statusLabel: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    alignItems: 'center',
  },
  invitationText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupNameLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupDescriptionLarge: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalActions: {
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#10b98115',
  },
  declineButton: {
    backgroundColor: '#f59f0b18',
  },
  modalButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSmall: {
    color: 'black',
    fontSize: 14,
    fontWeight: '600',
  },
   creatorNameLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 4,
  },
   headerButtonContainer: {
     alignItems: 'center',
   },
   headerButtonHint: {
     fontSize: 11,
     color: 'rgba(255, 255, 255, 0.8)',
     fontWeight: '500',
     textAlign: 'center',
     marginTop: 4,
   },
});