import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/contexts/GroupContext';
import NotificationService from '@/services/NotificationService';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Types
interface DayType {
  value: string;
  label: string;
  emoji: string;
  color: string;
}

const DAY_TYPES: DayType[] = [
  { value: 'morning', label: 'Morning', emoji: '🌅', color: '#FCD34D' },
  { value: 'afternoon', label: 'Afternoon', emoji: '☀️', color: '#FB923C' },
  { value: 'evening', label: 'Evening', emoji: '🌆', color: '#1E3A8A' },
  { value: 'all-day', label: 'All Day', emoji: '📅', color: '#0EA5E9' },
];

export default function AddEventScreen() {
  const { user, userProfile } = useAuth();
  const { id: groupId } = useLocalSearchParams();
  const { addEventToGroup, getGroup } = useGroups();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dayTypes, setDayTypes] = useState<Record<string, string>>({});
  const [eventNotes, setEventNotes] = useState('');

  // Calendar helper functions
  const formatDateString = (date: Date): string => {
    // Use local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    
    // Start from Sunday of the week containing the first day
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const handleDateSelect = (date: Date) => {
    const dateString = formatDateString(date);
    
    setSelectedDates(prev => {
      const isSelected = prev.includes(dateString);
      if (isSelected) {
        // Remove date and its day type
        setDayTypes(prevTypes => {
          const newTypes = { ...prevTypes };
          delete newTypes[dateString];
          return newTypes;
        });
        return prev.filter(d => d !== dateString);
      } else {
        // Add date with default day type
        setDayTypes(prevTypes => ({
          ...prevTypes,
          [dateString]: 'all-day'
        }));
        return [...prev, dateString];
      }
    });
  };

  const handleDayTypeChange = (dateString: string, dayType: string) => {
    setDayTypes(prev => ({
      ...prev,
      [dateString]: dayType
    }));
  };

  const handleAddEvent = async () => {
    if (selectedDates.length === 0) {
      Alert.alert('Error', 'Please select at least one date for the event.');
      return;
    }

    if (!groupId) {
      Alert.alert('Error', 'No group selected.');
      return;
    }

    if (!userProfile) {
      Alert.alert('Error', 'User profile not found.');
      return;
    }

    try {
      // Create events for each selected date
      const events = selectedDates.map(dateString => ({
        id: Date.now() + Math.random(), // Simple ID generation
        date: dateString,
        time: '',
        notes: eventNotes || 'Untitled Event',
        type: (dayTypes[dateString] || 'all-day') as 'morning' | 'afternoon' | 'evening' | 'all-day',
        user: userProfile.name,           // Use real user name
        userInitials: userProfile.initials, // Use real user initials
        createdBy: user?.uid || 'unknown'    // Use real user ID
      }));

      // Save to context
      await addEventToGroup(parseInt(groupId as string), events);

      // Send notification to group members
      const group = getGroup(parseInt(groupId as string));
      if (group) {
        await NotificationService.sendEventNotification(
          groupId as string,
          eventNotes || 'New Event',
          userProfile.name
        );
      }

      router.back();
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('Error', 'Failed to add event. Please try again.');
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const getFocusedDate = () => {
    return selectedDates.length > 0 ? selectedDates[selectedDates.length - 1] : null;
  };

  const getDayTypeColor = (dayType: string) => {
    const type = DAY_TYPES.find(t => t.value === dayType);
    return type?.color || '#BFDBFE';
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Event</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Calendar */}
          <View style={styles.calendarSection}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth('prev')}
              >
                <ChevronLeft size={20} color="#374151" />
              </TouchableOpacity>
              
              <Text style={styles.monthYear}>
                {currentDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Text>
              
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth('next')}
              >
                <ChevronRight size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <View key={day} style={styles.dayHeader}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {getDaysInMonth(currentDate).map((date, index) => {
                const dateString = formatDateString(date);
                const isSelected = selectedDates.includes(dateString);
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = dateString === formatDateString(new Date());
                const dayType = dayTypes[dateString];

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      !isCurrentMonth && styles.calendarDayInactive,
                      isSelected && styles.calendarDaySelected,
                      isToday && styles.calendarDayToday,
                    ]}
                    onPress={() => handleDateSelect(date)}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      !isCurrentMonth && styles.calendarDayTextInactive,
                      isSelected && styles.calendarDayTextSelected,
                    ]}>
                      {date.getDate()}
                    </Text>
                    {dayType && (
                      <View 
                        style={[
                          styles.dayTypeIndicator,
                          { backgroundColor: getDayTypeColor(dayType) }
                        ]} 
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Day Type Selection */}
          <View style={styles.dayTypeSection}>
            <Text style={styles.sectionTitle}>
              Day Type {getFocusedDate() ? `for ${formatDisplayDate(getFocusedDate()!)}` : '(Select a date first)'}
            </Text>
            <View style={styles.dayTypeGrid}>
              {DAY_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.dayTypeButton,
                    !getFocusedDate() && styles.dayTypeButtonDisabled,
                    getFocusedDate() && dayTypes[getFocusedDate()!] === type.value && styles.dayTypeButtonSelected
                  ]}
                  onPress={() => {
                    const focusedDate = getFocusedDate();
                    if (focusedDate) {
                      handleDayTypeChange(focusedDate, type.value);
                    }
                  }}
                  disabled={!getFocusedDate()}
                >
                  <Text style={[
                    styles.dayTypeEmoji,
                    !getFocusedDate() && styles.dayTypeEmojiDisabled
                  ]}>
                    {type.emoji}
                  </Text>
                  <Text style={[
                    styles.dayTypeLabel,
                    !getFocusedDate() && styles.dayTypeLabelDisabled
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Event Details */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Event Details</Text>
            <TextInput
              style={styles.notesInput}
              value={eventNotes}
              onChangeText={setEventNotes}
              placeholder="What's happening? (Apply to all selected dates within one event)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Add Event Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              selectedDates.length === 0 && styles.addButtonDisabled
            ]}
            onPress={handleAddEvent}
            disabled={selectedDates.length === 0}
          >
            <Text style={[
              styles.addButtonText,
              selectedDates.length === 0 && styles.addButtonTextDisabled
            ]}>
              Add Event
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    textAlign: 'left',
    marginRight: 28,
  },
  headerSpacer: {
    width: 28,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  scrollContentContainer: {
    paddingBottom: Platform.OS === 'ios' ? 80 : 60,
    flexGrow: 1,
  },
  calendarSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    paddingBottom: 0,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 0,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 2,
    position: 'relative',
  },
  calendarDayInactive: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: '#3B82F6',
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  calendarDayTextInactive: {
    color: '#9CA3AF',
  },
  calendarDayTextSelected: {
    color: 'white',
  },
  dayTypeIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    transform: [{ translateX: -8 }],
    width: 20,
    height: 6,
    borderRadius: 2,
  },
  dayTypeSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  dayTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayTypeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  dayTypeButtonSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  dayTypeButtonDisabled: {
    opacity: 0.5,
  },
  dayTypeEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  dayTypeEmojiDisabled: {
    opacity: 0.5,
  },
  dayTypeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  dayTypeLabelDisabled: {
    opacity: 0.5,
  },
  inputSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 80,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 16,
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  addButtonTextDisabled: {
    color: '#9CA3AF',
  },
});