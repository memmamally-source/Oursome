import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

import { deviceAccountMatches, useSession, validateEmail, validatePassword, type AuthService } from '@/features/session/store';
import { deviceTimeZone } from '@/lib/dates';

import { firebase } from './firebase';

const errorCode = (e: unknown) => (e as { code?: string }).code ?? '';
const isBadLogin = (code: string) =>
  code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found') || code.includes('invalid-login');

/** Friendly words for Firebase's error codes (never saying whether an email has an account). */
export function message(e: unknown): string {
  const code = errorCode(e);
  if (code.includes('email-already-in-use')) return 'There’s already an account with that email. Try signing in, or reset your password.';
  if (isBadLogin(code))
    return 'That email and password don’t match. Check them and try again, or tap Forgot password. New to Oursome online? Create an account: what’s on this phone stays.';
  if (code.includes('weak-password')) return 'Choose a stronger password: at least 8 characters with a letter and a number.';
  if (code.includes('invalid-email')) return 'Please enter a valid email address.';
  if (code.includes('too-many-requests')) return 'Too many tries. Wait a few minutes and try again.';
  if (code.includes('network-request-failed')) return 'You seem to be offline. Check your connection and try again.';
  if (code.includes('user-disabled')) return 'This account has been switched off. Email oursomeapp@outlook.com for help.';
  if (code.includes('operation-not-allowed')) return 'Signing in with email isn’t switched on yet. Please try again later.';
  return 'Something went wrong. Please try again.';
}

function setProfile(uid: string, email: string, name?: string | null) {
  const current = useSession.getState().profile;
  // The same person signing in to the cloud keeps the name and colour already on this device;
  // someone else signing in on this phone doesn't inherit them.
  const sameUser = current && (current.id === uid || current.email === email.toLowerCase());
  const existing = sameUser ? current : null;
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
      // An account made on this phone before online accounts: its password checks out here, so move it online.
      if (isBadLogin(errorCode(e)) && deviceAccountMatches(email, password)) return moveDeviceAccountOnline(email, password);
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
      // Same answer whether or not the email has an account, so nobody can use this to find out.
      if (isBadLogin(errorCode(e))) return { ok: true };
      return { ok: false, error: message(e) };
    }
  },
  async signOut() {
    await signOut(firebase().auth).catch(() => {});
    useSession.getState().setSignedIn(false);
  },
};

async function moveDeviceAccountOnline(email: string, password: string) {
  const name = useSession.getState().profile?.name ?? '';
  try {
    const { user } = await createUserWithEmailAndPassword(firebase().auth, email.trim(), password);
    if (name) await updateProfile(user, { displayName: name });
    setProfile(user.uid, user.email ?? email, name);
    return { ok: true as const };
  } catch (e) {
    // Already online with a different password: the normal answer.
    if (errorCode(e).includes('email-already-in-use'))
      return { ok: false as const, error: 'That email and password don’t match. Check them and try again, or tap Forgot password.' };
    return { ok: false as const, error: message(e) };
  }
}

/** Keep the app's signed-in state in step with Firebase (e.g. a session that ended elsewhere). */
export function watchAuth(onUser: (uid: string | null) => void): () => void {
  return onAuthStateChanged(firebase().auth, (user) => {
    if (!user && useSession.getState().signedIn) useSession.getState().setSignedIn(false);
    onUser(user?.uid ?? null);
  });
}
