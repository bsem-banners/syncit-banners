// config/firebase.ts
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { Firestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCtm8TYLPRdO89cKu7qmpcLflUfcRBEDuw",
  authDomain: "syncit-ead53.firebaseapp.com",
  databaseURL: "https://syncit-ead53-default-rtdb.firebaseio.com",
  projectId: "syncit-ead53",
  storageBucket: "syncit-ead53.firebasestorage.app",
  messagingSenderId: "587899647546",
  appId: "1:587899647546:web:14cc27a54d5f756bb26703"
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

export { auth, db, realtimeDb };
export default app;