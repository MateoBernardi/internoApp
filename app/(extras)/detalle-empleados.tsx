import { ThemedView } from "@/components/themed-view";
import { DetalleEmpleado } from '@/shared/views/DetalleEmpleado';
import React from 'react';
import { StyleSheet } from "react-native";

export default function DetalleEmpleadosScreen(props: any) {
  return (
    <ThemedView style={styles.container} lightColor="#ffffff">
      <DetalleEmpleado {...props} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '5%',
  },    
});
