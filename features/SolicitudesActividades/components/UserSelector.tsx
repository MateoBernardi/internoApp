import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Usuario } from '@/shared/users/User';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet, TextInput, TouchableOpacity,
  TouchableWithoutFeedback,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface UserSelectorProps {
  selectedUsers: Usuario[];
  onSelectUsers: (users: Usuario[]) => void;
  users: Usuario[]; // Search Results
  roles: string[];
  isLoadingUsers?: boolean;
  isLoadingRoles?: boolean;
  onSearch: (query: string) => void;
  onSelectRole: (role: string) => void;
}

export function UserSelector({
  selectedUsers,
  onSelectUsers,
  users,
  roles,
  isLoadingUsers = false,
  isLoadingRoles = false,
  onSearch,
  onSelectRole
}: UserSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [searchQuery, setSearchQuery] = useState('');
  
  // States for Modals/Popups
  const [isRolesVisible, setIsRolesVisible] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // We need to manage the text input manually to support clearing it
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    onSearch(text);
    if (text.length > 0) {
        setShowResults(true);
    } else {
        setShowResults(false);
    }
  };

  const toggleUserSelection = (user: Usuario) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id);
    if (isSelected) {
      onSelectUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      onSelectUsers([...selectedUsers, user]);
      setSearchQuery('');
      onSearch(''); 
      setShowResults(false);
    }
  };

  const handleSelectRole = (role: string) => {
      onSelectRole(role);
      setIsRolesVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Input Row */}
      <View style={styles.topRow}>
        <View style={styles.inputWrapper}>
             <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Escribe nombre o email..."
                placeholderTextColor="#9aa0a6"
                value={searchQuery}
                onChangeText={handleSearch}
                onFocus={() => {
                    if (searchQuery.length > 0) setShowResults(true);
                }}
                autoCapitalize="none"
             />
        </View>

        <TouchableOpacity 
             style={styles.rolesButton} 
             onPress={() => setIsRolesVisible(true)}
         >
             <ThemedText style={styles.rolesButtonText}>Roles</ThemedText>
             <Ionicons name="chevron-down" size={16} color="#5f6368" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* Roles Modal (Popup) */}
      <Modal
         transparent
         visible={isRolesVisible}
         animationType="fade"
         onRequestClose={() => setIsRolesVisible(false)}
      >
          <TouchableWithoutFeedback onPress={() => setIsRolesVisible(false)}>
              <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={styles.modalContent}>
                        <ThemedText type="defaultSemiBold" style={{ marginBottom: 10, textAlign: 'center' }}>Seleccionar Rol</ThemedText>
                        {roles && roles.length > 0 ? (
                                roles.map(role => (
                                    <TouchableOpacity 
                                        key={role} 
                                        style={styles.modalItem} 
                                        onPress={() => handleSelectRole(role)}
                                    >
                                        <ThemedText style={styles.roleText}>{role}</ThemedText>
                                        <Ionicons name="people-outline" size={20} color={colors.tint} />
                                    </TouchableOpacity>
                                ))
                        ) : (
                             isLoadingRoles ? 
                             <ActivityIndicator color={colors.tint} /> :
                            <ThemedText style={{ color: '#5f6368', padding: 10 }}>No hay roles disponibles</ThemedText>
                        )}
                    </View>
                  </TouchableWithoutFeedback>
              </View>
          </TouchableWithoutFeedback>
      </Modal>

      {/* Search Results Dropdown (In-Flow but looks overlay) */}
      {showResults && searchQuery.length > 0 && (
          <View style={[styles.resultsContainer, { borderColor: '#e0e0e0' }]}>
               <View style={styles.resultsHeader}>
                   <ThemedText style={{ fontSize: 12, color: '#5f6368' }}>Resultados</ThemedText>
                   <TouchableOpacity onPress={() => setShowResults(false)}>
                       <Ionicons name="close" size={16} color="#5f6368" />
                   </TouchableOpacity>
               </View>

               {isLoadingUsers ? (
                   <ActivityIndicator size="small" color={colors.tint} style={{ padding: 20 }} />
               ) : (
                   users && users.length > 0 ? (
                        users.map((item) => {
                            const isSelected = selectedUsers.some((u) => u.id === item.id);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.resultItem}
                                    onPress={() => toggleUserSelection(item)}
                                >
                                    <View style={styles.resultInfo}>
                                        <ThemedText style={styles.resultName}>{item.nombre} {item.apellido}</ThemedText>
                                        <ThemedText style={styles.resultEmail}>{item.email}</ThemedText>
                                    </View>
                                    {isSelected && <Ionicons name="checkmark" size={16} color={colors.tint} />}
                                </TouchableOpacity>
                            );
                        })
                   ) : (
                        <View style={{ padding: 16, alignItems: 'center' }}>
                            <ThemedText style={{ color: '#5f6368' }}>No se encontraron usuarios</ThemedText>
                        </View>
                   )
               )}
          </View>
      )}

      {/* Selected Chips */}
      <View style={styles.selectedChipsContainer}>
          {selectedUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              onPress={() => toggleUserSelection(user)}
              style={[styles.userChip, { borderColor: '#e0e0e0', backgroundColor: '#fff' }]}
            >
              <ThemedText style={[styles.userChipText, { color: '#202124' }]}>
                {user.nombre} {user.apellido}
              </ThemedText>
              <Ionicons name="close" size={16} color="#5f6368" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))}
      </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 10, // Helps with dropdown visibility
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    color: '#5f6368',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    height: 30, // Increased height for easier touch
  },
  rolesButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: '#f1f3f4',
      borderRadius: 16, // Pill shape
  },
  rolesButtonText: {
     fontSize: 14,
     color: '#5f6368',
     fontWeight: '500',
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalContent: {
      width: '80%',
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16,
      maxHeight: '60%',
      elevation: 5,
  },
  modalItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#f0f0f0',
  },
  roleText: {
      fontSize: 16,
      color: '#202124',
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 250,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    width: '100%',
    position: 'absolute', // Make it absolute so it floats over other content
    top: 40, // Height of the input row roughly
    zIndex: 999,
  },
  resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#f0f0f0',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
  },
  resultEmail: {
    fontSize: 12,
    color: '#5f6368',
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  userChipText: {
    fontSize: 14,
  },
});
