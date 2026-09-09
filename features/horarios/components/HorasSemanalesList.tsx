import { confirmAction } from '@/shared/ui/confirmAction';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { HorasSemanalDTO } from '../models/HorasExtra';
import type { HorasExtraFilter } from '../services/horasExtraService';
import { currentWeek } from '../utils/dateRange';
import { useDeleteObjetivoHoras, useHorasSemanalesVsObjetivo, useUpsertObjetivoHoras } from '../viewmodels/useHorasExtra';
import { WeekNavigator } from './WeekNavigator';
import { INK, MUTED, NAVY, RED_FLASH, TURNO_COLOR } from '../theme';

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
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [isFocused, setFocused] = useState(false);

  const upsertObjetivo = useUpsertObjetivoHoras();
  const deleteObjetivo = useDeleteObjetivoHoras();

  function startEditing() {
    setText(String(empleado.horasObjetivo));
    upsertObjetivo.reset();
    setEditing(true);
  }

  async function removeObjetivo() {
    const confirmed = await confirmAction({
      title: 'Quitar objetivo semanal',
      message: `¿Eliminar el objetivo semanal de ${empleado.nombre} ${empleado.apellido}?`,
      confirmText: 'Quitar',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (!confirmed) return;
    deleteObjetivo.mutate(empleado.userContextId);
  }

  const parsed = Number(text.replace(',', '.'));
  const isValid = text.trim().length > 0 && Number.isFinite(parsed) && parsed > 0;

  function save() {
    if (!isValid) return;
    upsertObjetivo.mutate(
      { userContextId: empleado.userContextId, horas: parsed, exists: true },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <View style={[glassStyles.card, styles.card]}>
      <View style={styles.cardTopRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(empleado.nombre, empleado.apellido)}</Text>
        </View>
        <View style={styles.mid}>
          <Text style={styles.nombre} numberOfLines={1}>{empleado.nombre} {empleado.apellido}</Text>
          {!editing && (
            <Text style={styles.horasText}>
              {formatHoras(empleado.horasTrabajadas)} trabajadas de {formatHoras(empleado.horasObjetivo)} semanales
            </Text>
          )}
        </View>
        {!editing && (
          <View style={styles.cardActions}>
            {deleteObjetivo.isPending ? (
              <ActivityIndicator size="small" color={RED_FLASH} style={styles.iconBtn} />
            ) : (
              <TouchableOpacity style={styles.iconBtn} onPress={removeObjetivo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={16} color={RED_FLASH} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={startEditing} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil" size={16} color={TURNO_COLOR} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {editing && (
        <View style={styles.editSection}>
          <View style={styles.editRow}>
            <View style={[glassStyles.fieldGlass, styles.editInputRow, isFocused && styles.inputFocused]}>
              <TextInput
                style={[styles.editInput, styles.inputNoOutline]}
                keyboardType="decimal-pad"
                value={text}
                onChangeText={setText}
                placeholder="0.0"
                placeholderTextColor={MUTED}
                editable={!upsertObjetivo.isPending}
                autoFocus
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              <Text style={styles.editInputSuffix}>hs</Text>
            </View>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setEditing(false)}
              disabled={upsertObjetivo.isPending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={MUTED} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, styles.saveBtn, (!isValid || upsertObjetivo.isPending) && styles.btnDisabled]}
              onPress={save}
              disabled={!isValid || upsertObjetivo.isPending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {upsertObjetivo.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="checkmark" size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
          {text.trim().length > 0 && !isValid && (
            <Text style={styles.errorText}>Ingresá un valor mayor a 0.</Text>
          )}
          {upsertObjetivo.isError && (
            <Text style={styles.errorText}>
              {(upsertObjetivo.error as Error)?.message || 'No se pudo guardar el objetivo.'}
            </Text>
          )}
        </View>
      )}
      {!editing && deleteObjetivo.isError && (
        <Text style={styles.errorText}>
          {(deleteObjetivo.error as Error)?.message || 'No se pudo quitar el objetivo.'}
        </Text>
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
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSection: {
    gap: 6,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
  },
  inputFocused: {
    borderColor: glassColors.link,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: INK,
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  editInputSuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
  },
  saveBtn: {
    backgroundColor: TURNO_COLOR,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 12,
    color: RED_FLASH,
  },
  inputNoOutline: {
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
});
