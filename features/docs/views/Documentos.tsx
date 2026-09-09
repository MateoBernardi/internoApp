import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CreateButton } from '@/components/ui/CreateButton';
import { GlassTabSelector } from '@/components/ui/GlassTabSelector';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { GlassButton } from '@/shared/ui/GlassButton';
import { focusBorderStyles, glassColors, glassStyles } from '@/shared/ui/glass';
import { useFocusBorder } from '@/shared/ui/useFocusBorder';
import { confirmAction } from '@/shared/ui/confirmAction';
import { showGlobalToast } from '@/shared/ui/toast';
import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, Modal, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CrearDocumento } from '../components/CrearDocumento';
import { DocumentOptionAction, DocumentOptionsModal } from '../components/DocumentOptionsModal';
import { EditCarpetaModal } from '../components/EditCarpetaModal';
import { Carpeta, UpdateCarpetaPayload } from '../models/Carpeta';
import { isArchivoInAuditWindow } from '../utils/auditWindow';
import { formatPartialWarnings } from '../utils/partialWarnings';
import { useArchivos, useArchivosPersonales, useCarpetas, useCreateCarpeta, useDeleteCarpeta, useSearchArchivos, useUpdateCarpeta } from '../viewmodels/useArchivos';
import DocumentosEmpresa from './DocumentosEmpresa';
import MisDocumentos from './MisDocumentos';

const colors = Colors['light'];

type TabType = 'empresa' | 'mios';

