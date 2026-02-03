import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CreateButton } from '@/components/ui/CreateButton';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SolicitudesEnviadas } from '../components/SolicitudesEnviadas';
import { SolicitudesRecibidas } from '../components/SolicitudesRecibidas';

type TabType = 'enviadas' | 'recibidas';
const colors = Colors['light'];


export default function SolicitudesView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('recibidas');

  const handleCreatePress = () => {
    router.push('/(extras)/crear-solicitud');
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header con tabs */}
      <View
        style={styles.header}
      >
        <View style={styles.headerContent}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'recibidas' && styles.tabActive,
              ]}
              onPress={() => setActiveTab('recibidas')}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === 'recibidas' && {
                    color: colors.tint,
                    fontWeight: 'bold',
                  },
                ]}
              >
                Recibidas
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'enviadas' && styles.tabActive,
              ]}
              onPress={() => setActiveTab('enviadas')}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === 'enviadas' && {
                    color: colors.tint,
                    fontWeight: 'bold',
                  },
                ]}
              >
                Enviadas
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Contenido */}
      <View style={styles.content}>
        {activeTab === 'recibidas' ? (
          <SolicitudesRecibidas />
        ) : (
          <SolicitudesEnviadas />
        )}
      </View>

      {/* Botón flotante */}
      {
        <View style={[styles.floatingButtonContainer, { bottom: insets.bottom + 8, right: 36 }]}>
          <CreateButton
            onPress={handleCreatePress}
            size={56}
            accessibilityLabel="Crear nueva solicitud"
          />
        </View>
      }
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    backgroundColor: colors.componentBackground,
  },
  title: {
    marginBottom: 12,
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.tint,
  },
  tabText: {
    fontSize: 18,
    fontWeight: '500',
    paddingBottom: 10
  },
  content: {
    flex: 1,
  },
  floatingButtonContainer: {
    position: 'absolute',
    right: 36,
  },
});
