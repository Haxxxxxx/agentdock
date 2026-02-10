import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, type Persistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Metro bundles the RN-specific build of firebase/auth at runtime which
// exports getReactNativePersistence. TypeScript resolves the browser types
// which don't include it, so we use require() with a fallback.
let persistence: Persistence = inMemoryPersistence;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getReactNativePersistence } = require('firebase/auth');
  if (getReactNativePersistence) {
    persistence = getReactNativePersistence(AsyncStorage);
  }
} catch {
  // inMemoryPersistence fallback — demo mode bypasses auth anyway
}

const auth = initializeAuth(app, { persistence });

const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

export { app, auth, db };
