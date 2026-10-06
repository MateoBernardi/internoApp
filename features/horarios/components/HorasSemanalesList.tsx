import { glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { HorasSemanalDTO } from '../models/HorasExtra';
import type { HorasExtraFilter } from '../services/horasExtraService';
import { currentWeek } from '../utils/dateRange';
import { useHorasSemanalesVsObjetivo } from '../viewmodels/useHorasExtra';
import { WeekNavigator } from './WeekNavigator';
import { AMBER, INK, MUTED, NAVY, RED_FLASH } from '../theme';

function formatHoras(n: number): string {
  return `${Math.round(n * 10) / 10} hs`;
}

function initials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

interface HorasSemanalesListProps {
  filter: HorasExtraFilter;
}

export function HorasSemanalesList({ filter }: HorasSemanalesListProps) {
  const [week, setWeek] = useState(() => currentWeek());
  const semanalesQuery = useHorasSemanalesVsObjetivo(week.from, week.to, filter);
  const empleados = semanalesQuery.data ?? [];

  return (
    <>
      <View style={styles.topSection}>
        <WeekNavigator week={week} onChange={setWeek} />
      </View>
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          <View style={styles.nota}>
            <Ionicons name="information-circle-outline" size={16} color={MUTED} />
            <Text style={styles.notaTexto}>
              Los objetivos de horas se editan en la planilla de horarios. Un cambio rige desde la semana próxima.
            </Text>
          </View>
          {semanalesQuery.isFetching && !semanalesQuery.data ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={NAVY} />
              <Text style={styles.stateText}>Cargando horas semanales…</Text>
            </View>
          ) : semanalesQuery.isError ? (
            <View style={styles.centerState}>
              <Ionicons name="alert-circle-outline" size={36} color={RED_FLASH} style={{ marginBottom: 8 }} />
              <Text style={styles.stateText}>No se pudieron cargar las horas semanales.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => semanalesQuery.refetch()}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : empleados.length === 0 ? (
            <View style={styles.centerState}>
              <Ionicons name="flag-outline" size={36} color={MUTED} style={{ marginBottom: 8 }} />
              <Text style={styles.stateText}>No hay empleados con objetivo de horas cargado.</Text>
            </View>
          ) : (
            empleados.map((e) => <HorasSemanalCard key={e.userContextId} empleado={e} />)
          )}
        </View>
      </ScrollView>
    </>
  );
}

function HorasSemanalCard({ empleado }: { empleado: HorasSemanalDTO }) {
  const pendiente = empleado.horasObjetivoPendiente;
  const hayPendiente = pendiente != null && pendiente !== empleado.horasObjetivo;

  return (
    <View style={[glassStyles.card, styles.card]}>
      <View style={styles.cardTopRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(empleado.nombre, empleado.apellido)}</Text>
        </View>
        <View style={styles.mid}>
          <Text style={styles.nombre} numberOfLines={1}>{empleado.nombre} {empleado.apellido}</Text>
          <Text style={styles.horasText}>
            {formatHoras(empleado.horasTrabajadas)} trabajadas de {formatHoras(empleado.horasObjetivo)} semanales
          </Text>
          {hayPendiente && (
            <View style={styles.pendientePill}>
              <Ionicons name="arrow-forward-circle-outline" size={13} color={AMBER} />
              <Text style={styles.pendienteText}>Desde el lunes: {formatHoras(pendiente)} semanales</Text>
            </View>
          )}
        </View>
      </View>
    </View>
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
  card: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 9,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47,134,214,0.12)',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: NAVY,
  },
  mid: {
    flex: 1,
    gap: 2,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '700',
    color: INK,
  },
  horasText: {
    fontSize: 12,
    color: MUTED,
  },
  nota: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingBottom: 12,
  },
  notaTexto: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    color: MUTED,
  },
  pendientePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(201,138,26,0.12)',
  },
  pendienteText: {
    fontSize: 11,
    fontWeight: '700',
    color: AMBER,
  },
});
