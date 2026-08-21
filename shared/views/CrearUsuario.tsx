import { InputWithIcon } from '@/components/InputWithIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRegisterUser } from '@/features/auth/hooks/useAuthActions';
import { CreateUserData } from '@/features/auth/types';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AuthGradientBackground } from '@/shared/ui/AuthGradientBackground';
import { GlassButton } from '@/shared/ui/GlassButton';
import { useAuthFormLayout } from '@/shared/ui/authLayout';
import { glassColors } from '@/shared/ui/glass';
import { KEYBOARD_BEHAVIOR } from '@/shared/ui/keyboard';

// Regex para validaciones
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,}$/;

type ValidationErrors = {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  nombre?: string;
  apellido?: string;
};

export default function CrearUsuario() {
  const router = useRouter();
  const { maxWidth: webFormMaxWidth, horizontalPadding } = useAuthFormLayout();
  const registerMutation = useRegisterUser();

  // Form state
  const [formData, setFormData] = useState<CreateUserData>({
    username: '',
    email: '',
    password: '',
    nombre: '',
    apellido: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const apellidoRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Validar campo individual
  const validateField = (field: keyof CreateUserData, value: string): string => {
    switch (field) {
      case 'username':
        if (!value.trim()) return 'El usuario es requerido';
        if (value.length < 3) return 'El usuario debe tener al menos 3 caracteres';
        if (!USERNAME_REGEX.test(value)) return 'El usuario solo puede contener letras, números, guiones y guiones bajos';
        return '';

      case 'email':
        if (!value.trim()) return 'El email es requerido';
        if (!EMAIL_REGEX.test(value)) return 'El email debe ser válido (ej: user@example.com)';
        return '';

      case 'password':
        if (!value.trim()) return 'La contraseña es requerida';
        if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
        return '';

      case 'nombre':
        if (!value.trim()) return 'El nombre es requerido';
        if (value.length < 2) return 'El nombre debe tener al menos 2 caracteres';
        if (!NAME_REGEX.test(value)) return 'El nombre no puede contener caracteres especiales';
        return '';

      case 'apellido':
        if (!value.trim()) return 'El apellido es requerido';
        if (value.length < 2) return 'El apellido debe tener al menos 2 caracteres';
        if (!NAME_REGEX.test(value)) return 'El apellido no puede contener caracteres especiales';
        return '';

      default:
        return '';
    }
  };

  // Validar confirmación de contraseña
  const validateConfirmPassword = (value: string): string => {
    if (!value.trim()) return 'Debes confirmar la contraseña';
    if (value !== formData.password) return 'Las contraseñas no coinciden';
    return '';
  };

  // Manejar cambios en inputs
  const handleInputChange = (field: keyof CreateUserData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Validar mientras escribe
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error,
    }));
  };

  // Validar todo el formulario
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    const fieldsToValidate: (keyof CreateUserData)[] = ['username', 'email', 'password', 'nombre', 'apellido'];

    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field] || '');
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Verificar si el formulario está completo
  const isFormComplete = useMemo(() => {
    const hasAllFields = (
      formData.username.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.password.trim() !== '' &&
      confirmPassword.trim() !== '' &&
      formData.nombre.trim() !== '' &&
      formData.apellido.trim() !== ''
    );

    const noErrors = !errors.username && !errors.email && !errors.password && 
                     !errors.confirmPassword && !errors.nombre && !errors.apellido;

    const passwordsMatch = confirmPassword === formData.password;

    return hasAllFields && noErrors && passwordsMatch;
  }, [formData, confirmPassword, errors]);

  // Manejar envío
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Por favor, corrija los errores en el formulario');
      return;
    }

    setLoading(true);
    setSuccessMessage('');

    try {
      const response = await registerMutation.mutateAsync(formData);

      if (response.success) {
        setSuccessMessage('Usuario creado exitosamente. Redirigiendo al login...');
        setFormData({
          username: '',
          email: '',
          password: '',
          nombre: '',
          apellido: '',
        });
        setConfirmPassword('');

        setTimeout(() => {
          router.replace('/login');
        }, 1500);
      } else {
        Alert.alert('Error', response.message || 'Intenta nuevamente');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Intenta nuevamente');
    } finally {
      setLoading(false);
    }
  }, [formData, registerMutation, router]);


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <AuthGradientBackground />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.formSection}>
          <ThemedText style={styles.title}>Crear Usuario</ThemedText>
          <ThemedText style={styles.subtitle}>Completá tus datos para registrarte</ThemedText>

          {successMessage ? (
            <View style={[styles.successContainer, { maxWidth: webFormMaxWidth }]}>
              <ThemedText style={styles.successText}>{successMessage}</ThemedText>
            </View>
          ) : null}

          <View style={[styles.formContainer, { maxWidth: webFormMaxWidth }]}>
            <InputWithIcon
              placeholder="Nombre"
              value={formData.nombre}
              onChangeText={(v) => handleInputChange('nombre', v)}
              hasError={!!errors.nombre}
              textContentType="givenName"
              variant="glass"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => apellidoRef.current?.focus()}
            />
            {errors.nombre ? <ThemedText style={styles.errorText}>{errors.nombre}</ThemedText> : null}

            <InputWithIcon
              ref={apellidoRef}
              placeholder="Apellido"
              value={formData.apellido}
              onChangeText={(v) => handleInputChange('apellido', v)}
              hasError={!!errors.apellido}
              textContentType="familyName"
              variant="glass"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => usernameRef.current?.focus()}
            />
            {errors.apellido ? <ThemedText style={styles.errorText}>{errors.apellido}</ThemedText> : null}

            <InputWithIcon
              ref={usernameRef}
              placeholder="Usuario"
              value={formData.username}
              onChangeText={(v) => handleInputChange('username', v)}
              hasError={!!errors.username}
              textContentType="username"
              variant="glass"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            {errors.username ? <ThemedText style={styles.errorText}>{errors.username}</ThemedText> : null}

            <InputWithIcon
              ref={emailRef}
              placeholder="Email"
              value={formData.email}
              onChangeText={(v) => handleInputChange('email', v)}
              hasError={!!errors.email}
              keyboardType="email-address"
              textContentType="emailAddress"
              variant="glass"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            {errors.email ? <ThemedText style={styles.errorText}>{errors.email}</ThemedText> : null}

            <InputWithIcon
              ref={passwordRef}
              placeholder="Contraseña"
              value={formData.password}
              onChangeText={(v) => handleInputChange('password', v)}
              secureTextEntry={!showPassword}
              onToggleSecure={() => setShowPassword(!showPassword)}
              hasError={!!errors.password}
              textContentType="newPassword"
              variant="glass"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />
            {errors.password ? <ThemedText style={styles.errorText}>{errors.password}</ThemedText> : null}

            <InputWithIcon
              ref={confirmPasswordRef}
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                const error = validateConfirmPassword(v);
                setErrors(prev => ({ ...prev, confirmPassword: error }));
              }}
              secureTextEntry={!showConfirmPassword}
              onToggleSecure={() => setShowConfirmPassword(!showConfirmPassword)}
              hasError={!!errors.confirmPassword}
              textContentType="newPassword"
              variant="glass"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {errors.confirmPassword ? <ThemedText style={styles.errorText}>{errors.confirmPassword}</ThemedText> : null}

            <GlassButton
              label="Crear Usuario"
              onPress={handleSubmit}
              disabled={!isFormComplete || loading}
              loading={loading}
              icon={(color) => <Feather name="user-plus" size={20} color={color} />}
              style={styles.button}
            />
          </View>

          <View style={styles.linksContainer}>
            <View style={styles.linkRow}>
              <ThemedText style={styles.linkLabel}>¿Ya tenés cuenta? </ThemedText>
              <Pressable onPress={() => router.replace('/login')}>
                <ThemedText style={styles.linkText}>Iniciar sesión</ThemedText>
              </Pressable>
            </View>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 24,
  },
  formContainer: {
    width: '100%',
    maxWidth: 380,
    gap: 6,
  },
  successContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(46,125,50,0.08)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: glassColors.success,
    width: '100%',
    maxWidth: 380,
  },
  successText: {
    color: glassColors.success,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    color: glassColors.error,
    fontSize: 12,
    marginTop: -4,
    marginBottom: 2,
    marginLeft: 4,
  },
  button: {
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  linksContainer: {
    marginTop: 20,
    gap: 12,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkLabel: {
    fontSize: 14,
    color: glassColors.textMuted,
  },
  linkText: {
    fontSize: 14,
    color: glassColors.link,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
