import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { UserSummary } from '@/shared/users/User';
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
  selectedUsers: UserSummary[];
  onSelectUsers: (users: UserSummary[]) => void;
  users: UserSummary[]; // Search Results
  roles: { label: string; value: string }[];
  selectedRoles?: { label: string; value: string }[];
  onRemoveRole?: (roleValue: string) => void;
  isLoadingUsers?: boolean;
  isLoadingRoles?: boolean;
  onSearch: (query: string) => void;
  onSelectRole: (role: string) => void;
}

const colors = Colors['light'];


export function UserSelector({
  selectedUsers,
  onSelectUsers,
  users,
  roles,
  selectedRoles = [],
  onRemoveRole,
  isLoadingUsers = false,
  isLoadingRoles = false,
  onSearch,
  onSelectRole
}: UserSelectorProps) {
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

  const toggleUserSelection = (user: UserSummary) => {
    const isSelected = selectedUsers.some((u) => u.user_context_id === user.user_context_id);
    if (isSelected) {
      onSelectUsers(selectedUsers.filter((u) => u.user_context_id !== user.user_context_id));
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
                placeholder="Para"
                placeholderTextColor= {colors.secondaryText}
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
             <Ionicons name="chevron-down" size={16} color={colors.icon} style={{ marginLeft: 4 }} />
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
                                        key={role.value} 
                                        style={styles.modalItem} 
                                        onPress={() => handleSelectRole(role.value)}
                                    >
                                        <ThemedText style={styles.roleText}>{role.label}</ThemedText>
                                        <Ionicons name="people-outline" size={20} color={colors.tint} />
                                    </TouchableOpacity>
                                ))
                        ) : (
                             isLoadingRoles ? 
                             <ActivityIndicator color={colors.tint} /> :
                            <ThemedText style={{ color: colors.secondaryText, padding: 10 }}>No se encontraron roles</ThemedText>
                        )}
                    </View>
                  </TouchableWithoutFeedback>
              </View>
          </TouchableWithoutFeedback>
      </Modal>

      {/* Search Results Dropdown (In-Flow but looks overlay) */}
      {showResults && searchQuery.length > 0 && (
          <View style={[styles.resultsContainer, { borderColor: colors.componentBackground }]}>
               <View style={styles.resultsHeader}>
                   <ThemedText style={{ fontSize: 12, color: colors.secondaryText }}>Resultados</ThemedText>
                   <TouchableOpacity onPress={() => setShowResults(false)}>
                       <Ionicons name="close" size={16} color={colors.icon} />
                   </TouchableOpacity>
               </View>

               {isLoadingUsers ? (
                   <ActivityIndicator size="small" color={colors.tint} style={{ padding: 20 }} />
               ) : (
                   users && users.length > 0 ? (
                        users.map((item) => {
                            const isSelected = selectedUsers.some((u) => u.user_context_id === item.user_context_id);
                            return (
                                <TouchableOpacity
                                    key={item.user_context_id}
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
                            <ThemedText style={{ color: colors.secondaryText }}>No se encontraron usuarios</ThemedText>
                        </View>
                   )
               )}
          </View>
      )}

      {/* Selected Chips */}
      <View style={styles.selectedChipsContainer}>
          {selectedRoles.map((role) => (
            <TouchableOpacity
              key={`role-${role.value}`}
              onPress={() => onRemoveRole?.(role.value)}
              style={[styles.userChip, styles.roleChip]}>
              <Ionicons name="people" size={14} color={colors.tint} style={{ marginRight: 4 }} />
              <ThemedText style={[styles.userChipText, { color: colors.tint }]}>
                {role.label}
              </ThemedText>
              <Ionicons name="close" size={16} color={colors.tint} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))}
          {selectedUsers.map((user) => (
            <TouchableOpacity
              key={user.user_context_id}
              onPress={() => toggleUserSelection(user)}
              style={[styles.userChip, { borderColor: colors.lightTint, backgroundColor: colors.componentBackground }]}>
              <ThemedText style={[styles.userChipText, { color: colors.text }]}>
                {user.nombre} {user.apellido}
              </ThemedText>
              <Ionicons name="close" size={16} color={colors.secondaryText} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))}
      </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.componentBackground,
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
    color: colors.secondaryText,
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
      backgroundColor: colors.componentBackground,
      borderRadius: 16, // Pill shape
  },
  rolesButtonText: {
     fontSize: 14,
     color: colors.secondaryText,
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
      backgroundColor: colors.componentBackground,
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
      borderBottomColor: colors.componentBackground,
  },
  roleText: {
      fontSize: 16,
      color: colors.text,
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: colors.componentBackground,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 250,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.componentBackground,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.componentBackground,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  resultEmail: {
    fontSize: 12,
    color: colors.secondaryText,
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
    borderColor: colors.componentBackground,
  },
  userChipText: {
    fontSize: 14,
  },
  roleChip: {
    borderColor: colors.tint,
    backgroundColor: colors.tint + '15',
  },
});
