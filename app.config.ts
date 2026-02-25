import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "internoApp",
  slug: "internoApp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
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
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    permissions: ["android.permission.RECORD_AUDIO"],
  },
  web: {
    output: "static" as const,
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#E6F4FE",
      },
    ],
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
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
    API_BASE_URL: "http://192.168.1.12:3000",
    router: {},
    eas: {
      projectId: "f7cef901-9e89-441f-8cb3-ceb9c01a8b6c",
    },
  },
});
