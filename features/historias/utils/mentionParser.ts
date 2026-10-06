/**
 * Menciones del lago de historias.
 *
 * El backend guarda las menciones como tokens `@{id}` dentro del cuerpo (el id es
 * `user_context_id`). En la UI el usuario ve y edita `@Nombre Apellido`; acá se
 * convierte entre ambas representaciones. Todo es puro para poder testearlo.
 */

export interface Mention {
  id: number;
  /** Nombre visible, sin la arroba. Ej: "Ana Pérez". */
  label: string;
}

export type MentionSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; id: number };

const TOKEN = /@\{(\d+)\}/g;
// `@` al inicio o tras un espacio, seguido de una palabra sin espacios hasta el caret.
const OPEN_MENTION = /(?:^|\s)@([^\s@{}]{0,30})$/;

/** Reemplaza cada `@Label` de las menciones elegidas por su token `@{id}`. */
export function serializeMentions(text: string, mentions: Mention[]): string {
  // Las más largas primero: "@Ana María" no debe quedar partida por "@Ana".
  const ordered = [...mentions].sort((a, b) => b.label.length - a.label.length);
  let out = text;
  for (const m of ordered) {
    out = out.split(`@${m.label}`).join(`@{${m.id}}`);
  }
  return out;
}

/** Parte un cuerpo con tokens en segmentos de texto y de mención, para renderizar. */
export function splitMentions(cuerpo: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let last = 0;
  for (const match of cuerpo.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ type: 'text', value: cuerpo.slice(last, start) });
    segments.push({ type: 'mention', id: Number(match[1]) });
    last = start + match[0].length;
  }
  if (last < cuerpo.length) segments.push({ type: 'text', value: cuerpo.slice(last) });
  return segments;
}

/**
 * Si el caret está justo después de un `@palabra`, devuelve dónde empieza la
 * mención (posición del `@`) y lo escrito después. Si no, null.
 */
export function detectMentionQuery(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = OPEN_MENTION.exec(before);
  if (!match) return null;
  const query = match[1] ?? '';
  return { start: caret - query.length - 1, query };
}

/** Sustituye el `@query` abierto por `@Label ` y devuelve el texto y el caret nuevos. */
export function applyMention(
  text: string,
  start: number,
  caret: number,
  label: string,
): { text: string; caret: number } {
  const insert = `@${label} `;
  return {
    text: text.slice(0, start) + insert + text.slice(caret),
    caret: start + insert.length,
  };
}

/** Texto plano para previews: las menciones se muestran genéricas y se corta un token a medias. */
export function previewPlano(cuerpo: string): string {
  return cuerpo.replace(/@\{\d*$/, '').replace(TOKEN, '@mención');
}
