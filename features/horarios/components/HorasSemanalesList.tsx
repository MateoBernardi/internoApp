import { glassStyles } from '@/shared/ui/glass';
import { formatMinutos } from '@/shared/utils/duracion';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { EstadoTurnoProyeccion, HorasSemanaProyeccionDTO } from '../models/HorasExtra';
import type { HorasExtraFilter } from '../services/horasExtraService';
import { currentWeek } from '../utils/dateRange';
import { useHorasSemanaProyeccion } from '../viewmodels/useHorasExtra';
import { WeekNavigator } from './WeekNavigator';
import { ACEPTADO_COLOR, AMBER, INK, LINE, MUTED, NAVY, RED_FLASH } from '../theme';

function initials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

interface HorasSemanalesListProps {
  filter: HorasExtraFilter;
}

export function HorasSemanalesList({ filter }: HorasSemanalesListProps) {
  const [week, setWeek] = useState(() => currentWeek());
  const semanalesQuery = useHorasSemanaProyeccion(week.from, week.to, filter);
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

const ESTADO_LABEL: Record<EstadoTurnoProyeccion, string> = {
  realizado: 'Realizado',
  en_curso: 'En curso',
  proyectado: 'Planificado',
  ausente: 'Ausente',
  licencia: 'Licencia',
};

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** 'YYYY-MM-DD' → 'Lun 19/10' (fecha local, sin pasar por UTC). */
function formatDia(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const dia = new Date(y, m - 1, d);
  return `${DIAS[dia.getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

export function HorasSemanalCard({ empleado }: { empleado: HorasSemanaProyeccionDTO }) {
  const [abierto, setAbierto] = useState(false);
  const objetivo = empleado.minutosObjetivo;
  const pendiente = empleado.minutosObjetivoPendiente;
  const hayPendiente = pendiente != null && pendiente !== objetivo;
  const diferencia = empleado.minutosProyectados - objetivo;
  const cubre = diferencia >= 0;

  return (
    <View style={[glassStyles.card, styles.card]}>
      <View style={styles.cardTopRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(empleado.nombre, empleado.apellido)}</Text>
        </View>
        <View style={styles.mid}>
          <Text style={styles.nombre} numberOfLines={1}>{empleado.nombre} {empleado.apellido}</Text>
          <Text style={styles.horasText}>
            Lleva <Text style={styles.valor}>{formatMinutos(empleado.minutosRealizados)}</Text>
          </Text>
          <Text style={styles.horasText}>
            Proyección <Text style={styles.valor}>{formatMinutos(empleado.minutosProyectados)}</Text> de {formatMinutos(objetivo)} semanales
          </Text>
          <Text style={[styles.diferencia, { color: cubre ? ACEPTADO_COLOR : AMBER }]}>
            {cubre
              ? diferencia > 0 ? `Supera el objetivo por ${formatMinutos(diferencia)}` : 'Cubre el objetivo'
              : `Le faltan ${formatMinutos(-diferencia)}`}
          </Text>
          <Text style={styles.horasText}>
            Saldo de francos: <Text style={styles.valor}>{formatMinutos(empleado.minutosSaldoFrancos)}</Text>
          </Text>
          {hayPendiente && (
            <View style={styles.pendientePill}>
              <Ionicons name="arrow-forward-circle-outline" size={13} color={AMBER} />
              <Text style={styles.pendienteText}>Desde el lunes: {formatMinutos(pendiente)} semanales</Text>
            </View>
          )}
        </View>
      </View>

      {empleado.turnos.length > 0 && (
        <TouchableOpacity style={styles.toggle} onPress={() => setAbierto(v => !v)} activeOpacity={0.7}>
          <Text style={styles.toggleText}>{abierto ? 'Ocultar días' : 'Ver días'}</Text>
          <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={14} color={NAVY} />
        </TouchableOpacity>
      )}

      {abierto && (
        <View style={styles.dias}>
          {empleado.turnos.map((t, i) => (
            <View key={`${t.fecha}-${t.turno}-${i}`} style={styles.diaRow}>
              <Text style={styles.diaFecha}>{formatDia(t.fecha)} · {t.turno}</Text>
              <Text style={styles.diaValor}>
                {formatMinutos(t.minutos)} <Text style={styles.diaEstado}>({ESTADO_LABEL[t.estado]})</Text>
              </Text>
            </View>
          ))}
        </View>
      )}
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
  valor: {
    fontWeight: '700',
    color: INK,
  },
  diferencia: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },
  dias: {
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
    gap: 6,
  },
  diaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  diaFecha: {
    fontSize: 12,
    color: INK,
  },
  diaValor: {
    fontSize: 12,
    fontWeight: '700',
    color: INK,
  },
  diaEstado: {
    fontWeight: '400',
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
