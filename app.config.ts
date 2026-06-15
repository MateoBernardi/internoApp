import { config as loadDotenv } from "dotenv";
import { ConfigContext, ExpoConfig } from "expo/config";
import { resolve } from "path";

// EAS no carga los archivos .env durante `eas update` (a diferencia de `expo start`),
// por lo que las variables quedaban undefined y se publicaban bundles sin API_BASE_URL.
// Los cargamos explícitamente acá. dotenv no pisa variables ya definidas, así que las
// inyectadas por EAS Build / `--environment` siguen teniendo prioridad.
loadDotenv({ path: resolve(__dirname, ".env.local") });
loadDotenv({ path: resolve(__dirname, ".env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[app.config] Falta la variable de entorno ${name}. ` +
        `Definila en .env o en el entorno de EAS antes de publicar/buildear.`,
    );
  }
  return value;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "Italo Argentina",
  slug: "internoApp",
  version: "1.0.5",
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
    bundleIdentifier: "ar.com.italoarg",
    infoPlist: {
      infoPlist: {
        UIBackgroundModes: ["remote-notification"],
        NSCameraUsageDescription: "Esta aplicación requiere acceso a la cámara para que los empleados puedan escanear códigos QR o capturar imágenes de remitos, productos, o reportes por ejemplo, al registrar un control de stock en el depósito de la empresa.",
        NSLocationWhenInUseUsageDescription: "Esta aplicación requiere acceso a tu ubicación para verificar que te encontrás dentro del predio de Italo Argentina, por ejemplo, al momento de registrar de forma válida tu asistencia, entrada o salida laboral.",
        NSPhotoLibraryUsageDescription: "Esta aplicación requiere acceso a tu biblioteca de fotos para que los empleados puedan seleccionar y subir imágenes de comprobantes, recibos o reportes de daños guardados en el dispositivo hacia el sistema de la empresa.",
      },
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
  androidStatusBar: {
    backgroundColor: "#e3e6eb",
    barStyle: "dark-content",
    translucent: false,
  },
  androidNavigationBar: {
    backgroundColor: "#dfe3e8",
    barStyle: "dark-content",
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
    [
      "expo-camera",
      {
        "cameraPermission": "Esta aplicación requiere acceso a la cámara para que los usuarios puedan escanear códigos QR o capturar imágenes de remitos, productos, o reportes por ejemplo, al registrar un control de stock en el depósito de la empresa.",
        "microphonePermission": "Esta aplicación necesita acceso al micrófono para grabar videos de reportes laborales."
      }
    ],
    [
      "expo-location",
      {
        "locationWhenInUsePermission": "Esta aplicación requiere acceso a tu ubicación para verificar que te encontrás dentro del predio de Italo Argentina, por ejemplo, al momento de registrar de forma válida tu asistencia, entrada o salida laboral."
      }
    ],
    "expo-secure-store",
    "@react-native-community/datetimepicker",
    [
      "expo-image-picker",
      {
        "photoLibraryPermission": "Esta aplicación requiere acceso a tu biblioteca de fotos para que los usuarios puedan seleccionar y subir imágenes de comprobantes, recibos o reportes de daños guardados en el dispositivo hacia el sistema de la empresa.",
      }
    ],
    "./plugins/withBlockedAndroidMediaPermissions",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    API_BASE_URL: requireEnv("API_BASE_URL"),
    // Secret en EAS (solo disponible en build, no en update) → opcional. Solo se usa para web push.
    VAPID_PUBLIC_KEY: process.env.FIREBASE_VAPID_PUBLIC_KEY,
    router: {},
    eas: {
      projectId: "f7cef901-9e89-441f-8cb3-ceb9c01a8b6c",
    },
  },
  updates: {
    url: "https://u.expo.dev/f7cef901-9e89-441f-8cb3-ceb9c01a8b6c"
  },
  runtimeVersion: {
    "policy": "appVersion"
  },
});
