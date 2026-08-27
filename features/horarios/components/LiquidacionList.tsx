import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { HorasExtraDTO } from '../models/HorasExtra';
import type { HorasExtraFilter } from '../services/horasExtraService';
import { useHorasExtra } from '../viewmodels/useHorasExtra';
import { EmpleadoHorasExtraCard } from './EmpleadoHorasExtraCard';
import { INK, LINE, MUTED, NAVY, RED_FLASH } from '../theme';

function formatHoras(n: number): string {
  return `${Math.round(n * 10) / 10}h`;
}

interface LiquidacionListProps {
  filter: HorasExtraFilter;
  liquidandoId: number | null;
  onOpenDetail: (empleado: HorasExtraDTO) => void;
  onOpenLiquidar: (empleado: HorasExtraDTO) => void;
}

export function LiquidacionList({ filter, liquidandoId, onOpenDetail, onOpenLiquidar }: LiquidacionListProps) {
  const horasExtraQuery = useHorasExtra(filter);
  const empleados = horasExtraQuery.data ?? [];
  const totalAll = empleados.reduce((s, e) => s + e.horas, 0);

  return (
    <>
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {horasExtraQuery.isFetching && !horasExtraQuery.data ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={NAVY} />
              <Text style={styles.stateText}>Cargando horas extra…</Text>
            </View>
          ) : horasExtraQuery.isError ? (
            <View style={styles.centerState}>
              <Ionicons name="alert-circle-outline" size={36} color={RED_FLASH} style={{ marginBottom: 8 }} />
              <Text style={styles.stateText}>No se pudieron cargar las horas extra.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => horasExtraQuery.refetch()}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : empleados.length === 0 ? (
            <View style={styles.centerState}>
              <Ionicons name="time-outline" size={36} color={MUTED} style={{ marginBottom: 8 }} />
              <Text style={styles.stateText}>No hay empleados con los filtros aplicados.</Text>
            </View>
          ) : (
            empleados.map((e) => (
              <EmpleadoHorasExtraCard
                key={e.userContextId}
                empleado={e}
                isLiquidando={liquidandoId === e.userContextId}
                onPress={onOpenDetail}
                onLiquidar={onOpenLiquidar}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.infoBar}>
        {horasExtraQuery.isFetching ? (
          <Text style={styles.infoText}>Actualizando…</Text>
        ) : (
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>{empleados.length}</Text>
            {` empleado${empleados.length !== 1 ? 's' : ''} · `}
            <Text style={styles.infoBold}>{formatHoras(totalAll)}</Text>
            {' horas extra de saldo'}
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  infoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  infoText: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
  },
  infoBold: {
    fontWeight: '700',
    color: INK,
  },
});
