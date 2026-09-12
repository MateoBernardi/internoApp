import type { Novedad } from '@/features/novedades/models/Novedades';
import { focusBorderStyles, glassColors, glassStyles } from '@/shared/ui/glass';
import { useFocusBorder } from '@/shared/ui/useFocusBorder';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FullScreenPortal } from '@/shared/ui/FullScreenPortal';
import { IsolatedTextInput, IsolatedTextInputHandle } from '@/shared/ui/IsolatedTextInput';
import { useKeyboardHeight } from '@/shared/ui/keyboard';
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
import { Dropdown } from 'react-native-element-dropdown';
import { ThemedText } from './themed-text';

interface NovedadFormModalProps {
  visible: boolean;
  novedad?: Novedad | null;
  onClose: () => void;
  onMinimize?: () => void;
  onSubmit: (data: Omit<Novedad, 'id' | 'createdAt'>) => Promise<void>;
  mode: 'create' | 'edit';
  draftValues?: {
    titulo: string;
    descripcion: string;
    tipo: number;
    prioridad: number;
  };
  onDraftChange?: (draft: {
    titulo: string;
    descripcion: string;
    tipo: number;
    prioridad: number;
  }) => void;
  resumeDraft?: boolean;
  onResumeDraftHandled?: () => void;
  resetDraftSignal?: number;
}

// Adaptamos los datos para la librería (label y value)
const TIPOS_NOVEDAD = [
  { label: 'General', value: 1 },
  { label: 'Eventos', value: 2 },
  { label: 'Supermercado', value: 3 },
  { label: 'Mantenimiento', value: 4 },
  { label: 'Seguridad e Higiene', value: 5 },
  { label: 'Personas y Relaciones', value: 6 },
  { label: 'Capacitación', value: 7 },
  { label: 'Comunicados', value: 8 },
  { label: 'Insumos', value: 9 },
  { label: 'Otros', value: 10 },
];

const PRIORIDADES = [
  { label: 'Alta', value: 1 },
  { label: 'Media', value: 2 },
  { label: 'Baja', value: 3 },
];

