// Dynamic config — allows env var substitution that app.json doesn't support.
// GOOGLE_SERVICES_JSON is set by EAS as a file env var during cloud builds.
// Locally, it falls back to ./google-services.json (in project root).
const { expo } = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  ...expo,
  android: {
    ...expo.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
};
