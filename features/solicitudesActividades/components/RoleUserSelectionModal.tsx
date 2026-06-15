import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { UserSummary } from '@/shared/users/User';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  UIManager,
  useWindowDimensions,
  View
} from 'react-native';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface RoleUserSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  roleName: string;
  roleUsers: UserSummary[];
  selectedUsers: UserSummary[]; // Global selected users
  isRoleSelected?: boolean; // Whether the entire role is in allowed_roles
  onToggleUser: (user: UserSummary) => void;
  onSelectAll: (users: UserSummary[]) => void;
  onDeselectAll: (users: UserSummary[]) => void;
}

const colors = Colors['light'];


export function RoleUserSelectionModal({
  visible,
  onClose,
  roleName,
  roleUsers,
  selectedUsers,
  isRoleSelected = false,
  onToggleUser,
  onSelectAll,
  onDeselectAll
}: RoleUserSelectionModalProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const { width } = useWindowDimensions();

  const modalWidth = useMemo(() => {
    if (Platform.OS === 'web') {
      return Math.min(760, Math.max(360, width - 56));
    }
    return width - 40;
  }, [width]);

  const displayedUsers = React.useMemo(() => {
    if (!searchQuery) return roleUsers;
    const lower = searchQuery.toLowerCase();
    return roleUsers.filter(u =>
      u.nombre.toLowerCase().includes(lower) ||
      u.apellido.toLowerCase().includes(lower) ||
      u.email.toLowerCase().includes(lower)
    );
  }, [roleUsers, searchQuery]);

  const allSelected = useMemo(() => {
    if (displayedUsers.length === 0) return false;
    if (isRoleSelected) return true;
    return displayedUsers.every(rUser => selectedUsers.some(sUser => sUser.user_context_id === rUser.user_context_id));
  }, [displayedUsers, selectedUsers, isRoleSelected]);

  const handleHeaderToggle = () => {
    if (displayedUsers.length === 0) return;
    if (allSelected) {
      onDeselectAll(displayedUsers);
    } else {
      onSelectAll(displayedUsers);
    }
  };

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const renderItem = ({ item }: { item: UserSummary }) => {
    const isSelected = isRoleSelected || selectedUsers.some(u => u.user_context_id === item.user_context_id);
    return (
      <TouchableOpacity
        style={styles.userRow}
        onPress={() => onToggleUser(item)}
      >
        <View style={styles.userInfo}>
          <ThemedText style={styles.userName}>{item.nombre} {item.apellido}</ThemedText>
          <ThemedText style={styles.userEmail}>{item.email}</ThemedText>
        </View>
        <Ionicons
          name={isSelected ? "checkbox" : "square-outline"}
          size={24}
          color={isSelected ? colors.tint : colors.secondaryText}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={[styles.modalOverlay, Platform.OS === 'web' && styles.modalOverlayWeb]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.componentBackground, width: modalWidth },
                Platform.OS === 'web' && styles.modalContentWeb,
              ]}
            >

              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>Rol: {roleName}</ThemedText>
                  <ThemedText style={{ fontSize: 12, color: colors.secondaryText }}>{roleUsers.length} usuarios</ThemedText>
                </View>
                <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color={colors.secondaryText} />
                </TouchableOpacity>
              </View>

              {/* Search Role Users */}
              <TextInput
                style={styles.roleSearchInput}
                placeholder="Buscar en este rol..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {/* Actions Row */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionButton} onPress={handleHeaderToggle}>
                  <Ionicons
                    name={allSelected ? "checkbox" : "square-outline"}
                    size={22}
                    color={allSelected ? colors.tint : colors.secondaryText}
                    style={{ marginRight: 8 }}
                  />
                  <ThemedText style={{ fontWeight: '500' }}>{allSelected ? "Deseleccionar todos" : "Seleccionar todos"}</ThemedText>
                </TouchableOpacity>
              </View>

              <View style={styles.contentArea}>
                {/* List */}
                <FlatList
                  data={displayedUsers}
                  keyExtractor={(item) => item.user_context_id.toString()}
                  renderItem={renderItem}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                />

                <View style={styles.bottomActions}>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      {
                        backgroundColor: colors.componentBackground,
                        borderColor: colors.lightTint,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={handleClose}
                  >
                    <ThemedText style={{ color: colors.lightTint, fontWeight: 'bold' }}>OK</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalOverlayWeb: {
    zIndex: 1000,
    pointerEvents: 'auto',
  },
  modalContent: {
    width: '100%',
    minHeight: 420,
    maxHeight: '92%',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalContentWeb: {
    zIndex: 1001,
    pointerEvents: 'auto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleSearchInput: {
    backgroundColor: colors.componentBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.componentBackground,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
    minHeight: 180,
    marginBottom: 0,
  },
  listContent: {
    paddingBottom: 8,
  },
  bottomActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.componentBackground,
    paddingTop: 12,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.componentBackground,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  confirmButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 0,
  }
});