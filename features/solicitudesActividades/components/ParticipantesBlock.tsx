import { focusBorderStyles, glassColors, glassStyles } from '@/shared/ui/glass';
import { useFocusBorder } from '@/shared/ui/useFocusBorder';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export interface Participante {
  id: number;
  nombre: string;
  subtitulo?: string;
}

interface Props {
  participantes: Participante[];
  onRemove?: (id: number) => void;
  onAgregar?: () => void;
  canManage?: boolean;
  isRemovable?: (id: number) => boolean;
  extraContent?: React.ReactNode;
  renderRowSub?: (id: number) => React.ReactNode;
  /** Arranca expandido — para cuando ya se llegó acá con un tap explícito
   * (ej. modal de participantes) y no hace falta un segundo paso. */
  initialExpanded?: boolean;
}

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function ParticipantesBlock({
  participantes,
  onRemove,
  onAgregar,
  canManage,
  isRemovable,
  extraContent,
  renderRowSub,
  initialExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [query, setQuery] = useState('');
  const searchFocus = useFocusBorder();

  const stackAvatars = participantes.slice(0, 4);
  const overflow = participantes.length > 4 ? participantes.length - 4 : 0;

  const filtered =
    query.trim()
      ? participantes.filter(p =>
          p.nombre.toLowerCase().includes(query.toLowerCase()),
        )
      : participantes;

  const canRemoveRow = (id: number) =>
    !!canManage && !!onRemove && (isRemovable ? isRemovable(id) : true);

  return (
    <View>
      {/* Collapsible card */}
      <View style={s.card}>
        <TouchableOpacity
          style={s.collapsedRow}
          onPress={() => setExpanded(e => !e)}
          activeOpacity={0.72}
        >
          <View style={s.avatarStack}>
            {stackAvatars.map((p, i) => (
              <View key={p.id} style={[s.avatarXs, i > 0 && s.avatarXsOverlap]}>
                <Text style={s.avatarXsText}>{initials(p.nombre)}</Text>
              </View>
            ))}
            {overflow > 0 && (
              <View style={[s.overflowChip, s.avatarXsOverlap]}>
                <Text style={s.overflowText}>+{overflow}</Text>
              </View>
            )}
          </View>

          <View style={s.caption}>
            <Text style={s.captionTitle}>{participantes.length} participantes</Text>
            <Text style={s.captionSub}>
              {expanded ? 'Tocá para contraer' : 'Tocá para ver y administrar'}
            </Text>
          </View>

          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={glassColors.textMuted}
          />
        </TouchableOpacity>

        {expanded && (
          <View style={s.expandedSection}>
            {participantes.length > 6 && (
              <View style={[s.searchBar, searchFocus.isFocused && { borderBottomColor: glassColors.link }]}>
                <Ionicons name="search" size={15} color={glassColors.textMuted} />
                <TextInput
                  style={[s.searchInput, focusBorderStyles.inputNoOutline]}
                  placeholder="Buscar participante"
                  placeholderTextColor={glassColors.placeholder}
                  value={query}
                  onChangeText={setQuery}
                  onFocus={searchFocus.onFocus}
                  onBlur={searchFocus.onBlur}
                />
              </View>
            )}

            <ScrollView style={s.list} nestedScrollEnabled showsVerticalScrollIndicator>
              {filtered.length === 0 ? (
                <Text style={s.emptyFilter}>Sin resultados</Text>
              ) : (
                filtered.map(p => (
                  <View key={p.id} style={s.row}>
                    <View style={s.avatarSm}>
                      <Text style={s.avatarSmText}>{initials(p.nombre)}</Text>
                    </View>
                    <View style={s.rowInfo}>
                      <Text style={s.rowName}>{p.nombre}</Text>
                      {renderRowSub
                        ? renderRowSub(p.id)
                        : p.subtitulo
                        ? <Text style={s.rowSub}>{p.subtitulo}</Text>
                        : null}
                    </View>
                    {canRemoveRow(p.id) && (
                      <TouchableOpacity
                        style={s.removeBtn}
                        onPress={() => onRemove!(p.id)}
                      >
                        <Text style={s.removeBtnText}>{'×'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            {extraContent}

            <View style={s.footer}>
              <Text style={s.footerCount}>{participantes.length} en total</Text>
              {canManage && onAgregar && (
                <TouchableOpacity style={s.addPill} onPress={onAgregar}>
                  <Text style={s.addPillText}>{'+ Agregar'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  addPill: {
    borderWidth: 1,
    borderColor: 'rgba(26,115,232,0.35)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(26,115,232,0.12)',
  },
  addPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: glassColors.link,
  },
  card: {
    overflow: 'hidden',
    ...glassStyles.card,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarXs: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(26,115,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarXsOverlap: {
    marginLeft: -10,
  },
  avatarXsText: {
    fontSize: 11,
    fontWeight: '700',
    color: glassColors.link,
  },
  overflowChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(17,24,28,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  overflowText: {
    fontSize: 11,
    fontWeight: '700',
    color: glassColors.textMuted,
  },
  caption: {
    flex: 1,
  },
  captionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: glassColors.text,
  },
  captionSub: {
    fontSize: 12,
    color: glassColors.textMuted,
    marginTop: 1,
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,24,28,0.08)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,24,28,0.08)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: glassColors.text,
  },
  list: {
    maxHeight: 160,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  emptyFilter: {
    textAlign: 'center',
    color: glassColors.textMuted,
    fontSize: 14,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  avatarSm: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(26,115,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmText: {
    fontSize: 13,
    fontWeight: '700',
    color: glassColors.link,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: glassColors.text,
  },
  rowSub: {
    fontSize: 12,
    color: glassColors.textMuted,
    marginTop: 1,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.35)',
    backgroundColor: 'rgba(244,67,54,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: glassColors.error,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,24,28,0.08)',
  },
  footerCount: {
    fontSize: 12,
    color: glassColors.textMuted,
  },
});
