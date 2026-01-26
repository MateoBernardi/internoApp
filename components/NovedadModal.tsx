import type { Novedad } from '@/features/novedades/models/Novedades';
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
  novedad: (Novedad & { categoria: string; fecha: string; }) | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

// Helper para iconos de categoría
const getCategoriaIcon = (categoria: string): string => {
  switch (categoria?.toLowerCase()) {
    case 'general': return '📋';
    case 'eventos': return '🎉';
    case 'supermercado': return '📦';
    case 'mantenimiento': return '🔧';
    case 'seguridad e higiene': return '🛡️';
    case 'personas y relaciones': return '👥';
    case 'capacitación': return '🎓';
    case 'comunicados': return '📢';
    case 'insumos': return '🌱';
    case 'otros': return '📌';
    default: return '📌';
  }
};

// Helper para colores de prioridad
const getPrioridadColor = (prioridad: number): string => {
  switch (prioridad) {
    case 1: return '#ef4444'; // Alta - Rojo
    case 2: return '#fbbf24'; // Media - Ámbar
    case 3: return '#22c55e'; // Baja - Verde
    default: return '#9ca3af';
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
  
  // Si no hay novedad, no renderizamos nada para evitar errores de undefined
  if (!novedad) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Capa para cerrar al tocar fuera del recuadro blanco */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContainer}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            // flexGrow asegura que el contenido empuje el modal y sea visible
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header con icono y categoría */}
            <View style={styles.header}>
              <View
                style={[
                  styles.iconContainer,
                  { borderColor: getPrioridadColor(novedad.prioridad) },
                ]}
              >
                <Text style={styles.headerIcon}>
                    {getCategoriaIcon(novedad.categoria)}
                </Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.categoriaLabel}>CATEGORÍA</Text>
                <Text style={styles.categoriaText}>{novedad.categoria}</Text>
              </View>
            </View>

            {/* Título */}
            <Text style={styles.titulo}>{novedad.titulo}</Text>

            {/* Descripción */}
            <Text style={styles.descripcion}>{novedad.descripcion || 'Sin descripción disponible.'}</Text>

            {/* Fecha */}
            <View style={styles.fechaContainer}>
                <Text style={styles.fecha}>📅 {novedad.fecha}</Text>
            </View>

            {/* Botones de acción */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>

              {canEdit && (
                <View style={styles.editActions}>
                  {onEdit && (
                    <TouchableOpacity style={styles.editButton} onPress={onEdit}>
                      <Text style={styles.editButtonText}>Modificar</Text>
                    </TouchableOpacity>
                  )}
                  {onDelete && (
                    <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                      <Text style={styles.deleteButtonText}>Eliminar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Fondo oscurecido
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 450,
    maxHeight: '80%', // Evita que se salga de la pantalla
    overflow: 'hidden', // Necesario para bordes redondeados con ScrollView
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1, // Solución al problema del modal "en blanco"
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 28,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  categoriaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  categoriaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  descripcion: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 20,
  },
  fechaContainer: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 25,
  },
  fecha: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});