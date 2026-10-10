import React, { useMemo } from 'react';
import { Linking, Platform, StyleSheet, Text, type TextStyle } from 'react-native';
import { glassColors } from './glass';

export interface Fragmento {
  texto: string;
  /** URL absoluta (https) a la que apunta el fragmento; ausente en texto plano. */
  href?: string;
}

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const PUNTUACION_FINAL = /[.,;:!?'")\]}]+$/;

/** Parte un texto en fragmentos planos y links http(s); `www.` se normaliza a `https://`. */
export function partirLinks(texto: string): Fragmento[] {
  const salida: Fragmento[] = [];
  let desde = 0;
  for (const m of texto.matchAll(URL_RE)) {
    const inicio = m.index ?? 0;
    let url = m[0];
    // Los paréntesis de cierre solo son parte del link si está su apertura (p. ej. wikipedia).
    while (PUNTUACION_FINAL.test(url)) {
      const ultimo = url[url.length - 1]!;
      if (ultimo === ')' && (url.match(/\(/g)?.length ?? 0) >= (url.match(/\)/g)?.length ?? 0)) break;
      url = url.slice(0, -1);
    }
    if (!/^(?:https?:\/\/|www\.)[^\s.]/i.test(url) || /^(?:https?:\/\/|www\.)$/i.test(url)) continue;
    if (inicio > desde) salida.push({ texto: texto.slice(desde, inicio) });
    salida.push({ texto: url, href: /^www\./i.test(url) ? `https://${url}` : url });
    desde = inicio + url.length;
  }
  if (desde < texto.length) salida.push({ texto: texto.slice(desde) });
  return salida;
}

function abrir(href: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(href, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(href).catch(() => {});
}

interface Props {
  children?: string | null;
  /** Estilo del link; por defecto azul subrayado (en burbujas oscuras pasar un color legible). */
  linkStyle?: TextStyle;
}

/** Texto plano con las URLs clicables. Se usa como hijo de un `<Text>` existente. */
export function LinkifiedText({ children, linkStyle }: Props) {
  const fragmentos = useMemo(() => partirLinks(children ?? ''), [children]);
  return (
    <>
      {fragmentos.map((f, i) =>
        f.href ? (
          <Text key={i} style={[styles.link, linkStyle]} onPress={() => abrir(f.href!)} accessibilityRole="link">
            {f.texto}
          </Text>
        ) : (
          f.texto
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  link: { color: glassColors.link, textDecorationLine: 'underline' },
});
