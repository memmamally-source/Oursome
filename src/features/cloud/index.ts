import { useEffect } from 'react';

import { cloudConfigured } from './config';
import { cloudErrorMessage } from './mapping';

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

/** Runs a cloud action and turns any failure into words people can act on. */
async function friendly<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    throw new Error(cloudErrorMessage(e));
  }
}

export const shareFamily = (spaceId: string) => friendly(async () => (await engine()).shareFamily(spaceId));
export const inviteToFamily = (spaceId: string) => friendly(async () => (await engine()).inviteToFamily(spaceId));
export const joinFamily = (code: string) => friendly(async () => (await engine()).joinFamily(code));
export const leaveFamily = (spaceId: string) => friendly(async () => (await engine()).leaveFamily(spaceId));
export const deleteCloudAccount = () => friendly(async () => (await engine()).deleteCloudAccount());
