# Guía de Integración Backend - Registro de Dispositivos

## Endpoint Requerido

Tu backend debe tener un endpoint para recibir los registros de dispositivos.

## Request

### Método
```
POST /api/devices
```

### Headers
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

### Body
```json
{
  "token": "ExponentPushToken[uDiB7...example...abcd123]",
  "platform": "ios",
  "device_name": "iPhone 13 Pro Max"
}
```

### Headers Ejemplo Completo
```
POST /api/devices HTTP/1.1
Host: tu-api.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Length: 145

{
  "token": "ExponentPushToken[abc123...]",
  "platform": "ios",
  "device_name": "iPhone 13"
}
```

## Response

### Success (200)
```json
{
  "success": true,
  "device_id": "device_12345",
  "message": "Device registered successfully"
}
```

### Error (400)
```json
{
  "success": false,
  "error": "Invalid token format"
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

## Detalles de los Campos

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `token` | string | Push token de Expo | `ExponentPushToken[...]` |
| `platform` | enum | `ios` o `android` | `ios` |
| `device_name` | string | Nombre del dispositivo | `iPhone 13 Pro Max` |

## Validaciones Recomendadas

```typescript
// Backend validations
function validateDeviceRegistration(req: Request) {
  const { token, platform, device_name } = req.body;

  // Token debe ser string no vacío
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token');
  }

  // Platform debe ser ios o android
  if (!['ios', 'android'].includes(platform)) {
    throw new Error('Invalid platform');
  }

  // Device name debe ser string
  if (!device_name || typeof device_name !== 'string') {
    throw new Error('Invalid device name');
  }

  // Token no debe exceder cierta longitud
  if (token.length > 1000) {
    throw new Error('Token too long');
  }

  return true;
}
```

## Lógica Backend Recomendada

```typescript
// Pseudocódigo
async function registerDevice(req: Request, res: Response) {
  try {
    // 1. Verificar autenticación
    const user = await verifyToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Validar request
    const { token, platform, device_name } = req.body;
    validateDeviceRegistration({ token, platform, device_name });

    // 3. Verificar si dispositivo ya existe
    const existingDevice = await Device.findOne({
      userId: user.id,
      pushToken: token,
    });

    if (existingDevice) {
      // Actualizar last_active
      existingDevice.lastActive = new Date();
      await existingDevice.save();
      
      return res.status(200).json({
        success: true,
        device_id: existingDevice.id,
        message: 'Device already registered, updated',
      });
    }

    // 4. Crear nuevo dispositivo
    const device = await Device.create({
      userId: user.id,
      pushToken: token,
      platform,
      deviceName: device_name,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      registeredAt: new Date(),
      lastActive: new Date(),
    });

    // 5. Log para auditoría
    console.log(`Device registered: ${device.id} for user ${user.id}`);

    // 6. Responder
    res.status(200).json({
      success: true,
      device_id: device.id,
      message: 'Device registered successfully',
    });

  } catch (error) {
    console.error('Device registration error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}
```

## Modelo de Base de Datos

### Schema recomendado
```typescript
interface Device {
  id: string;
  userId: string;              // FK to User
  pushToken: string;           // Expo token único
  platform: 'ios' | 'android';
  deviceName: string;          // e.g., "iPhone 13"
  ip: string;                  // IP del cliente
  userAgent: string;           // Browser/App info
  registeredAt: Date;
  lastActive: Date;
  isActive: boolean;
  metadata?: {
    osVersion?: string;
    appVersion?: string;
  };
}
```

### SQL Example
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_token VARCHAR(500) NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_token UNIQUE (user_id, push_token)
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_push_token ON devices(push_token);
CREATE INDEX idx_devices_last_active ON devices(last_active);
```

## Enviar Notificaciones

Una vez que tengas los push tokens registrados:

```typescript
import * as Expo from 'expo-server-sdk';

const expo = new Expo();

async function sendNotification(userId: string, message: string) {
  // 1. Obtener dispositivos activos del usuario
  const devices = await Device.find({
    userId,
    isActive: true,
  });

  if (devices.length === 0) {
    console.log(`No active devices for user ${userId}`);
    return;
  }

  // 2. Preparar notificaciones
  const messages = devices.map(device => ({
    to: device.pushToken,
    sound: 'default',
    title: 'Mi App',
    body: message,
    data: { someData: 'goes here' },
  }));

  // 3. Enviar en chunks (Expo tiene límite por lote)
  const chunks = expo.chunkPushNotifications(messages);
  
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('Tickets:', ticketChunk);
      
      // Guardar tickets para tracking
      await saveNotificationTickets(ticketChunk);
    } catch (error) {
      console.error('Error sending chunk:', error);
    }
  }
}
```

## Manejo de Errores y Edge Cases

```typescript
// Tokens expirados
// A veces Expo tokens pueden expirar
// Implementar limpieza periódica:
async function cleanupInactiveDevices() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  await Device.deleteMany({
    lastActive: { $lt: thirtyDaysAgo },
  });
  
  console.log('Cleaned up inactive devices');
}

// Ejecutar diariamente
setInterval(cleanupInactiveDevices, 24 * 60 * 60 * 1000);
```

## Testing con cURL

```bash
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "token": "ExponentPushToken[abc123...]",
    "platform": "ios",
    "device_name": "iPhone 13"
  }'
```

## Consideraciones de Seguridad

1. **Validar Bearer Token**: Verificar que el token sea válido y no esté expirado
2. **Rate Limiting**: Limitar requests por IP/Usuario
3. **XSS/CSRF**: Validar inputs
4. **Token Uniqueness**: Devicers duplicados pueden causar problemas
5. **Logs**: Registrar cambios para auditoría
6. **Cleanup**: Eliminar tokens expirados periódicamente

## Monitoreo

Recomendaciones para monitorear:

```typescript
// Alertas si algo falla
async function monitorDeviceRegistration() {
  const stats = await Device.aggregate([
    {
      $group: {
        _id: '$platform',
        count: { $sum: 1 },
      }
    }
  ]);

  console.log('Active devices by platform:', stats);
  
  // Alerta si hay demasiados registros fallidos
  const recentErrors = await NotificationLog.find({
    status: 'error',
    createdAt: { $gt: new Date(Date.now() - 1 * 60 * 60 * 1000) }
  });

  if (recentErrors.length > 100) {
    sendAlert('High error rate in device registration');
  }
}
```

---

¡Listo! Tu backend está listo para recibir registro de dispositivos desde la app. 🚀
