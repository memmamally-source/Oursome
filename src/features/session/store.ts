import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { cloudConfigured } from '@/features/cloud/config';
import { deviceTimeZone } from '@/lib/dates';
import { persistStorage, STORE_VERSION } from '@/lib/storage';
import type { AccentKey } from '@/theme/tokens';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  color: AccentKey;
  timeZone: string;
  createdAt: string;
};

/**
 * Stage 1 auth is a *local preview only*: profiles live on this device and
 * passwords are validated for strength but never stored or verified.
 * Stage 2 replaces `localAuth` with Firebase Authentication behind the same
 * interface, so screens don't change.
 */
export type AuthResult = { ok: true } | { ok: false; error: string };

export interface AuthService {
  signUp(input: { name: string; email: string; password: string }): Promise<AuthResult>;
  signIn(input: { email: string; password: string }): Promise<AuthResult>;
  sendPasswordReset(email: string): Promise<AuthResult>;
  signOut(): Promise<void>;
}

type SessionState = {
  /** The account registered on this device (kept after sign-out). */
  profile: UserProfile | null;
  signedIn: boolean;
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  setSignedIn: (signedIn: boolean) => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      profile: null,
      signedIn: false,
      setProfile: (profile) => set({ profile }),
      updateProfile: (patch) => set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : s)),
      setSignedIn: (signedIn) => set({ signedIn }),
    }),
    { name: 'oursome.session', version: STORE_VERSION, storage: persistStorage },
  ),
);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  return emailPattern.test(email.trim()) ? null : 'Please enter a valid email address.';
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number.';
  return null;
}

export const localAuth: AuthService = {
  async signUp({ name, email, password }) {
    const emailError = validateEmail(email);
    if (emailError) return { ok: false, error: emailError };
    const pwError = validatePassword(password);
    if (pwError) return { ok: false, error: pwError };
    if (!name.trim()) return { ok: false, error: 'What should we call you?' };
    useSession.getState().setProfile({
      id: 'me',
      name: name.trim(),
      email: email.trim().toLowerCase(),
      color: 'coral',
      timeZone: deviceTimeZone(),
      createdAt: new Date().toISOString(),
    });
    useSession.getState().setSignedIn(true);
    return { ok: true };
  },
  async signIn({ email, password }) {
    const emailError = validateEmail(email);
    if (emailError) return { ok: false, error: emailError };
    if (!password) return { ok: false, error: 'Please enter your password.' };
    const profile = useSession.getState().profile;
    if (!profile || profile.email !== email.trim().toLowerCase()) {
      return { ok: false, error: 'No account with that email on this device yet. Create one to get started.' };
    }
    useSession.getState().setSignedIn(true);
    return { ok: true };
  },
  async sendPasswordReset(email) {
    const emailError = validateEmail(email);
    if (emailError) return { ok: false, error: emailError };
    return { ok: false, error: 'Password reset emails arrive with cloud accounts in the next update.' };
  },
  async signOut() {
    useSession.getState().setSignedIn(false);
  },
};

/** The account service in use: Firebase when cloud sharing is configured, otherwise this device only. */
async function service(): Promise<AuthService> {
  return cloudConfigured ? (await import('@/features/cloud/runtime')).firebaseAuth : localAuth;
}

export const auth: AuthService = {
  signUp: async (input) => (await service()).signUp(input),
  signIn: async (input) => (await service()).signIn(input),
  sendPasswordReset: async (email) => (await service()).sendPasswordReset(email),
  signOut: async () => (await service()).signOut(),
};
