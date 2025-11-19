import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aiarchitect.app',
  appName: 'Ai Architect',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // Allow all URLs for development and API calls
    allowNavigation: ['*'],
    // Handle external URLs
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    // Enable WKWebView features
    preferredContentMode: 'mobile',
    // Allow inline media playback (important for voice features)
    allowsInlineMediaPlayback: true,
    // Suppress incremental rendering for better performance
    suppressesIncrementalRendering: false,
    // Handle links
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    // Enable Safari Web Inspector for debugging
    CapacitorHttp: {
      enabled: true
    },
    // Configure permissions
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#111827",
      showSpinner: false
    }
  }
};

export default config;
