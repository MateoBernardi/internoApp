import { InputWithIcon } from '@/components/InputWithIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useUpdatePassword, useUpdateUserData } from '@/shared/users/useUser';
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

const colors = Colors['light'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,}$/;

type ValidationErrors = {
  username?: string;
  email?: string;
  oldPassword?: string;
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

  // Form state - Password (old + new + confirm)
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
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
        if (!USERNAME_REGEX.test(value)) return 'Solo letras, números, guiones y guiones bajos';
        return '';
      case 'email':
        if (!value.trim()) return 'El email es requerido';
        if (!EMAIL_REGEX.test(value)) return 'El email debe ser válido';
        return '';
      default:
        return '';
    }
  };

  // Validate password field
  const validatePasswordField = (field: 'oldPassword' | 'newPassword' | 'confirmPassword', value: string): string => {
    switch (field) {
      case 'oldPassword':
        if (!value.trim()) return 'La contraseña actual es requerida';
        return '';
      case 'newPassword':
        if (!value.trim()) return 'La nueva contraseña es requerida';
        if (value.length < 8) return 'Debe tener al menos 8 caracteres';
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
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // Handle password field change
  const handlePasswordChange = (field: 'oldPassword' | 'newPassword' | 'confirmPassword', value: string) => {
    if (field === 'oldPassword') setOldPassword(value);
    else if (field === 'newPassword') setNewPassword(value);
    else setConfirmPassword(value);

    const error = validatePasswordField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
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
      oldPassword.trim() !== '' &&
      newPassword.trim() !== '' &&
      confirmPassword.trim() !== '' &&
      !validatePasswordField('oldPassword', oldPassword) &&
      !validatePasswordField('newPassword', newPassword) &&
      !validatePasswordField('confirmPassword', confirmPassword)
    );
  }, [oldPassword, newPassword, confirmPassword]);

  // Submit user data
  const handleSubmitUserData = useCallback(async () => {
    if (!isUserDataFormValid) {
      Alert.alert('Error', 'Por favor, corrija los errores en el formulario');
      return;
    }

    try {
      setSuccessMessage('');
      await updateUserMutation.mutateAsync({ username, email });
      setSuccessMessage('Datos actualizados exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Intenta nuevamente');
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
      await updatePasswordMutation.mutateAsync({ oldPassword, newPassword });
      setSuccessPasswordMessage('Contraseña actualizada exitosamente');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessPasswordMessage(''), 3000);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Intenta nuevamente');
    }
  }, [isPasswordFormValid, oldPassword, newPassword, updatePasswordMutation]);

  if (!user) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.lightTint} />
      </ThemedView>
    );
  }

  // Dynamic button styles - user data
  const userBtnBg = updateUserMutation.isPending ? colors.lightTint : isUserDataFormValid ? colors.lightTint : colors.background;
  const userBtnColor = updateUserMutation.isPending || isUserDataFormValid ? colors.componentBackground : colors.secondaryText;

  // Dynamic button styles - password
  const passBtnBg = updatePasswordMutation.isPending ? colors.lightTint : isPasswordFormValid ? colors.lightTint : colors.background;
  const passBtnColor = updatePasswordMutation.isPending || isPasswordFormValid ? colors.componentBackground : colors.secondaryText;

  return (
    <>
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
            <ThemedText style={styles.title}>Editar Perfil</ThemedText>
            <ThemedText style={styles.subtitle}>Modificá tus datos de cuenta</ThemedText>

            {/* Section 1: Account data */}
            <ThemedView style={styles.formContainer}>
              <ThemedText style={styles.sectionTitle}>Datos de la Cuenta</ThemedText>

              {/* Read-only: Nombre */}
              <View style={styles.readonlyField}>
                <ThemedText style={styles.readonlyLabel}>Nombre</ThemedText>
                <View style={styles.readonlyValue}>
                  <ThemedText style={styles.readonlyText}>{user.nombre}</ThemedText>
                </View>
              </View>

              {/* Read-only: Apellido */}
              <View style={styles.readonlyField}>
                <ThemedText style={styles.readonlyLabel}>Apellido</ThemedText>
                <View style={styles.readonlyValue}>
                  <ThemedText style={styles.readonlyText}>{user.apellido}</ThemedText>
                </View>
              </View>

              {!isEditingUserData ? (
                <Pressable
                  style={[styles.button, { backgroundColor: colors.lightTint }]}
                  onPress={() => setIsEditingUserData(true)}
                >
                  <Feather name="edit-2" size={18} color={colors.componentBackground} style={{ marginRight: 8 }} />
                  <ThemedText style={[styles.buttonText, { color: colors.componentBackground }]}>
                    Editar Usuario y Email
                  </ThemedText>
                </Pressable>
              ) : (
                <>
                  {successMessage ? (
                    <View style={styles.successContainer}>
                      <ThemedText style={styles.successText}>{successMessage}</ThemedText>
                    </View>
                  ) : null}

                  <InputWithIcon
                    icon="👤"
                    placeholder={user.username}
                    value={username}
                    onChangeText={(v) => handleUserDataChange('username', v)}
                    hasError={!!errors.username}
                    textContentType="username"
                  />
                  {errors.username ? <ThemedText style={styles.errorText}>{errors.username}</ThemedText> : null}

                  <InputWithIcon
                    icon="✉️"
                    placeholder={user.email}
                    value={email}
                    onChangeText={(v) => handleUserDataChange('email', v)}
                    hasError={!!errors.email}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                  />
                  {errors.email ? <ThemedText style={styles.errorText}>{errors.email}</ThemedText> : null}

                  <View style={styles.buttonGroup}>
                    <Pressable
                      style={[styles.button, styles.buttonFlex, { backgroundColor: userBtnBg }]}
                      onPress={handleSubmitUserData}
                      disabled={!isUserDataFormValid || updateUserMutation.isPending}
                    >
                      {updateUserMutation.isPending ? (
                        <ActivityIndicator color={colors.componentBackground} size="small" style={{ marginRight: 8 }} />
                      ) : (
                        <Feather name="save" size={18} color={userBtnColor} style={{ marginRight: 8 }} />
                      )}
                      <ThemedText style={[styles.buttonText, { color: userBtnColor }]}>
                        {updateUserMutation.isPending ? 'Guardando...' : 'Guardar'}
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      style={[styles.buttonSecondary, styles.buttonFlex]}
                      onPress={() => {
                        setIsEditingUserData(false);
                        setUsername(user?.username || '');
                        setEmail(user?.email || '');
                        setErrors({});
                      }}
                    >
                      <ThemedText style={styles.buttonTextSecondary}>Cancelar</ThemedText>
                    </Pressable>
                  </View>
                </>
              )}
            </ThemedView>

            {/* Section 2: Change password */}
            <ThemedView style={[styles.formContainer, { marginTop: 20 }]}>
              <ThemedText style={styles.sectionTitle}>Cambiar Contraseña</ThemedText>

              {successPasswordMessage ? (
                <View style={styles.successContainer}>
                  <ThemedText style={styles.successText}>{successPasswordMessage}</ThemedText>
                </View>
              ) : null}

              <InputWithIcon
                icon="🔒"
                placeholder="Contraseña actual"
                value={oldPassword}
                onChangeText={(v) => handlePasswordChange('oldPassword', v)}
                secureTextEntry={!showOldPassword}
                onToggleSecure={() => setShowOldPassword(!showOldPassword)}
                hasError={!!errors.oldPassword}
                textContentType="password"
              />
              {errors.oldPassword ? <ThemedText style={styles.errorText}>{errors.oldPassword}</ThemedText> : null}

              <InputWithIcon
                icon="🔒"
                placeholder="Nueva contraseña"
                value={newPassword}
                onChangeText={(v) => handlePasswordChange('newPassword', v)}
                secureTextEntry={!showNewPassword}
                onToggleSecure={() => setShowNewPassword(!showNewPassword)}
                hasError={!!errors.newPassword}
                textContentType="newPassword"
              />
              {errors.newPassword ? <ThemedText style={styles.errorText}>{errors.newPassword}</ThemedText> : null}

              <InputWithIcon
                icon="🔒"
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={(v) => handlePasswordChange('confirmPassword', v)}
                secureTextEntry={!showConfirmPassword}
                onToggleSecure={() => setShowConfirmPassword(!showConfirmPassword)}
                hasError={!!errors.confirmPassword}
                textContentType="newPassword"
              />
              {errors.confirmPassword ? <ThemedText style={styles.errorText}>{errors.confirmPassword}</ThemedText> : null}

              <Pressable
                style={[styles.button, { backgroundColor: passBtnBg }]}
                onPress={handleSubmitPassword}
                disabled={!isPasswordFormValid || updatePasswordMutation.isPending}
              >
                {updatePasswordMutation.isPending ? (
                  <ActivityIndicator color={colors.componentBackground} size="small" style={{ marginRight: 8 }} />
                ) : (
                  <Feather name="lock" size={18} color={passBtnColor} style={{ marginRight: 8 }} />
                )}
                <ThemedText style={[styles.buttonText, { color: passBtnColor }]}>
                  {updatePasswordMutation.isPending ? 'Actualizando...' : 'Actualizar Contraseña'}
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
      <OperacionPendienteModal visible={updateUserMutation.isPending || updatePasswordMutation.isPending} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: '5%',
    paddingVertical: '4%',
  },
  formSection: {
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  formContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.componentBackground,
    borderRadius: 16,
    padding: '6%',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  readonlyField: {
    marginBottom: 4,
  },
  readonlyLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondaryText,
    marginBottom: 4,
  },
  readonlyValue: {
    borderWidth: 1,
    borderColor: '#e0e3e7',
    borderRadius: 12,
    paddingHorizontal: '3%',
    paddingVertical: '2.5%',
    backgroundColor: colors.background,
  },
  readonlyText: {
    fontSize: 14,
    color: colors.text,
  },
  successContainer: {
    padding: '3%',
    backgroundColor: '#d4edda',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
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
    marginTop: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  buttonText: {
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
    marginTop: 8,
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
  },
  buttonFlex: {
    flex: 1,
  },
});
