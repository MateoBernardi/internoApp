import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { UpdateHorarioPayload } from '../models/HorarioDTO';
import { mapHorarioDTOToTurno, type Turno } from '../models/Turno';
import type { FeriadosRangeFilter } from '../services/horariosService';
import { currentWeek, dayName, formatDDMM } from '../utils/dateRange';
import { useFeriadosByRange, useSedes, useUpdateHorario } from '../viewmodels/useHorarios';
import { EditarTurnoSheet } from './EditarTurnoSheet';
import { TurnoCard } from './TurnoCard';
import { WeekNavigator } from './WeekNavigator';
import { INK, MUTED, NAVY, RED_FLASH } from '../theme';

interface FeriadosListProps {
  filter: FeriadosRangeFilter;
  onToast: (msg: string, isError?: boolean) => void;
}

export function FeriadosList({ filter, onToast }: FeriadosListProps) {
  const [week, setWeek] = useState(() => currentWeek());
  const [editingTurno, setEditingTurno] = useState<Turno | null>(null);

  const feriadosQuery = useFeriadosByRange(week.from, week.to, filter);
  const sedesQuery = useSedes();
  const { mutate: updateShift, isPending: isSaving } = useUpdateHorario();

  const sedes = sedesQuery.data ?? [];
  const turnos = useMemo(() => (feriadosQuery.data ?? []).map(mapHorarioDTOToTurno), [feriadosQuery.data]);

  const grouped = useMemo(() => {
    const map = new Map<string, Turno[]>();
    for (const t of turnos) {
      const list = map.get(t.fechaISO) ?? [];
      list.push(t);
      map.set(t.fechaISO, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [turnos]);

  const openEdit = useCallback((turno: Turno) => setEditingTurno({ ...turno }), []);
  const closeEdit = useCallback(() => setEditingTurno(null), []);
  const setField = useCallback(<K extends keyof Turno>(key: K, value: Turno[K]) => {
    setEditingTurno((d) => (d ? { ...d, [key]: value } : d));
  }, []);
  const saveEdit = useCallback(() => {
    if (!editingTurno) return;
    const payload: UpdateHorarioPayload = {
      id: editingTurno.id,
      turno: editingTurno.turno,
      horario_in: `${editingTurno.fechaISO}T${editingTurno.ingreso}:00`,
      horario_out: `${editingTurno.fechaISO}T${editingTurno.egreso}:00`,
      sede_id_in: editingTurno.sedeIdIngreso,
      sede_id_out: editingTurno.sedeIdEgreso,
      licencia: editingTurno.licencia ? 1 : 0,
      feriado: editingTurno.feriado ? 1 : 0,
    };
    updateShift(payload, {
      onSuccess: () => {
        onToast('Turno actualizado');
        closeEdit();
      },
      onError: () => onToast('Error al guardar. Intenta de nuevo.', true),
    });
  }, [editingTurno, updateShift, onToast, closeEdit]);

  return (
    <>
      <View style={styles.topSection}>
        <WeekNavigator week={week} onChange={setWeek} />
      </View>
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {feriadosQuery.isFetching && !feriadosQuery.data ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={NAVY} />
              <Text style={styles.stateText}>Cargando feriados…</Text>
            </View>
          ) : feriadosQuery.isError ? (
            <View style={styles.centerState}>
              <Ionicons name="alert-circle-outline" size={36} color={RED_FLASH} style={{ marginBottom: 8 }} />
              <Text style={styles.stateText}>No se pudieron cargar los feriados.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => feriadosQuery.refetch()}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : grouped.length === 0 ? (
            <View style={styles.centerState}>
              <Ionicons name="calendar-outline" size={36} color={MUTED} style={{ marginBottom: 8 }} />
              <Text style={styles.stateText}>No hay turnos feriados en esta semana.</Text>
            </View>
          ) : (
            grouped.map(([fechaISO, dayTurnos]) => (
              <View key={fechaISO} style={styles.dayGroup}>
                <Text style={styles.dayGroupLabel}>{dayName(fechaISO)} {formatDDMM(fechaISO)}</Text>
                {dayTurnos.map((t, i) => (
                  <TurnoCard key={t.id || `${t.userContextId}-${i}`} turno={t} sedes={sedes} onPress={openEdit} />
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <EditarTurnoSheet
        visible={editingTurno !== null}
        draft={editingTurno}
        sedes={sedes}
        isSaving={isSaving}
        onClose={closeEdit}
        onField={setField}
        onSave={saveEdit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topSection: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  list: {
    gap: 0,
  },
  dayGroup: {
    marginBottom: 8,
  },
  dayGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
    marginBottom: 8,
  },
  centerState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  stateText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: NAVY,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
