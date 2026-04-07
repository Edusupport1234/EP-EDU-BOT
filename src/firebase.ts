import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot, query, where, orderBy, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use the provided firestoreDatabaseId if it's not "(default)" or empty, otherwise use the default database
export const db = (firebaseConfig as any).firestoreDatabaseId && (firebaseConfig as any).firestoreDatabaseId !== "(default)"
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signOut, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  getDocFromServer
};

// Connection test
async function testConnection() {
  console.log("Testing Firestore connection for project:", firebaseConfig.projectId);
  try {
    // Try a simple server-side fetch
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful!");
  } catch (error: any) {
    console.error("Firestore Error Details:", {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack
    });

    if (error.message?.includes('the client is offline')) {
      console.error("CRITICAL: Firestore is reporting 'offline'. This is 99% likely because the Firestore Database has not been created in the Firebase Console for this project.");
    } else if (error.code === 'permission-denied') {
      console.log("Firestore connection confirmed (Permission Denied). This means the database exists and is reachable, but the test document is protected.");
    }
  }
}
testConnection();
