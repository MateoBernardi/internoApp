import { apiRequest } from '@/shared/apiRequest';

interface RegisterDeviceData {
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_name?: string;
}

interface RegisterDeviceResponse {
  success: boolean;
  message?: string;
  device_id?: string;
}

function isLikelyExpoToken(token: string): boolean {
  return /^ExponentPushToken\[[^\]]+\]$/.test(token) || /^ExpoPushToken\[[^\]]+\]$/.test(token);
}

function isLikelyFcmToken(token: string): boolean {
  const normalized = token.trim();
  return normalized.length >= 120 && /:/.test(normalized) && /^[A-Za-z0-9_:\-\.]+$/.test(normalized);
}

function isValidPushTokenForPlatform(token: string, platform: RegisterDeviceData['platform']): boolean {
  if (!token || !token.trim()) return false;
  if (platform === 'web') return isLikelyFcmToken(token);
  return isLikelyExpoToken(token);
}

function toErrorWithStatus(error: unknown, statusCode?: number): Error {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const wrapped = new Error(message);
  (wrapped as any).statusCode = statusCode;
  return wrapped;
}

/**
 * Registra un dispositivo en el backend para recibir notificaciones push
 * @param accessToken Token de acceso del usuario
 * @param deviceData Datos del dispositivo (token push, plataforma, nombre)
 * @returns Respuesta del servidor
 */
export async function registerDevice(
  accessToken: string,
  deviceData: RegisterDeviceData
): Promise<RegisterDeviceResponse> {
  try {
    const response = await apiRequest({ method: 'POST', endpoint: '/devices', token: accessToken, body: deviceData });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw toErrorWithStatus(
        errData.message || errData.error || response.statusText,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error registering device:', error);
    throw error;
  }
}

/**
 * Registra un dispositivo de forma segura, manejando errores
 * @param accessToken Token de acceso del usuario
 * @param pushToken Token de push del dispositivo
 * @param platform Plataforma ('ios' o 'android')
 * @param deviceName Nombre del dispositivo
 */
export async function registerDeviceSafely(
  accessToken: string,
  pushToken: string,
  platform: 'ios' | 'android' | 'web',
  deviceName: string,
  maxRetries: number = 2
): Promise<{ ok: boolean; invalidToken?: boolean; statusCode?: number; message?: string }> {
  try {
    if (!accessToken || !pushToken) {
      console.warn('Dispositivo: No se puede registrar sin token de acceso o push token');
      return { ok: false, invalidToken: true, message: 'Token de acceso o push token faltante' };
    }

    if (!isValidPushTokenForPlatform(pushToken, platform)) {
      console.warn('[Devices] Push token inválido para la plataforma', {
        platform,
        tokenPreview: pushToken.slice(0, 24),
      });
      return {
        ok: false,
        invalidToken: true,
        message:
          platform === 'web'
            ? 'Token FCM inválido para web. Vuelve a autorizar notificaciones.'
            : 'Token Expo inválido para dispositivo nativo. Vuelve a autorizar notificaciones.',
      };
    }

    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
      try {
        const response = await registerDevice(accessToken, {
          token: pushToken,
          platform,
          device_name: deviceName,
        });

        console.log('[Devices] Device registered', {
          platform,
          deviceName,
          success: response.success,
          deviceId: response.device_id,
          attempt,
        });
        return { ok: true };
      } catch (error) {
        const statusCode = Number((error as any)?.statusCode) || undefined;
        if (statusCode === 400) {
          const message = error instanceof Error ? error.message : 'Payload inválido';
          console.warn('[Devices] Backend rejected device payload (400)', {
            platform,
            deviceName,
            message,
          });
          return { ok: false, invalidToken: true, statusCode, message };
        }

        if (attempt > maxRetries) {
          throw error;
        }

        const delayMs = Math.min(1000 * 2 ** attempt, 5000);
        console.warn('[Devices] Device registration failed, retrying', {
          platform,
          deviceName,
          attempt,
          delayMs,
        });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return { ok: false };

  } catch (error) {
    console.error('✗ Error registrando dispositivo:', error);
    const statusCode = Number((error as any)?.statusCode) || undefined;
    return {
      ok: false,
      statusCode,
      message: error instanceof Error ? error.message : 'Error registrando dispositivo',
    };
  }
}
