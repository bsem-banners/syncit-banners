// test-firebase.js - Just for testing
import { auth } from './config/firebase';

console.log('Firebase Auth:', auth);
console.log('Testing Firebase connection...');

export default function testFirebase() {
  try {
    console.log('Firebase initialized successfully!');
    console.log('Auth instance:', auth());
    return true;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return false;
  }
}