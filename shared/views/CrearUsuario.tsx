import { InputWithIcon } from '@/components/InputWithIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useRegisterUser } from '@/features/auth/hooks/useAuthActions';
import { CreateUserData } from '@/features/auth/types';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

const colors = Colors['light'];

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

  // Dynamic button styles
  const buttonBg = loading ? colors.lightTint : isFormComplete ? colors.lightTint : colors.background;
  const buttonColor = loading || isFormComplete ? colors.componentBackground : colors.secondaryText;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.formSection}>
          <ThemedText style={styles.title}>Crear Usuario</ThemedText>
          <ThemedText style={styles.subtitle}>Completá tus datos para registrarte</ThemedText>

          {successMessage ? (
            <View style={styles.successContainer}>
              <ThemedText style={styles.successText}>{successMessage}</ThemedText>
            </View>
          ) : null}

          <ThemedView style={styles.formContainer}>
            <InputWithIcon
              icon="📝"
              placeholder="Nombre"
              value={formData.nombre}
              onChangeText={(v) => handleInputChange('nombre', v)}
              hasError={!!errors.nombre}
              textContentType="givenName"
            />
            {errors.nombre ? <ThemedText style={styles.errorText}>{errors.nombre}</ThemedText> : null}

            <InputWithIcon
              icon="📝"
              placeholder="Apellido"
              value={formData.apellido}
              onChangeText={(v) => handleInputChange('apellido', v)}
              hasError={!!errors.apellido}
              textContentType="familyName"
            />
            {errors.apellido ? <ThemedText style={styles.errorText}>{errors.apellido}</ThemedText> : null}

            <InputWithIcon
              icon="👤"
              placeholder="Usuario"
              value={formData.username}
              onChangeText={(v) => handleInputChange('username', v)}
              hasError={!!errors.username}
              textContentType="username"
            />
            {errors.username ? <ThemedText style={styles.errorText}>{errors.username}</ThemedText> : null}

            <InputWithIcon
              icon="✉️"
              placeholder="Email"
              value={formData.email}
              onChangeText={(v) => handleInputChange('email', v)}
              hasError={!!errors.email}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            {errors.email ? <ThemedText style={styles.errorText}>{errors.email}</ThemedText> : null}

            <InputWithIcon
              icon="🔒"
              placeholder="Contraseña"
              value={formData.password}
              onChangeText={(v) => handleInputChange('password', v)}
              secureTextEntry={!showPassword}
              onToggleSecure={() => setShowPassword(!showPassword)}
              hasError={!!errors.password}
              textContentType="newPassword"
            />
            {errors.password ? <ThemedText style={styles.errorText}>{errors.password}</ThemedText> : null}

            <InputWithIcon
              icon="🔒"
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
            />
            {errors.confirmPassword ? <ThemedText style={styles.errorText}>{errors.confirmPassword}</ThemedText> : null}

            <Pressable
              style={[styles.button, { backgroundColor: buttonBg }]}
              onPress={handleSubmit}
              disabled={!isFormComplete || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.componentBackground} style={{ marginRight: 8 }} />
              ) : (
                <Feather name="user-plus" size={20} color={buttonColor} style={{ marginRight: 8 }} />
              )}
              <ThemedText style={[styles.buttonText, { color: buttonColor }]}>
                {loading ? 'Creando...' : 'Crear Usuario'}
              </ThemedText>
            </Pressable>
          </ThemedView>

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
    backgroundColor: colors.componentBackground,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  formSection: {
    backgroundColor: 'transparent',
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
    marginBottom: 24,
  },
  formContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.componentBackground,
    borderRadius: 16,
    padding: 24,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  successContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    width: '100%',
    maxWidth: 380,
  },
  successText: {
    color: '#155724',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: -4,
    marginBottom: 2,
    marginLeft: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
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
    color: colors.secondaryText,
  },
  linkText: {
    fontSize: 14,
    color: colors.tint,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
