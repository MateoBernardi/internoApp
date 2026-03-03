import { CambiarRolEmpleado } from "@/components/CambiarRolEmpleado";
import { ThemedView } from "@/components/themed-view";
import React from 'react';
import { StyleSheet } from "react-native";

export default function CambiarRolEmpleadoScreen(props: any) {
  return (
    <ThemedView style={styles.container}>
      <CambiarRolEmpleado />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '5%',
  },    
});