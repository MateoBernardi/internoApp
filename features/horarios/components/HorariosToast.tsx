import { glassStyles } from '@/shared/ui/glass';
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface HorariosToastProps {
  message: string;
  error?: boolean;
  opacity: Animated.Value;
}

export function HorariosToast({ message, error = false, opacity }: HorariosToastProps) {
  if (!message) return null;

  return (
    <Animated.View
      style={[
        glassStyles.pill,
        styles.toast,
        error && styles.toastError,
        { opacity },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.dot, error && styles.dotError]} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 64,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(43,31,92,0.94)',
    borderColor: 'rgba(43,31,92,0.25)',
    zIndex: 100,
  },
  toastError: {
    backgroundColor: 'rgba(185,28,28,0.94)',
    borderColor: 'rgba(185,28,28,0.3)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: '#4ade80',
  },
  dotError: {
    backgroundColor: '#fecaca',
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});

