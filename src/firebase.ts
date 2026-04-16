import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  initializeFirestore, 
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
  getDocFromServer, 
  limit, 
  addDoc, 
  writeBatch,
  memoryLocalCache, // Import memory-only cache
  clearIndexedDbPersistence // Import persistence clearing tool
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use the provided firestoreDatabaseId if it's not "(default)" or empty, otherwise use the default database
const databaseId = (firebaseConfig as any).firestoreDatabaseId && (firebaseConfig as any).firestoreDatabaseId !== "(default)"
  ? (firebaseConfig as any).firestoreDatabaseId
  : undefined;

// Initialize Firestore with memory-only cache to prevent IndexedDB "Unexpected state" errors
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache() // Disables disk persistence to avoid corruption in sandboxed environments
}, databaseId);

// Clear any existing persistent data on startup to ensure a clean state
clearIndexedDbPersistence(db).catch((err) => {
  console.warn("Could not clear persistence (this is expected if it was never enabled):", err);
});

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
  getDocFromServer,
  limit,
  addDoc,
  writeBatch
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
