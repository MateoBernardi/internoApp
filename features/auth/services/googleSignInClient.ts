import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * @react-native-google-signin/google-signin registra un TurboModule nativo
 * (RNGoogleSignin) que solo existe en un dev client / build standalone.
 * Expo Go no lo incluye, así que un `import` estático de la librería explota
 * apenas se evalúa el módulo. Lo cargamos con `require` sólo fuera de Expo Go.
 * En web tampoco existe (soporte solo para sponsors): el login con Google en
 * web usa Google Identity Services por separado, ver googleIdentityServicesWeb.ts.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const shouldLoadNative = !isExpoGo && Platform.OS !== 'web';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin')['GoogleSignin'];

let googleSigninModule: GoogleSigninModule | null = null;

if (shouldLoadNative) {
  try {
    googleSigninModule = require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch {
    googleSigninModule = null;
  }
}

export const GoogleSignin = googleSigninModule;
export const isGoogleSignInAvailable = googleSigninModule !== null;
