import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import { emulatorHost, firebaseConfig } from './config';

/** Firebase, started once and only when cloud sharing is configured. */
let instance: { app: FirebaseApp; auth: FirebaseAuth.Auth; db: Firestore } | null = null;

export function firebase() {
  if (instance) return instance;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig as Record<string, string>);
  // Phones keep the sign-in in AsyncStorage; browsers use their own storage.
  const rnPersistence = (FirebaseAuth as unknown as { getReactNativePersistence?: (s: typeof AsyncStorage) => FirebaseAuth.Persistence })
    .getReactNativePersistence;
  const auth =
    Platform.OS === 'web' || !rnPersistence
      ? FirebaseAuth.getAuth(app)
      : FirebaseAuth.initializeAuth(app, { persistence: rnPersistence(AsyncStorage) });
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  if (emulatorHost) {
    FirebaseAuth.connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
  }
  instance = { app, auth, db };
  return instance;
}
