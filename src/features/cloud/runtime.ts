/**
 * The single lazily-loaded entry to everything that uses the Firebase SDK.
 * Keeping one entry lets the bundler put Firebase in its own chunk, which
 * only downloads when cloud sharing is configured.
 */
export { firebaseAuth } from './auth';
export { inviteToFamily, joinFamily, leaveFamily, shareFamily, startCloud } from './engine';
