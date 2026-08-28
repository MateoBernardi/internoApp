import { CrearNovedadCard } from '@/components/CrearNovedadCard';
import { NovedadCard } from '@/components/NovedadCard';
import { NovedadFormModal } from '@/components/NovedadFormModal';
import { NovedadModal } from '@/components/NovedadModal';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton } from '@/shared/ui/GlassButton';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Novedad } from '../models/Novedades';
import { formatNovedadDate, getNovedadCategory } from '../novedadPresentation';
import { useCrearNovedad, useActualizarNovedad, useEliminarNovedad, useGetNovedades } from '../viewmodels/useNovedades';

// Roles que tienen permiso para crear, editar y eliminar novedades
const supervisorRoles = ['gerencia', 'personasRelaciones', 'encargado', 'presidencia', 'sistemas'];

interface NovedadView extends Novedad {
  categoria: string;
  fecha: string;
}

interface TablonNovedadesProps {
  enabled?: boolean;
}

const colors = Colors['light'];

interface NovedadCreateDraft {
  titulo: string;
  descripcion: string;
  tipo: number;
  prioridad: number;
}

const DEFAULT_NOVEDAD_DRAFT: NovedadCreateDraft = {
  titulo: '',
  descripcion: '',
  tipo: 1,
  prioridad: 2,
};

export default function TablonNovedades({ enabled = true }: TablonNovedadesProps) {
  const { user } = useAuth();
  const { idempotencyKey, regenerateIdempotencyKey } = useIdempotencyKey();
  const { data: novedadesData, isLoading, error, refetch } = useGetNovedades(enabled);
  const crearNovedadMutation = useCrearNovedad();
  const actualizarNovedadMutation = useActualizarNovedad();
  const eliminarNovedadMutation = useEliminarNovedad();

  const novedades: NovedadView[] = useMemo(() => {
    return (novedadesData ?? [])
      .slice()
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .map((n) => ({
        ...n,
        categoria: getNovedadCategory(n.id_etiqueta),
        fecha: formatNovedadDate(n.createdAt),
      }));
  }, [novedadesData]);

  const [selectedNovedad, setSelectedNovedad] = useState<NovedadView | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isFormModalMinimized, setIsFormModalMinimized] = useState(false);
  const [resumeFormDraft, setResumeFormDraft] = useState(false);
  const [resetFormDraftSignal, setResetFormDraftSignal] = useState(0);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [createDraft, setCreateDraft] = useState<NovedadCreateDraft>(DEFAULT_NOVEDAD_DRAFT);


  const handleNovedadPress = (novedad: NovedadView) => {
    setSelectedNovedad(novedad);
    setIsDetailModalOpen(true);
  };

  const handleCreatePress = () => {
    setFormMode('create');
    setSelectedNovedad(null);
    if (!isFormModalMinimized) {
      setCreateDraft(DEFAULT_NOVEDAD_DRAFT);
    }
    setResumeFormDraft(false);
    setIsFormModalMinimized(false);
    setIsFormModalOpen(true);
  };

  const handleEditPress = () => {
    setIsDetailModalOpen(false);
    setFormMode('edit');
    setResumeFormDraft(false);
    setIsFormModalMinimized(false);
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
            try {
              await eliminarNovedadMutation.mutateAsync(selectedNovedad.id!);
              setIsDetailModalOpen(false);
              setSelectedNovedad(null);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Intenta nuevamente');
            }
          },
        },
      ]
    );
  };

  const handleFormSubmit = async (data: Omit<Novedad, 'id' | 'createdAt'>) => {
    if (formMode === 'create') {
      try {
        await crearNovedadMutation.mutateAsync({ data: { ...data }, idempotencyKey });
        // La novedad ya existe: la próxima creación es una operación nueva.
        regenerateIdempotencyKey();
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Intenta nuevamente');
      }
    } else if (formMode === 'edit' && selectedNovedad?.id) {
      try {
        await actualizarNovedadMutation.mutateAsync({
          id: selectedNovedad.id,
          ...data,
        });
        setSelectedNovedad(null);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Intenta nuevamente');
      }
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedNovedad(null);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setIsFormModalMinimized(false);
    setResumeFormDraft(false);
    setCreateDraft(DEFAULT_NOVEDAD_DRAFT);
    setResetFormDraftSignal((prev) => prev + 1);
    setSelectedNovedad(null);
  };

  const minimizeFormModal = () => {
    if (formMode !== 'create') {
      closeFormModal();
      return;
    }
    setIsFormModalOpen(false);
    setIsFormModalMinimized(true);
    setResumeFormDraft(true);
  };

  const restoreFormModal = () => {
    setFormMode('create');
    setSelectedNovedad(null);
    setIsFormModalMinimized(false);
    setResumeFormDraft(true);
    setIsFormModalOpen(true);
  };

  const discardFormDraft = () => {
    setIsFormModalOpen(false);
    setIsFormModalMinimized(false);
    setResumeFormDraft(false);
    setCreateDraft(DEFAULT_NOVEDAD_DRAFT);
    setResetFormDraftSignal((prev) => prev + 1);
    setSelectedNovedad(null);
  };

  // Determinar si el usuario puede crear/editar novedades
  // Solo usuarios con roles específicos pueden gestionar novedades
  const userRole = user?.rol_nombre || '';
  const hasPermission = supervisorRoles.includes(userRole);
  const canCreate = hasPermission;
  const canEdit = hasPermission;

  if (isLoading) {
    return (
      <ScreenSkeleton rows={4} />
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error.message || 'Intenta nuevamente'}</Text>
        <GlassButton label="Reintentar" onPress={() => refetch()} />
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
        {canCreate && <CrearNovedadCard onPress={handleCreatePress} />}

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
        onMinimize={minimizeFormModal}
        onSubmit={handleFormSubmit}
        mode={formMode}
        draftValues={formMode === 'create' ? createDraft : undefined}
        onDraftChange={formMode === 'create' ? setCreateDraft : undefined}
        resumeDraft={resumeFormDraft}
        onResumeDraftHandled={() => setResumeFormDraft(false)}
        resetDraftSignal={resetFormDraftSignal}
      />

      {canCreate && isFormModalMinimized && (
        <View style={[styles.minimizedDraftContainer, glassStyles.pill]}>
          <TouchableOpacity style={styles.minimizedDraftMain} onPress={restoreFormModal}>
            <Ionicons name="chevron-up" size={18} color={glassColors.link} />
            <Text style={styles.minimizedDraftText}>Borrador de novedad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.minimizedDraftClose} onPress={discardFormDraft}>
            <Ionicons name="close" size={16} color={glassColors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 104,
    backgroundColor: colors.componentBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17,24,28,0.08)',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    minHeight: 104,
    alignItems: 'stretch',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  centerContainer: {
    minHeight: 104,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
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
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  minimizedDraftContainer: {
    position: 'absolute',
    right: 16,
    bottom: 18,
  },
  minimizedDraftMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
  },
  minimizedDraftText: {
    marginLeft: 6,
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
  minimizedDraftClose: {
    marginLeft: 6,
    padding: 4,
  },
});
