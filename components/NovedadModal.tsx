import type { Novedad } from '@/features/Novedades/models/Novedades';
import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface NovedadModalProps {
  visible: boolean;
  novedad: (Novedad & { categoria: string; fecha: string; autor: string }) | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

const getCategoriaIcon = (categoria: string): string => {
  switch (categoria.toLowerCase()) {
    case 'general':
      return '📋';
    case 'eventos':
      return '🎉';
    case 'supermercado':
      return '📦';
    case 'mantenimiento':
      return '🔧';
    case 'seguridad e higiene':
      return '🛡️';
    case 'personas y relaciones':
      return '👥';
    case 'capacitación':
      return '🎓';
    case 'comunicados':
      return '📢';
    case 'insumos':
      return '🌱';
    case 'otros':
      return '📌';
    default:
      return '📌';
  }
};

const getPrioridadColor = (prioridad: number): string => {
  switch (prioridad) {
    case 1:
      return '#ef4444';
    case 2:
      return '#fbbf24';
    case 3:
      return '#22c55e';
    default:
      return '#9ca3af';
  }
};

export function NovedadModal({
  visible,
  novedad,
  onClose,
  onEdit,
  onDelete,
  canEdit = false,
}: NovedadModalProps) {
  if (!novedad) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header con icono y categoría */}
                <View style={styles.header}>
                  <View
                    style={[
                      styles.iconContainer,
                      { borderColor: getPrioridadColor(novedad.prioridad) },
                    ]}
                  >
                    <Text style={styles.headerIcon}>{getCategoriaIcon(novedad.categoria)}</Text>
                  </View>
                  <View style={styles.headerInfo}>
                    <Text style={styles.autor}>{novedad.autor}</Text>
                    <Text style={styles.categoriaText}>{novedad.categoria}</Text>
                  </View>
                </View>

                {/* Título */}
                <Text style={styles.titulo}>{novedad.titulo}</Text>

                {/* Descripción */}
                <Text style={styles.descripcion}>{novedad.descripcion}</Text>

                {/* Fecha */}
                <Text style={styles.fecha}>📅 {novedad.fecha}</Text>

                {/* Botones */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>Cerrar</Text>
                  </TouchableOpacity>

                  {canEdit && onEdit && (
                    <TouchableOpacity style={styles.editButton} onPress={onEdit}>
                      <Text style={styles.editButtonText}>Modificar</Text>
                    </TouchableOpacity>
                  )}

                  {canEdit && onDelete && (
                    <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                      <Text style={styles.deleteButtonText}>Eliminar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
  },
  autor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  categoriaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  descripcion: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  fecha: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
    marginTop: 8,
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#eab308',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
