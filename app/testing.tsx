import { TestingUtils } from '@/utils/TestingUtils';
import { useState } from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TestingScreen() {
  const [testGroupId, setTestGroupId] = useState<number | null>(null);
  
  const runTests = async () => {
    try {
      // Create test group
      const group = await TestingUtils.createTestGroup();
      setTestGroupId(group.id);
      Alert.alert('Success', 'Test group created');
      
      // Test notifications
      await TestingUtils.testNotification();
      
    } catch (error) {
      Alert.alert('Error', (error as Error).message || 'Unknown error occurred');
    }
  };

  const createMultipleGroups = async () => {
    try {
      const groups = await TestingUtils.createMultipleTestGroups();
      Alert.alert('Success', `Created ${groups.length} test groups`);
    } catch (error) {
      Alert.alert('Error', (error as Error).message || 'Unknown error occurred');
    }
  };
  
  const simulateEvent = async () => {
    if (testGroupId) {
      try {
        await TestingUtils.simulateEventCreation(testGroupId);
        Alert.alert('Success', 'Test event created - check real-time updates!');
      } catch (error) {
        Alert.alert('Error', (error as Error).message || 'Unknown error occurred');
      }
    } else {
      Alert.alert('Error', 'Please create a test group first');
    }
  };

  const clearTestData = async () => {
    try {
      await TestingUtils.clearTestData();
      setTestGroupId(null);
      Alert.alert('Success', 'Test data cleared');
    } catch (error) {
      Alert.alert('Error', (error as Error).message || 'Unknown error occurred');
    }
  };
  
  return (
    <SafeAreaView style={{ 
      flex: 1, 
      padding: 20, 
      backgroundColor: '#F9FAFB' 
    }}>
      <Text style={{ 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginBottom: 30, 
        textAlign: 'center',
        color: '#111827'
      }}>
        Real-time Testing
      </Text>
      
      <TouchableOpacity 
        style={{
          backgroundColor: '#3B82F6',
          padding: 16,
          borderRadius: 8,
          marginBottom: 16
        }}
        onPress={runTests}
      >
        <Text style={{
          color: 'white',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: '600'
        }}>
          Create Test Group
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={{
          backgroundColor: '#10B981',
          padding: 16,
          borderRadius: 8,
          marginBottom: 16
        }}
        onPress={createMultipleGroups}
      >
        <Text style={{
          color: 'white',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: '600'
        }}>
          Create Multiple Test Groups
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{
          backgroundColor: '#F59E0B',
          padding: 16,
          borderRadius: 8,
          marginBottom: 16,
          opacity: testGroupId ? 1 : 0.5
        }}
        onPress={simulateEvent}
        disabled={!testGroupId}
      >
        <Text style={{
          color: 'white',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: '600'
        }}>
          Simulate Real-time Event
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={{
          backgroundColor: '#EF4444',
          padding: 16,
          borderRadius: 8,
          marginBottom: 16
        }}
        onPress={clearTestData}
      >
        <Text style={{
          color: 'white',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: '600'
        }}>
          Clear Test Data
        </Text>
      </TouchableOpacity>

      {testGroupId && (
        <Text style={{
          fontSize: 14,
          color: '#6B7280',
          textAlign: 'center',
          marginTop: 20
        }}>
          Active Test Group ID: {testGroupId}
        </Text>
      )}
    </SafeAreaView>
  );
}