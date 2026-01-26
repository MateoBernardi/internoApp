import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CreateButton } from '@/components/ui/CreateButton';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SolicitudesEnviadas } from '../components/SolicitudesEnviadas';
import { SolicitudesRecibidas } from '../components/SolicitudesRecibidas';

type TabType = 'enviadas' | 'recibidas';

export default function SolicitudesView() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('recibidas');
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const [isButtonVisible, setIsButtonVisible] = useState(true);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.y;

    // Mostrar/ocultar botón según la dirección del scroll
    if (offset > 50) {
      // Scrolling hacia abajo
      if (isButtonVisible) {
        setIsButtonVisible(false);
      }
    } else if (offset < 50) {
      // Scrolling hacia arriba
      if (!isButtonVisible) {
        setIsButtonVisible(true);
      }
    }
  };

  const handleCreatePress = () => {
    router.push('/(extras)/crear-solicitud');
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header con tabs */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: '#fafafa',
          },
        ]}
      >
        <View style={styles.headerContent}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'recibidas' && [
                  styles.tabActive,
                  { borderBottomColor: '#00054bff' },
                ],
              ]}
              onPress={() => setActiveTab('recibidas')}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === 'recibidas' && {
                    color: '#00054bff',
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
                activeTab === 'enviadas' && [
                  styles.tabActive,
                  { borderBottomColor: '#00054bff' },
                ],
              ]}
              onPress={() => setActiveTab('enviadas')}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === 'enviadas' && {
                    color: '#00054bff',
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
      {isButtonVisible && (
        <View style={styles.floatingButtonContainer}>
          <CreateButton
            onPress={handleCreatePress}
            size={56}
            accessibilityLabel="Crear nueva solicitud"
          />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    // Removed border
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
  },
});