export function NovedadFormModal({
  visible,
  novedad,
  onClose,
  onMinimize,
  onSubmit,
  mode,
  draftValues,
  onDraftChange,
  resumeDraft = false,
  onResumeDraftHandled,
  resetDraftSignal = 0,
}: NovedadFormModalProps) {
  const tituloRef = useRef<IsolatedTextInputHandle>(null);
  const descripcionRef = useRef<IsolatedTextInputHandle>(null);
  const [tipo, setTipo] = useState<number>(1);
  const [prioridad, setPrioridad] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const keyboardHeight = useKeyboardHeight();
  const isKeyboardOpen = keyboardHeight > 0;
  const insets = useSafeAreaInsets();
  const bottomInset = useSafeBottomInset();
  const tituloFocus = useFocusBorder();
  const descripcionFocus = useFocusBorder();

  const syncCreateDraft = (partial: Partial<{ titulo: string; descripcion: string; tipo: number; prioridad: number }>) => {
    if (mode !== 'create' || !onDraftChange) return;
    onDraftChange({
      titulo: tituloRef.current?.getValue() ?? '',
      descripcion: descripcionRef.current?.getValue() ?? '',
      tipo,
      prioridad,
      ...partial,
    });
  };

  useEffect(() => {
    if (!visible) return;

    if (mode === 'edit' && novedad) {
      tituloRef.current?.setValue(novedad.titulo);
      descripcionRef.current?.setValue(novedad.descripcion);
      setTipo(novedad.id_etiqueta || 1);
      setPrioridad(novedad.prioridad);
      return;
    }

    if (!resumeDraft) {
      tituloRef.current?.setValue(draftValues?.titulo ?? '');
      descripcionRef.current?.setValue(draftValues?.descripcion ?? '');
      setTipo(draftValues?.tipo ?? 1);
      setPrioridad(draftValues?.prioridad ?? 2);
    } else {
      tituloRef.current?.setValue(draftValues?.titulo ?? '');
      descripcionRef.current?.setValue(draftValues?.descripcion ?? '');
      setTipo(draftValues?.tipo ?? 1);
      setPrioridad(draftValues?.prioridad ?? 2);
      onResumeDraftHandled?.();
    }
  }, [mode, novedad, visible, resumeDraft, onResumeDraftHandled, draftValues]);

  useEffect(() => {
    if (resetDraftSignal > 0 && mode === 'create') {
      tituloRef.current?.clear();
      descripcionRef.current?.clear();
      setTipo(1);
      setPrioridad(2);
    }
  }, [resetDraftSignal, mode]);

  const handleSubmit = async () => {
    const titulo = tituloRef.current?.getValue() ?? '';
    const descripcion = descripcionRef.current?.getValue() ?? '';
    if (!titulo.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        id_etiqueta: tipo,
        prioridad,
      });
      onClose();
    } catch (error) {
      console.error('Error al guardar novedad:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMinimize = () => {
    if (mode !== 'create' || !onMinimize || loading) return;
    syncCreateDraft({});
    onMinimize();
  };

  useEffect(() => {
    if (!visible) return;
    const handleBackPress = mode === 'create' && onMinimize ? handleMinimize : onClose;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true;
    });
    return () => sub.remove();
  }, [visible, mode, onMinimize, onClose, loading]);

  if (!visible) return null;

  return (
      <FullScreenPortal>
      <View style={styles.fullScreen}>
        <ModalKeyboardView style={styles.modalKeyboardAvoiding}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, glassStyles.sheetHeader, { paddingTop: insets.top + 12 }]}>
              <TouchableOpacity onPress={onClose} style={styles.headerIconButton} disabled={loading}>
                <Ionicons name="chevron-back" size={24} color="#6b7280" />
              </TouchableOpacity>
              <View style={styles.modalHeaderActions}>
                {mode === 'create' && (
                  <TouchableOpacity onPress={handleMinimize} style={styles.headerIconButton} disabled={loading}>
                    <Ionicons name="chevron-down" size={24} color="#6b7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 88 + keyboardHeight },
              ]}
              keyboardShouldPersistTaps={isKeyboardOpen ? 'handled' : 'never'}
              keyboardDismissMode={isKeyboardOpen ? 'none' : (Platform.OS === 'ios' ? 'interactive' : 'on-drag')}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >

              {/* Título */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Título</Text>
                <IsolatedTextInput
                  ref={tituloRef}
                  style={[
                    styles.input,
                    focusBorderStyles.inputNoOutline,
                    tituloFocus.isFocused && { borderColor: glassColors.link },
                  ]}
                  initialValue={novedad?.titulo ?? draftValues?.titulo ?? ''}
                  onFocus={tituloFocus.onFocus}
                  onBlur={() => { tituloFocus.onBlur(); syncCreateDraft({}); }}
                  placeholder="Título"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Descripción */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Descripción</Text>
                <IsolatedTextInput
                  ref={descripcionRef}
                  style={[
                    styles.input,
                    styles.textArea,
                    focusBorderStyles.inputNoOutline,
                    descripcionFocus.isFocused && { borderColor: glassColors.link },
                  ]}
                  initialValue={novedad?.descripcion ?? draftValues?.descripcion ?? ''}
                  onFocus={descripcionFocus.onFocus}
                  onBlur={() => { descripcionFocus.onBlur(); syncCreateDraft({}); }}
                  placeholder="Descripción"
                  placeholderTextColor="#9ca3af"
                  multiline
                />
              </View>

              {/* Categoría */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Categoría</Text>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={TIPOS_NOVEDAD}
                  maxHeight={180}
                  labelField="label"
                  valueField="value"
                  value={tipo}
                  onChange={item => {
                    setTipo(item.value);
                    syncCreateDraft({ tipo: item.value });
                  }}
                />
              </View>

              {/* Prioridad */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Prioridad</Text>
                <Dropdown
                  style={styles.dropdown}
                  data={PRIORIDADES}
                  maxHeight={150}
                  labelField="label"
                  valueField="value"
                  value={prioridad}
                  onChange={item => {
                    setPrioridad(item.value);
                    syncCreateDraft({ prioridad: item.value });
                  }}
                />
              </View>

            </ScrollView>

            <View style={[styles.uploadButtonContainer, { paddingBottom: bottomInset }]}>
              <TouchableOpacity
                onPress={handleSubmit}
                style={[styles.uploadButton, glassStyles.button]}
              >
                <Ionicons name="cloud-upload" size={20} color={glassColors.link} />
                <ThemedText style={styles.uploadButtonText}>{'Crear'}</ThemedText>

              </TouchableOpacity>
            </View>
          </View>
        </ModalKeyboardView>
      </View>
      </FullScreenPortal>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFill,
    ...glassStyles.sheet,
    zIndex: 1000,
  },
  modalKeyboardAvoiding: {
    flex: 1,
    width: '100%',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerIconButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(17,24,28,0.06)',
    marginLeft: 8,
  },
  formScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    flexGrow: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  dropdown: {
    height: 50,
    borderColor: 'rgba(17,24,28,0.12)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  placeholderStyle: {
    fontSize: 15,
    color: glassColors.placeholder,
  },
  selectedTextStyle: {
    fontSize: 15,
    color: glassColors.text,
  },
  modalSubmitFab: {
    alignSelf: 'flex-end',
    marginRight: 20,
    marginBottom: 20,
  },
  uploadButtonContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17,24,28,0.08)',
    paddingHorizontal: '4%',
    paddingTop: 14,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: glassColors.link,
    fontWeight: '600',
    fontSize: 16,
  },
});