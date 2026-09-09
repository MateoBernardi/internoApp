import { InputWithIcon } from '@/components/InputWithIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthFormLayout } from '@/shared/ui/authLayout';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { GoogleSignin, isGoogleSignInAvailable } from '@/features/auth/services/googleSignInClient';
import { isGoogleIdentityServicesAvailable, renderGoogleButton } from '@/features/auth/services/googleIdentityServicesWeb';
import { GoogleLogo } from '@/shared/ui/GoogleLogo';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

const colors = Colors['light'];

export const LoginForm: React.FC = () => {
  const { signIn, signInWithGoogle } = useAuth();
  const { maxWidth: webFormMaxWidth, horizontalPadding, logoSize } = useAuthFormLayout();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const passRef = useRef<TextInput>(null);
  const googleButtonContainerRef = useRef<View>(null);

  // Validación de formulario
  const isFormValid = useMemo(() => {
    const userTrimmed = user.trim();
    const passTrimmed = pass.trim();
    return userTrimmed.length > 0 && passTrimmed.length > 0;
  }, [user, pass]);

  // Colores dinámicos del botón (glass): el fondo se mantiene constante,
  // el estado se comunica a través del color de icono/texto
  const buttonIconColor = loading || isFormValid ? glassColors.text : glassColors.disabledText;
  const buttonTextColor = buttonIconColor;

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
    } catch (err: unknown) {
      // Error: limpiar usuario, mantener foco en inicio, mostrar error
      setUser("");
      setPass("");
      if (err instanceof Error) {
        setError(err.message || "Intenta nuevamente");
      } else {
        setError("Intenta nuevamente");
      }
    } finally {
      setLoading(false);
    }
  }, [user, pass, signIn, isFormValid]);

  // Sign in con Google (solo nativo: el SDK no soporta web)
  const onGoogleSignIn = useCallback(async () => {
    if (!GoogleSignin) {
      setError("Inicio de sesión con Google no disponible en Expo Go");
      return;
    }

    setGoogleLoading(true);
    setError("");

    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      if (result.type === 'cancelled') {
        // El usuario cerró el selector de cuentas: no es un error a mostrar
        return;
      }
      const idToken = result.data?.idToken;
      if (!idToken) {
        throw new Error("No se pudo obtener el token de Google");
      }
      await signInWithGoogle(idToken);
      // El RootLayout maneja el redirect automáticamente basado en isAuthenticated y requiresAssociation
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Intenta nuevamente");
    } finally {
      setGoogleLoading(false);
    }
  }, [signInWithGoogle]);

  // Sign in con Google en web vía Google Identity Services (idToken llega por callback del botón oficial)
  const onGoogleCredential = useCallback(async (idToken: string) => {
    setGoogleLoading(true);
    setError("");

    try {
      await signInWithGoogle(idToken);
      // El RootLayout maneja el redirect automáticamente basado en isAuthenticated y requiresAssociation
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Intenta nuevamente");
    } finally {
      setGoogleLoading(false);
    }
  }, [signInWithGoogle]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isGoogleIdentityServicesAvailable) return;
    const node = googleButtonContainerRef.current as unknown as HTMLElement | null;
    if (!node) return;

    renderGoogleButton(node, onGoogleCredential).catch((err) => {
      console.error('No se pudo inicializar Google Identity Services:', err);
    });
  }, [onGoogleCredential]);

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
    <ThemedView style={[styles.formSection, { paddingHorizontal: horizontalPadding }]}>
      <Image
        source={require('@/assets/images/logoItalo.png')}
        style={[styles.logo, { width: logoSize, height: logoSize }]}
        resizeMode="contain"
        accessibilityLabel="Logo Italo"
      />
      <ThemedText style={styles.title}>Inicio de Sesión</ThemedText>
      <View style={[styles.loginForm, { maxWidth: webFormMaxWidth }]}>
        <InputWithIcon
          placeholder="Usuario"
          value={user}
          onChangeText={handleUserChange}
          accessibilityLabel="Campo usuario"
          textContentType="username"
          autoComplete="username"
          hasError={!!error && !user.trim()}
          variant="glass"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passRef.current?.focus()}
        />
        <InputWithIcon
          ref={passRef}
          placeholder="Contraseña"
          value={pass}
          onChangeText={handlePassChange}
          secureTextEntry={!showPassword}
          onToggleSecure={() => setShowPassword(!showPassword)}
          accessibilityLabel="Campo contraseña"
          returnKeyType="done"
          textContentType="password"
          autoComplete="password"
          hasError={!!error && !pass.trim()}
          variant="glass"
          onSubmitEditing={onSubmit}
        />
        {errorContent}
        <Pressable
          style={[styles.loginButton, glassStyles.button]}
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

        {Platform.OS !== 'web' && isGoogleSignInAvailable && (
          <Pressable
            style={[styles.loginButton, styles.googleButton]}
            onPress={onGoogleSignIn}
            disabled={googleLoading}
            accessibilityRole="button"
            accessibilityLabel="Botón continuar con Google"
            android_ripple={{ color: colors.lightTint }}
          >
            <View style={{ marginRight: 8 }}>
              <GoogleLogo size={20} />
            </View>
            <ThemedText style={[styles.loginButtonText, { color: glassColors.text }]}>
              {googleLoading ? "Ingresando..." : "Continuar con Google"}
            </ThemedText>
          </Pressable>
        )}

        {Platform.OS === 'web' && isGoogleIdentityServicesAvailable && (
          <View ref={googleButtonContainerRef} style={styles.googleButtonWebContainer} />
        )}

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
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  formSection: {
    backgroundColor: 'transparent',
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
  },
  logo: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: glassColors.text,
    marginBottom: 24,
  },
  loginForm: {
    width: '100%',
    maxWidth: 340,
    gap: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 32,
    borderRadius: 18,
    overflow: 'hidden',
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  googleButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: glassColors.text,
    backgroundColor: 'transparent',
  },
  googleButtonWebContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  loginCardText: {
    color: colors.componentBackground,
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(244,67,54,0.08)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: glassColors.error,
  },
  errorText: {
    color: glassColors.error,
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
    color: glassColors.textMuted,
  },
  signupLink: {
    fontSize: 14,
    color: glassColors.link,
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
    color: glassColors.link,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});