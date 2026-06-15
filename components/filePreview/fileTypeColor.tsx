import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const EXT_COLORS: Record<string, string> = {
  txt: '#5b6b7a',
  pdf: '#d64545',
  doc: '#2f6fd6',
  docx: '#2f6fd6',
  xls: '#1f9d57',
  xlsx: '#1f9d57',
  csv: '#1f9d57',
  zip: '#b07a1e',
};

export function fileTypeColor(ext: string): string {
  return EXT_COLORS[ext.toLowerCase()] ?? '#7a8087';
}

export function FileTypeBadge({ ext }: { ext: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: fileTypeColor(ext) }]}>
      <Text style={styles.badgeText}>{ext.toUpperCase().slice(0, 4)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: 'monospace',
  },
});
