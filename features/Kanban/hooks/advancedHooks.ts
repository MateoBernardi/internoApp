/**
 * Ejemplos avanzados de uso de TanStack Query en el Kanban
 */

// ============================================
// 1. Hook personalizado para filtrado en tiempo real
// ============================================

import { useMemo } from 'react';
import { useObjetivos } from '../hooks/useObjetivos';

export function useObjetivosFiltrados(filtros?: {
  estado?: string;
  createdBy?: number;
  searchTerm?: string;
}) {
  const { data: objetivos = [], isLoading, error } = useObjetivos();

  const filtered = useMemo(() => {
    return objetivos.filter((objetivo) => {
      // Filtro por estado
      if (filtros?.estado && objetivo.estado !== filtros.estado) {
        return false;
      }

      // Filtro por usuario
      if (filtros?.createdBy && objetivo.created_by !== filtros.createdBy) {
        return false;
      }

      // Búsqueda por texto
      if (filtros?.searchTerm) {
        const term = filtros.searchTerm.toLowerCase();
        return (
          objetivo.titulo.toLowerCase().includes(term) ||
          objetivo.descripcion.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [objetivos, filtros]);

  return { data: filtered, isLoading, error };
}

// ============================================
// 2. Hook para estadísticas del tablero
// ============================================

export function useKanbanStats() {
  const { data: objetivos = [] } = useObjetivos();

  const stats = useMemo(() => {
    return {
      total: objetivos.length,
      pendiente: objetivos.filter((o) => o.estado === 'PENDIENTE').length,
      progreso: objetivos.filter((o) => o.estado === 'PROGRESO').length,
      hecho: objetivos.filter((o) => o.estado === 'HECHO').length,
      prioridad: objetivos.filter((o) => o.estado === 'PRIORIDAD').length,
      porcentajeCompletado:
        objetivos.length > 0
          ? ((objetivos.filter((o) => o.estado === 'HECHO').length / objetivos.length) * 100)
              .toFixed(1)
          : 0,
    };
  }, [objetivos]);

  return stats;
}

// ============================================
// 3. Componente con estadísticas y filtros
// ============================================

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useKanbanStats } from './advancedHooks';

export function KanbanStats() {
  const stats = useKanbanStats();

  return (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.pendiente}</Text>
        <Text style={styles.statLabel}>Pendiente</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.progreso}</Text>
        <Text style={styles.statLabel}>En Progreso</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.hecho}</Text>
        <Text style={styles.statLabel}>Hecho</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.porcentajeCompletado}%</Text>
        <Text style={styles.statLabel}>Completado</Text>
      </View>
    </View>
  );
}

// ============================================
// 4. Componente con búsqueda y filtros
// ============================================

export function KanbanConFiltros() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  const { data: objetivos } = useObjetivosFiltrados({
    searchTerm,
    estado: filtroEstado || undefined,
  });

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar objetivos..."
        value={searchTerm}
        onChangeText={setSearchTerm}
        clearButtonMode="while-editing"
      />

      {/* Filtros por estado */}
      <View style={styles.filterButtons}>
        {['', 'PENDIENTE', 'PROGRESO', 'HECHO', 'PRIORIDAD'].map((estado) => (
          <TouchableOpacity
            key={estado || 'ALL'}
            style={[
              styles.filterButton,
              filtroEstado === estado && styles.filterButtonActive,
            ]}
            onPress={() => setFiltroEstado(estado)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filtroEstado === estado && styles.filterButtonTextActive,
              ]}
            >
              {estado || 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resultados */}
      <Text style={styles.resultsCount}>
        Encontrados: {objetivos.length} objetivo
        {objetivos.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

// ============================================
// 5. Hook para manejar cambios en tiempo real
// ============================================

import { useEffect, useState } from 'react';

export function useObjetivosEnTiempoReal() {
  const { data: objetivos = [], isLoading, error } = useObjetivos();
  const [ultimosObjetivos, setUltimosObjetivos] = useState(objetivos);
  const [cambiosRecientes, setCambiosRecientes] = useState<number[]>([]);

  useEffect(() => {
    // Detectar objetivos nuevos o modificados
    const nuevosIds: number[] = [];

    objetivos.forEach((obj) => {
      const anterior = ultimosObjetivos.find((o) => o.id === obj.id);
      if (!anterior || anterior.updated_at !== obj.updated_at) {
        nuevosIds.push(obj.id);
      }
    });

    if (nuevosIds.length > 0) {
      setCambiosRecientes(nuevosIds);

      // Limpiar después de 3 segundos
      const timer = setTimeout(() => {
        setCambiosRecientes([]);
      }, 3000);

      return () => clearTimeout(timer);
    }

    setUltimosObjetivos(objetivos);
  }, [objetivos, ultimosObjetivos]);

  return {
    objetivos,
    isLoading,
    error,
    cambiosRecientes, // IDs de objetivos que cambiaron recientemente
  };
}

// ============================================
// 6. Hook para paginación infinita (scroll)
// ============================================

import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context/AuthContext';

export function useObjetivosInfinito(pageSize = 10) {
  const { authTokens } = useAuth();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['objetivos', 'infinito'],
    queryFn: async ({ pageParam = 0 }) => {
      if (!authTokens?.access) throw new Error('No token');

      // Simular paginación (necesita ajuste en el backend)
      const response = await fetch(`/kanban?page=${pageParam}&limit=${pageSize}`);
      return response.json();
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === pageSize ? allPages.length : undefined,
    enabled: !!authTokens?.access,
  });

  const allObjetivos = data?.pages.flatMap((page) => page) ?? [];

  return {
    objetivos: allObjetivos,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  };
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  container: {
    padding: 12,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  resultsCount: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
});

// ============================================
// Ejemplo de integración en un componente
// ============================================

import { FlatList, View as ViewNative } from 'react-native';

export function KanbanCompleto() {
  const { objetivos, cambiosRecientes } = useObjetivosEnTiempoReal();
  const stats = useKanbanStats();

  return (
    <ViewNative style={styles.container}>
      <KanbanStats />

      <KanbanConFiltros />

      <FlatList
        data={objetivos}
        renderItem={({ item }) => (
          <ViewNative
            style={[
              styles.card,
              cambiosRecientes.includes(item.id) && styles.cardHighlighted,
            ]}
          >
            <Text>{item.titulo}</Text>
          </ViewNative>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
    </ViewNative>
  );
}
