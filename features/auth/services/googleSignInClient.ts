import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * @react-native-google-signin/google-signin registra un TurboModule nativo
 * (RNGoogleSignin) que solo existe en un dev client / build standalone.
 * Expo Go no lo incluye, así que un `import` estático de la librería explota
 * apenas se evalúa el módulo. Lo cargamos con `require` sólo fuera de Expo Go.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin')['GoogleSignin'];

let googleSigninModule: GoogleSigninModule | null = null;

if (!isExpoGo) {
  try {
    googleSigninModule = require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch {
    googleSigninModule = null;
  }
}

export const GoogleSignin = googleSigninModule;
export const isGoogleSignInAvailable = googleSigninModule !== null;
