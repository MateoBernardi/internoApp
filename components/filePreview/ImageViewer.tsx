import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFileActions } from './useFileActions';
import type { FileItem } from './types';

interface Props {
  file: FileItem;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withTiming(MIN_SCALE);
    savedScale.value = MIN_SCALE;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedTx.value = 0;
    savedTy.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.8), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE) {
        reset();
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.value <= MIN_SCALE) return;
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > MIN_SCALE) {
        reset();
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={styles.imageWrap}>
        <Animated.View style={[styles.imageInner, animatedStyle]}>
          <Image source={{ uri }} style={styles.image} contentFit="contain" transition={200} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export function ImageViewer({ file, onClose }: Props) {
  const { share, download, print, busy } = useFileActions(file);
  const { top, bottom } = useSafeAreaInsets();

  const subtitle = [file.sender, file.date].filter(Boolean).join(' · ');

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: top }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeGlyph}>×</Text>
        </TouchableOpacity>
        <View style={styles.topTitleBlock}>
          <Text style={styles.topTitle} numberOfLines={1}>{file.name}</Text>
          {subtitle ? (
            <Text style={styles.topSubtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      {/* Image body */}
      <View style={styles.body}>
        <ZoomableImage uri={file.uri} />
        <View style={styles.captionChip} pointerEvents="none">
          <Text style={styles.captionText}>
            {file.ext.toUpperCase()}{file.size ? ` · ${file.size}` : ''} · pellizcá o tocá 2× para zoom
          </Text>
        </View>
      </View>

      {/* Action bar */}
      <View style={[styles.actionBar, { paddingBottom: Math.max(bottom, 16) }]}>
        <ActionBtn icon="share-outline" label="Compartir" onPress={share} disabled={busy} />
        <ActionBtn icon="download-outline" label="Descargar" onPress={download} disabled={busy} />
        <ActionBtn icon="print-outline" label="Imprimir" onPress={print} disabled={busy} />
      </View>
    </GestureHandlerRootView>
  );
}

function ActionBtn({ icon, label, onPress, disabled }: { icon: any; label: string; onPress: () => void; disabled: boolean }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color="#fff" />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0e1216',
  },
  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '400',
  },
  topTitleBlock: {
    flex: 1,
  },
  topTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  topSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageInner: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  captionChip: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  captionText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 13,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '600',
  },
});
