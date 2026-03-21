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
    ...(process.env.GOOGLE_SERVICES_IOS
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_IOS }
      : {}),
    supportsTablet: true,
    bundleIdentifier: "italoarg.com.ar",
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
    },
  },
  android: {
    package: "italoarg.com.ar",
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON,
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
    API_BASE_URL: process.env.API_BASE_URL ?? "http://192.168.1.6:3000",
    ENABLE_PUSH_CACHE_SYNC: process.env.EXPO_PUBLIC_ENABLE_PUSH_CACHE_SYNC ?? "true",
    VITE_FEATURE_FOLDERS: process.env.VITE_FEATURE_FOLDERS ?? "false",
    FIREBASE_WEB: {
      apiKey: process.env.FIREBASE_API_KEY ?? "",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? "",
      projectId: process.env.FIREBASE_PROJECT_ID ?? "",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? "",
      appId: process.env.FIREBASE_APP_ID ?? "",
    },
    VAPID_PUBLIC_KEY: process.env.FIREBASE_VAPID_PUBLIC_KEY ?? "",
    router: {},
    eas: {
      projectId: "f7cef901-9e89-441f-8cb3-ceb9c01a8b6c",
    },
  },
});
