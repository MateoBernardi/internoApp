import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { Colors, UI } from '@/constants/theme';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FullScreenPortal } from '@/shared/ui/FullScreenPortal';
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
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
  const bottomInset = useSafeBottomInset();
  const [focusedField, setFocusedField] = useState<'titulo' | 'descripcion' | null>(null);
  const isFormValid = newActivity.title.trim().length > 0 && !activityDateErrorMessage;

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onMinimize();
      return true;
    });
    return () => sub.remove();
  }, [visible, onMinimize]);

  if (!visible) return null;

  return (
    <FullScreenPortal>
    <View style={styles.fullScreen}>
      <ModalKeyboardView style={styles.modalKavWrapper}>
          <View style={[styles.modalContainer, { paddingBottom: bottomInset }]}>
            <View style={[styles.modalHeader, { paddingTop: insets.top + 12 }]}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="chevron-back" size={24} color={glassColors.textMuted} />
              </TouchableOpacity>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity onPress={onMinimize} style={styles.closeButton}>
                  <Ionicons name="chevron-down" size={24} color={glassColors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {activityDateErrorMessage && (
                <Text style={styles.errorTextInline}>{activityDateErrorMessage}</Text>
              )}

              {/* Fecha */}
              <View style={styles.dateSection}>
                <View style={styles.dateFieldGroup}>
                  <Text style={styles.dateFieldLabel}>Fecha inicio</Text>
                  <View style={styles.dateRow}>
                    <TouchableOpacity onPress={onStartDate} style={styles.dateButton}>
                      <Text style={styles.dateValue}>
                        {new Date(newActivity.date + 'T00:00:00').toLocaleDateString(
                          'es-ES',
                          { weekday: 'short', day: '2-digit', month: 'short' }
                        )}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onStartTime} style={styles.timeButton}>
                      <Text style={[styles.dateValue, styles.timeValue]}>
                        {newActivity.startTime.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.endDateCollapsible} onPress={onToggleEndDateFields}>
                  <Text style={styles.endDateCollapsibleText}>Agregar fecha de fin</Text>
                  <Ionicons name={showEndDateFields ? 'chevron-up' : 'chevron-down'} size={16} color={colors.secondaryText} />
                </TouchableOpacity>

                {showEndDateFields && (
                  <View style={styles.dateFieldGroup}>
                    <Text style={styles.dateFieldLabel}>Fecha fin</Text>
                    <View style={styles.dateRow}>
                      <TouchableOpacity onPress={onEndDate} style={styles.dateButton}>
                        <Text style={styles.dateValue}>
                          {new Date(newActivity.endDate + 'T00:00:00').toLocaleDateString(
                            'es-ES',
                            { weekday: 'short', day: '2-digit', month: 'short' }
                          )}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={onEndTime} style={styles.timeButton}>
                        <Text style={[styles.dateValue, styles.timeValue]}>
                          {newActivity.endTime.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Título */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Título</Text>
                <TextInput
                  style={[styles.input, styles.inputNoOutline, focusedField === 'titulo' && styles.inputFocused]}
                  placeholder="Título"
                  value={newActivity.title}
                  onChangeText={onChangeTitle}
                  placeholderTextColor={glassColors.placeholder}
                  onFocus={() => setFocusedField('titulo')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Descripción */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.descriptionInput, styles.inputNoOutline, focusedField === 'descripcion' && styles.inputFocused]}
                  placeholder="Descripción (opcional)"
                  value={newActivity.description}
                  onChangeText={onChangeDescription}
                  placeholderTextColor={glassColors.placeholder}
                  multiline
                  numberOfLines={4}
                  onFocus={() => setFocusedField('descripcion')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </ScrollView>

            <View style={styles.uploadButtonContainer}>
              <TouchableOpacity
                onPress={onSubmit}
                disabled={isLoading || !isFormValid}
                style={[styles.uploadButton, (isLoading || !isFormValid) && styles.uploadButtonDisabled]}
              >
                <Ionicons name="cloud-upload" size={20} color={glassColors.link} />
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
    </FullScreenPortal>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.componentBackground,
    zIndex: 1000,
    elevation: 8,
  },
  modalKavWrapper: {
    flex: 1,
    width: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  modalScroll: {
    flex: 1,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17,24,28,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    marginLeft: 8,
  },
  errorTextInline: {
    color: colors.error,
    fontSize: 12,
    marginTop: 8,
  },
  dateSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17,24,28,0.08)',
    paddingBottom: 12,
    marginBottom: 20,
  },
  dateFieldGroup: {
    gap: 6,
    marginBottom: 12,
  },
  dateFieldLabel: {
    fontSize: 12,
    color: glassColors.textMuted,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  dateButton: {
    ...glassStyles.buttonSecondary,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timeButton: {
    ...glassStyles.buttonSecondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateValue: {
    fontSize: 15,
    color: colors.lightTint,
    fontWeight: '600',
    textAlign: 'center',
  },
  timeValue: {
    fontWeight: '600',
  },
  endDateCollapsible: {
    marginTop: UI.spacing.sm,
    paddingVertical: UI.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17,24,28,0.08)',
  },
  endDateCollapsibleText: {
    color: colors.secondaryText,
    fontSize: UI.fontSize.sm,
    fontWeight: '600',
  },
  fieldContainer: {
    marginBottom: 22,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: glassColors.text,
    marginBottom: 6,
  },
  input: {
    ...glassStyles.fieldGlass,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: glassColors.text,
  },
  inputFocused: {
    borderColor: glassColors.link,
  },
  inputNoOutline: {
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  uploadButtonContainer: {
    backgroundColor: colors.componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17,24,28,0.08)',
    paddingHorizontal: '4%',
    paddingTop: 10,
  },
  uploadButton: {
    ...glassStyles.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 26,
    gap: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: glassColors.link,
    fontWeight: '600',
    fontSize: 16,
  },
});
