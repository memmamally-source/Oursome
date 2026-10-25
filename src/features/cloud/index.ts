import { useEffect } from 'react';

import { cloudConfigured } from './config';

/**
 * The only cloud module screens import directly. The Firebase SDK and the
 * sync engine load on demand, and only when cloud sharing is configured.
 */
export { cloudConfigured } from './config';
export { useCloud } from './state';

const engine = () => import('./runtime');

/** Mounted once at the root: starts sync when cloud sharing is configured. */
export function CloudBoot() {
  useEffect(() => {
    if (cloudConfigured) void engine().then((m) => m.startCloud());
  }, []);
  return null;
}

export const shareFamily = async (spaceId: string) => (await engine()).shareFamily(spaceId);
export const inviteToFamily = async (spaceId: string) => (await engine()).inviteToFamily(spaceId);
export const joinFamily = async (code: string) => (await engine()).joinFamily(code);
export const leaveFamily = async (spaceId: string) => (await engine()).leaveFamily(spaceId);
