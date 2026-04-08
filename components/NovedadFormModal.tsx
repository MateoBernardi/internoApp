import type { Novedad } from '@/features/novedades/models/Novedades';
import { AppFab } from '@/shared/ui/AppFab';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

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
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<number>(1);
  const [prioridad, setPrioridad] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isKeyboardOpen = keyboardHeight > 0;

  const syncCreateDraft = (partial: Partial<{ titulo: string; descripcion: string; tipo: number; prioridad: number }>) => {
    if (mode !== 'create' || !onDraftChange) return;
    onDraftChange({
      titulo,
      descripcion,
      tipo,
      prioridad,
      ...partial,
    });
  };

  useEffect(() => {
    const onShow = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const onHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);
  
  useEffect(() => {
    if (!visible) return;

    if (mode === 'edit' && novedad) {
      setTitulo(novedad.titulo);
      setDescripcion(novedad.descripcion);
      setTipo(novedad.id_etiqueta || 1);
      setPrioridad(novedad.prioridad);
      return;
    }

    if (!resumeDraft) {
      setTitulo(draftValues?.titulo ?? '');
      setDescripcion(draftValues?.descripcion ?? '');
      setTipo(draftValues?.tipo ?? 1);
      setPrioridad(draftValues?.prioridad ?? 2);
    } else {
      setTitulo(draftValues?.titulo ?? '');
      setDescripcion(draftValues?.descripcion ?? '');
      setTipo(draftValues?.tipo ?? 1);
      setPrioridad(draftValues?.prioridad ?? 2);
      onResumeDraftHandled?.();
    }
  }, [mode, novedad, visible, resumeDraft, onResumeDraftHandled, draftValues]);

  useEffect(() => {
    if (resetDraftSignal > 0 && mode === 'create') {
      setTitulo('');
      setDescripcion('');
      setTipo(1);
      setPrioridad(2);
    }
  }, [resetDraftSignal, mode]);

  const handleSubmit = async () => {
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
    onMinimize();
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={mode === 'create' && onMinimize ? handleMinimize : onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalKeyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.headerTitle}>
              {mode === 'create' ? 'Crear Novedad' : 'Editar Novedad'}
            </Text>
            <View style={styles.modalHeaderActions}>
              {mode === 'create' && (
                <TouchableOpacity onPress={handleMinimize} style={styles.headerIconButton} disabled={loading}>
                  <Ionicons name="chevron-down" size={24} color="#6b7280" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.headerIconButton} disabled={loading}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
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
                <TextInput
                  style={styles.input}
                  value={titulo}
                  onChangeText={(value) => {
                    setTitulo(value);
                    syncCreateDraft({ titulo: value });
                  }}
                  placeholder="Título"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Descripción */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={descripcion}
                  onChangeText={(value) => {
                    setDescripcion(value);
                    syncCreateDraft({ descripcion: value });
                  }}
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

          <AppFab
            icon="checkmark"
            floating={false}
            onPress={handleSubmit}
            disabled={!titulo.trim() || loading}
            isLoading={loading}
            style={styles.modalSubmitFab}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalKeyboardAvoiding: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 4,
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
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  dropdown: {
    height: 50,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  placeholderStyle: {
    fontSize: 15,
    color: '#9ca3af',
  },
  selectedTextStyle: {
    fontSize: 15,
    color: '#111827',
  },
  modalSubmitFab: {
    alignSelf: 'flex-end',
    marginRight: 20,
    marginBottom: 20,
  },
});