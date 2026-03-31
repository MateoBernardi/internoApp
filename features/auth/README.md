# Arquitectura de Autenticación

## 📋 Principio de Diseño

La arquitectura sigue el principio de **separación de responsabilidades**:

- **El Contexto** es un almacén de datos
- **Los Servicios** ejecutan la lógica de negocio
- **Los Hooks** conectan ambos con la UI

## 🏗️ Estructura

```
features/auth/
├── context/
│   └── AuthContext.tsx          # 📦 Almacén de datos del usuario
├── services/
│   └── authApi.ts                # 🔧 Lógica de autenticación (API)
├── hooks/
│   └── useAuthActions.ts         # 🎯 Acciones de autenticación
└── types/
    └── index.ts                  # 📝 Tipos TypeScript
```

## 🎯 Responsabilidades

### 1. El Contexto (`AuthContext`)
**¿Qué hace?**
- Almacena el estado del usuario (`user`, `userContext`)
- Provee el estado de carga (`isLoading`, `isAuthenticated`)
- Sincroniza los datos del usuario con toda la aplicación

**¿Qué NO hace?**
- NO ejecuta login o logout
- NO hace llamadas directas a la API de autenticación
- NO maneja tokens (solo los lee)

**Métodos que expone:**
```typescript
const { 
  user,              // Usuario actual
  userContext,       // Contexto extendido con cuentas
  isLoading,         // ¿Está cargando?
  isAuthenticated,   // ¿Está autenticado?
  loadUserContext,   // Cargar/refrescar datos del usuario
  clearUser,         // Limpiar estado (usado internamente)
  setUser            // Actualizar usuario (usado internamente)
} = useAuth();
```

### 2. Los Servicios (`authApi`)
**¿Qué hace?**
- Se comunica con el backend (HTTP requests)
- Maneja tokens (guardar, borrar, refrescar)
- Ejecuta la lógica de autenticación pura

**Funciones disponibles:**
- `login()` - Autenticar usuario
- `logout()` - Cerrar sesión
- `registerUser()` - Registrar nuevo usuario
- `getCurrentUser()` - Obtener contexto del usuario
- `obtenerCuentasDisponibles()` - Buscar cuentas para asociar
- `solicitarVerificacion()` - Enviar código de verificación
- `validarYAsociarCuenta()` - Validar código y asociar cuenta

### 3. Los Hooks (`useAuthActions`)
**¿Qué hace?**
- Conecta los servicios con el contexto
- Orquesta el flujo de autenticación
- Provee funciones listas para usar en componentes

**Métodos que expone:**
```typescript
const { 
  login,                  // Iniciar sesión
  logout,                 // Cerrar sesión
  register,               // Registrar usuario
  obtenerCuentas,         // Buscar cuentas
  solicitarVerificacion,  // Solicitar código
  validarYAsociar        // Validar y asociar cuenta
} = useAuthActions();
```

## 🔄 Flujo de Autenticación

### Login
```
┌──────────────┐
│   Usuario    │
│ hace login   │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  useAuthActions()    │
│  login(email, pass)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│    authApi.login()   │
│  • Envía credenciales│
│  • Recibe tokens     │
│  • Guarda tokens     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│   AuthContext        │
│ loadUserContext()    │
│  • Pide datos a API  │
│  • Guarda en estado  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│        UI            │
│  Se actualiza        │
│  automáticamente     │
└──────────────────────┘
```

### Logout
```
┌──────────────┐
│   Usuario    │
│ hace logout  │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  useAuthActions()    │
│     logout()         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│   authApi.logout()   │
│  • Invalida sesión   │
│  • Borra tokens      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│   AuthContext        │
│    clearUser()       │
│  • Limpia estado     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│        UI            │
│  Muestra Login       │
└──────────────────────┘
```

## 💻 Ejemplo de Uso

### En un componente de Login
```tsx
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthActions } from '@/features/auth/hooks/useAuthActions';

export function LoginScreen() {
  // Leer el estado
  const { isLoading, isAuthenticated } = useAuth();
  
  // Ejecutar acciones
  const { login } = useAuthActions();

  const handleLogin = async () => {
    const result = await login('user@example.com', 'password123');
    
    if (result.success) {
      // El contexto ya se actualizó, la UI reacciona automáticamente
      console.log('Login exitoso');
    } else {
      console.error(result.error);
    }
  };

  return (
    <View>
      <Button onPress={handleLogin} disabled={isLoading}>
        {isLoading ? 'Cargando...' : 'Entrar'}
      </Button>
    </View>
  );
}
```

### En un componente de Perfil
```tsx
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthActions } from '@/features/auth/hooks/useAuthActions';

export function ProfileScreen() {
  // Leer el estado del usuario
  const { user, userContext, isLoading } = useAuth();
  
  // Ejecutar acciones
  const { logout } = useAuthActions();

  if (isLoading) {
    return <Loading />;
  }

  if (!user) {
    return <Text>No autenticado</Text>;
  }

  return (
    <View>
      <Text>Hola, {user.nombre || user.username}</Text>
      <Text>Email: {user.email}</Text>
      
      {userContext?.cuentas && (
        <Text>Cuentas: {userContext.cuentas.length}</Text>
      )}

      <Button onPress={logout}>Cerrar Sesión</Button>
    </View>
  );
}
```

### Sincronización automática
Si el usuario actualiza su perfil en una pantalla, todos los componentes que usen `useAuth()` se actualizarán automáticamente:

```tsx
// En cualquier lugar de la app
const { loadUserContext } = useAuth();

// Después de actualizar el perfil
await updateProfile(newData);
await loadUserContext(); // ✨ Toda la app se sincroniza
```

## 🔑 Ventajas de esta Arquitectura

### ✅ Escalabilidad
Si mañana cambias de JWT a Firebase, solo modificas `authApi.ts`. El contexto y la UI no se enteran del cambio.

### ✅ Testeable
Puedes testear cada capa por separado:
- Servicios: Test unitarios de API calls
- Contexto: Test de sincronización de estado
- Hooks: Test de integración

### ✅ Mantenible
Cada archivo tiene una responsabilidad clara. Es fácil encontrar dónde hacer cambios.

### ✅ Reutilizable
Los servicios pueden usarse fuera del contexto si es necesario (ej: en un script de migración).

## 🛡️ Regla de Oro

> **El Contexto es para leer datos globalmente**
> 
> **Los Servicios son para ejecutar acciones**
>
> **Los Hooks son el puente entre ambos**

## 🚀 Siguientes Pasos

1. **Actualizar LoginScreen**: Usar `useAuthActions()` en lugar del contexto directamente
2. **Refactorizar componentes**: Separar lectura de estado (`useAuth`) de acciones (`useAuthActions`)
3. **Agregar más servicios**: Si necesitas más funcionalidades, agrégalas a `authApi.ts`
