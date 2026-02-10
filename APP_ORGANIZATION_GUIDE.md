# Guía de Organización de Carpeta `/app` y Navegación

Esta guía detalla la estructura y lógica de navegación utilizada en la aplicación, empleando **Expo Router** con navegación basada en grupos.

## 1. Estructura de `/app`

La carpeta `app/` es el corazón de la navegación. Se organiza mediante **Directorios de Grupo** (identificados por paréntesis) para separar responsabilidades sin afectar la estructura de la URL.

### Grupos Principales:
- **`(auth)`**: Contiene las pantallas de flujo de autenticación (`login.tsx`, `crear-usuario.tsx`, `cambiar-contrasena.tsx`).
- **`(tabs)`**: Define la interfaz principal de la aplicación con navegación por pestañas (Tab Bar). 
- **`(extras)`**: Pantallas secundarias o de detalle que no están directamente en la barra de navegación pero son accesibles desde ella.
- **`(association)`**: Flujo específico para asociar el dispositivo con un usuario/empleado (`asociar.tsx`).

---

## 2. Contextos y Layout Raíz (`app/_layout.tsx`)

El archivo [app/_layout.tsx](app/_layout.tsx) es el punto de entrada global. Aquí se configuran los proveedores de contexto y la lógica de redirección.

### Uso de Contextos:
- **`QueryProvider`**: Envuelve toda la app para habilitar `react-query` (manejo de estado de red y caché).
- **`AuthProvider`**: Gestiona el estado de sesión (`isAuthenticated`), datos del usuario y tokens.
- **`ThemeProvider`**: Aplica el esquema de colores de la aplicación (usando `DefaultTheme` de `@react-navigation/native`).

### Lógica de Redirección (`RootNavigator`):
La navegación está protegida mediante el hook `useSegments()` y `Redirect`.
- **Protección de Auth**: Si el usuario no está autenticado y no está en el grupo `(auth)`, es redirigido a `/login`.
- **Protección de Asociación**: Si está autenticado pero requiere asociación de dispositivo, es redirigido a `/asociar`.
- **Redirección Post-Login**: Si ya está autenticado e intenta entrar a `(auth)`, es movido automáticamente a `(tabs)`.

---

## 3. Navegación por Grupos

### `(tabs)`
Usa un `TabLayout` en [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx). 
- Implementa una barra inferior personalizada.
- Utiliza **Roles de Usuario** para filtrar qué opciones son visibles mediante el hook `useRoleCheck`.
- Define menús contextuales (Administración vs Personal).

### `(extras)`
Aunque no tienen un `_layout.tsx` complejo, sirven para organizar pantallas de "segundo nivel". Se accede a ellas mediante `router.push('/(extras)/pantalla')`.

---

## 4. Implementación de Notificaciones

La aplicación utiliza `expo-notifications`. La lógica se divide en dos partes:

### A. Configuración y Listeners (Global)
En [app/_layout.tsx](app/_layout.tsx), se inicializa el manejo de notificaciones:
```tsx
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

### B. Registro del Dispositivo (`useRegisterDevice`)
El hook [features/devices/hooks/useRegisterDevice.ts](features/devices/hooks/useRegisterDevice.ts) se encarga de:
1. **Permisos**: Solicita permiso al usuario mediante `Notifications.requestPermissionsAsync()`.
2. **Push Token**: Obtiene el `ExpoPushToken` usando el `projectId` de la configuración.
3. **Persistencia**: Registra el token en el backend cuando el usuario inicia sesión.
4. **Canales (Android)**: Configura canales de importancia alta para notificaciones en Android.

---

## 5. Guía para replicar en otra App

1. **Estructura base**: Crea las carpetas `(auth)`, `(tabs)`, `(extras)` dentro de `app/`.
2. **Layout Raíz**: Copia la lógica de `RootNavigator` para manejar las redirecciones automáticas basadas en el estado de `auth`.
3. **Proveedores**: Asegúrate de envolver `RootNavigator` con los contextos necesarios en el export default de `app/_layout.tsx`.
4. **Protección de Rutas**: Usa un hook de autenticación que devuelva `isLoading` para evitar "flasheos" de pantallas protegidas mientras se verifica la sesión.
5. **Notificaciones**: 
   - Instala `expo-notifications` y `expo-device`.
   - Copia el hook `useRegisterDevice` y llámalo dentro del componente principal de navegación.
