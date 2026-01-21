
import { InputWithIcon } from '@/components/InputWithIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/hooks/useAuthActions';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

export const LoginForm: React.FC = () => {
  const { handleLogin } = useAuth();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Validación de formulario
  const isFormValid = useMemo(() => {
    const userTrimmed = user.trim();
    const passTrimmed = pass.trim();
    return userTrimmed.length > 0 && passTrimmed.length > 0;
  }, [user, pass]);

  // Estilos del botón
  const buttonStyle = useMemo(() => [
    styles.loginButton,
    !isFormValid && styles.loginButtonDisabled,
    loading && styles.loginButtonLoading
  ], [isFormValid, loading]);

  // Submit handler
  const onSubmit = useCallback(async () => {
    if (!isFormValid) {
      setError("Por favor completa todos los campos");
      return;
    }
    
    // Dismiss keyboard para mejor UX
    Keyboard.dismiss();
    
    setLoading(true);
    setError("");
    
    try {
      const ok = await handleLogin(user.trim(), pass.trim());
      if (ok) {
        router.replace("/explore");
      } else {
        setError("Usuario o contraseña incorrectos");
      }
    } catch (err) {
      setError("Error de conexión. Intenta nuevamente");
    } finally {
      setLoading(false);
    }
  }, [user, pass, handleLogin, isFormValid]);

  // Cambios de usuario y contraseña
  const handleUserChange = useCallback((text: string) => {
    setUser(text);
    error && setError("");
  }, [error]);

  const handlePassChange = useCallback((text: string) => {
    setPass(text);
    error && setError("");
  }, [error]);

  // Error container
  const errorContent = useMemo(() => {
    if (!error) return null;
    return (
      <View style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }, [error]);

  return (
    <ThemedView style={styles.formSection}>
      <ThemedText style={styles.formSubtitle}>Accede a tu cuenta</ThemedText>
      <ThemedView style={styles.loginForm}>
        <InputWithIcon
          icon="👤"
          placeholder="Usuario"
          value={user}
          onChangeText={handleUserChange}
          accessibilityLabel="Campo usuario"
          textContentType="username"
          hasError={!!error && !user.trim()}
        />
        <InputWithIcon
          icon="🔒"
          placeholder="Contraseña"
          value={pass}
          onChangeText={handlePassChange}
          secureTextEntry
          accessibilityLabel="Campo contraseña"
          returnKeyType="done"
          textContentType="password"
          hasError={!!error && !pass.trim()}
        />
        {errorContent}
        <Pressable
          style={buttonStyle}
          onPress={onSubmit}
          disabled={!isFormValid || loading}
          accessibilityRole="button"
          accessibilityLabel="Botón ingresar"
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          {...Platform.OS === 'ios' && {
            onPressIn: () => {
              // Feedback háptico nativo disponible si se necesita
            }
          }}
        >
          <Feather name="log-in" size={22} color={isFormValid ? "#274690" : "#fff"} style={{ marginRight: 8 }} />
          <ThemedText style={[styles.loginButtonText, !isFormValid && { color: '#fff' }] }>
            {loading ? "Ingresando..." : "Ingresar"}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  formSection: {
    backgroundColor: 'transparent',
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  formSubtitle: {
    display: 'none',
  },
  loginForm: {
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonText: {
    color: '#274690',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 32,
    backgroundColor: '#f3f6fa',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 32,
    elevation: 8,
    shadowColor: '#274690',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  loginCardText: {
    color: '#274690',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginButtonDisabled: {
    backgroundColor: '#adb5bd',
    shadowOpacity: 0.1,
  },
  loginButtonLoading: {
    opacity: 0.8,
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '500',
  },
});
