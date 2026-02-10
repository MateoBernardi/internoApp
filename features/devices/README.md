# Device Registration System

Este módulo maneja el registro de dispositivos para notificaciones push en la aplicación.

## Flujo funcionamiento

1. **`app/_layout.tsx`**: Entry point de la aplicación
   - Configura el manejador de notificaciones globalmente
   - Contiene `RootNavigator` que llama a `useRegisterDevice()`

2. **`useRegisterDevice()` hook** (`features/devices/hooks/useRegisterDevice.ts`)
   - Obtiene los permisos de notificaciones
   - Configura los canales de Android
   - Obtiene el push token de Expo
   - Registra automáticamente el dispositivo cuando el usuario esté autenticado

3. **`devicesApi.ts`** (`features/devices/services/devicesApi.ts`)
   - `registerDevice()` - Realiza la petición HTTP a la API
   - `registerDeviceSafely()` - Versión segura que maneja errores sin interrumpir la app

## Cómo funciona

### 1. Configuración inicial
```tsx
// En RootNavigator (dentro de app/_layout.tsx)
const { isAuthenticated } = useAuth();
useRegisterDevice(); // Hook que maneja todo automáticamente
```

### 2. El hook `useRegisterDevice()`
El hook realiza los siguientes pasos:

a) **Configura canales de Android**
```tsx
Notifications.setNotificationChannelAsync('default', {
  name: 'default',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#FF231F7C',
})
```

b) **Obtiene permisos y push token**
```tsx
const { status } = await Notifications.requestPermissionsAsync();
const token = await Notifications.getExpoPushTokenAsync({ projectId });
```

c) **Registra el dispositivo cuando está autenticado**
```tsx
if (expoPushToken && tokens?.accessToken && isAuthenticated) {
  registerDeviceSafely(tokens.accessToken, expoPushToken, platform, deviceName);
}
```

### 3. Petición a la API
```typescript
POST /api/devices
Authorization: Bearer {accessToken}

Body:
{
  "token": "ExponentPushToken[...]",
  "platform": "ios" | "android",
  "device_name": "iPhone 13"
}
```

## Manejo de tokens

- **Push Token**: Obtenido de Expo y usado para enviar notificaciones
- **Access Token**: Obtenido del AuthContext, usado para identificar al usuario en la petición

El sistema espera a tener ambos tokens antes de registrar el dispositivo.

## Flujo detallado de autenticación

```
User login
    ↓
AuthContext tiene tokens
    ↓
useRegisterDevice() obtiene push token
    ↓
tokens.accessToken disponible + isAuthenticated = true
    ↓
Llama registerDeviceSafely()
    ↓
POST /api/devices con el push token
    ↓
Backend registra dispositivo en BD
    ↓
Usuario puede recibir notificaciones push
```

## Manejo de errores

El sistema maneja los siguientes casos:
- ❌ No es un dispositivo físico → Se salta silenciosamente
- ❌ Sin permisos de notificaciones → Se pide permiso
- ❌ Sin Project ID → Logger warning
- ❌ Error en la API → Se loguea pero no interrumpe la app

## Variables de entorno

Asegúrate de tener configurado en tu `app.json` o `.env`:
```json
{
  "extra": {
    "eas": {
      "projectId": "tu-proyecto-id"
    }
  }
}
```

## Testing

Para probar localmente:
1. Usar dispositivo físico (las notificaciones push no funcionan en emuladores)
2. Permitir permisos cuando se pida
3. Revisar los logs en la consola para confirmar que el token se obtuvo y registró

```bash
✓ Push token obtenido: ExponentPushToken[...]
✓ Dispositivo registrado exitosamente: { success: true, device_id: "xxx" }
```
