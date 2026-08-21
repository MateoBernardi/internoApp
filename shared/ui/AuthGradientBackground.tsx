import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet } from 'react-native';

export const AUTH_GRADIENT_COLORS = ['#ffffff', '#eaf1fd'] as const;
export const AUTH_GRADIENT_START = AUTH_GRADIENT_COLORS[0];

export function AuthGradientBackground() {
  return (
    <LinearGradient
      colors={AUTH_GRADIENT_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
  );
}
