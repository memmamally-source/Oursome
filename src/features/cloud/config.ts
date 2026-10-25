/**
 * Cloud sharing is off unless a Firebase project is configured at build time
 * (see docs/CLOUD.md). These values are public by design: Firebase web
 * config identifies the project; the security rules protect the data.
 */
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

/** For local testing against the Firebase emulators, e.g. "localhost". */
export const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;

export const cloudConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && firebaseConfig.authDomain);
