import { TestingUtils } from '@/utils/TestingUtils';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TestingScreen() {
  const [testGroupId, setTestGroupId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  
  const showMessage = (message: string, error: boolean = false) => {
    setStatusMessage(message);
    setIsError(error);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const runTests = async () => {
    try {
      const group = await TestingUtils.createTestGroup();
      setTestGroupId(group.id);
      showMessage('Test group created successfully');
      
      await TestingUtils.testNotification();
      
    } catch (error) {
      showMessage((error as Error).message || 'Unknown error occurred', true);
    }
  };

  const createMultipleGroups = async () => {
    try {
      const groups = await TestingUtils.createMultipleTestGroups();
      showMessage(`Created ${groups.length} test groups successfully`);
    } catch (error) {
      showMessage((error as Error).message || 'Unknown error occurred', true);
    }
  };
  
  const simulateEvent = async () => {
    if (testGroupId) {
      try {
        await TestingUtils.simulateEventCreation(testGroupId);
        showMessage('Test event created - check real-time updates!');
      } catch (error) {
        showMessage((error as Error).message || 'Unknown error occurred', true);
      }
    } else {
      showMessage('Please create a test group first', true);
    }
  };

  const clearTestData = async () => {
    try {
      await TestingUtils.clearTestData();
      setTestGroupId(null);
      showMessage('Test data cleared successfully');
    } catch (error) {
      showMessage((error as Error).message || 'Unknown error occurred', true);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        Real-time Testing
      </Text>

      {/* Status Message Display */}
      {statusMessage && (
        <View style={[
          styles.statusContainer,
          isError ? styles.errorContainer : styles.successContainer
        ]}>
          <Text style={[
            styles.statusText,
            isError ? styles.errorText : styles.successText
          ]}>
            {statusMessage}
          </Text>
          <TouchableOpacity 
            onPress={() => setStatusMessage('')} 
            style={styles.statusDismiss}
          >
            <Text style={styles.statusDismissText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.button}
        onPress={runTests}
      >
        <Text style={styles.buttonText}>
          Create Test Group
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.successButton]}
        onPress={createMultipleGroups}
      >
        <Text style={styles.buttonText}>
          Create Multiple Test Groups
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.button, 
          styles.warningButton,
          { opacity: testGroupId ? 1 : 0.5 }
        ]}
        onPress={simulateEvent}
        disabled={!testGroupId}
      >
        <Text style={styles.buttonText}>
          Simulate Real-time Event
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.dangerButton]}
        onPress={clearTestData}
      >
        <Text style={styles.buttonText}>
          Clear Test Data
        </Text>
      </TouchableOpacity>

      {testGroupId && (
        <Text style={styles.infoText}>
          Active Test Group ID: {testGroupId}
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    padding: 20, 
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 30, 
    textAlign: 'center',
    color: '#111827',
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successContainer: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  successText: {
    color: '#059669',
  },
  errorText: {
    color: '#DC2626',
  },
  statusDismiss: {
    padding: 8,
    backgroundColor: 'transparent',
  },
  statusDismissText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  warningButton: {
    backgroundColor: '#F59E0B',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
  },
});