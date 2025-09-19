import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { privacyPolicy } from '../data/privacyPolicy';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header} />
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.documentText}>{privacyPolicy}</Text>
      </ScrollView>
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
    height: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  documentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
});