import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CreateButton } from '@/components/ui/CreateButton';
import { Colors } from '@/constants/theme';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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


interface SolicitudesViewProps {
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

export default function SolicitudesView({ onRefresh, refreshing }: SolicitudesViewProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasRole } = useRoleCheck();
  const isConsejo = hasRole('consejo');

  const [activeTab, setActiveTab] = useState<TabType>('recibidas');

  useEffect(() => {
    if (isConsejo && activeTab === 'enviadas') {
      setActiveTab('recibidas');
    }
  }, [isConsejo, activeTab]);

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
            {!isConsejo && (
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
            )}
          </View>
        </View>
      </View>

      {/* Contenido */}
      <View style={styles.content}>
        {activeTab === 'enviadas' && !isConsejo ? (
          <SolicitudesEnviadas onRefresh={onRefresh} refreshing={refreshing} />
        ) : (
          <SolicitudesRecibidas onRefresh={onRefresh} refreshing={refreshing} />
        )}
      </View>

      {/* Botón flotante */}
      {!isConsejo &&
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
    paddingHorizontal: '4%',
    paddingVertical: '3%',
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
    marginHorizontal: '-4%',
    paddingHorizontal: '4%',
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
