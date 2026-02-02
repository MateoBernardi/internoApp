import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CreateButton } from '@/components/ui/CreateButton';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { CrearDocumento } from '../components/CrearDocumento';
import DocumentosEmpresa from './DocumentosEmpresa';
import MisDocumentos from './MisDocumentos';

const colors = Colors['light'];

type TabType = 'empresa' | 'mios';

export default function Documentos() {
  const [tab, setTab] = useState<TabType>('empresa');
  const [modalVisible, setModalVisible] = useState(false);
  const [pickedFile, setPickedFile] = useState<any>(null);
  const [query, setQuery] = useState('');

  const handleCreatePress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPickedFile(result.assets[0]);
        setModalVisible(true);
      }
    } catch (err) {
      console.error("Error seleccionando documento", err);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header con tabs */}
      <View style={[styles.header, { backgroundColor: colors.componentBackground }]}>
        <View style={styles.headerContent}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                tab === 'empresa' && [
                  styles.tabActive,
                  { borderBottomColor: colors.tint },
                ],
              ]}
              onPress={() => setTab('empresa')}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  tab === 'empresa' && {
                    color: colors.tint,
                    fontWeight: 'bold',
                  },
                ]}
              >
                Empresa
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                tab === 'mios' && [
                  styles.tabActive,
                  { borderBottomColor: colors.tint },
                ],
              ]}
              onPress={() => setTab('mios')}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  tab === 'mios' && {
                    color: colors.tint,
                    fontWeight: 'bold',
                  },
                ]}
              >
                Mis Documentos
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar archivos..."
          onClear={handleClearSearch}
        />
      </View>

      {/* Content - Direct render without extra wrapper */}
      <View style={styles.contentContainer}>
        {tab === 'empresa' ? <DocumentosEmpresa query={query} /> : <MisDocumentos query={query} />}
      </View>

      <CreateButton onPress={handleCreatePress} style={styles.fab} />

      {modalVisible && (
        <CrearDocumento
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setPickedFile(null);
          }}
          initialFile={pickedFile}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  header: {
    backgroundColor: colors.componentBackground,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.componentBackground,
  },
  contentContainer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
  },
});
