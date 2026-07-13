import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Activity } from '@/features/solicitudesActividades/models/activityTypes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAceptarTurno } from '../viewmodels/useTurnosAgenda';

const colors = Colors['light'];

function formatDateLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatAceptadoLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hh}:${mm}`;
}

function egresoLabel(activity: Activity): string {
  if (!activity.fecha_fin) return '—';
  const d = new Date(activity.fecha_fin);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface TurnoDetalleProps {
  activity: Activity;
  visible?: boolean;
  onClose: () => void;
}

export function TurnoDetalle({ activity, visible, onClose }: TurnoDetalleProps) {
  const insets = useSafeAreaInsets();
  const modalVisible = visible ?? true;

  // Estado local para reflejar el "aceptado" al instante, sin esperar el
  // refetch de la agenda (que igual se dispara por invalidación de queries).
  const [aceptedAt, setAceptedAt] = useState<string | null>(activity.acepted_at ?? null);

  useEffect(() => {
    if (!modalVisible) return;
    setAceptedAt(activity.acepted_at ?? null);
  }, [modalVisible, activity.acepted_at]);

  const { mutate: aceptar, isPending } = useAceptarTurno();

  const planificacionId = activity.planificacion_id;
  const hasValidId = Number.isFinite(planificacionId) && (planificacionId ?? 0) > 0;
  const yaAceptado = Boolean(aceptedAt);

  // Un turno solo puede aceptarse mientras no haya comenzado. fecha_inicio viene en hora
  // de Argentina sin zona; Argentina es UTC-3 todo el año, así que la interpretamos como
  // instante absoluto con offset fijo -03:00 y comparamos contra ahora (sirve en cualquier
  // TZ del dispositivo y no depende de Intl, poco soportado en Hermes/RN).
  const yaComenzo = (() => {
    if (!activity.fecha_inicio) return false;
    const inicioMs = new Date(`${activity.fecha_inicio}-03:00`).getTime();
    if (Number.isNaN(inicioMs)) return false;
    return inicioMs <= Date.now();
  })();

  const handleAceptar = () => {
    if (!hasValidId || !planificacionId) return;
    aceptar(planificacionId, {
      onSuccess: (response) => {
        setAceptedAt(response.acepted_at);
      },
      onError: (error) => {
        Alert.alert('Error', error instanceof Error ? error.message : 'Intentá nuevamente');
      },
    });
  };

  return (
    <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="chevron-down" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Título */}
            <View style={styles.contentBlock}>
              <ThemedText style={styles.label}>Turno</ThemedText>
              <ThemedText style={styles.titulo}>{activity.title}</ThemedText>
            </View>

            {/* Fecha */}
            <View style={styles.contentBlock}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.lightTint} />
                <ThemedText style={[styles.label, styles.labelInline]}>Fecha</ThemedText>
              </View>
              <ThemedText style={styles.dateValue}>{formatDateLabel(activity.date)}</ThemedText>
            </View>

            {/* Horario */}
            <View style={styles.contentBlock}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time-outline" size={16} color={colors.lightTint} />
                <ThemedText style={[styles.label, styles.labelInline]}>Horario</ThemedText>
              </View>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabelSmall}>Ingreso</Text>
                <ThemedText style={styles.dateValue}>{activity.time || '—'}</ThemedText>
              </View>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabelSmall}>Egreso</Text>
                <ThemedText style={styles.dateValue}>{egresoLabel(activity)}</ThemedText>
              </View>
            </View>

            {/* Sede */}
            {(activity.sede_ingreso || activity.sede_egreso) && (
              <View style={styles.contentBlock}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="location-outline" size={16} color={colors.lightTint} />
                  <ThemedText style={[styles.label, styles.labelInline]}>Sede</ThemedText>
                </View>
                <ThemedText style={styles.dateValue}>
                  {activity.sede_ingreso}
                  {activity.sede_egreso && activity.sede_egreso !== activity.sede_ingreso
                    ? ` → ${activity.sede_egreso}`
                    : ''}
                </ThemedText>
              </View>
            )}

            {/* Aceptación */}
            <View style={styles.acceptSection}>
              {yaAceptado ? (
                <View style={styles.acceptedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.acceptedBadgeText}>
                    Aceptado el {aceptedAt ? formatAceptadoLabel(aceptedAt) : ''}
                  </Text>
                </View>
              ) : yaComenzo ? (
                <View style={styles.pasadoBadge}>
                  <Ionicons name="time-outline" size={18} color="#9ca3af" />
                  <Text style={styles.pasadoBadgeText}>El horario de entrada ya pasó</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.acceptButton, (isPending || !hasValidId) && styles.acceptButtonDisabled]}
                  onPress={handleAceptar}
                  disabled={isPending || !hasValidId}
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.acceptButtonText}>Aceptar</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    marginTop: '10%',
    backgroundColor: colors.componentBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },
  contentBlock: {
    gap: 6,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  labelInline: {
    marginBottom: 0,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  dateLabelSmall: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    width: 60,
  },
  dateValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  acceptSection: {
    marginTop: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.lightTint,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.success + '50',
    backgroundColor: colors.success + '10',
  },
  acceptedBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  pasadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  pasadoBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
});
