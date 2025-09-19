import Constants from 'expo-constants';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { Firestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "AIzaSyCtm8TYLPRdO89cKu7qmpcLflUfcRBEDuw",
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || "syncit-ead53.firebaseapp.com",
  databaseURL: Constants.expoConfig?.extra?.firebaseDatabaseURL || "https://syncit-ead53-default-rtdb.firebaseio.com",
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || "syncit-ead53",
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || "syncit-ead53.firebasestorage.app",
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || "587899647546",
  appId: Constants.expoConfig?.extra?.firebaseAppId || "1:587899647546:web:14cc27a54d5f756bb26703"
};

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const realtimeDb: Database = getDatabase(app);

// Suppress Firebase console logs in production
if (!__DEV__) {
  // Override console methods to suppress Firebase error logs in production
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  
  console.error = (...args: any[]) => {
    // Only suppress Firebase-related errors
    const message = args.join(' ');
    if (
      message.includes('Firebase') ||
      message.includes('auth/') ||
      message.includes('firestore/') ||
      message.includes('invalid-credential') ||
      message.includes('wrong-password') ||
      message.includes('user-not-found')
    ) {
      return; // Suppress Firebase errors
    }
    originalConsoleError(...args); // Keep other errors
  };
  
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('Firebase') || message.includes('auth/')) {
      return; // Suppress Firebase warnings
    }
    originalConsoleWarn(...args); // Keep other warnings
  };
  
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('Firebase') || message.includes('auth/')) {
      return; // Suppress Firebase logs
    }
    originalConsoleLog(...args); // Keep other logs
  };
}

export { auth, db, realtimeDb };
export default app;