# 🔄 Guía de Migración

## Cómo actualizar componentes existentes

### Paso 1: Identificar componentes que usan `useAuth()`

Busca en tu código cualquier uso de:
```tsx
const { login, logout, register, ... } = useAuth();
```

### Paso 2: Separar estado de acciones

**Antes:**
```tsx
import { useAuth } from '@/features/auth/context/AuthContext';

function MyComponent() {
  // ❌ Todo mezclado
  const { 
    user,           // Estado
    isLoading,      // Estado
    login,          // Acción ❌
    logout          // Acción ❌
  } = useAuth();

  // ... resto del código
}
```

**Después:**
```tsx
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthActions } from '@/features/auth/hooks/useAuthActions';

function MyComponent() {
  // ✅ Estado separado
  const { user, isLoading } = useAuth();
  
  // ✅ Acciones separadas
  const { login, logout } = useAuthActions();

  // ... resto del código (sin cambios)
}
```

### Paso 3: Verificar que funciona igual

El comportamiento es **exactamente igual**, solo cambia dónde obtienes las funciones:

```tsx
// Antes
const { logout } = useAuth();
await logout();

// Después
const { logout } = useAuthActions();
await logout(); // ✅ Funciona igual
```

## 📋 Checklist de Migración

### Archivos a actualizar

- [ ] `/app/(auth)/index.tsx` - Pantalla de login
- [ ] `/app/(tabs)/user.tsx` - Perfil de usuario
- [ ] `/components/LoginForm.tsx` - ✅ Ya actualizado
- [ ] Cualquier otro componente que use `useAuth()`

### Para cada componente:

1. [ ] Agregar import de `useAuthActions`
2. [ ] Separar `useAuth()` en dos líneas:
   - Una para estado (user, isLoading, etc.)
   - Una para acciones (login, logout, etc.)
3. [ ] Verificar que compile sin errores
4. [ ] Probar que funcione correctamente

## 🔍 Búsqueda Rápida

Para encontrar todos los archivos que necesitas actualizar, ejecuta:

```bash
# Buscar uso de useAuth
grep -r "useAuth()" --include="*.tsx" --include="*.ts" app/ components/
```

## 📝 Ejemplos de Migración

### Ejemplo 1: Login Screen

**Antes:**
```tsx
// app/(auth)/index.tsx
import { useAuth } from '@/features/auth/context/AuthContext';

export default function LoginScreen() {
  const { login, isLoading, error } = useAuth();
  
  const handleLogin = async () => {
    await login(email, password);
  };

  return (
    <View>
      <Button onPress={handleLogin} disabled={isLoading}>
        Login
      </Button>
    </View>
  );
}
```

**Después:**
```tsx
// app/(auth)/index.tsx
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthActions } from '@/features/auth/hooks/useAuthActions';

export default function LoginScreen() {
  // Separar estado de acciones
  const { isLoading } = useAuth();
  const { login } = useAuthActions();
  
  const handleLogin = async () => {
    await login(email, password);
  };

  return (
    <View>
      <Button onPress={handleLogin} disabled={isLoading}>
        Login
      </Button>
    </View>
  );
}
```

### Ejemplo 2: User Profile

**Antes:**
```tsx
// app/(tabs)/user.tsx
import { useAuth } from '@/features/auth/context/AuthContext';

export default function UserScreen() {
  const { user, userContext, logout } = useAuth();

  return (
    <View>
      <Text>Hola, {user?.nombre}</Text>
      <Text>Cuentas: {userContext?.cuentas?.length}</Text>
      <Button onPress={logout}>Salir</Button>
    </View>
  );
}
```

**Después:**
```tsx
// app/(tabs)/user.tsx
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthActions } from '@/features/auth/hooks/useAuthActions';

export default function UserScreen() {
  // Estado
  const { user, userContext } = useAuth();
  
  // Acciones
  const { logout } = useAuthActions();

  return (
    <View>
      <Text>Hola, {user?.nombre}</Text>
      <Text>Cuentas: {userContext?.cuentas?.length}</Text>
      <Button onPress={logout}>Salir</Button>
    </View>
  );
}
```

