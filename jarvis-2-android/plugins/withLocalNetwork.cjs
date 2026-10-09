const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withLocalNetwork(config) {
  return withAndroidManifest(config, (result) => {
    const application = result.modResults.manifest.application?.[0];
    if (!application) throw new Error('Android application manifest is missing.');
    application.$['android:usesCleartextTraffic'] = 'true';
    application.$['android:allowBackup'] = 'false';
    return result;
  });
};
