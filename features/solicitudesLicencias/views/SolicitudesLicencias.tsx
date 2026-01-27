import { ThemedView } from '@/components/themed-view';
import React from 'react';
import {
    StyleSheet,
    View
} from 'react-native';
import { LicenciasSolicitadas } from '../components/LicenciasSolicitadas';

export default function SolicitudesLicenciasView() {
  return (
    <ThemedView style={styles.container}>
      {/* Content */}
      <View style={styles.content}>
        <LicenciasSolicitadas />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});