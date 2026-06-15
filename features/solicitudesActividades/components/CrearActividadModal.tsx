import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { Colors, UI } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NewActivityState } from '../agenda/dateUtils';

const colors = Colors['light'];

interface CrearActividadModalProps {
  visible: boolean;
  newActivity: NewActivityState;
  showEndDateFields: boolean;
  activityDateErrorMessage: string | null;
  isLoading: boolean;
  onMinimize: () => void;
  onClose: () => void;
  onStartDate: () => void;
  onStartTime: () => void;
  onEndDate: () => void;
  onEndTime: () => void;
  onToggleEndDateFields: () => void;
  onChangeTitle: (text: string) => void;
  onChangeDescription: (text: string) => void;
  onSubmit: () => void;
  // Date picker (iOS se renderiza dentro del modal; Android lo renderiza el padre).
  showDatePicker: boolean;
  datePickerMode: 'date' | 'time';
  pickerKey: string;
  datePickerValue: Date;
  onDateConfirm: (date: Date) => void;
  onDateCancel: () => void;
}

/**
 * Modal de creación de actividad de la Agenda Personal: fechas de
 * inicio/fin opcionales, título y descripción. El estado y la lógica viven en
 * el contenedor (`AgendaPersonal`); este componente es presentacional.
 */
export function CrearActividadModal({
  visible,
  newActivity,
  showEndDateFields,
  activityDateErrorMessage,
  isLoading,
  onMinimize,
  onClose,
  onStartDate,
  onStartTime,
  onEndDate,
  onEndTime,
  onToggleEndDateFields,
  onChangeTitle,
  onChangeDescription,
  onSubmit,
  showDatePicker,
  datePickerMode,
  pickerKey,
  datePickerValue,
  onDateConfirm,
  onDateCancel,
}: CrearActividadModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onMinimize}
    >
      <View style={styles.overlay}>
        <ModalKeyboardView style={styles.modalKavWrapper}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom }]}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderActions}>
                  <TouchableOpacity onPress={onMinimize} style={styles.closeButton}>
                    <Ionicons name="chevron-down" size={24} color={colors.secondaryText} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={22} color={colors.secondaryText} />
                  </TouchableOpacity>
                </View>
              </View>

              {activityDateErrorMessage && (
                <Text style={styles.errorTextInline}>{activityDateErrorMessage}</Text>
              )}

              {/* Fecha */}
              <View style={styles.dateSection}>
                <TouchableOpacity onPress={onStartDate} style={styles.dateRow}>
                  <Ionicons name="calendar" size={20} color={colors.lightTint} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.dateLabel}>Fecha inicio</Text>
                    <Text style={styles.dateValue}>
                      {new Date(newActivity.date + 'T00:00:00').toLocaleDateString(
                        'es-ES',
                        { weekday: 'short', day: '2-digit', month: 'short' }
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={onStartTime} style={styles.dateRow}>
                  <Ionicons name="time" size={20} color={colors.lightTint} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.dateLabel}>Hora inicio</Text>
                    <Text style={styles.dateValue}>
                      {newActivity.startTime.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.endDateCollapsible} onPress={onToggleEndDateFields}>
                  <Text style={styles.endDateCollapsibleText}>Agregar fecha de fin</Text>
                  <Ionicons name={showEndDateFields ? 'chevron-up' : 'chevron-down'} size={16} color={colors.secondaryText} />
                </TouchableOpacity>

                {showEndDateFields && (
                  <>
                    <TouchableOpacity onPress={onEndDate} style={styles.dateRow}>
                      <Ionicons name="calendar" size={20} color={colors.lightTint} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.dateLabel}>Fecha fin</Text>
                        <Text style={styles.dateValue}>
                          {new Date(newActivity.endDate + 'T00:00:00').toLocaleDateString(
                            'es-ES',
                            { weekday: 'short', day: '2-digit', month: 'short' }
                          )}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onEndTime} style={styles.dateRow}>
                      <Ionicons name="time" size={20} color={colors.lightTint} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.dateLabel}>Hora fin</Text>
                        <Text style={styles.dateValue}>
                          {newActivity.endTime.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Título */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Título</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Título"
                  value={newActivity.title}
                  onChangeText={onChangeTitle}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Descripción */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.descriptionInput]}
                  placeholder="Descripción (opcional)"
                  value={newActivity.description}
                  onChangeText={onChangeDescription}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.uploadButtonContainer}>
              <TouchableOpacity
                onPress={onSubmit}
                style={[styles.uploadButton, { backgroundColor: isLoading ? '#d1d5db' : colors.componentBackground }]}
              >
                <Ionicons name="cloud-upload" size={20} color={colors.lightTint} />
                <ThemedText style={styles.uploadButtonText}>Crear</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && Platform.OS !== 'android' && (
            <DateTimePicker
              key={pickerKey}
              visible={showDatePicker}
              testID="dateTimePicker"
              value={datePickerValue}
              mode={datePickerMode}
              is24Hour={true}
              onConfirm={onDateConfirm}
              onCancel={onDateCancel}
            />
          )}
        </ModalKeyboardView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalKavWrapper: {
    flex: 1,
    width: '100%',
  },
  modalContainer: {
    flex: 1,
    marginTop: '10%',
    backgroundColor: colors.componentBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: colors.icon,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginLeft: 8,
  },
  errorTextInline: {
    color: colors.error,
    fontSize: 12,
    marginTop: 8,
  },
  dateSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateLabel: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 15,
    color: colors.lightTint,
    fontWeight: '600',
    marginTop: 2,
  },
  endDateCollapsible: {
    marginTop: UI.spacing.sm,
    paddingVertical: UI.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.neutralBorder,
  },
  endDateCollapsibleText: {
    color: colors.secondaryText,
    fontSize: UI.fontSize.sm,
    fontWeight: '600',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  uploadButtonContainer: {
    backgroundColor: colors.componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.icon,
    paddingHorizontal: '4%',
    paddingTop: 10,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: colors.lightTint,
    fontWeight: '600',
    fontSize: 16,
  },
});
