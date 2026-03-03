import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "Italo Argentina",
  slug: "internoApp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon-1024.png",
  scheme: "internoapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    googleServicesFile: "./GoogleService-Info.plist",
    supportsTablet: true,
    bundleIdentifier: "italoarg.com.ar",
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
    },
  },
  android: {
    package: "italoarg.com.ar",
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/icon-1024.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    permissions: ["android.permission.RECORD_AUDIO"],
  },
  web: {
    output: "static" as const,
    favicon: "./assets/images/favicon.png",
    name: "Italo Argentina",
    shortName: "Italo Arg",
    description: "App interna de Italo Argentina",
    lang: "es",
    themeColor: "#00054b",
    backgroundColor: "#eeeeee",
    display: "standalone",
    orientation: "portrait",
    startUrl: "/",
    scope: "/",
  },
  plugins: [
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon-1024.png",
        color: "#E6F4FE",
      },
    ],
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/icon-1024.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "expo-secure-store",
    "@react-native-community/datetimepicker",
    "expo-image-picker",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    API_BASE_URL: "http://192.168.1.189:3000",
    // TODO: Reemplazar con los valores de Firebase Console → Project Settings → General → Web App
    FIREBASE_WEB: {
      apiKey: "TU_API_KEY_WEB",
      authDomain: "italoapp-7def0.firebaseapp.com",
      projectId: "italoapp-7def0",
      storageBucket: "italoapp-7def0.firebasestorage.app",
      messagingSenderId: "444092191215",
      appId: "TU_APP_ID_WEB",
    },
    // TODO: Reemplazar con la VAPID key de Firebase Console → Cloud Messaging → Web Push certificates
    VAPID_PUBLIC_KEY: "TU_VAPID_PUBLIC_KEY",
    router: {},
    eas: {
      projectId: "f7cef901-9e89-441f-8cb3-ceb9c01a8b6c",
    },
  },
});
