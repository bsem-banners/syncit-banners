import GroupSpecificBanner from '@/components/GroupSpecificBanner';
import { useAuth } from '@/contexts/AuthContext';
import type { Event as GroupEvent } from '@/contexts/GroupContext';
import { useGroups } from '@/contexts/GroupContext';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Phone,
  Plus,
  Shield,
  Trash2,
  Users,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function GroupDetailScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('');
  
  const [showDayEvents, setShowDayEvents] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<GroupEvent[]>([]);
  const [selectedDayDate, setSelectedDayDate] = useState<string>('');

  const { getGroup, deleteEventFromGroup, markEventAsViewed, isEventNewForUser } = useGroups();
  const group = getGroup(parseInt(id as string));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setShowFilterDropdown(false);
    setTimeout(() => {
      setRefreshing(false);
    }, 300);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredEvents = selectedMemberFilter === 'all' 
    ? group.events 
    : group.events.filter(event => event.createdBy === selectedMemberFilter);

  const getEventColor = (type: string) => {
    const colors = {
      morning: '#FCD34D',
      afternoon: '#FB923C', 
      evening: '#1E3A8A',
      'all-day': '#0EA5E9'
    };
    return colors[type as keyof typeof colors] || colors['all-day'];
  };

  const handleCall = async (phoneNumber: string) => {
    setSelectedPhoneNumber(phoneNumber);
    setShowCallModal(true);
  };

  const handleMessage = async (phoneNumber: string) => {
    setSelectedPhoneNumber(phoneNumber);
    setShowMessageModal(true);
  };

  const executeCall = async (option: { name: string; url: string }) => {
    setShowCallModal(false);
    try {
      await Linking.openURL(option.url);
    } catch (error) {
      console.log(`Failed to open ${option.name}:`, error);
      Alert.alert(
        'App Not Available', 
        `${option.name} is not installed or cannot handle this request. Please install the app or try another option.`
      );
    }
  };

  const executeMessage = async (option: { name: string; url: string }) => {
    setShowMessageModal(false);
    try {
      await Linking.openURL(option.url);
    } catch (error) {
      console.log(`Failed to open ${option.name}:`, error);
      Alert.alert(
        'App Not Available', 
        `${option.name} is not installed or cannot handle this request. Please install the app or try another option.`
      );
    }
  };

  const handleDeleteEvent = (event: GroupEvent) => {
    if (!group) return;
    
    if (group.admin !== user?.uid && event.createdBy !== user?.uid) {
      Alert.alert('Error', 'You can only delete events you created or if you are the group admin.');
      return;
    }

    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.notes}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteEventFromGroup(group.id, event.id);
            setShowDayEvents(false);
            handleRefresh();
          }
        }
      ]
    );
  };

  const getEventTypeLabel = (type: string) => {
    const labels = {
      morning: 'Morning Event',
      afternoon: 'Afternoon Event',
      evening: 'Evening Event',
      'all-day': 'All Day Event'
    };
    return labels[type as keyof typeof labels] || 'All Day Event';
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  const renderCalendarDay = (date: Date, index: number) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const dayEvents = filteredEvents.filter(event => event.date === dateString);
    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
    const today = new Date();
    const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    const isToday = dateString === todayString;

    const hasNewEvents = dayEvents.some(event => isEventNewForUser && isEventNewForUser(event));

    const handleDayPress = () => {
      if (dayEvents.length > 0) {
        setSelectedDayEvents(dayEvents);
        setSelectedDayDate(dateString);
        setShowDayEvents(true);
        
        dayEvents.forEach(event => {
          if (isEventNewForUser && isEventNewForUser(event)) {
            markEventAsViewed && markEventAsViewed(group.id, event.id);
          }
        });
      }
    };

    return (
      <TouchableOpacity
        key={`${dateString}-${index}`}
        onPress={handleDayPress}
        disabled={dayEvents.length === 0}
        style={[
          styles.calendarDay,
          !isCurrentMonth && styles.calendarDayOtherMonth,
          isToday && styles.calendarDayToday,
          dayEvents.length > 0 && styles.calendarDayWithEvents
        ]}
      >
        <Text style={[
          styles.calendarDayText,
          !isCurrentMonth && styles.calendarDayTextOtherMonth,
          isToday && styles.calendarDayTextToday
        ]}>
          {date.getDate()}
        </Text>
        <View style={styles.calendarDayEvents}>
          {dayEvents.slice(0, 2).map((event, eventIndex) => (
            <View
              key={`${event.id}-${eventIndex}`}
              style={[
                styles.calendarEventStamp,
                { backgroundColor: getEventColor(event.type) }
              ]}
            >
              <Text style={styles.calendarEventInitials}>
                {event.userInitials}
              </Text>
            </View>
          ))}
          {dayEvents.length > 2 && (
            <Text style={styles.calendarMoreEvents}>+{dayEvents.length - 2}</Text>
          )}
          
          {/* Single red dot in top-right corner of day if any events are new */}
          {hasNewEvents && (
            <View style={styles.dayNotificationDot} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>{group.name}</Text>
            {group.admin === 'you' && <Shield size={16} color="rgba(255,255,255,0.8)" />}
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButtonContainer}
            onPress={() => router.push(`/create-group?id=${group.id}&mode=edit` as any)}
          >
            <View style={styles.headerButton}>
              <Users size={20} color="white" strokeWidth={2} />
            </View>
            <Text style={styles.headerButtonHint}>Manage Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButtonContainer}
            onPress={() => router.push(`/add-event?id=${group.id}` as any)}
          >
            <View style={styles.headerButton}>
              <Plus size={20} color="white" strokeWidth={3} />
            </View>
            <Text style={styles.headerButtonHint}>Add Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterLabel}>Filter:</Text>
            <View style={styles.filterDropdown}>
              <TouchableOpacity
                style={styles.filterSelector}
                onPress={() => setShowFilterDropdown(!showFilterDropdown)}
              >
                <Text style={styles.filterSelectedText}>
                  {selectedMemberFilter === 'all' 
                    ? 'All Members' 
                    : group.members.find(m => m.id === selectedMemberFilter)?.name || 'All Members'
                  }
                </Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
              
              {showFilterDropdown && (
                <View style={styles.filterDropdownList}>
                  <TouchableOpacity
                    style={[
                      styles.filterDropdownItem,
                      selectedMemberFilter === 'all' && styles.filterDropdownItemActive
                    ]}
                    onPress={() => {
                      setSelectedMemberFilter('all');
                      setShowFilterDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.filterDropdownItemText,
                      selectedMemberFilter === 'all' && styles.filterDropdownItemTextActive
                    ]}>
                      All Members
                    </Text>
                  </TouchableOpacity>
                  {group.members.map(member => (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.filterDropdownItem,
                        selectedMemberFilter === member.id && styles.filterDropdownItemActive
                      ]}
                      onPress={() => {
                        setSelectedMemberFilter(member.id);
                        setShowFilterDropdown(false);
                      }}
                    >
                      <View style={styles.filterDropdownMember}>
                        <View style={styles.filterMemberAvatar}>
                          <Text style={styles.filterMemberInitials}>{member.initials}</Text>
                        </View>
                        <Text style={[
                          styles.filterDropdownItemText,
                          selectedMemberFilter === member.id && styles.filterDropdownItemTextActive
                        ]}>
                          {member.name} {member.id === 'you' && '(You)'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>Calendar</Text>
            <View style={styles.calendarNavigation}>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(currentDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}
              >
                <ChevronLeft size={16} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthYear}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(currentDate.getMonth() + 1);
                  setCurrentDate(newDate);
                }}
              >
                <ChevronRight size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.calendar} key={refreshKey}>
            <View style={styles.calendarWeekHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.calendarDayHeader}>{day}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => renderCalendarDay(date, index))}
            </View>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FCD34D' }]} />
              <Text style={styles.legendText}>Morning</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FB923C' }]} />
              <Text style={styles.legendText}>Afternoon</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#1E3A8A' }]} />
              <Text style={styles.legendText}>Evening</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0EA5E9' }]} />
              <Text style={styles.legendText}>All Day</Text>
            </View>
          </View>
          <GroupSpecificBanner groupId={group.id} />
        </View>
      </ScrollView>

      {/* Day Events Modal - Enhanced with Action Icons and Red Dots */}
      {showDayEvents && (
        <View style={styles.modalOverlay}>
          <View style={styles.dayEventsModal}>
            <View style={styles.dayEventsHeader}>
              <Text style={styles.dayEventsTitle}>
                Events for {new Date(selectedDayDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDayEvents(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.dayEventsContent}>
              {selectedDayEvents.map((event) => {
                const eventCreator = group?.members.find(m => m.id === event.createdBy);
                const isMyEvent = event.createdBy === user?.uid;
                const canDelete = group?.admin === user?.uid || isMyEvent;
                const isNewEvent = isEventNewForUser && isEventNewForUser(event);

                return (
                  <View
                    key={event.id}
                    style={[
                      styles.dayEventItem,
                      isNewEvent && styles.dayEventItemNew
                    ]}
                  >
                    <View style={styles.dayEventHeader}>
                      <View style={styles.dayEventCreator}>
                        <View style={[
                          styles.dayEventAvatar,
                          { backgroundColor: '#3B82F6' }
                        ]}>
                          <Text style={styles.dayEventInitials}>
                            {event.userInitials}
                          </Text>
                          {isNewEvent && (
                            <View style={styles.eventDetailNewDot} />
                          )}
                        </View>
                        <View style={styles.dayEventInfo}>
                          <Text style={styles.dayEventCreatorName}>{eventCreator?.name || event.user}</Text>
                          {event.time && (
                            <Text style={styles.dayEventTime}>{event.time}</Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.eventActions}>
                        {!isMyEvent && eventCreator && (
                          <>
                            <TouchableOpacity
                              style={styles.actionIcon}
                              onPress={() => handleCall(eventCreator.phone)}
                            >
                              <Phone size={16} color="#3B82F6" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionIcon}
                              onPress={() => handleMessage(eventCreator.phone)}
                            >
                              <MessageCircle size={16} color="#3B82F6" />
                            </TouchableOpacity>
                          </>
                        )}

                        {canDelete && (
                          <TouchableOpacity
                            style={styles.actionIcon}
                            onPress={() => handleDeleteEvent(event)}
                          >
                            <Trash2 size={16} color="#DC2626" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <Text style={styles.dayEventNotes}>{event.notes}</Text>

                    <View style={[
                      styles.dayEventTypeContainer,
                      { backgroundColor: getEventColor(event.type) }
                    ]}>
                      <Text style={[
                        styles.dayEventType,
                        { color: event.type === 'morning' ? '#000000' : '#FFFFFF' }
                      ]}>
                        {getEventTypeLabel(event.type)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Call Options Modal */}
      {showCallModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModal}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>Choose Calling Method</Text>
              <Text style={styles.optionsSubtitle}>Call {selectedPhoneNumber} using:</Text>
            </View>
            
            <View style={styles.optionsContent}>
              {[
                { name: 'Phone', url: `tel:${selectedPhoneNumber}` },
                { name: 'WhatsApp Call', url: `whatsapp://call?phone=${selectedPhoneNumber}` },
              ].map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionButton}
                  onPress={() => executeCall(option)}
                >
                  <Text style={styles.optionText}>{option.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCallModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Message Options Modal */}
      {showMessageModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModal}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>Choose Messaging Method</Text>
              <Text style={styles.optionsSubtitle}>Message {selectedPhoneNumber} using:</Text>
            </View>
            
            <View style={styles.optionsContent}>
              {[
                { name: 'Messages (SMS)', url: `sms:${selectedPhoneNumber}` },
                { name: 'WhatsApp', url: `whatsapp://send?phone=${selectedPhoneNumber}` },
              ].map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionButton}
                  onPress={() => executeMessage(option)}
                >
                  <Text style={styles.optionText}>{option.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMessageModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  headerContent: {
    flex: 1,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButtonContainer: {
    alignItems: 'center',
  },
  headerButton: {
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
    marginBottom: 4,
  },
  headerButtonHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  filterSection: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    position: 'relative',
    zIndex: 10,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterDropdown: {
    position: 'relative',
    minWidth: 150,
  },
  filterSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 150,
  },
  filterSelectedText: {
    fontSize: 14,
    color: '#374151',
    marginRight: 8,
  },
  filterDropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  filterDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterDropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  filterDropdownMember: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterMemberAvatar: {
    width: 24,
    height: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  filterMemberInitials: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  filterDropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  filterDropdownItemTextActive: {
    color: '#2563EB',
    fontWeight: '500',
  },
  calendarSection: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  calendarNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarNavButton: {
    padding: 4,
    borderRadius: 16,
  },
  calendarMonthYear: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    minWidth: 120,
    textAlign: 'center',
  },
  calendar: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
  },
  calendarDayHeader: {
    flex: 1,
    padding: 8,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.285714%',
    aspectRatio: 1,
    minHeight: 65,
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  calendarDayOtherMonth: {
    backgroundColor: '#F9FAFB',
  },
  calendarDayToday: {
    backgroundColor: '#EFF6FF',
  },
  calendarDayWithEvents: {
    backgroundColor: '#F0F9FF',
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  calendarDayTextOtherMonth: {
    color: '#9CA3AF',
  },
  calendarDayTextToday: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  calendarDayEvents: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 2,
    position: 'relative',
  },
  calendarEventStamp: {
    width: 20,
    height: 14,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  calendarEventInitials: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  calendarMoreEvents: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 1,
  },
  // Single red dot for new events per day in top-right corner
  dayNotificationDot: {
    position: 'absolute',
    top: -22,
    right: -10,
    width: 8,
    height: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'white',
  },
  eventDetailNewDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  dayEventItemNew: {
    borderWidth: 2,
    borderColor: '#EF4444',
    borderStyle: 'solid',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dayEventsModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dayEventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayEventsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  dayEventsContent: {
    padding: 20,
  },
  dayEventItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayEventCreator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayEventAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  dayEventInitials: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffffff',
  },
  dayEventInfo: {
    flex: 1,
  },
  dayEventCreatorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  dayEventTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  dayEventNotes: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  dayEventType: {
    fontSize: 12,
    fontWeight: '500',
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
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  optionsModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  optionsHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  optionsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  optionsContent: {
    padding: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  cancelButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 16,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayEventTypeContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
});