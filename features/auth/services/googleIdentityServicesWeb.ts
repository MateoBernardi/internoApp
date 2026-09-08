import Constants from 'expo-constants';

/**
 * Google Sign-In en web: el paquete nativo @react-native-google-signin
 * no funciona en el navegador (soporte solo para sponsors), así que acá
 * usamos Google Identity Services (GIS), el SDK web soportado por Google,
 * por separado. Ver googleSignInClient.ts para la parte nativa.
 */

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const googleWebClientId = Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID as string | undefined;

type CredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services')));
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export const isGoogleIdentityServicesAvailable = !!googleWebClientId;

/**
 * Carga GIS si hace falta y renderiza el botón oficial de Google dentro de
 * `container`. `onCredential` recibe el ID token para pasarle a signInWithGoogle.
 */
export async function renderGoogleButton(
  container: HTMLElement,
  onCredential: (idToken: string) => void,
): Promise<void> {
  if (!googleWebClientId) {
    throw new Error('GOOGLE_WEB_CLIENT_ID no está configurado');
  }

  await loadGisScript();

  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services no está disponible');
  }

  window.google.accounts.id.initialize({
    client_id: googleWebClientId,
    callback: (response) => onCredential(response.credential),
  });

  window.google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width: 320,
  });
}
