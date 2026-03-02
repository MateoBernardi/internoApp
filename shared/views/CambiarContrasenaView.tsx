import { InputWithIcon } from '@/components/InputWithIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  changePasswordWithToken,
  generatePasswordToken,
  validatePasswordToken,
} from '../users/userApi';

const colors = Colors['light'];

type Step = 'email' | 'token' | 'password' | 'success';

interface CambiarContrasenaViewProps {
  onSuccess?: () => void;
}

export const CambiarContrasenaView: React.FC<CambiarContrasenaViewProps> = ({ onSuccess }) => {
  // Estados del flujo
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
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

    isProcessingRef.current = true;
    setLoading(true);
    setError('');
    Keyboard.dismiss();

    try {
      await generatePasswordToken(email.trim());
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

    isProcessingRef.current = true;
    setLoading(true);
    setError('');
    Keyboard.dismiss();

    try {
      const response = await validatePasswordToken(email.trim(), token.trim());
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
  }, [email, token, isTokenValid]);

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
      setToken('');
      setError('');
    } else if (currentStep === 'password') {
      // El token ya fue consumido al validarse, hay que reiniciar todo el flujo
      setCurrentStep('email');
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
        <Feather name="alert-circle" size={16} color={colors.error} style={{ marginRight: 8 }} />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }, [error]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <ThemedView style={styles.formSection}>
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
          <ThemedView style={styles.formContainer}>
            <InputWithIcon
              icon="✉️"
              placeholder="tu@email.com"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              textContentType="emailAddress"
              hasError={!!error && !isEmailValid}
            />
            {errorContent}
            <Pressable
              style={[styles.button, !isEmailValid && styles.buttonDisabled, loading && styles.buttonLoading]}
              onPress={handleGenerateToken}
              disabled={!isEmailValid || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.lightTint} />
              ) : (
                <>
                  <Feather name="send" size={18} color={colors.componentBackground} style={{ marginRight: 8 }} />
                  <ThemedText style={styles.buttonText}>Enviar Token</ThemedText>
                </>
              )}
            </Pressable>
          </ThemedView>
        )}

        {/* Paso 2: Token */}
        {currentStep === 'token' && (
          <ThemedView style={styles.formContainer}>
            <InputWithIcon
              icon="🔐"
              placeholder="Ingresa el token"
              value={token}
              onChangeText={handleTokenChange}
              hasError={!!error && !isTokenValid}
            />
            {errorContent}
            <View style={styles.buttonGroup}>
              <Pressable
                style={[styles.button, styles.buttonFlex, !isTokenValid && styles.buttonDisabled, loading && styles.buttonLoading]}
                onPress={handleValidateToken}
                disabled={!isTokenValid || loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.lightTint} />
                ) : (
                  <>
                    <Feather name="check" size={18} color={colors.componentBackground} style={{ marginRight: 8 }} />
                    <ThemedText style={styles.buttonText}>Validar</ThemedText>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.buttonSecondary, styles.buttonFlex]}
                onPress={handleGoBack}
                disabled={loading}
              >
                <Feather name="arrow-left" size={18} color={colors.tint} style={{ marginRight: 8 }} />
                <ThemedText style={styles.buttonTextSecondary}>Atrás</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}

        {/* Paso 3: Nueva Contraseña */}
        {currentStep === 'password' && (
          <ThemedView style={styles.formContainer}>
            <InputWithIcon
              icon="🔒"
              placeholder="Nueva contraseña (8+ caracteres)"
              value={newPassword}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
              hasError={!!error && newPassword.length > 0 && newPassword.length < 8}
            />
            <Pressable
              style={styles.togglePassword}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.tint} />
            </Pressable>

            <InputWithIcon
              icon="🔒"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry={!showConfirmPassword}
              hasError={!!error && confirmPassword.length > 0 && newPassword !== confirmPassword}
            />
            <Pressable
              style={styles.togglePassword}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color={colors.tint} />
            </Pressable>

            {newPassword.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={[styles.strengthBar, { width: newPassword.length >= 8 ? '100%' : `${(newPassword.length / 8) * 100}%` }]} />
              </View>
            )}

            {errorContent}

            <View style={styles.buttonGroup}>
              <Pressable
                style={[styles.button, styles.buttonFlex, !isPasswordValid && styles.buttonDisabled, loading && styles.buttonLoading]}
                onPress={handleChangePassword}
                disabled={!isPasswordValid || loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.lightTint} />
                ) : (
                  <>
                    <Feather name="save" size={18} color={colors.componentBackground} style={{ marginRight: 8 }} />
                    <ThemedText style={styles.buttonText}>Cambiar</ThemedText>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.buttonSecondary, styles.buttonFlex]}
                onPress={handleGoBack}
                disabled={loading}
              >
                <Feather name="arrow-left" size={18} color={colors.tint} style={{ marginRight: 8 }} />
                <ThemedText style={styles.buttonTextSecondary}>Atrás</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}

        {/* Paso 4: Success */}
        {currentStep === 'success' && (
          <ThemedView style={styles.formContainer}>
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <Feather name="check-circle" size={64} color={colors.success} />
              </View>
              <ThemedText style={styles.successTitle}>¡Éxito!</ThemedText>
              <ThemedText style={styles.successMessage}>
                Tu contraseña ha sido cambiada correctamente.
              </ThemedText>
            </View>

            <Pressable
              style={styles.button}
              onPress={handleBackToLogin}
            >
              <Feather name="log-in" size={18} color={colors.componentBackground} style={{ marginRight: 8 }} />
              <ThemedText style={styles.buttonText}>Volver a Ingresar</ThemedText>
            </Pressable>
          </ThemedView>
        )}
      </ThemedView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  formSection: {
    backgroundColor: 'transparent',
  },
  headerContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
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
  errorContainer: {
    backgroundColor: '#fee',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lightTint,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: colors.secondaryText,
    opacity: 0.5,
  },
  buttonLoading: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.componentBackground,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderColor: colors.tint,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  buttonTextSecondary: {
    color: colors.tint,
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
  togglePassword: {
    position: 'absolute',
    right: 40,
    top: 0,
    height: '100%',
    justifyContent: 'center',
  },
  passwordStrengthContainer: {
    height: 4,
    backgroundColor: colors.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    backgroundColor: colors.success,
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
    color: colors.text,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
