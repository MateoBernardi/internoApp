import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Adjunto } from '../dto/InformeDTO';
import { colorExtension, extensionDe, tamanoLegible } from '../utils/format';

export interface AdjuntoAbierto {
  informeId: string;
  adjunto: Adjunto;
  autor: string;
  fecha: string;
}

interface Props {
  abierto: AdjuntoAbierto | null;
  obtenerUrl: (informeId: string, adjuntoId: string) => Promise<{ url: string; expira_en: number }>;
  onClose: () => void;
}

function Video({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });
  return <VideoView player={player} style={styles.media} nativeControls contentFit="contain" />;
}

export function VisorAdjunto({ abierto, obtenerUrl, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const obtenerRef = useRef(obtenerUrl);
  obtenerRef.current = obtenerUrl;

  useEffect(() => {
    setUrl(null);
    setError(null);
    if (!abierto) return;
    let vigente = true;
    obtenerRef.current(abierto.informeId, abierto.adjunto.id)
      .then((r) => vigente && setUrl(r.url))
      .catch((e) => vigente && setError(e instanceof Error ? e.message : 'No se pudo abrir el archivo.'));
    return () => {
      vigente = false;
    };
  }, [abierto]);

  const adjunto = abierto?.adjunto;
  const ext = adjunto ? extensionDe(adjunto.nombre) : '';

  return (
    <Modal visible={!!abierto} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <View style={styles.top}>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar visor">
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <View style={styles.titles}>
            <Text style={styles.name} numberOfLines={1}>
              {adjunto?.nombre}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {abierto?.autor} · {abierto?.fecha}
            </Text>
          </View>
        </View>

        <View style={styles.stage}>
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : !url ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>Generando enlace seguro…</Text>
            </View>
          ) : adjunto?.tipo === 'imagen' ? (
            <Image source={{ uri: url }} style={styles.media} contentFit="contain" />
          ) : adjunto?.tipo === 'video' ? (
            <Video url={url} />
          ) : (
            <View style={styles.doc}>
              <View style={[styles.docBadge, { backgroundColor: colorExtension(ext) }]}>
                <Text style={styles.docExt}>{(ext || 'doc').toUpperCase().slice(0, 4)}</Text>
              </View>
              <Text style={styles.docName} numberOfLines={2}>
                {adjunto?.nombre}
              </Text>
              <Text style={styles.sub}>
                {(ext || 'archivo').toUpperCase()} · {tamanoLegible(adjunto?.tamano ?? 0)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.foot}>
          <Text style={styles.footText}>
            <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.6)" /> Enlace firmado · vence en 15 min
          </Text>
          <Pressable
            onPress={() => url && Linking.openURL(url)}
            disabled={!url}
            style={[styles.download, !url && styles.downloadOff]}
            accessibilityRole="button"
          >
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={styles.downloadText}>Descargar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0e1216' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 44, paddingBottom: 10 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1 },
  name: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  media: { width: '100%', height: '100%', borderRadius: 8 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  error: { color: '#ff8a80', fontSize: 14, textAlign: 'center' },
  doc: { alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  docBadge: { width: 92, height: 92, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  docExt: { color: '#fff', fontSize: 22, fontWeight: '800' },
  docName: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  footText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  download: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  downloadOff: { opacity: 0.4 },
  downloadText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
