/**
 * Extends app.json. EXPO_BASE_URL sets the web sub-path, e.g. "/Oursome"
 * for https://<user>.github.io/Oursome/. Leave it unset for a custom domain.
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
