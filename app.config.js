/**
 * Extends app.json. EXPO_BASE_URL sets the web sub-path, e.g. "/Oursome"
 * for https://<user>.github.io/Oursome/. Leave it unset for a custom domain.
 * IOS_BUILD_NUMBER / ANDROID_VERSION_CODE (set by the app workflows) must rise with every store upload.
 */
const { withAndroidManifest, withEntitlementsPlist } = require('expo/config-plugins');

// Reminders are local notifications scheduled on the phone, so the app doesn't
// need the push entitlement expo-notifications adds (it would need the Push
// capability on the App ID, and remote push isn't used).
const withoutPushEntitlement = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });

// The app is portrait-only, so Android adds a *required* portrait-screen feature,
// which hides it on landscape-only devices (Chromebooks, some tablets, XR). Play
// flags that; marking the feature optional keeps those devices able to install.
const withOptionalPortraitScreen = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const features = (manifest['uses-feature'] ??= []);
    const portrait = features.find((f) => f.$?.['android:name'] === 'android.hardware.screen.portrait');
    if (portrait) portrait.$['android:required'] = 'false';
    else features.push({ $: { 'android:name': 'android.hardware.screen.portrait', 'android:required': 'false' } });
    return mod;
  });

module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), withoutPushEntitlement, withOptionalPortraitScreen],
  ios: {
    ...config.ios,
    ...(process.env.IOS_BUILD_NUMBER ? { buildNumber: process.env.IOS_BUILD_NUMBER } : {}),
  },
  android: {
    ...config.android,
    ...(process.env.ANDROID_VERSION_CODE ? { versionCode: Number(process.env.ANDROID_VERSION_CODE) } : {}),
  },
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
