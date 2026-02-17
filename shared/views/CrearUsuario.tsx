import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useRegisterUser } from '@/features/auth/hooks/useAuthActions';
import { CreateUserData } from '@/features/auth/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';

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
  telefono?: string;
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
  const isFormComplete = (): boolean => {
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
  };

  // Manejar envío
  const handleSubmit = async () => {
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

        // Redirigir al login después de 1.5 segundos
        setTimeout(() => {
          router.replace('/login');
        }, 1500);
      } else {
        Alert.alert('Error', response.message || 'Error al crear el usuario');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 40, backgroundColor: Colors.light.componentBackground, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText type="title" style={{ marginBottom: 30, textAlign: 'center' }}>
          Crear Usuario
        </ThemedText>

      {successMessage ? (
        <View style={{ marginBottom: 20, padding: 12, backgroundColor: '#d4edda', borderRadius: 8 }}>
          <ThemedText style={{ color: '#155724', textAlign: 'center' }}>
            {successMessage}
          </ThemedText>
        </View>
      ) : null}

      {/* Username */}
      <View style={{ marginBottom: 16 }}>
        <TextInput
          placeholder="Tu nombre de usuario"
          placeholderTextColor={Colors.light.secondaryText}
          value={formData.username}
          onChangeText={(value) => handleInputChange('username', value)}
          editable={!loading}
          style={{
            borderWidth: 1,
            borderColor: errors.username ? '#dc3545' : Colors.light.secondaryText,
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
          }}
        />
        {errors.username && (
          <ThemedText style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
            {errors.username}
          </ThemedText>
        )}
      </View>

      {/* Email */}
      <View style={{ marginBottom: 16 }}>
        <TextInput
          placeholder="tu@email.com"
          placeholderTextColor={Colors.light.secondaryText}
          value={formData.email}
          onChangeText={(value) => handleInputChange('email', value)}
          keyboardType="email-address"
          editable={!loading}
          style={{
            borderWidth: 1,
            borderColor: errors.email ? '#dc3545' : Colors.light.secondaryText,
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
          }}
        />
        {errors.email && (
          <ThemedText style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
            {errors.email}
          </ThemedText>
        )}
      </View>

      {/* Password */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
          <TextInput
            placeholder="Tu contraseña"
            placeholderTextColor={Colors.light.secondaryText}
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            secureTextEntry={!showPassword}
            editable={!loading}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: errors.password ? '#dc3545' : Colors.light.secondaryText,
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              paddingRight: 40,
              fontSize: 14,
            }}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: 12 }}
          >
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
        {errors.password && (
          <ThemedText style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
            {errors.password}
          </ThemedText>
        )}
      </View>

      {/* Confirm Password */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
          <TextInput
            placeholder="Confirma tu contraseña"
            placeholderTextColor={Colors.light.secondaryText}
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              const error = validateConfirmPassword(value);
              setErrors(prev => ({
                ...prev,
                confirmPassword: error,
              }));
            }}
            secureTextEntry={!showPassword}
            editable={!loading}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: errors.confirmPassword ? '#dc3545' : Colors.light.secondaryText,
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              paddingRight: 40,
              fontSize: 14,
            }}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: 12 }}
          >
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && (
          <ThemedText style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
            {errors.confirmPassword}
          </ThemedText>
        )}
      </View>

      {/* Nombre */}
      <View style={{ marginBottom: 16 }}>
        <TextInput
          placeholder="Tu nombre"
          placeholderTextColor={Colors.light.secondaryText}
          value={formData.nombre}
          onChangeText={(value) => handleInputChange('nombre', value)}
          editable={!loading}
          style={{
            borderWidth: 1,
            borderColor: errors.nombre ? '#dc3545' : Colors.light.secondaryText,
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
          }}
        />
        {errors.nombre && (
          <ThemedText style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
            {errors.nombre}
          </ThemedText>
        )}
      </View>

      {/* Apellido */}
      <View style={{ marginBottom: 16 }}>
        <TextInput
          placeholder="Tu apellido"
          placeholderTextColor={Colors.light.secondaryText}
          value={formData.apellido}
          onChangeText={(value) => handleInputChange('apellido', value)}
          editable={!loading}
          style={{
            borderWidth: 1,
            borderColor: errors.apellido ? '#dc3545' : Colors.light.secondaryText,
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: Colors.light.text,
          }}
        />
        {errors.apellido && (
          <ThemedText style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
            {errors.apellido}
          </ThemedText>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={!isFormComplete() || loading}
        style={{
          backgroundColor: isFormComplete() && !loading ? '#007AFF' : '#cccccc',
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12,
          flexDirection: 'row',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <>
            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
            <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Creando usuario...
            </ThemedText>
          </>
        ) : (
          <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            Crear Usuario
          </ThemedText>
        )}
      </TouchableOpacity>

      {/* Volver al Login */}
      <TouchableOpacity
        onPress={() => router.replace('/login')}
        disabled={loading}
      >
        <ThemedText style={{ color: '#007AFF', textAlign: 'center', fontSize: 14 }}>
          Volver al Login
        </ThemedText>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
