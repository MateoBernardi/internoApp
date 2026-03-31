import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { confirmAction } from '@/shared/ui/confirmAction';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { RemovePermisosPayload, ResourcePermisos } from '../models/Permisos';

const colors = Colors.light;

type ResourcePermisosModalProps = {
  visible: boolean;
  title: string;
  isLoading: boolean;
  isSubmitting?: boolean;
  data?: ResourcePermisos;
  availableUserIds?: number[];
  userIdByName?: Record<string, number>;
  errorMessage?: string;
  onSubmitRemove?: (payload: RemovePermisosPayload) => void;
  onClose: () => void;
};

export function ResourcePermisosModal({
  visible,
  title,
  isLoading,
  isSubmitting = false,
  data,
  availableUserIds = [],
  userIdByName,
  errorMessage,
  onSubmitRemove,
  onClose,
}: ResourcePermisosModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const canSubmit = !!onSubmitRemove && (selectedRoles.length > 0 || selectedUserIds.length > 0) && !isSubmitting;

  const normalizedUserOptions = useMemo(() => {
    const names = data?.allowed_users || [];
    const backendIds = (data?.user_context_ids || []).filter((id) => Number.isInteger(id) && id > 0);
    const fallbackIds = availableUserIds.filter((id) => Number.isInteger(id) && id > 0);
    const seen = new Set<number>();

    return names
      .map((name, index) => {
        const idFromBackend = backendIds[index];
        const mappedIdFromName = userIdByName?.[name];
        const fallbackByIndex = fallbackIds[index];
        const id = Number.isInteger(idFromBackend) && (idFromBackend as number) > 0
          ? (idFromBackend as number)
          : Number.isInteger(mappedIdFromName) && (mappedIdFromName as number) > 0
          ? (mappedIdFromName as number)
          : fallbackByIndex;

        if (!Number.isInteger(id) || (id as number) <= 0 || seen.has(id as number)) {
          return null;
        }

        seen.add(id as number);
        return {
          id: id as number,
          name,
        };
      })
      .filter((entry): entry is { id: number; name: string } => !!entry);
  }, [availableUserIds, data?.allowed_users, data?.user_context_ids, userIdByName]);

  const hasRemovableUsers = normalizedUserOptions.length > 0;

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]));
  };

  const toggleUserId = (id: number) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleRequestSubmit = async () => {
    if (!onSubmitRemove || isSubmitting) return;

    if (selectedRoles.length === 0 && selectedUserIds.length === 0) {
      Alert.alert('Sin cambios', 'Selecciona al menos un rol o un usuario para quitar permisos.');
      return;
    }

    const confirmed = await confirmAction({
      title: 'Confirmar cambios',
      message: `Se quitaran ${selectedRoles.length} rol(es) y ${selectedUserIds.length} usuario(s).`,
      confirmText: 'Quitar permisos',
      cancelText: 'Cancelar',
      destructive: true,
    });

    if (!confirmed) return;

    onSubmitRemove({
      ...(selectedRoles.length > 0 ? { allowed_roles: selectedRoles } : {}),
      ...(selectedUserIds.length > 0 ? { ids: selectedUserIds } : {}),
    });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedRoles([]);
    setSelectedUserIds([]);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.card}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} disabled={isSubmitting}>
              <Ionicons name="close" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
              <ThemedText style={styles.secondaryText}>Cargando permisos...</ThemedText>
            </View>
          ) : errorMessage ? (
            <View style={styles.loadingContainer}>
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
            </View>
          ) : data ? (
            <View style={styles.bodyContainer}>
              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Permisos actuales</ThemedText>
                </View>

                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Roles permitidos</ThemedText>
                  <ThemedText style={styles.valueText}>
                    {data.allowed_roles.length > 0 ? data.allowed_roles.join(', ') : 'Sin roles asignados'}
                  </ThemedText>
                </View>

                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Usuarios permitidos</ThemedText>
                  <ThemedText style={styles.valueText}>
                    {data.allowed_users.length > 0 ? data.allowed_users.join(', ') : 'Sin usuarios asignados'}
                  </ThemedText>
                </View>

                <View style={styles.sectionDivider} />

                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Quitar permisos</ThemedText>
                  <ThemedText style={styles.secondaryText}>Selecciona roles y usuarios a remover parcialmente.</ThemedText>
                </View>

                <View style={styles.section}>
                  <ThemedText style={styles.subSectionTitle}>Roles a remover</ThemedText>
                  {data.allowed_roles.length > 0 ? (
                    <View style={styles.chipList}>
                      {data.allowed_roles.map((role) => {
                        const isSelected = selectedRoles.includes(role);
                        return (
                          <TouchableOpacity
                            key={role}
                            style={[styles.chip, isSelected && styles.chipSelected]}
                            onPress={() => toggleRole(role)}
                            disabled={isSubmitting}
                          >
                            <Ionicons
                              name={isSelected ? 'checkbox-outline' : 'square-outline'}
                              size={16}
                              color={isSelected ? colors.tint : colors.secondaryText}
                            />
                            <ThemedText style={styles.chipText}>{role}</ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <ThemedText style={styles.secondaryText}>No hay roles disponibles para remover.</ThemedText>
                  )}
                </View>

                <View style={styles.section}>
                  <ThemedText style={styles.subSectionTitle}>Usuarios a remover</ThemedText>
                  {hasRemovableUsers ? (
                    <View style={styles.chipList}>
                      {normalizedUserOptions.map((userOption) => {
                        const isSelected = selectedUserIds.includes(userOption.id);
                        return (
                          <TouchableOpacity
                            key={userOption.id}
                            style={[styles.chip, isSelected && styles.chipSelected]}
                            onPress={() => toggleUserId(userOption.id)}
                            disabled={isSubmitting}
                          >
                            <Ionicons
                              name={isSelected ? 'checkbox-outline' : 'square-outline'}
                              size={16}
                              color={isSelected ? colors.tint : colors.secondaryText}
                            />
                            <ThemedText style={styles.chipText}>{userOption.name}</ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <ThemedText style={styles.secondaryText}>No hay usuarios disponibles para remover.</ThemedText>
                  )}
                </View>
              </ScrollView>

              {onSubmitRemove && (
                <View style={styles.footer}>
                  <TouchableOpacity
                    style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                    onPress={handleRequestSubmit}
                    disabled={!canSubmit}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={colors.componentBackground} />
                    ) : (
                      <ThemedText style={styles.submitButtonText}>Quitar permisos</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ThemedText style={styles.secondaryText}>No hay permisos para mostrar.</ThemedText>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'center',
    paddingHorizontal: '6%',
  },
  card: {
    backgroundColor: colors.componentBackground,
    borderRadius: 12,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  bodyScroll: {
    flexGrow: 0,
  },
  bodyContainer: {
    flex: 1,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.icon,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.icon,
    marginVertical: 4,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondaryText,
  },
  valueText: {
    fontSize: 14,
    lineHeight: 20,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipList: {
    gap: 8,
  },
  chip: {
    minHeight: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.icon,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipSelected: {
    borderColor: colors.tint,
  },
  chipText: {
    fontSize: 14,
    flexShrink: 1,
  },
  submitButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.icon,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.componentBackground,
    fontSize: 15,
    fontWeight: '700',
  },
  loadingContainer: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  secondaryText: {
    color: colors.secondaryText,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
});
