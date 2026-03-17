import { apiRequest } from '@/shared/apiRequest';

interface RegisterDeviceData {
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_name: string;
}

interface RegisterDeviceResponse {
  success: boolean;
  message?: string;
  device_id?: string;
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
      throw new Error(errData.message || errData.error || response.statusText);
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
): Promise<boolean> {
  try {
    if (!accessToken || !pushToken) {
      console.warn('Dispositivo: No se puede registrar sin token de acceso o push token');
      return false;
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
        return true;
      } catch (error) {
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

    return false;

  } catch (error) {
    console.error('✗ Error registrando dispositivo:', error);
    // No lanzar error para evitar interrumpir el flujo de la app
    return false;
  }
}
