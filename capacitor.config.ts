import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neel.play',
  appName: 'PLAY',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
