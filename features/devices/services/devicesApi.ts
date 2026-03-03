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
  deviceName: string
): Promise<void> {
  try {
    if (!accessToken || !pushToken) {
      console.warn('Dispositivo: No se puede registrar sin token de acceso o push token');
      return;
    }

    const response = await registerDevice(accessToken, {
      token: pushToken,
      platform,
      device_name: deviceName,
    });

  } catch (error) {
    console.error('✗ Error registrando dispositivo:', error);
    // No lanzar error para evitar interrumpir el flujo de la app
  }
}
