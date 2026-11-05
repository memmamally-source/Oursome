/**
 * Firebase configuration for the Steps Ahead project ONLY (never another app's project).
 * Web config values are public identifiers; security comes from Firestore rules and App Check.
 * Until the variables are set, the app runs fully on-device and no Firebase code is loaded.
 * See DATABASE_ARCHITECTURE.md for the setup steps and the data model.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const appEnv = (import.meta.env.VITE_APP_ENV as string | undefined) ?? (import.meta.env.DEV ? 'development' : 'production');

export const cloudConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