export default function Documentos() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const canCreate = true;
  const canSeeMisDocumentos = true;
  const currentUserId = user?.user_context_id;
  const { data: carpetasData } = useCarpetas('list', true);
  const { data: empresaFiles = [] } = useArchivos();
  const { data: personalFiles = [] } = useArchivosPersonales();
  const createCarpeta = useCreateCarpeta();
  const updateCarpeta = useUpdateCarpeta();
  const deleteCarpeta = useDeleteCarpeta();
  const { idempotencyKey, regenerateIdempotencyKey } = useIdempotencyKey();
  const [tab, setTab] = useState<TabType>('empresa');
  const [modalVisible, setModalVisible] = useState(false);
  const [pickedFiles, setPickedFiles] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const { data: searchResults } = useSearchArchivos(query);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [folderName, setFolderName] = useState('');
  const folderNameFocus = useFocusBorder();
  const [folderForOptions, setFolderForOptions] = useState<Carpeta | null>(null);
  const [folderToEdit, setFolderToEdit] = useState<Carpeta | null>(null);
  const [folderEditPartialWarning, setFolderEditPartialWarning] = useState<string | null>(null);
  const [folderDeleteConflictMessage, setFolderDeleteConflictMessage] = useState<string | null>(null);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);

  const navigateToFolder = (
    nextFolderId: number | null,
    options: { syncHistory?: boolean; replaceHistory?: boolean } = {}
  ) => {
    const { syncHistory = true, replaceHistory = false } = options;
    setCurrentFolderId(nextFolderId);

    if (Platform.OS !== 'web' || !syncHistory || typeof window === 'undefined') {
      return;
    }

    const currentState = (window.history.state && typeof window.history.state === 'object')
      ? window.history.state
      : {};
    const nextState = { ...currentState, docsFolderNavigation: true, folderId: nextFolderId };

    if (replaceHistory) {
      window.history.replaceState(nextState, '');
      return;
    }

    window.history.pushState(nextState, '');
  };

  useEffect(() => {
    if (!canSeeMisDocumentos && tab === 'mios') {
      setTab('empresa');
    }
  }, [canSeeMisDocumentos, tab]);

  const folders = useMemo(
    () => (carpetasData?.items || []).filter((folder: Carpeta) => folder.id !== null && folder.type !== 'virtual'),
    [carpetasData]
  );

  const foldersById = useMemo(() => {
    const map = new Map<number, Carpeta>();
    for (const folder of folders) {
      if (folder.id !== null) {
        map.set(folder.id, folder);
      }
    }
    return map;
  }, [folders]);

  const activeFiles = useMemo(
    () => (tab === 'mios' ? personalFiles : empresaFiles),
    [empresaFiles, personalFiles, tab]
  );

  const foldersWithUnreadFiles = useMemo(() => {
    const unreadFolders = new Set<number>();
    if (!currentUserId) return unreadFolders;

    for (const file of activeFiles) {
      const fileFolderId = file.id_carpeta ?? null;
      const isUnread = !file.openedAt;
      if (!fileFolderId || !isUnread || file.creadorId === currentUserId || !isArchivoInAuditWindow(file.createdAt)) {
        continue;
      }

      let cursor: number | null = fileFolderId;
      while (cursor !== null) {
        unreadFolders.add(cursor);
        cursor = foldersById.get(cursor)?.id_carpeta_padre ?? null;
      }
    }

    return unreadFolders;
  }, [activeFiles, currentUserId, foldersById]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const state = (window.history.state && typeof window.history.state === 'object')
      ? window.history.state
      : {};

    if (!state.docsFolderNavigation) {
      window.history.replaceState({ ...state, docsFolderNavigation: true, folderId: null }, '');
    }

    const onPopState = (event: PopStateEvent) => {
      const nextState = (event.state && typeof event.state === 'object') ? event.state : null;

      if (nextState?.docsFolderNavigation) {
        const folderId = Number.isInteger(nextState.folderId) ? nextState.folderId : null;
        setCurrentFolderId(folderId);
      }
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    if (currentFolderId === null || Platform.OS === 'web') {
      return;
    }

    const onHardwareBackPress = () => {
      const parentId = foldersById.get(currentFolderId)?.id_carpeta_padre ?? null;
      setCurrentFolderId(parentId);
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, [currentFolderId, foldersById]);

  const childFolders = useMemo(
    () => folders.filter((folder) => (folder.id_carpeta_padre ?? null) === currentFolderId),
    [folders, currentFolderId]
  );

  const breadcrumbs = useMemo(() => {
    const path: Carpeta[] = [];
    let pointerId = currentFolderId;

    while (pointerId !== null) {
      const node = foldersById.get(pointerId);
      if (!node) break;
      path.unshift(node);
      pointerId = node.id_carpeta_padre ?? null;
    }

    return path;
  }, [currentFolderId, foldersById]);

  const isSearchingWithResults = query.trim().length > 0 && (searchResults?.length || 0) > 0;

  const folderHeader = !isSearchingWithResults ? (
    <View style={styles.folderSection}>
      <View style={styles.breadcrumbRow}>
        <TouchableOpacity style={styles.homeButton} onPress={() => navigateToFolder(null)}>
          <Ionicons name="home-outline" size={14} color={colors.tint} />
        </TouchableOpacity>
        {breadcrumbs.map((item) => (
          <View key={item.id} style={styles.breadcrumbItem}>
            <Ionicons name="chevron-forward" size={14} color={colors.secondaryText} />
            <TouchableOpacity onPress={() => item.id !== null && navigateToFolder(item.id)}>
              <ThemedText numberOfLines={1} style={styles.breadcrumbText}>{item.nombre}</ThemedText>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.folderList}>
        {childFolders.map((folder) => (
          <View key={folder.id} style={styles.folderRowItem}>
            <TouchableOpacity
              style={styles.folderRowMain}
              onPress={() => folder.id !== null && navigateToFolder(folder.id)}
              onLongPress={() => openFolderOptions(folder)}
            >
              <View style={styles.folderRowLeft}>
                <Ionicons name="folder-outline" size={18} color={glassColors.link} />
                <ThemedText style={styles.folderRowText}>{folder.nombre}</ThemedText>
                {folder.id !== null && foldersWithUnreadFiles.has(folder.id) && <View style={styles.unreadDot} />}
              </View>
              <Ionicons name="chevron-forward" size={16} color={glassColors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.folderOptionsButton}
              onPress={() => openFolderOptions(folder)}
              accessibilityLabel={`Opciones de carpeta ${folder.nombre}`}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={glassColors.textMuted} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  ) : null;

  const handleCreateDocument = async () => {
    setFabMenuVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPickedFiles(result.assets);
        setModalVisible(true);
      }
    } catch (err) {
      console.error("Error seleccionando documento", err);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
  };

  const openCreateFolderModal = () => {
    setFabMenuVisible(false);
    setFolderName('');
    setFolderModalVisible(true);
  };

  const openEditFolderModal = (folder: Carpeta) => {
    if (folder.id === null) return;
    setFolderEditPartialWarning(null);
    setFolderToEdit(folder);
  };

  const openFolderOptions = (folder: Carpeta) => {
    setFolderForOptions(folder);
  };

  const handleDeleteFolder = async (folder: Carpeta) => {
    if (folder.id === null) return;
    const confirmed = await confirmAction({
      title: 'Eliminar carpeta',
      message: `Se eliminara ${folder.nombre} junto con subcarpetas y archivos asociados.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      destructive: true,
    });

    if (!confirmed) return;

    deleteCarpeta.mutate(folder.id as number, {
      onSuccess: () => {
        if (currentFolderId === folder.id) {
          navigateToFolder(folder.id_carpeta_padre ?? null, { replaceHistory: true });
        }
        Alert.alert('Carpeta eliminada', 'Se elimino la carpeta y su contenido asociado');
      },
      onError: (error: unknown) => {
        const statusCode = (error as any)?.statusCode;
        const message = error instanceof Error ? error.message : 'No se pudo eliminar la carpeta';

        if (statusCode === 409) {
          setFolderDeleteConflictMessage(
            `${message}\n\nPrimero move el contenido de otro creador fuera de esta carpeta y luego intenta borrarla nuevamente.`
          );
          return;
        }

        Alert.alert('Error', message);
      },
    });
  };

  const buildFolderOptions = (folder: Carpeta): DocumentOptionAction[] => {
    const options: DocumentOptionAction[] = [
      {
        key: 'delete-folder',
        label: 'Eliminar',
        icon: 'trash-outline',
        destructive: true,
        onPress: () => handleDeleteFolder(folder),
      },
    ];

    options.unshift({
      key: 'edit-folder-and-permissions',
      label: 'Editar y Administrar permisos',
      icon: 'create-outline',
      onPress: () => openEditFolderModal(folder),
    });

    return options;
  };

  const submitFolderModal = () => {
    const trimmed = folderName.trim();
    if (!trimmed) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre para la carpeta');
      return;
    }

    createCarpeta.mutate(
      {
        nombre: trimmed,
        ...(currentFolderId !== null ? { id_carpeta_padre: currentFolderId } : {}),
        idempotencyKey,
      },
      {
        onSuccess: () => {
          // La carpeta ya existe: la próxima creación es una operación nueva.
          regenerateIdempotencyKey();
          setFolderModalVisible(false);
          setFolderName('');
          Alert.alert('Carpeta creada', 'La carpeta se creo correctamente');
        },
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No se pudo crear la carpeta';
          Alert.alert('Error', message);
        },
      }
    );
  };

  const handleSubmitEditFolder = (payload: UpdateCarpetaPayload) => {
    if (!folderToEdit?.id) return;

    updateCarpeta.mutate(
      {
        id: folderToEdit.id,
        payload,
      },
      {
        onSuccess: (result) => {
          if (result.status === 'partial_success') {
            setFolderEditPartialWarning(formatPartialWarnings(result.warnings));
            showGlobalToast('Guardado parcial');
            return;
          }

          setFolderEditPartialWarning(null);
          setFolderToEdit(null);
          Alert.alert('Carpeta actualizada', 'Los cambios se guardaron correctamente');
        },
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No se pudo actualizar la carpeta';
          Alert.alert('Error', message);
        },
      }
    );
  };

  const tabs = canSeeMisDocumentos
    ? [
        { key: 'empresa', label: 'Empresa' },
        { key: 'mios', label: 'Mis Documentos' },
      ]
    : [{ key: 'empresa', label: 'Empresa' }];

  return (
    <ThemedView style={styles.container}>
      {/* Selector de pestañas + buscador */}
      <View style={styles.searchContainer}>
        <GlassTabSelector
          tabs={tabs}
          activeKey={tab}
          onChange={(key) => setTab(key as TabType)}
        />

        <View style={styles.searchRow}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar archivos..."
            onClear={handleClearSearch}
            style={styles.searchBarStyle}
          />

          {canCreate && (
            <CreateButton
              onPress={() => setFabMenuVisible((prev) => !prev)}
              accessibilityLabel="Crear documento o carpeta"
            />
          )}
        </View>
      </View>

      {/* Content - Direct render without extra wrapper */}
      <View style={styles.contentContainer}>
        {tab === 'mios' && canSeeMisDocumentos
          ? <MisDocumentos query={query} selectedFolderId={currentFolderId} listHeader={folderHeader} />
          : <DocumentosEmpresa query={query} selectedFolderId={currentFolderId} listHeader={folderHeader} />}
      </View>

      {modalVisible && (
        <CrearDocumento
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setPickedFiles([]);
          }}
          initialFiles={pickedFiles}
          initialFolderId={currentFolderId}
        />
      )}

      <DocumentOptionsModal
        visible={canCreate && fabMenuVisible}
        title="Crear"
        fileName=""
        actions={[
          {
            key: 'create-document',
            label: 'Crear documento',
            icon: 'document-text-outline',
            onPress: handleCreateDocument,
          },
          {
            key: 'create-folder',
            label: 'Crear carpeta',
            icon: 'folder-outline',
            onPress: openCreateFolderModal,
          },
        ]}
        onClose={() => setFabMenuVisible(false)}
      />

      <Modal
        visible={folderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <ModalKeyboardView
            keyboardVerticalOffset={insets.top + 12}
            style={styles.modalKavWrapper}
          >
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
              <ThemedText style={styles.modalTitle}>Crear carpeta</ThemedText>

              <ThemedText style={styles.modalLabel}>Nombre</ThemedText>
              <View style={[styles.modalInputWrap, folderNameFocus.isFocused && { borderColor: glassColors.link }]}>
                <TextInput
                  style={[styles.modalInput, focusBorderStyles.inputNoOutline]}
                  placeholder="Ej: Legales"
                  placeholderTextColor={glassColors.placeholder}
                  value={folderName}
                  onChangeText={setFolderName}
                  onFocus={folderNameFocus.onFocus}
                  onBlur={folderNameFocus.onBlur}
                />
              </View>

              <View style={styles.modalActions}>
                <GlassButton
                  variant="secondary"
                  label="Cancelar"
                  onPress={() => setFolderModalVisible(false)}
                  style={styles.modalActionButton}
                />
                <GlassButton
                  variant="primary"
                  label="Crear"
                  onPress={submitFolderModal}
                  style={styles.modalActionButton}
                />
              </View>
            </View>
          </ModalKeyboardView>
        </View>
      </Modal>

      <DocumentOptionsModal
        visible={!!folderForOptions}
        fileName={folderForOptions?.nombre || ''}
        title="Opciones de carpeta"
        actions={folderForOptions ? buildFolderOptions(folderForOptions) : []}
        onClose={() => setFolderForOptions(null)}
      />

      {folderToEdit && (
        <EditCarpetaModal
          visible={!!folderToEdit}
          carpeta={folderToEdit}
          isSaving={updateCarpeta.isPending}
          onClose={() => {
            setFolderToEdit(null);
            setFolderEditPartialWarning(null);
          }}
          partialWarningMessage={folderEditPartialWarning}
          onDismissPartialWarning={() => setFolderEditPartialWarning(null)}
          onSubmit={handleSubmitEditFolder}
        />
      )}

      <Modal
        visible={!!folderDeleteConflictMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderDeleteConflictMessage(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <ThemedText style={styles.modalTitle}>No se puede borrar la carpeta</ThemedText>
            <ThemedText style={styles.modalLabel}>{folderDeleteConflictMessage}</ThemedText>
            <View style={styles.modalActions}>
              <GlassButton
                variant="primary"
                label="Entendido"
                onPress={() => setFolderDeleteConflictMessage(null)}
                style={styles.modalActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: colors.componentBackground,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBarStyle: {
    flex: 1,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  contentContainer: {
    flex: 1,
  },
  folderSection: {
    paddingHorizontal: '4%',
    paddingBottom: '2%',
    gap: 10,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  homeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '75%',
    marginLeft: 4,
  },
  breadcrumbText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  folderSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  folderList: {
    gap: 8,
  },
  folderRowItem: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...glassStyles.card,
  },
  folderRowMain: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  folderRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  folderOptionsButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.1)',
  },
  folderRowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    ...glassStyles.modalOverlay,
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
  },
  modalKavWrapper: {
    width: '100%',
  },
  modalCard: {
    width: '100%',
    padding: 20,
    gap: 10,
    ...glassStyles.modalCard,
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: glassColors.textMuted,
  },
  modalInputWrap: {
    ...glassStyles.fieldGlass,
  },
  modalInput: {
    minHeight: 42,
    paddingHorizontal: 12,
    color: glassColors.text,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  modalActionButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
});
