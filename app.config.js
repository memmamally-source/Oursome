/**
 * Extends app.json. EXPO_BASE_URL sets the web sub-path, e.g. "/Oursome"
 * for https://<user>.github.io/Oursome/. Leave it unset for a custom domain.
 * IOS_BUILD_NUMBER (set by the iPhone app workflow) must rise with every App Store upload.
 */
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    ...(process.env.IOS_BUILD_NUMBER ? { buildNumber: process.env.IOS_BUILD_NUMBER } : {}),
  },
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
