export default {
  expo: {
    name: "SynciT",
    slug: "SynciTMobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "syncitmobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSContactsUsageDescription: "This app needs access to contacts to help you find friends who use SynciT.",
        ITSAppUsesNonExemptEncryption: false
      },
      googleServicesFile: "./GoogleService-Info.plist",
      bundleIdentifier: "com.kairom.syncitmobile"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      edgeToEdgeEnabled: true,
      package: "com.kairom.syncitmobile",
      permissions: [
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.READ_CONTACTS"
      ],
      googleServicesFile: "./google-services.json"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#FFFFFF"
        }
      ],
      [
        "@react-native-firebase/app",
        {
          ios_config_file: "./GoogleService-Info.plist",
          android_config_file: "./google-services.json"
        }
      ],
      [
        "@react-native-firebase/messaging",
        {
          android: {
            requestIgnoreBatteryOptimizations: false
          }
        }
      ],
      [
        "@sentry/react-native/expo",
        {
          project: "syncitmobileapp",
          organization: "kairom"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "6d31fe32-139a-4791-bb5a-82cbbfd70bc7"
      },
      // Disable error overlay in production
      enableErrorOverlay: false,
      // Firebase environment variables
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseDatabaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
    },
    // Disable development mode error screens
    developmentClient: {
      silentLaunch: true
    }
  }
};