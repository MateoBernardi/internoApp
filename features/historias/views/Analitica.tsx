import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarList, BarRow } from '../components/BarList';
import { Column, ColumnChart } from '../components/ColumnChart';
import { nombreCompleto } from '../utils/format';
import {
  useActividadSemanal,
  useGrafoMenciones,
  usePalabras,
  usePalabrasDePersona,
  usePersonasMencionadas,
} from '../viewmodels/useHistorias';

const SEMANAS_VISIBLES = 12;
const ARISTAS_VISIBLES = 15;

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function Analitica() {
  const palabras = usePalabras();
  const personas = usePersonasMencionadas();
  const grafo = useGrafoMenciones();
  const actividad = useActividadSemanal();
  const [personaSel, setPersonaSel] = useState<number | null>(null);
  const palabrasPersona = usePalabrasDePersona(personaSel);

  const palabraRows = useMemo<BarRow[]>(
    () => (palabras.data ?? []).map((p) => ({ key: p.palabra, label: p.palabra, value: p.apariciones })),
    [palabras.data],
  );

  const personaRows = useMemo<BarRow[]>(
    () =>
      (personas.data ?? []).slice(0, 15).map((p) => ({
        key: String(p.persona_id),
        label: nombreCompleto(p) || `Usuario ${p.persona_id}`,
        value: p.menciones,
        // Siempre junto al conteo: distingue "muchas menciones" de "mencionada por muchos".
        detail: `por ${p.mencionada_por} ${p.mencionada_por === 1 ? 'autor' : 'autores'}`,
      })),
    [personas.data],
  );

  const aristaRows = useMemo<BarRow[]>(() => {
    if (!grafo.data) return [];
    const nombres = new Map(grafo.data.nodos.map((n) => [n.id, nombreCompleto(n) || `Usuario ${n.id}`]));
    return [...grafo.data.aristas]
      .sort((a, b) => b.menciones - a.menciones)
      .slice(0, ARISTAS_VISIBLES)
      .map((a) => ({
        key: `${a.de}-${a.a}`,
        label: `${nombres.get(a.de) ?? a.de} → ${nombres.get(a.a) ?? a.a}`,
        value: a.menciones,
        detail: `${a.historias} ${a.historias === 1 ? 'historia' : 'historias'}`,
      }));
  }, [grafo.data]);

  const semanas = useMemo<Column[]>(
    () =>
      (actividad.data ?? [])
        .slice(-SEMANAS_VISIBLES)
        .map((s) => ({ key: s.semana, label: fechaCorta(s.semana), value: s.entradas })),
    [actividad.data],
  );

  const personaSelNombre = personaRows.find((r) => r.key === String(personaSel))?.label;
  const personaPalabraRows = useMemo<BarRow[]>(
    () => (palabrasPersona.data ?? []).map((p) => ({ key: p.palabra, label: p.palabra, value: p.apariciones })),
    [palabrasPersona.data],
  );

  if ([palabras, personas, grafo, actividad].every((q) => q.isLoading)) {
    return <ScreenSkeleton rows={5} showHeader={false} />;
  }

  const firstError = [palabras, personas, grafo, actividad].find((q) => q.isError)?.error;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {firstError ? (
        <Text style={styles.error}>
          {firstError instanceof Error ? firstError.message : 'No se pudo cargar la analítica.'}
        </Text>
      ) : null}
      <Text style={styles.note}>Se actualiza cada hora.</Text>

      <Section title="Actividad semanal" subtitle={`Entradas por semana (últimas ${SEMANAS_VISIBLES}), desde el lunes indicado`}>
        <ColumnChart columns={semanas} emptyText="Todavía no hay actividad." />
      </Section>

      <Section title="Palabras más usadas" subtitle="Últimos 90 días">
        <BarList rows={palabraRows} emptyText="Todavía no hay palabras para mostrar." />
      </Section>

      <Section title="Personas más mencionadas" subtitle="Tocá una persona para ver las palabras de sus historias">
        <BarList
          rows={personaRows}
          emptyText="Todavía no hay menciones."
          selectedKey={personaSel === null ? null : String(personaSel)}
          onPressRow={(r) => setPersonaSel((cur) => (cur === Number(r.key) ? null : Number(r.key)))}
        />
        {personaSel !== null && (
          <View style={styles.drill}>
            <Text style={styles.drillTitle}>Palabras alrededor de {personaSelNombre ?? 'la persona'}</Text>
            {palabrasPersona.isLoading ? (
              <Text style={styles.subtitle}>Cargando…</Text>
            ) : (
              <BarList rows={personaPalabraRows} emptyText="Sin palabras para mostrar." />
            )}
          </View>
        )}
      </Section>

      <Section title="Quién menciona a quién" subtitle={`Las ${ARISTAS_VISIBLES} relaciones con más menciones`}>
        <BarList rows={aristaRows} emptyText="Todavía no hay menciones." />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  note: { fontSize: 12, color: glassColors.textMuted },
  error: { color: glassColors.error },
  section: { ...glassStyles.card, padding: 14, gap: 10 },
  title: { fontSize: 16, fontWeight: '700', color: glassColors.text },
  subtitle: { fontSize: 12, color: glassColors.textMuted, marginTop: -6 },
  drill: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(17,24,28,0.08)', gap: 8 },
  drillTitle: { fontSize: 14, fontWeight: '600', color: glassColors.text },
});