### Ejemplo 3: Asociar Cuenta

**Antes:**
```tsx
import { useAuth } from '@/features/auth/context/AuthContext';

function AsociarCuentaScreen() {
  const { 
    obtenerCuentas, 
    solicitarVerificacion, 
    validarYAsociar 
  } = useAuth();

  const handleAsociar = async () => {
    const cuentas = await obtenerCuentas(cuit);
    await solicitarVerificacion(cuentas[0]);
    await validarYAsociar(cuentas[0], codigo);
  };

  return <View>{/* ... */}</View>;
}
```

**Después:**
```tsx
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthActions } from '@/features/auth/hooks/useAuthActions';

function AsociarCuentaScreen() {
  // Estado (si lo necesitas)
  const { user } = useAuth();
  
  // Acciones
  const { 
    obtenerCuentas, 
    solicitarVerificacion, 
    validarYAsociar 
  } = useAuthActions();

  const handleAsociar = async () => {
    const cuentas = await obtenerCuentas(cuit);
    await solicitarVerificacion(cuentas[0]);
    await validarYAsociar(cuentas[0], codigo);
  };

  return <View>{/* ... */}</View>;
}
```

## ⚠️ Propiedades Eliminadas

Estas propiedades **ya no existen** en `useAuth()`:

- ❌ `login` - Usar `useAuthActions().login`
- ❌ `logout` - Usar `useAuthActions().logout`
- ❌ `register` - Usar `useAuthActions().register`
- ❌ `obtenerCuentas` - Usar `useAuthActions().obtenerCuentas`
- ❌ `solicitarVerificacion` - Usar `useAuthActions().solicitarVerificacion`
- ❌ `validarYAsociar` - Usar `useAuthActions().validarYAsociar`
- ❌ `clearError` - Ya no es necesario
- ❌ `setRequiresAssociation` - Ya no es necesario
- ❌ `refreshUser` - Usar `useAuth().loadUserContext`
- ❌ `error` - Manejar errores en cada acción
- ❌ `requiresAssociation` - Verificar en la respuesta de login

### Propiedades que SÍ existen en `useAuth()`:

- ✅ `user` - Usuario actual
- ✅ `userContext` - Contexto extendido
- ✅ `isLoading` - Estado de carga
- ✅ `isAuthenticated` - ¿Está autenticado?
- ✅ `loadUserContext()` - Refrescar datos del usuario
- ✅ `clearUser()` - Limpiar estado (uso interno)
- ✅ `setUser()` - Actualizar usuario (uso interno)

## 🧪 Testing

Después de migrar cada componente:

1. **Compilación**: Verificar que no haya errores de TypeScript
2. **Funcionalidad**: Probar login, logout, navegación
3. **Estado**: Verificar que el estado se actualice correctamente
4. **UI**: Confirmar que la interfaz se actualice automáticamente

## 🆘 Solución de Problemas

### Error: "Property 'login' does not exist on type..."

**Causa:** Intentas obtener `login` de `useAuth()` pero ya no existe ahí.

**Solución:**
```tsx
// ❌ Incorrecto
const { login } = useAuth();

// ✅ Correcto
const { login } = useAuthActions();
```

### Error: Hook useAuthActions no está definido

**Causa:** No importaste el hook.

**Solución:**
```tsx
import { useAuthActions } from '@/features/auth/hooks/useAuthActions';
```

### El estado no se actualiza

**Causa:** Probablemente no estás llamando a `loadUserContext()` después de una acción.

**Solución:** Los hooks ya lo hacen automáticamente en `login` y `validarYAsociar`. Si actualizas el perfil manualmente, llama a:
```tsx
const { loadUserContext } = useAuth();
await loadUserContext();
```

## 📚 Recursos

- [README.md](./features/auth/README.md) - Documentación completa de la arquitectura
- [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - Resumen de cambios
- [UserProfileExample.tsx](./features/auth/examples/UserProfileExample.tsx) - Ejemplos de uso

---

**Tiempo estimado de migración:** 5-10 minutos por componente
