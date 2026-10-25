import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

import { useSession, validateEmail, validatePassword, type AuthService } from '@/features/session/store';
import { deviceTimeZone } from '@/lib/dates';

import { firebase } from './firebase';

/** Friendly words for Firebase's error codes. */
function message(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  if (code.includes('email-already-in-use')) return 'There’s already an account with that email. Try signing in.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'That email and password don’t match. Try again, or reset your password.';
  if (code.includes('weak-password')) return 'Choose a stronger password: at least 8 characters with a letter and a number.';
  if (code.includes('invalid-email')) return 'Please enter a valid email address.';
  if (code.includes('too-many-requests')) return 'Too many tries. Wait a few minutes and try again.';
  if (code.includes('network-request-failed')) return 'You seem to be offline. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}

function setProfile(uid: string, email: string, name?: string | null) {
  const existing = useSession.getState().profile;
  // Signing in to the cloud keeps the name and colour already on this device.
  useSession.getState().setProfile({
    id: uid,
    email: email.toLowerCase(),
    name: name?.trim() || existing?.name || email.split('@')[0],
    color: existing?.color ?? 'coral',
    timeZone: existing?.timeZone ?? deviceTimeZone(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
  useSession.getState().setSignedIn(true);
}

/** Real accounts with Firebase Authentication. Data on this device is kept as it is. */
export const firebaseAuth: AuthService = {
  async signUp({ name, email, password }) {
    const invalid = validateEmail(email) ?? validatePassword(password) ?? (name.trim() ? null : 'What should we call you?');
    if (invalid) return { ok: false, error: invalid };
    try {
      const { user } = await createUserWithEmailAndPassword(firebase().auth, email.trim(), password);
      await updateProfile(user, { displayName: name.trim() });
      setProfile(user.uid, user.email ?? email, name);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: message(e) };
    }
  },
  async signIn({ email, password }) {
    const invalid = validateEmail(email) ?? (password ? null : 'Please enter your password.');
    if (invalid) return { ok: false, error: invalid };
    try {
      const { user } = await signInWithEmailAndPassword(firebase().auth, email.trim(), password);
      setProfile(user.uid, user.email ?? email, user.displayName);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: message(e) };
    }
  },
  async sendPasswordReset(email) {
    const invalid = validateEmail(email);
    if (invalid) return { ok: false, error: invalid };
    try {
      await sendPasswordResetEmail(firebase().auth, email.trim());
      return { ok: true };
    } catch (e) {
      return { ok: false, error: message(e) };
    }
  },
  async signOut() {
    await signOut(firebase().auth).catch(() => {});
    useSession.getState().setSignedIn(false);
  },
};

/** Keep the app's signed-in state in step with Firebase (e.g. a session that ended elsewhere). */
export function watchAuth(onUser: (uid: string | null) => void): () => void {
  return onAuthStateChanged(firebase().auth, (user) => {
    if (!user && useSession.getState().signedIn) useSession.getState().setSignedIn(false);
    onUser(user?.uid ?? null);
  });
}
