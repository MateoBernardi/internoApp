import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Usuario } from '@/shared/users/User';
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
  roleUsers: Usuario[];
  selectedUsers: Usuario[]; // Global selected users
  onToggleUser: (user: Usuario) => void;
  onSelectAll: (users: Usuario[]) => void;
  onDeselectAll: (users: Usuario[]) => void;
}

export function RoleUserSelectionModal({
  visible,
  onClose,
  roleName,
  roleUsers,
  selectedUsers,
  onToggleUser,
  onSelectAll,
  onDeselectAll
}: RoleUserSelectionModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [searchQuery, setSearchQuery] = React.useState('');

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
      return displayedUsers.every(rUser => selectedUsers.some(sUser => sUser.id === rUser.id));
  }, [displayedUsers, selectedUsers]);

  const handleHeaderToggle = () => {
    if (displayedUsers.length === 0) return;
    if (allSelected) {
        onDeselectAll(displayedUsers);
    } else {
        onSelectAll(displayedUsers);
    }
  };

  const renderItem = ({ item }: { item: Usuario }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
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
                color={isSelected ? colors.tint : '#5f6368'} 
            />
        </TouchableOpacity>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { backgroundColor: '#fff' }]}>
                    
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>Rol: {roleName}</ThemedText>
                            <ThemedText style={{ fontSize: 12, color: '#5f6368' }}>{roleUsers.length} usuarios</ThemedText>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                            <Ionicons name="close" size={24} color="#5f6368" />
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
                                color={allSelected ? colors.tint : '#5f6368'} 
                                style={{ marginRight: 8 }}
                             />
                             <ThemedText style={{ fontWeight: '500' }}>{allSelected ? "Deseleccionar todos" : "Seleccionar todos"}</ThemedText>
                         </TouchableOpacity>
                    </View>

                    {/* List */}
                    <FlatList
                        data={displayedUsers}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderItem}
                        style={styles.list}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        keyboardShouldPersistTaps="handled" 
                    />
                    
                     <TouchableOpacity style={[styles.confirmButton, { backgroundColor: colors.tint }]} onPress={onClose}>
                        <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>OK</ThemedText>
                     </TouchableOpacity>

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
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  roleSearchInput: {
      backgroundColor: '#f1f3f4',
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
      borderBottomColor: '#f0f0f0',
      marginBottom: 8,
  },
  actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  list: {
      flexGrow: 0, 
      marginBottom: 16
  },
  userRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#f0f0f0',
  },
  userInfo: {
      flex: 1,
  },
  userName: {
      fontSize: 16,
      color: '#202124',
      marginBottom: 2,
  },
  userEmail: {
      fontSize: 12,
      color: '#5f6368',
  },
  confirmButton: {
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
  }
});