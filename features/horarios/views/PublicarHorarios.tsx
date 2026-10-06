import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
import { confirmAction } from '@/shared/ui/confirmAction';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { GlassButton } from '@/shared/ui/GlassButton';
import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErroresPlanilla } from '../components/ErroresPlanilla';
import { PlanificacionAlertas } from '../components/PlanificacionAlertas';
import { PlanificacionDiffList } from '../components/PlanificacionDiffList';
import { PlanificacionResumen } from '../components/PlanificacionResumen';
import type { PlanificacionAplicadaDTO, PlanificacionPreviewDTO } from '../models/Planificacion';
import { ACEPTADO_COLOR, INK, MUTED, NAVY, RED_FLASH } from '../theme';
import {
  agruparDiffPorUsuario,
  contarOmitidosRelevantes,
  formatFechaHoraLocal,
  formatMinSeg,
  totalCambios,
} from '../utils/planificacionDiff';
import { describirErrorPlanificacion } from '../utils/planificacionErrores';
import { useCuentaRegresiva } from '../viewmodels/useCuentaRegresiva';
import {
  useConfirmarPlanificacion,
  usePlanificacionInfo,
  usePreviewPlanificacion,
} from '../viewmodels/usePlanificacion';

interface PublicarHorariosProps {
  /** Lleva a "Turnos del día" (atajo después de publicar). */
  onVerTurnos?: () => void;
}

const PASOS = [
  { icono: 'create-outline', texto: 'Editá la planilla de horarios.' },
  { icono: 'git-compare-outline', texto: 'Revisá qué va a cambiar.' },
  { icono: 'cloud-upload-outline', texto: 'Publicá: los empleados afectados reciben un aviso.' },
] as const;

/**
 * Publicación de horarios desde la planilla de Google: revisar cambios (diff) → confirmar.
 * Flujo: inicio → revisión (preview) → publicado. El preview vence a los 30 minutos y cada
 * revisión tiene su propia clave de idempotencia, así que tocar "Publicar" dos veces no duplica.
 */
