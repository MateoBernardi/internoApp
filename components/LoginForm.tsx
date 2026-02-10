
import { InputWithIcon } from '@/components/InputWithIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

const colors = Colors['light'];

export const LoginForm: React.FC = () => {
  const { signIn } = useAuth();
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

  // Colores dinámicos del botón
  const buttonIconColor = isFormValid ? colors.lightTint : colors.secondaryText;
  const buttonTextColor = isFormValid ? colors.lightTint : colors.secondaryText;

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
      await signIn(user.trim(), pass.trim());
      // El RootLayout maneja el redirect automáticamente basado en isAuthenticated y requiresAssociation
    } catch (err: any) {
      setError(err.message || "Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }, [user, pass, signIn, isFormValid]);

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
          android_ripple={{ color: colors.lightTint }}
          {...Platform.OS === 'ios' && {
            onPressIn: () => {
              // Feedback háptico nativo disponible si se necesita
            }
          }}
        >
          <Feather name="log-in" size={22} color={buttonIconColor} style={{ marginRight: 8 }} />
          <ThemedText style={[styles.loginButtonText, { color: buttonTextColor }]}>
            {loading ? "Ingresando..." : "Ingresar"}
          </ThemedText>
        </Pressable>

        <View style={styles.linksContainer}>
          <View style={styles.signupContainer}>
            <ThemedText style={styles.signupText}>¿No tenés usuario? </ThemedText>
            <Pressable onPress={() => router.navigate({pathname: '/(auth)/crear-usuario' as any})}>
              <ThemedText style={styles.signupLink}>Crear uno</ThemedText>
            </Pressable>
          </View>

          <View style={styles.forgotPasswordContainer}>
            <Pressable onPress={() => router.navigate({pathname: '/(auth)/cambiar-contrasena' as any})}>
              <ThemedText style={styles.forgotPasswordLink}>¿Olvidaste tu contraseña?</ThemedText>
            </Pressable>
          </View>
        </View>
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
    paddingTop: 60,
  },
  formSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  loginForm: {
    maxWidth: 380,
    backgroundColor: colors.componentBackground,
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
    color: colors.componentBackground,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 32,
    backgroundColor: colors.lightTint,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 32,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  loginCardText: {
    color: colors.componentBackground,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginButtonDisabled: {
    backgroundColor: colors.background,
    shadowOpacity: 0.1,
  },
  loginButtonLoading: {
    opacity: 0.8,
    backgroundColor: colors.secondaryText,
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
  linksContainer: {
    marginTop: 20,
    gap: 12,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  signupLink: {
    fontSize: 14,
    color: colors.tint,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  forgotPasswordContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordLink: {
    fontSize: 13,
    color: colors.tint,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
