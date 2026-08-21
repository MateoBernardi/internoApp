import { InputWithIcon } from '@/components/InputWithIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AuthGradientBackground } from '@/shared/ui/AuthGradientBackground';
import { useAuthFormLayout } from '@/shared/ui/authLayout';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { KEYBOARD_BEHAVIOR } from '@/shared/ui/keyboard';
import {
  changePasswordWithToken,
  generatePasswordToken,
  validatePasswordToken,
} from '../users/userApi';

type Step = 'email' | 'token' | 'password' | 'success';

interface CambiarContrasenaViewProps {
  onSuccess?: () => void;
}

export const CambiarContrasenaView: React.FC<CambiarContrasenaViewProps> = ({ onSuccess }) => {
  const { maxWidth: webFormMaxWidth, horizontalPadding } = useAuthFormLayout();

  // Estados del flujo
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isProcessingRef = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Validaciones
  const isEmailValid = useMemo(() => {
    return email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const isTokenValid = useMemo(() => {
    return token.trim().length > 0;
  }, [token]);

  const isPasswordValid = useMemo(() => {
    return newPassword.length >= 8 && confirmPassword.length >= 8 && newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  // Handlers de cambio
  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    error && setError('');
  }, [error]);

  const handleTokenChange = useCallback((text: string) => {
    setToken(text);
    error && setError('');
  }, [error]);

  const handlePasswordChange = useCallback((text: string) => {
    setNewPassword(text);
    error && setError('');
  }, [error]);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    setConfirmPassword(text);
    error && setError('');
  }, [error]);

  // Paso 1: Generar token
  const handleGenerateToken = useCallback(async () => {
    if (!isEmailValid || isProcessingRef.current) return;

    const normalizedEmail = email.trim();

    isProcessingRef.current = true;
    setLoading(true);
    setError('');
    Keyboard.dismiss();

    try {
      await generatePasswordToken(normalizedEmail);
      setRecoveryEmail(normalizedEmail);
      setCurrentStep('token');
    } catch (err: any) {
      setError(err.message || 'Intenta nuevamente');
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [email, isEmailValid]);

  // Paso 2: Validar token
  const handleValidateToken = useCallback(async () => {
    if (!isTokenValid || isProcessingRef.current) return;

    const emailToValidate = recoveryEmail.trim();
    if (!emailToValidate) {
      setError('Primero debes solicitar el token con tu correo');
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    setError('');
    Keyboard.dismiss();

    try {
      const response = await validatePasswordToken(emailToValidate, token.trim());
      if (response.success && response.accessToken) {
        setAccessToken(response.accessToken);
        setCurrentStep('password');
      } else {
        setError(response.message || 'Intenta nuevamente');
      }
    } catch (err: any) {
      setError(err.message || 'Intenta nuevamente');
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [recoveryEmail, token, isTokenValid]);

  // Paso 3: Cambiar contraseña
  const handleChangePassword = useCallback(async () => {
    if (isProcessingRef.current) return;

    if (!isPasswordValid) {
      if (newPassword.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
      } else if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden');
      } else {
        setError('Por favor completa todos los campos correctamente');
      }
      return;
    }

    if (!accessToken) {
      setError('Error: token de acceso no válido');
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    setError('');
    Keyboard.dismiss();

    try {
      await changePasswordWithToken(accessToken, newPassword.trim());
      setCurrentStep('success');
    } catch (err: any) {
      setError(err.message || 'Intenta nuevamente');
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [newPassword, confirmPassword, accessToken, isPasswordValid]);

  // Volver a paso anterior
  const handleGoBack = useCallback(() => {
    if (currentStep === 'token') {
      setCurrentStep('email');
      setRecoveryEmail('');
      setToken('');
      setError('');
    } else if (currentStep === 'password') {
      // El token ya fue consumido al validarse, hay que reiniciar todo el flujo
      setCurrentStep('email');
      setRecoveryEmail('');
      setToken('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setAccessToken(null);
    }
  }, [currentStep]);

  // Volver a login
  const handleBackToLogin = useCallback(() => {
    router.navigate('/(auth)/login' as any);
  }, []);

  const errorContent = useMemo(() => {
    if (!error) return null;
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={16} color={glassColors.error} style={{ marginRight: 8 }} />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }, [error]);

  // Si está cargando, mostrar skeleton
  if (loading) {
    return <ScreenSkeleton rows={3} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
    <AuthGradientBackground />
    <ScrollView style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingHorizontal: horizontalPadding }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={[styles.formSection, { maxWidth: webFormMaxWidth }]}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <ThemedText style={styles.title}>Recuperar Contraseña</ThemedText>
          <ThemedText style={styles.subtitle}>
            {currentStep === 'email' && 'Ingresa tu email de usuario para recibir un token'}
            {currentStep === 'token' && 'Ingresa el token que recibiste por email'}
            {currentStep === 'password' && 'Crea tu nueva contraseña'}
            {currentStep === 'success' && 'Contraseña cambiada con éxito'}
          </ThemedText>
        </View>

        {/* Paso 1: Email */}
        {currentStep === 'email' && (
          <View style={styles.formContainer}>
            <InputWithIcon
              placeholder="tu@email.com"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              textContentType="emailAddress"
              hasError={!!error && !isEmailValid}
              variant="glass"
              returnKeyType="done"
              onSubmitEditing={handleGenerateToken}
            />
            {errorContent}
            <Pressable
              style={[styles.button, glassStyles.button, !isEmailValid && styles.buttonDisabled, loading && styles.buttonLoading]}
              onPress={handleGenerateToken}
              disabled={!isEmailValid || loading}
            >
              {loading ? (
                <ActivityIndicator color={glassColors.text} />
              ) : (
                <>
                  <Feather name="send" size={18} color={glassColors.text} style={{ marginRight: 8 }} />
                  <ThemedText style={styles.buttonText}>Enviar Token</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Paso 2: Token */}
        {currentStep === 'token' && (
          <View style={styles.formContainer}>
            <InputWithIcon
              placeholder="Ingresa el token"
              value={token}
              onChangeText={handleTokenChange}
              hasError={!!error && !isTokenValid}
              variant="glass"
              returnKeyType="done"
              onSubmitEditing={handleValidateToken}
            />
            {errorContent}
            <View style={styles.buttonGroup}>
              <Pressable
                style={[styles.buttonSecondary, glassStyles.buttonSecondary, styles.buttonFlex]}
                onPress={handleGoBack}
                disabled={loading}
              >
                <Feather name="arrow-left" size={18} color={glassColors.text} style={{ marginRight: 8 }} />
                <ThemedText style={styles.buttonTextSecondary}>Atrás</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.button, glassStyles.button, styles.buttonFlex, !isTokenValid && styles.buttonDisabled, loading && styles.buttonLoading]}
                onPress={handleValidateToken}
                disabled={!isTokenValid || loading}
              >
                {loading ? (
                  <ActivityIndicator color={glassColors.text} />
                ) : (
                  <>
                    <Feather name="check" size={18} color={glassColors.text} style={{ marginRight: 8 }} />
                    <ThemedText style={styles.buttonText}>Validar</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Paso 3: Nueva Contraseña */}
        {currentStep === 'password' && (
          <View style={styles.formContainer}>
            <InputWithIcon
              placeholder="Nueva contraseña (8+ caracteres)"
              value={newPassword}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
              onToggleSecure={() => setShowPassword(!showPassword)}
              hasError={!!error && newPassword.length > 0 && newPassword.length < 8}
              variant="glass"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />

            <InputWithIcon
              ref={confirmPasswordRef}
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry={!showConfirmPassword}
              onToggleSecure={() => setShowConfirmPassword(!showConfirmPassword)}
              hasError={!!error && confirmPassword.length > 0 && newPassword !== confirmPassword}
              variant="glass"
              returnKeyType="done"
              onSubmitEditing={handleChangePassword}
            />

            {newPassword.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={[styles.strengthBar, { width: newPassword.length >= 8 ? '100%' : `${(newPassword.length / 8) * 100}%` }]} />
              </View>
            )}

            {errorContent}

            <View style={styles.buttonGroup}>
              <Pressable
                style={[styles.buttonSecondary, glassStyles.buttonSecondary, styles.buttonFlex]}
                onPress={handleGoBack}
                disabled={loading}
              >
                <Feather name="arrow-left" size={18} color={glassColors.text} style={{ marginRight: 8 }} />
                <ThemedText style={styles.buttonTextSecondary}>Atrás</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.button, glassStyles.button, styles.buttonFlex, !isPasswordValid && styles.buttonDisabled, loading && styles.buttonLoading]}
                onPress={handleChangePassword}
                disabled={!isPasswordValid || loading}
              >
                {loading ? (
                  <ActivityIndicator color={glassColors.text} />
                ) : (
                  <>
                    <Feather name="save" size={18} color={glassColors.text} style={{ marginRight: 8 }} />
                    <ThemedText style={styles.buttonText}>Cambiar</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Paso 4: Success */}
        {currentStep === 'success' && (
          <View style={styles.formContainer}>
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <Feather name="check-circle" size={64} color={glassColors.success} />
              </View>
              <ThemedText style={styles.successTitle}>¡Éxito!</ThemedText>
              <ThemedText style={styles.successMessage}>
                Tu contraseña ha sido cambiada correctamente.
              </ThemedText>
            </View>

            <Pressable
              style={[styles.button, glassStyles.button]}
              onPress={handleBackToLogin}
            >
              <Feather name="log-in" size={18} color={glassColors.text} style={{ marginRight: 8 }} />
              <ThemedText style={styles.buttonText}>Volver a Ingresar</ThemedText>
            </Pressable>
          </View>
        )}

        {/* Volver al login (visible en email y token steps) */}
        {(currentStep === 'email' || currentStep === 'token') && (
          <View style={styles.backToLoginContainer}>
            <Pressable onPress={handleBackToLogin}>
              <ThemedText style={styles.backToLoginLink}>Volver al inicio de sesión</ThemedText>
            </Pressable>
          </View>
        )}
      </ThemedView>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  formSection: {
    backgroundColor: 'transparent',
    width: '100%',
  },
  headerContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: glassColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: glassColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    gap: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(244,67,54,0.08)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: glassColors.error,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: glassColors.error,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  button: {
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLoading: {
    opacity: 0.8,
  },
  buttonText: {
    color: glassColors.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonSecondary: {
    minHeight: 48,
  },
  buttonTextSecondary: {
    color: glassColors.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  buttonFlex: {
    flex: 1,
  },
  passwordStrengthContainer: {
    height: 4,
    backgroundColor: 'rgba(17,24,28,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    backgroundColor: glassColors.success,
    borderRadius: 2,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: glassColors.text,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: glassColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  backToLoginContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  backToLoginLink: {
    fontSize: 14,
    color: glassColors.link,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
