/**
 * Extends app.json. EXPO_BASE_URL sets the web sub-path, e.g. "/Oursome"
 * for https://<user>.github.io/Oursome/. Leave it unset for a custom domain.
 * IOS_BUILD_NUMBER (set by the iPhone app workflow) must rise with every App Store upload.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

// Reminders are local notifications scheduled on the phone, so the app doesn't
// need the push entitlement expo-notifications adds (it would need the Push
// capability on the App ID, and remote push isn't used).
const withoutPushEntitlement = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });

module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), withoutPushEntitlement],
  ios: {
    ...config.ios,
    ...(process.env.IOS_BUILD_NUMBER ? { buildNumber: process.env.IOS_BUILD_NUMBER } : {}),
  },
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
