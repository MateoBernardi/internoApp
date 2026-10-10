import { glassColors } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TipoAdjunto } from '../dto/InformeDTO';
import { useUrlAdjunto } from '../viewmodels/useUrlAdjunto';
import { colorExtension, extensionDe, tamanoLegible } from '../utils/format';

interface Props {
  tipo: TipoAdjunto;
  nombre: string;
  tamano: number;
  uri?: string;
  /** Adjunto ya guardado: con estos ids se pide la URL firmada para mostrar la miniatura. */
  informeId?: string;
  adjuntoId?: string;
  empleadoId?: number;
  /** Versión grande para adjuntos dentro del texto. */
  grande?: boolean;
  size?: number;
  onPress?: () => void;
  onRemove?: () => void;
}

export function AdjuntoTile({
  tipo,
  nombre,
  tamano,
  uri,
  informeId,
  adjuntoId,
  empleadoId,
  grande = false,
  size = 76,
  onPress,
  onRemove,
}: Props) {
  const { url: urlFirmada, isLoading, isError, error } = useUrlAdjunto(
    informeId ?? '',
    adjuntoId ?? '',
    empleadoId,
    tipo === 'imagen' && !uri && !!informeId && !!adjuntoId,
  );
  const fuente = uri ?? urlFirmada;
  const [imagenRota, setImagenRota] = useState(false);
  const fallo = imagenRota || isError;

  useEffect(() => {
    setImagenRota(false);
  }, [fuente]);

  useEffect(() => {
    if (isError) console.warn('[informes] no se pudo obtener la URL del adjunto', adjuntoId, error);
  }, [isError, adjuntoId, error]);
  const esDocumento = tipo === 'documento';
  const ext = extensionDe(nombre);

  const contenido = esDocumento ? (
    <View style={styles.chip}>
      <View style={[styles.badge, { backgroundColor: colorExtension(ext) }]}>
        <Text style={styles.badgeText}>{(ext || 'doc').toUpperCase().slice(0, 4)}</Text>
      </View>
      <Text style={styles.chipName} numberOfLines={1}>
        {nombre}
      </Text>
      <Text style={styles.chipSize}>{tamanoLegible(tamano)}</Text>
    </View>
  ) : (
    <View style={[styles.thumb, grande ? styles.thumbGrande : { width: size, height: size }]}>
      {tipo === 'imagen' && fuente && !fallo ? (
        <Image
          source={{ uri: fuente }}
          style={StyleSheet.absoluteFill}
          contentFit={grande ? 'contain' : 'cover'}
          onError={() => {
            console.warn('[informes] no se pudo cargar la imagen del adjunto', adjuntoId);
            setImagenRota(true);
          }}
        />
      ) : tipo === 'imagen' && isLoading ? (
        <ActivityIndicator color={glassColors.textMuted} />
      ) : (
        <Ionicons
          name={tipo === 'imagen' ? (fallo ? 'alert-circle-outline' : 'image-outline') : 'videocam-outline'}
          size={grande ? 40 : size / 3}
          color={glassColors.textMuted}
          style={fallo ? styles.fallo : undefined}
        />
      )}
      {tipo === 'video' && (
        <View style={styles.play}>
          <Ionicons name="play" size={14} color="#fff" />
        </View>
      )}
    </View>
  );

  return (
    <View>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${nombre}`}
        style={({ pressed }) => pressed && onPress && styles.pressed}
      >
        {contenido}
      </Pressable>
      {onRemove && (
        <Pressable onPress={onRemove} style={styles.remove} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Quitar ${nombre}`}>
          <Ionicons name="close" size={12} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  thumb: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.08)',
    backgroundColor: 'rgba(17,24,28,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Ancho fijo: un porcentaje colapsa a 0 dentro de un contenedor que se ajusta al contenido.
  thumbGrande: { width: 320, maxWidth: '100%', height: 220 },
  fallo: { opacity: 0.5 },
  play: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(17,21,27,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.08)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 10,
    backgroundColor: '#ffffff',
  },
  badge: { minWidth: 34, paddingHorizontal: 4, paddingVertical: 4, borderRadius: 6, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 9.5, fontWeight: '800' },
  chipName: { fontSize: 13, fontWeight: '600', color: glassColors.text, maxWidth: 170, flexShrink: 1 },
  chipSize: { fontSize: 11.5, color: glassColors.textMuted },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4a5058',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
