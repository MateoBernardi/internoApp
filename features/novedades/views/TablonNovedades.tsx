import { CrearNovedadCard } from '@/components/CrearNovedadCard';
import { NovedadCard } from '@/components/NovedadCard';
import { NovedadFormModal } from '@/components/NovedadFormModal';
import { NovedadModal } from '@/components/NovedadModal';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { useAuth } from '@/features/auth/context/AuthContext';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Novedad } from '../models/Novedades';
import { useNovedad } from '../viewmodels/useNovedad';

// Roles que tienen permiso para crear, editar y eliminar novedades
const supervisorRoles = ['gerencia', 'personasRelaciones', 'encargado', 'presidencia'];

interface NovedadView extends Novedad {
  categoria: string;
  fecha: string;
}

const TIPOS_NOVEDAD = [
  { id: 1, nombre: 'General' },
  { id: 2, nombre: 'Eventos' },
  { id: 3, nombre: 'Supermercado' },
  { id: 4, nombre: 'Mantenimiento' },
  { id: 5, nombre: 'Seguridad e Higiene' },
  { id: 6, nombre: 'Personas y Relaciones' },
  { id: 7, nombre: 'Capacitación' },
  { id: 8, nombre: 'Comunicados' },
  { id: 9, nombre: 'Insumos' },
  { id: 10, nombre: 'Otros' },
];

interface TablonNovedadesProps {
  refreshTrigger?: number;
  enabled?: boolean;
}

export default function TablonNovedades({ refreshTrigger, enabled = true }: TablonNovedadesProps) {
  const { user } = useAuth();
  const { obtenerNovedades, crearNovedad, actualizarNovedad, eliminarNovedad, isLoading, error } =
    useNovedad();

  const [novedades, setNovedades] = useState<NovedadView[]>([]);
  const [selectedNovedad, setSelectedNovedad] = useState<NovedadView | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [localLoading, setLocalLoading] = useState(true);

  // Cargar novedades al montar el componente
  useEffect(() => {
    if (!enabled) {
      setLocalLoading(false);
      return;
    }

    loadNovedades();
  }, [enabled]);

  // Recargar cuando se dispara refresh desde el padre
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (refreshTrigger && refreshTrigger > 0) {
      loadNovedades();
    }
  }, [enabled, refreshTrigger]);

  const loadNovedades = async () => {
    setLocalLoading(true);
    const result = await obtenerNovedades();

    if (result.success && result.data) {
      const viewData: NovedadView[] = result.data
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .map((n) => ({
          ...n,
          categoria: getTipoString(n.id_etiqueta || 1),
          fecha: formatFecha(n.createdAt),
        }));
      setNovedades(viewData);
    }

    setLocalLoading(false);
  };

  const formatFecha = (fecha?: Date | string): string => {
    if (!fecha) return 'Fecha no disponible';
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const getTipoString = (tipo: number): string => {
    const tipoNovedad = TIPOS_NOVEDAD.find((t) => t.id === tipo);
    return tipoNovedad ? tipoNovedad.nombre : 'General';
  };

  const handleNovedadPress = (novedad: NovedadView) => {
    setSelectedNovedad(novedad);
    setIsDetailModalOpen(true);
  };

  const handleCreatePress = () => {
    setFormMode('create');
    setSelectedNovedad(null);
    setIsFormModalOpen(true);
  };

  const handleEditPress = () => {
    setIsDetailModalOpen(false);
    setFormMode('edit');
    setIsFormModalOpen(true);
  };

  const handleDeletePress = () => {
    if (!selectedNovedad?.id) return;

    Alert.alert(
      'Eliminar Novedad',
      '¿Estás seguro de que deseas eliminar esta novedad?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const result = await eliminarNovedad(selectedNovedad.id!);
            if (result.success) {
              setNovedades((prev) => prev.filter((n) => n.id !== selectedNovedad.id));
              setIsDetailModalOpen(false);
              setSelectedNovedad(null);
            } else {
              Alert.alert('Error', result.error || 'Intenta nuevamente');
            }
          },
        },
      ]
    );
  };

  const handleFormSubmit = async (data: Omit<Novedad, 'id' | 'createdAt'>) => {
    if (formMode === 'create') {
      const result = await crearNovedad({
        ...data,
      });

      if (result.success && result.data) {
        const newNovedadView: NovedadView = {
          ...result.data,
          categoria: getTipoString(result.data.id_etiqueta || 1),
          fecha: formatFecha(result.data.createdAt),
        };
        setNovedades((prev) => [newNovedadView, ...prev]);
      } else {
        Alert.alert('Error', result.error || 'Intenta nuevamente');
      }
    } else if (formMode === 'edit' && selectedNovedad?.id) {
      const result = await actualizarNovedad({
        id: selectedNovedad.id,
        ...data,
      });

      if (result.success && result.data) {
        setNovedades((prev) =>
          prev.map((n) =>
            n.id === selectedNovedad.id
              ? {
                  ...result.data!,
                  categoria: getTipoString(result.data!.id_etiqueta || 1),
                  fecha: formatFecha(result.data!.createdAt),
                }
              : n
          )
        );
        setSelectedNovedad(null);
      } else {
        Alert.alert('Error', result.error || 'Intenta nuevamente');
      }
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedNovedad(null);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedNovedad(null);
  };

  // Determinar si el usuario puede crear/editar novedades
  // Solo usuarios con roles específicos pueden gestionar novedades
  const userRole = user?.rol_nombre || '';
  const hasPermission = supervisorRoles.includes(userRole);
  const canCreate = hasPermission;
  const canEdit = hasPermission;

  if (localLoading || isLoading) {
    return (
      <ScreenSkeleton rows={4} />
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadNovedades}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (novedades.length === 0 && !canCreate) {
    return null; // No mostrar nada si no hay novedades y el usuario no puede crear
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {/* Botón para crear novedad */}
        {canCreate && <CrearNovedadCard onPress={handleCreatePress} />}

        {/* Tarjetas de novedades */}
        {novedades.map((novedad) => (
          <NovedadCard
            key={novedad.id}
            novedad={novedad}
            onPress={() => handleNovedadPress(novedad)}
          />
        ))}
      </ScrollView>

      {/* Modal para ver detalles */}
      <NovedadModal
        visible={isDetailModalOpen}
        novedad={selectedNovedad}
        onClose={closeDetailModal}
        onEdit={canEdit ? handleEditPress : undefined}
        onDelete={canEdit ? handleDeletePress : undefined}
        canEdit={canEdit}
      />

      {/* Modal para crear/editar */}
      <NovedadFormModal
        visible={isFormModalOpen}
        novedad={selectedNovedad}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
        mode={formMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffff',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingLeft: 10,
    paddingRight: 0,
    paddingVertical: 16,
    gap: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});
