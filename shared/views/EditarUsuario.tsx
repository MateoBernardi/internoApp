import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useUpdatePassword, useUpdateUserData } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,}$/;

type ValidationErrors = {
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export default function EditarUsuario() {
  const { user } = useAuth();
  const updateUserMutation = useUpdateUserData();
  const updatePasswordMutation = useUpdatePassword();

  // Form state - User Data
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEditingUserData, setIsEditingUserData] = useState(false);

  // Form state - Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation and UI state
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [successPasswordMessage, setSuccessPasswordMessage] = useState('');

  // Validate user data field
  const validateUserDataField = (field: 'username' | 'email', value: string): string => {
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

      default:
        return '';
    }
  };

  // Validate password field
  const validatePasswordField = (field: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string): string => {
    switch (field) {
      case 'currentPassword':
        if (!value.trim()) return 'La contraseña actual es requerida';
        return '';

      case 'newPassword':
        if (!value.trim()) return 'La nueva contraseña es requerida';
        if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
        return '';

      case 'confirmPassword':
        if (!value.trim()) return 'Debes confirmar la contraseña';
        if (value !== newPassword) return 'Las contraseñas no coinciden';
        return '';

      default:
        return '';
    }
  };

  // Handle user data field change
  const handleUserDataChange = (field: 'username' | 'email', value: string) => {
    if (field === 'username') setUsername(value);
    else setEmail(value);

    const error = validateUserDataField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error,
    }));
  };

  // Handle password field change
  const handlePasswordChange = (field: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string) => {
    if (field === 'currentPassword') setCurrentPassword(value);
    else if (field === 'newPassword') setNewPassword(value);
    else setConfirmPassword(value);

    const error = validatePasswordField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error,
    }));
  };

  // Check if user data form is valid
  const isUserDataFormValid = useMemo(() => {
    return (
      username.trim() !== '' &&
      email.trim() !== '' &&
      !validateUserDataField('username', username) &&
      !validateUserDataField('email', email)
    );
  }, [username, email]);

  // Check if password form is valid
  const isPasswordFormValid = useMemo(() => {
    return (
      currentPassword.trim() !== '' &&
      newPassword.trim() !== '' &&
      confirmPassword.trim() !== '' &&
      !validatePasswordField('currentPassword', currentPassword) &&
      !validatePasswordField('newPassword', newPassword) &&
      !validatePasswordField('confirmPassword', confirmPassword)
    );
  }, [currentPassword, newPassword, confirmPassword]);

  // Submit user data
  const handleSubmitUserData = useCallback(async () => {
    if (!isUserDataFormValid) {
      Alert.alert('Error', 'Por favor, corrija los errores en el formulario');
      return;
    }

    try {
      setSuccessMessage('');
      await updateUserMutation.mutateAsync({
        username,
        email,
      });
      setSuccessMessage('Datos actualizados exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al actualizar datos');
    }
  }, [isUserDataFormValid, username, email, updateUserMutation]);

  // Submit password
  const handleSubmitPassword = useCallback(async () => {
    if (!isPasswordFormValid) {
      Alert.alert('Error', 'Por favor, corrija los errores en el formulario');
      return;
    }

    try {
      setSuccessPasswordMessage('');
      // Nota: El servicio no valida la contraseña actual en este caso
      // Si necesitas validarla, debes implementarla en el backend
      await updatePasswordMutation.mutateAsync({ oldPassword: currentPassword, newPassword });
      setSuccessPasswordMessage('Contraseña actualizada exitosamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessPasswordMessage(''), 3000);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al actualizar contraseña');
    }
  }, [isPasswordFormValid, newPassword, updatePasswordMutation]);

  if (!user) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={{ flex: 1, backgroundColor: '#ffffff' }} 
        contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText type="title" style={{ fontSize: 18, fontWeight: '500', color: 'black', textAlign: 'center', marginBottom: 20 }}>
          Editar Perfil
        </ThemedText>

      {/* SECTION 1: Ver datos del usuario */}
      <ThemedView style={{ marginBottom: 30, padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
        <ThemedText type="subtitle" style={{ marginBottom: 16, fontWeight: '600', color: 'black' }}>
          Datos de la Cuenta
        </ThemedText>

        {/* Nombre (readonly) */}
        <View style={{ marginBottom: 12 }}>
          <ThemedText style={{ marginBottom: 6, fontSize: 12, fontWeight: '500', color: '#666' }}>
            Nombre
          </ThemedText>
          <View style={{
            borderWidth: 1,
            borderColor: '#e0e0e0',
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: '#f5f5f5',
          }}>
            <ThemedText style={{ fontSize: 14 }}>
              {user.nombre}
            </ThemedText>
          </View>
        </View>

        {/* Apellido (readonly) */}
        <View style={{ marginBottom: 16 }}>
          <ThemedText style={{ marginBottom: 6, fontSize: 12, fontWeight: '500', color: '#666' }}>
            Apellido
          </ThemedText>
          <View style={{
            borderWidth: 1,
            borderColor: '#e0e0e0',
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: '#f5f5f5',
          }}>
            <ThemedText style={{ fontSize: 14 }}>
              {user.apellido}
            </ThemedText>
          </View>
        </View>

        {!isEditingUserData ? (
          <TouchableOpacity
            onPress={() => setIsEditingUserData(true)}
            style={{
              backgroundColor: '#007AFF',
              paddingVertical: 10,
              borderRadius: 6,
              alignItems: 'center',
            }}
          >
            <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
              Editar Usuario y Email
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <>
            {successMessage ? (
              <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#d4edda', borderRadius: 6 }}>
                <ThemedText style={{ color: '#155724', fontSize: 12, textAlign: 'center' }}>
                  {successMessage}
                </ThemedText>
              </View>
            ) : null}

            {/* Username */}
            <View style={{ marginBottom: 12 }}>
              <TextInput
                placeholder={user.username}
                value={username}
                onChangeText={(value) => handleUserDataChange('username', value)}
                style={{
                  borderWidth: 1,
                  borderColor: errors.username ? '#dc3545' : '#ccc',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                }}
              />
              {errors.username && (
                <ThemedText style={{ color: '#dc3545', fontSize: 11, marginTop: 4 }}>
                  {errors.username}
                </ThemedText>
              )}
            </View>

            {/* Email */}
            <View style={{ marginBottom: 16 }}>
              <TextInput
                placeholder={user.email}
                value={email}
                onChangeText={(value) => handleUserDataChange('email', value)}
                keyboardType="email-address"
                style={{
                  borderWidth: 1,
                  borderColor: errors.email ? '#dc3545' : '#ccc',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                }}
              />
              {errors.email && (
                <ThemedText style={{ color: '#dc3545', fontSize: 11, marginTop: 4 }}>
                  {errors.email}
                </ThemedText>
              )}
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={handleSubmitUserData}
                disabled={!isUserDataFormValid || updateUserMutation.isPending}
                style={{
                  flex: 1,
                  backgroundColor: isUserDataFormValid ? '#28a745' : '#ccc',
                  paddingVertical: 10,
                  borderRadius: 6,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
              >
                {updateUserMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                ) : null}
                <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                  {updateUserMutation.isPending ? 'Guardando...' : 'Guardar'}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setIsEditingUserData(false);
                  setUsername('');
                  setEmail('');
                  setErrors({});
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#6c757d',
                  paddingVertical: 10,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                  Cancelar
                </ThemedText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ThemedView>

      {/* SECTION 2: Cambiar contraseña */}
      <ThemedView style={{ padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
        <ThemedText type="subtitle" style={{ marginBottom: 16, fontWeight: '600' }}>
          Cambiar Contraseña
        </ThemedText>

        {successPasswordMessage ? (
          <View style={{ marginBottom: 16, padding: 10, backgroundColor: '#d4edda', borderRadius: 6 }}>
            <ThemedText style={{ color: '#155724', fontSize: 12, textAlign: 'center' }}>
              {successPasswordMessage}
            </ThemedText>
          </View>
        ) : null}

        {/* Current Password */}
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
            <TextInput
              placeholder="Tu contraseña actual"
              value={currentPassword}
              onChangeText={(value) => handlePasswordChange('currentPassword', value)}
              secureTextEntry={!showCurrentPassword}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: errors.currentPassword ? '#dc3545' : '#ccc',
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 10,
                paddingRight: 40,
                fontSize: 14,
              }}
            />
            <TouchableOpacity
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              style={{ position: 'absolute', right: 12 }}
            >
              <Ionicons
                name={showCurrentPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {errors.currentPassword && (
            <ThemedText style={{ color: '#dc3545', fontSize: 11, marginTop: 4 }}>
              {errors.currentPassword}
            </ThemedText>
          )}
        </View>

        {/* New Password */}
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
            <TextInput
              placeholder="Tu nueva contraseña"
              value={newPassword}
              onChangeText={(value) => handlePasswordChange('newPassword', value)}
              secureTextEntry={!showNewPassword}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: errors.newPassword ? '#dc3545' : '#ccc',
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 10,
                paddingRight: 40,
                fontSize: 14,
              }}
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={{ position: 'absolute', right: 12 }}
            >
              <Ionicons
                name={showNewPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {errors.newPassword && (
            <ThemedText style={{ color: '#dc3545', fontSize: 11, marginTop: 4 }}>
              {errors.newPassword}
            </ThemedText>
          )}
        </View>

        {/* Confirm Password */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
            <TextInput
              placeholder="Confirma tu nueva contraseña"
              value={confirmPassword}
              onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: errors.confirmPassword ? '#dc3545' : '#ccc',
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 10,
                paddingRight: 40,
                fontSize: 14,
              }}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ position: 'absolute', right: 12 }}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && (
            <ThemedText style={{ color: '#dc3545', fontSize: 11, marginTop: 4 }}>
              {errors.confirmPassword}
            </ThemedText>
          )}
        </View>

        {/* Update Password Button */}
        <TouchableOpacity
          onPress={handleSubmitPassword}
          disabled={!isPasswordFormValid || updatePasswordMutation.isPending}
          style={{
            backgroundColor: isPasswordFormValid ? '#007AFF' : '#ccc',
            paddingVertical: 12,
            borderRadius: 6,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          {updatePasswordMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
          ) : null}
          <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
            {updatePasswordMutation.isPending ? 'Actualizando...' : 'Actualizar Contraseña'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
