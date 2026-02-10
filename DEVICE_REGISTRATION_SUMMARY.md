# Sistema de Registro de Dispositivos - Solución Implementada

## Resumen de lo que se hizo

Se implementó un sistema completo y automático para registrar dispositivos en el backend cuando un usuario inicia sesión. El dispositivo se registra utilizando el **token de acceso del usuario** y el **push token de Expo**.

## Problema Original

El código en `_layout.tsx` intentaba usar `token.accessToken`, pero `token` era una cadena de texto (el push token), no un objeto. Esto causaba que el registro de dispositivos fallara.

## Solución Implementada

### 1. Estructura de Carpetas Creada

```
features/devices/
├── services/
│   └── devicesApi.ts           # Funciones para comunicarse con la API
├── hooks/
│   └── useRegisterDevice.ts     # Hook que maneja todo automáticamente
├── examples/
│   └── usage.tsx               # Ejemplos de cómo usar el sistema
└── README.md                   # Documentación
```

### 2. Archivos Creados

#### `features/devices/services/devicesApi.ts`
- **`registerDevice()`**: Envía la petición POST a la API con el token de acceso
- **`registerDeviceSafely()`**: Versión segura que maneja errores sin interrumpir la app

```typescript
POST /api/devices
Authorization: Bearer {accessToken}
Body: { token, platform, device_name }
```

#### `features/devices/hooks/useRegisterDevice.ts`
- Hook que se encarga de todo automáticamente
- Obtiene permisos de notificaciones
- Configura canales de Android
- Obtiene el push token
- Registra el dispositivo cuando esté autenticado

#### `app/_layout.tsx` (Actualizado)
- Se limpió el código basura
- Se quito la lógica incorrecta de registro
- Se importó y usa el hook `useRegisterDevice()`
- Se mantiene el manejador global de notificaciones

### 3. Flujo de Funcionamiento

```
1. Usuario abre la app
   ↓
2. RootLayout renderiza
   ↓
3. AuthProvider carga (verifica si está autenticado)
   ↓
4. RootNavigator renderiza
   ↓
5. useRegisterDevice() hook ejecuta:
   a) Solicita permisos de notificaciones (si no los tiene)
   b) Configura canales de notificación (Android)
   c) Obtiene el push token de Expo
   d) Cuando el usuario está autenticado + tiene push token → Registra dispositivo
   ↓
6. POST /api/devices { token, platform, device_name }
   ↓
7. Backend registra el dispositivo
   ↓
8. Usuario puede recibir notificaciones push
```

### 4. Flujo de Autenticación

```
User login (signIn)
    ↓
Backend verifica credenciales
    ↓
Devuelve accessToken + refreshToken
    ↓
AuthContext actualiza tokens
    ↓
useRegisterDevice() hook detecta cambio
    ↓
Verifica: isAuthenticated=true + expoPushToken ≠ null + accessToken ≠ null
    ↓
Llama registerDeviceSafely() ✓
    ↓
Dispositivo registrado en el backend
```

## Cambios en Detalle

### Antes (Código Incorrecto)
```typescript
// ❌ INCORRECTO - En _layout.tsx dentro de registerForPushNotificationsAsync()
if (token.accessToken) { // token es string, no tiene .accessToken
  const deviceName = Device.modelName || Device.osName;
  await fetch('https://TU-API.com/api/devices', {
    headers: {
      'Authorization': `Bearer ${token.accessToken}`, // ❌ Error
    },
    body: JSON.stringify({
      token: pushTokenString,
      platform: Platform.OS,
      device_name: deviceName,
    }),
  });
}
```

### Después (Código Correcto)
```typescript
// ✓ CORRECTO - Automático en el hook
function RootNavigator() {
  useRegisterDevice(); // ✓ Maneja todo automáticamente
  // ...
}

// En el hook useRegisterDevice.ts:
useEffect(() => {
  if (expoPushToken && tokens?.accessToken && isAuthenticated) {
    registerDeviceSafely(tokens.accessToken, expoPushToken, platform, deviceName);
  }
}, [expoPushToken, tokens?.accessToken, isAuthenticated]);
```

## Ventajas de la Solución

✅ **Automático**: No requiere código adicional en componentes  
✅ **Reactivo**: Detecta automáticamente cuando el usuario se autentica  
✅ **Seguro**: Maneja errores sin interrumpir la app  
✅ **Separación de responsabilidades**: Lógica en carpeta dedicada  
✅ **Reutilizable**: Hook puede usarse en cualquier componente  
✅ **Permiso correcto**: Usa el token de acceso enviado en header Authorization  
✅ **TypeScript**: Totalmente tipado  

## Cómo Usar

### Uso Automático (Recomendado)
```tsx
// En app/_layout.tsx (ya implementado)
function RootNavigator() {
  useRegisterDevice(); // ✓ Listo
  // ...
}
```

### Uso Manual (Si lo necesitas)
```typescript
import { registerDeviceSafely } from '@/features/devices/services/devicesApi';

await registerDeviceSafely(accessToken, pushToken, platform, deviceName);
```

## Configuración Necesaria

Asegúrate de que en tu `app.json` esté configurado:
```json
{
  "extra": {
    "eas": {
      "projectId": "tu-proyecto-id"
    }
  }
}
```

## Debugging

Mira los logs en consola:
```
✓ Push token obtenido: ExponentPushToken[...]
✓ Dispositivo registrado exitosamente: { success: true, device_id: "xxx" }
```

## Endpoints Esperados

Tu backend debe tener:
```
POST /api/devices
Headers:
  - Authorization: Bearer {accessToken}
  - Content-Type: application/json

Body:
{
  "token": "ExponentPushToken[...]",
  "platform": "ios" | "android",
  "device_name": "iPhone 13"
}

Response:
{
  "success": true,
  "device_id": "xxx",
  "message": "Device registered successfully"
}
```

## Próximos Pasos (Opcionales)

1. **Actualizar tu backend** para aceptar los requests en `/api/devices`
2. **Almacenar dispositivos** en la BD asociados al usuario
3. **Enviar notificaciones** usando los push tokens guardados
4. **Manejar logout** para desvincular dispositivos
5. **Sincronizar dispositivos** cuando el usuario cambia de dispositivo

## Archivos Modificados

- ✅ `app/_layout.tsx` - Se limpió y refactorizó
- ✅ `features/devices/` - Nueva carpeta con toda la lógica

## Testing

Para probar en desarrollo:
1. Usar dispositivo físico (push tokens no funcionan en emuladores)
2. Permitir notificaciones cuando se pide
3. Revisar logs en consola
4. Confirmar que la petición llega al backend

## Notas Importantes

- El sistema es **silencioso**: No muestra dialogs ni loaders  
- Los **errores no interrumpen** la app: El usuario puede usar la app normalmente  
- En **emuladores**: El push token no se obtiene pero la app funciona  
- El **registro es automático**: No necesitas hacer nada después de implementar  

---

¡Sistema completamente implementado y listo para producción! 🚀