export function PublicarHorarios({ onVerTurnos }: PublicarHorariosProps) {
  const bottomInset = useSafeBottomInset();
  const infoQuery = usePlanificacionInfo();
  const previewMutation = usePreviewPlanificacion();
  const confirmarMutation = useConfirmarPlanificacion();
  const { idempotencyKey, regenerateIdempotencyKey } = useIdempotencyKey();

  const [preview, setPreview] = useState<PlanificacionPreviewDTO | null>(null);
  const [aplicada, setAplicada] = useState<PlanificacionAplicadaDTO | null>(null);
  // Cambios que no se aplicaron y vale la pena informar (mismo criterio que los avisos de la revisión).
  const [sinAplicar, setSinAplicar] = useState(0);
  const [error, setError] = useState<unknown>(null);

  const { segundos, vencido } = useCuentaRegresiva(preview ? preview.expiraAt : null);
  const grupos = useMemo(() => (preview ? agruparDiffPorUsuario(preview.detalle) : []), [preview]);
  const errorUI = useMemo(() => (error ? describirErrorPlanificacion(error) : null), [error]);

  const info = infoQuery.data;
  const revisando = previewMutation.isPending;
  const publicando = confirmarMutation.isPending;
  const cambios = preview ? totalCambios(preview.resumen) : 0;

  const revisar = useCallback(() => {
    setError(null);
    setAplicada(null);
    previewMutation.mutate(undefined, {
      onSuccess: (data) => {
        setPreview(data);
        regenerateIdempotencyKey(); // una key nueva por revisión
      },
      onError: (e) => {
        setPreview(null);
        setError(e);
      },
    });
  }, [previewMutation, regenerateIdempotencyKey]);

  const publicar = useCallback(async () => {
    if (!preview) return;
    const { altas, modificaciones, bajas } = preview.resumen;
    const ok = await confirmAction({
      title: 'Publicar horarios',
      message:
        `Se van a aplicar ${cambios} cambio${cambios === 1 ? '' : 's'} ` +
        `(${altas} nuevo${altas === 1 ? '' : 's'}, ${modificaciones} modificado${modificaciones === 1 ? '' : 's'}, ${bajas} eliminado${bajas === 1 ? '' : 's'}). ` +
        'Los empleados afectados reciben un aviso.',
      confirmText: 'Publicar',
    });
    if (!ok) return;

    setError(null);
    confirmarMutation.mutate(
      { previewId: preview.snapshotId, idempotencyKey },
      {
        onSuccess: (data) => {
          setSinAplicar(contarOmitidosRelevantes(preview.detalle));
          setAplicada(data);
          setPreview(null);
        },
        onError: (e) => setError(e),
      },
    );
  }, [preview, cambios, confirmarMutation, idempotencyKey]);

  const abrirPlanilla = () => {
    if (info?.planillaUrl) Linking.openURL(info.planillaUrl).catch(() => undefined);
  };

  const enRevision = preview !== null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {errorUI && <ErroresPlanilla error={errorUI} />}

        {!enRevision && !aplicada && (
          <>
            <View style={[glassStyles.card, styles.intro]}>
              <Text style={styles.introTitulo}>Publicá los horarios desde la planilla</Text>
              {PASOS.map((p, i) => (
                <View key={p.texto} style={styles.paso}>
                  <View style={styles.pasoNumero}>
                    <Text style={styles.pasoNumeroText}>{i + 1}</Text>
                  </View>
                  <Ionicons name={p.icono} size={18} color={NAVY} />
                  <Text style={styles.pasoTexto}>{p.texto}</Text>
                </View>
              ))}
              {info?.planillaUrl ? (
                <GlassButton
                  label="Abrir planilla"
                  variant="secondary"
                  icon={(c) => <Ionicons name="open-outline" size={18} color={c} />}
                  onPress={abrirPlanilla}
                />
              ) : null}
            </View>

            <View style={[glassStyles.card, styles.ultima]}>
              <Ionicons name="time-outline" size={18} color={MUTED} />
              <Text style={styles.ultimaTexto}>
                {infoQuery.isLoading
                  ? 'Cargando última publicación…'
                  : info?.ultimaPublicacion
                    ? `Última publicación: ${formatFechaHoraLocal(info.ultimaPublicacion.aplicadoAt ?? '')}` +
                      (info.ultimaPublicacion.publicadoPor
                        ? ` · ${info.ultimaPublicacion.publicadoPor.nombre} ${info.ultimaPublicacion.publicadoPor.apellido}`
                        : '')
                    : 'Todavía no se publicó ninguna planilla.'}
              </Text>
            </View>

            {revisando ? (
              <View style={styles.cargando}>
                <ActivityIndicator size="large" color={NAVY} />
                <Text style={styles.cargandoTexto}>Leyendo la planilla…</Text>
              </View>
            ) : (
              <GlassButton
                label="Revisar cambios"
                icon={(c) => <Ionicons name="git-compare-outline" size={18} color={c} />}
                onPress={revisar}
              />
            )}
          </>
        )}

        {enRevision && preview && (
          <>
            <View style={[glassStyles.card, styles.vigencia, vencido && styles.vigenciaVencida]}>
              <Ionicons name={vencido ? 'alert-circle' : 'hourglass-outline'} size={18} color={vencido ? RED_FLASH : MUTED} />
              <Text style={[styles.vigenciaTexto, vencido && { color: RED_FLASH }]}>
                {vencido ? 'La revisión venció. Volvé a revisar para publicar.' : `Revisión vigente por ${formatMinSeg(segundos)}`}
              </Text>
            </View>

            <PlanificacionResumen resumen={preview.resumen} />

            {cambios === 0 && (
              <View style={[glassStyles.successBox, styles.sinCambios]}>
                <Text style={styles.sinCambiosTitulo}>
                  {preview.igualAlVigente ? 'La planilla coincide con lo publicado' : 'No hay cambios para publicar'}
                </Text>
                <Text style={styles.sinCambiosTexto}>No hay nada que aplicar en lo que queda de la semana.</Text>
              </View>
            )}

            <PlanificacionAlertas preview={preview} />
            <PlanificacionDiffList grupos={grupos} />
          </>
        )}

        {aplicada && (
          <View style={[glassStyles.successBox, styles.exito]}>
            <View style={styles.exitoHeader}>
              <Ionicons name="checkmark-circle" size={22} color={ACEPTADO_COLOR} />
              <Text style={styles.exitoTitulo}>Horarios publicados</Text>
            </View>
            <Text style={styles.exitoTexto}>
              {aplicada.altas} nuevo{aplicada.altas === 1 ? '' : 's'} · {aplicada.modificaciones} modificado
              {aplicada.modificaciones === 1 ? '' : 's'} · {aplicada.bajas} eliminado{aplicada.bajas === 1 ? '' : 's'}
              {sinAplicar > 0 ? ` · ${sinAplicar} sin aplicar` : ''}
            </Text>
            <Text style={styles.exitoTexto}>Los empleados afectados reciben un aviso en unos minutos.</Text>
            <View style={styles.exitoAcciones}>
              {onVerTurnos && <GlassButton label="Ver turnos del día" onPress={onVerTurnos} />}
              <GlassButton label="Revisar de nuevo" variant="secondary" onPress={revisar} loading={revisando} />
            </View>
          </View>
        )}
      </ScrollView>

      {enRevision && (
        <View style={[styles.barra, { paddingBottom: Math.max(bottomInset, 12) }]}>
          <GlassButton
            label="Volver a revisar"
            variant="secondary"
            onPress={revisar}
            loading={revisando}
            disabled={publicando}
            style={styles.barraBtn}
          />
          <GlassButton
            label={cambios > 0 ? `Publicar (${cambios})` : 'Publicar'}
            variant="success"
            onPress={publicar}
            loading={publicando}
            disabled={cambios === 0 || vencido || revisando}
            style={styles.barraBtn}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 18, gap: 14, paddingBottom: 28 },
  intro: { padding: 16, gap: 12 },
  introTitulo: { fontSize: 17, fontWeight: '800', color: INK },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pasoNumero: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,115,232,0.12)',
  },
  pasoNumeroText: { fontSize: 12, fontWeight: '800', color: glassColors.link },
  pasoTexto: { flex: 1, fontSize: 14, color: INK, lineHeight: 19 },
  ultima: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  ultimaTexto: { flex: 1, fontSize: 13, color: glassColors.textMuted, lineHeight: 18 },
  cargando: { alignItems: 'center', gap: 10, paddingVertical: 18 },
  cargandoTexto: { fontSize: 14, color: MUTED },
  vigencia: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12 },
  vigenciaVencida: { borderColor: 'rgba(239,68,68,0.35)' },
  vigenciaTexto: { flex: 1, fontSize: 13, fontWeight: '600', color: glassColors.textMuted },
  sinCambios: { gap: 4 },
  sinCambiosTitulo: { fontSize: 15, fontWeight: '800', color: INK },
  sinCambiosTexto: { fontSize: 13, color: glassColors.textMuted, lineHeight: 18 },
  exito: { gap: 8 },
  exitoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exitoTitulo: { fontSize: 17, fontWeight: '800', color: INK },
  exitoTexto: { fontSize: 13.5, color: glassColors.textMuted, lineHeight: 19 },
  exitoAcciones: { gap: 8, marginTop: 6 },
  barra: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17,24,28,0.08)',
  },
  barraBtn: { flex: 1, paddingHorizontal: 12 },
});
