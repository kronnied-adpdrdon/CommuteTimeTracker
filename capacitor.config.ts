import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.commute.tracker',
  appName: 'Commute Time Tracker',
  webDir: 'out',
  android: {
    // Required by @capgo/background-geolocation: without it, location updates stop after
    // about 5 minutes with the screen off.
    useLegacyBridge: true,
  },
};

export default config;
