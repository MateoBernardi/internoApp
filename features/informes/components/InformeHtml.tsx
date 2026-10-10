import { glassColors } from '@/shared/ui/glass';
import { HTMLElement, NodeType, parse, type Node } from 'node-html-parser';
import React, { memo, useMemo } from 'react';
import { Linking, Platform, StyleSheet, Text, TextStyle, View } from 'react-native';
import type { Adjunto } from '../dto/InformeDTO';
import { AdjuntoTile } from './AdjuntoTile';

const BLOQUES = new Set(['p', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'div']);
const IGNORADOS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'img', 'svg']);

const esElemento = (n: Node): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE;
const esBloque = (n: Node) => esElemento(n) && BLOQUES.has(n.tagName.toLowerCase());

const hrefSeguro = (href?: string) => (href && /^https?:\/\//i.test(href.trim()) ? href.trim() : null);

export interface AdjuntosEnLinea {
  informeId: string;
  adjuntos: Adjunto[];
  empleadoId?: number;
  onAbrir: (adjunto: Adjunto) => void;
}

interface Ctx {
  miId: number | null;
  baseStyle: TextStyle;
  enLinea?: AdjuntosEnLinea | undefined;
}

function Mencion({ label, mine }: { label: string; mine: boolean }) {
  return (
    <Text style={[styles.pill, mine ? styles.pillMine : styles.pillOther]} accessibilityLabel={`Mención a ${label}`}>
      {Platform.OS === 'web' ? label : ` ${label} `}
    </Text>
  );
}

function inline(nodes: Node[], ctx: Ctx, keyBase = ''): React.ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${keyBase}${i}`;
    if (n.nodeType === NodeType.TEXT_NODE) return n.text;
    if (!esElemento(n)) return null;
    const tag = n.tagName.toLowerCase();
    if (IGNORADOS.has(tag)) return null;
    if (tag === 'br') return '\n';
    const hijos = inline(n.childNodes, ctx, `${key}.`);
    switch (tag) {
      case 'strong':
      case 'b':
        return <Text key={key} style={styles.bold}>{hijos}</Text>;
      case 'em':
      case 'i':
        return <Text key={key} style={styles.italic}>{hijos}</Text>;
      case 'u':
        return <Text key={key} style={styles.underline}>{hijos}</Text>;
      case 's':
        return <Text key={key} style={styles.strike}>{hijos}</Text>;
      case 'a': {
        const href = hrefSeguro(n.getAttribute('href'));
        if (!href) return <Text key={key}>{hijos}</Text>;
        return (
          <Text key={key} style={styles.link} onPress={() => Linking.openURL(href)} accessibilityRole="link">
            {hijos}
          </Text>
        );
      }
      case 'span': {
        const id = n.getAttribute('data-mention');
        if (id && /^\d+$/.test(id)) {
          return <Mencion key={key} label={n.text.trim()} mine={ctx.miId !== null && Number(id) === ctx.miId} />;
        }
        return <Text key={key}>{hijos}</Text>;
      }
      default:
        return <Text key={key}>{hijos}</Text>;
    }
  });
}

function bloques(nodes: Node[], ctx: Ctx, keyBase = ''): React.ReactNode[] {
  const salida: React.ReactNode[] = [];
  let suelto: Node[] = [];
  const volcar = (k: string) => {
    if (suelto.some((n) => n.nodeType === NodeType.ELEMENT_NODE || n.text.trim())) {
      salida.push(<Text key={`t${k}`} style={ctx.baseStyle}>{inline(suelto, ctx)}</Text>);
    }
    suelto = [];
  };

  nodes.forEach((n, i) => {
    const key = `${keyBase}${i}`;
    if (!esBloque(n)) {
      suelto.push(n);
      return;
    }
    volcar(key);
    const el = n as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === 'div') {
      const orden = Number(el.getAttribute('data-adjunto'));
      const adjunto = ctx.enLinea?.adjuntos.find((a) => a.orden === orden);
      if (adjunto && ctx.enLinea) {
        const { informeId, empleadoId, onAbrir } = ctx.enLinea;
        salida.push(
          <View key={key} style={styles.adjunto}>
            <AdjuntoTile
              tipo={adjunto.tipo}
              nombre={adjunto.nombre}
              tamano={adjunto.tamano}
              informeId={informeId}
              adjuntoId={adjunto.id}
              {...(empleadoId !== undefined ? { empleadoId } : null)}
              grande
              onPress={() => onAbrir(adjunto)}
            />
          </View>,
        );
      }
    } else if (tag === 'p') {
      salida.push(<Text key={key} style={[ctx.baseStyle, styles.p]}>{inline(el.childNodes, ctx)}</Text>);
    } else if (tag === 'h2' || tag === 'h3') {
      salida.push(
        <Text key={key} style={[ctx.baseStyle, styles.p, tag === 'h2' ? styles.h2 : styles.h3]}>
          {inline(el.childNodes, ctx)}
        </Text>,
      );
    } else if (tag === 'blockquote') {
      salida.push(
        <View key={key} style={styles.quote}>
          {bloques(el.childNodes, ctx, `${key}.`)}
        </View>,
      );
    } else if (tag === 'ul' || tag === 'ol') {
      const items = el.childNodes.filter((c) => esElemento(c) && c.tagName.toLowerCase() === 'li');
      salida.push(
        <View key={key} style={styles.list}>
          {items.map((li, j) => (
            <View key={j} style={styles.item}>
              <Text style={[ctx.baseStyle, styles.marker]}>{tag === 'ol' ? `${j + 1}.` : '•'}</Text>
              <View style={styles.itemBody}>{bloques((li as HTMLElement).childNodes, ctx, `${key}.${j}.`)}</View>
            </View>
          ))}
        </View>,
      );
    } else {
      salida.push(...bloques(el.childNodes, ctx, `${key}.`));
    }
  });
  volcar('fin');
  return salida;
}

interface Props {
  html: string;
  miId?: number | null;
  style?: TextStyle;
  /** Adjuntos de la entrada para resolver los marcadores `data-adjunto`. */
  enLinea?: AdjuntosEnLinea;
}

export const InformeHtml = memo(({ html, miId = null, style, enLinea }: Props) => {
  const arbol = useMemo(() => parse(html ?? ''), [html]);
  return <View>{bloques(arbol.childNodes, { miId, baseStyle: { ...styles.base, ...style }, enLinea })}</View>;
});
InformeHtml.displayName = 'InformeHtml';

const styles = StyleSheet.create({
  base: { fontSize: 15, lineHeight: 22, color: '#2c3035' },
  p: { marginBottom: 4 },
  adjunto: { marginVertical: 6 },
  h2: { fontSize: 18, fontWeight: '800' },
  h3: { fontSize: 16, fontWeight: '700' },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline' },
  strike: { textDecorationLine: 'line-through' },
  link: { color: glassColors.link, textDecorationLine: 'underline' },
  pill: {
    fontWeight: '600',
    fontSize: 14,
    ...(Platform.OS === 'web' ? ({ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, whiteSpace: 'nowrap' } as TextStyle) : null),
  },
  pillOther: { backgroundColor: 'rgba(26,115,232,0.14)', color: '#1558b0' },
  pillMine: { backgroundColor: glassColors.link, color: '#ffffff' },
  quote: { borderLeftWidth: 3, borderLeftColor: 'rgba(17,24,28,0.15)', paddingLeft: 10, marginVertical: 4 },
  list: { marginVertical: 4, paddingLeft: 4 },
  item: { flexDirection: 'row', gap: 6 },
  marker: { width: 18 },
  itemBody: { flex: 1 },
});
