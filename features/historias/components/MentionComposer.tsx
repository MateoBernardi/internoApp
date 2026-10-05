import { useSearchUsers } from '@/shared/users/useUser';
import { focusBorderStyles, glassColors, glassStyles } from '@/shared/ui/glass';
import { useFocusBorder } from '@/shared/ui/useFocusBorder';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputSelectionChangeEventData,
  View,
} from 'react-native';
import { nombreCompleto } from '../utils/format';
import {
  applyMention,
  detectMentionQuery,
  Mention,
  serializeMentions,
} from '../utils/mentionParser';

const MAX_SUGGESTIONS = 5;
const MIN_QUERY = 2; // useSearchUsers no busca con menos de 2 caracteres

/** Estado del borrador: lo que ve el usuario (`text`) y las menciones elegidas. */
export function useMentionDraft() {
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<Mention[]>([]);

  const addMention = useCallback((m: Mention) => {
    setMentions((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
  }, []);
  const reset = useCallback(() => {
    setText('');
    setMentions([]);
  }, []);
  /** Cuerpo listo para enviar, con `@Nombre` convertido a `@{id}`. */
  const serialize = useCallback(() => serializeMentions(text, mentions).trim(), [text, mentions]);

  return { text, setText, mentions, addMention, reset, serialize };
}

interface Props {
  draft: ReturnType<typeof useMentionDraft>;
  placeholder?: string;
  multiline?: boolean;
  minHeight?: number;
  editable?: boolean;
}

/** TextInput que al escribir `@` busca usuarios y deja elegir a quién mencionar. */
export function MentionComposer({ draft, placeholder, multiline = true, minHeight, editable = true }: Props) {
  const { text, setText, addMention } = draft;
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  // Solo se controla la selección justo después de elegir una mención (para dejar el caret
  // al final); controlarla siempre hace saltar el cursor en Android al tipear.
  const [forcedSelection, setForcedSelection] = useState<{ start: number; end: number } | undefined>();
  const { isFocused, onFocus, onBlur } = useFocusBorder();

  const open = useMemo(() => detectMentionQuery(text, selection.start), [text, selection.start]);
  const query = open?.query ?? '';
  const { data, isFetching } = useSearchUsers(query.length >= MIN_QUERY ? query : '');
  const suggestions = open && query.length >= MIN_QUERY ? (data ?? []).slice(0, MAX_SUGGESTIONS) : [];

  const onSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setSelection(e.nativeEvent.selection);
      setForcedSelection(undefined);
    },
    [],
  );

  const pick = (u: { user_context_id: number; nombre: string; apellido: string }) => {
    if (!open) return;
    const label = nombreCompleto(u);
    const next = applyMention(text, open.start, selection.start, label);
    addMention({ id: u.user_context_id, label });
    setText(next.text);
    setSelection({ start: next.caret, end: next.caret });
    setForcedSelection({ start: next.caret, end: next.caret });
  };

  return (
    <View>
      {open && (
        <View style={styles.suggestions}>
          {query.length < MIN_QUERY ? (
            <Text style={styles.hint}>Escribí al menos 2 letras para buscar a alguien…</Text>
          ) : isFetching && suggestions.length === 0 ? (
            <ActivityIndicator style={styles.loading} color={glassColors.link} />
          ) : suggestions.length === 0 ? (
            <Text style={styles.hint}>No se encontró a nadie.</Text>
          ) : (
            suggestions.map((u) => (
              <Pressable
                key={u.user_context_id}
                onPress={() => pick(u)}
                style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Mencionar a ${nombreCompleto(u)}`}
              >
                <Text style={styles.suggestionName}>{nombreCompleto(u)}</Text>
                {!!u.role?.[0] && <Text style={styles.suggestionRole}>{u.role[0]}</Text>}
              </Pressable>
            ))
          )}
        </View>
      )}
      <TextInput
        value={text}
        onChangeText={setText}
        selection={forcedSelection}
        onSelectionChange={onSelectionChange}
        onFocus={onFocus}
        onBlur={onBlur}
        editable={editable}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={glassColors.placeholder}
        style={[
          styles.input,
          focusBorderStyles.inputBorderDefault,
          isFocused && focusBorderStyles.inputBorderFocused,
          focusBorderStyles.inputNoOutline,
          minHeight ? { minHeight } : null,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    ...glassStyles.box,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: glassColors.text,
    maxHeight: 180,
    textAlignVertical: 'top',
  },
  suggestions: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.08)',
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  suggestion: { paddingHorizontal: 14, paddingVertical: 10 },
  suggestionPressed: { backgroundColor: 'rgba(26,115,232,0.08)' },
  suggestionName: { fontSize: 15, fontWeight: '600', color: glassColors.text },
  suggestionRole: { fontSize: 12, color: glassColors.textMuted, marginTop: 1 },
  hint: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: glassColors.textMuted },
  loading: { paddingVertical: 12 },
});
