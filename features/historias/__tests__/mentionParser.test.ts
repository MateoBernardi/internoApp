import {
  applyMention,
  detectMentionQuery,
  previewPlano,
  serializeMentions,
  splitMentions,
} from '../utils/mentionParser';

describe('serializeMentions', () => {
  it('reemplaza @Label por @{id}', () => {
    expect(serializeMentions('hola @Ana Pérez, ¿viste?', [{ id: 7, label: 'Ana Pérez' }])).toBe(
      'hola @{7}, ¿viste?',
    );
  });

  it('no pisa una mención larga con otra más corta', () => {
    const out = serializeMentions('@Ana María y @Ana', [
      { id: 1, label: 'Ana' },
      { id: 2, label: 'Ana María' },
    ]);
    expect(out).toBe('@{2} y @{1}');
  });

  it('deja el texto intacto si la mención fue editada a mano', () => {
    expect(serializeMentions('hola @Ana Pe', [{ id: 7, label: 'Ana Pérez' }])).toBe('hola @Ana Pe');
  });
});

describe('splitMentions', () => {
  it('separa texto y menciones', () => {
    expect(splitMentions('a @{1} b @{22}')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'mention', id: 1 },
      { type: 'text', value: ' b ' },
      { type: 'mention', id: 22 },
    ]);
  });

  it('sin tokens devuelve un único texto', () => {
    expect(splitMentions('hola')).toEqual([{ type: 'text', value: 'hola' }]);
  });
});

describe('detectMentionQuery', () => {
  it('detecta un @ abierto junto al caret', () => {
    expect(detectMentionQuery('hola @an', 8)).toEqual({ start: 5, query: 'an' });
  });

  it('detecta un @ recién escrito (query vacía)', () => {
    expect(detectMentionQuery('@', 1)).toEqual({ start: 0, query: '' });
  });

  it('no detecta dentro de un email ni tras un espacio cerrado', () => {
    expect(detectMentionQuery('mail a@b', 8)).toBeNull();
    expect(detectMentionQuery('hola @ana y', 11)).toBeNull();
  });

  it('usa solo el texto anterior al caret', () => {
    expect(detectMentionQuery('@ana después', 4)).toEqual({ start: 0, query: 'ana' });
  });
});

describe('applyMention', () => {
  it('inserta la mención y deja el caret al final', () => {
    expect(applyMention('hola @an resto', 5, 8, 'Ana Pérez')).toEqual({
      text: 'hola @Ana Pérez  resto',
      caret: 16,
    });
  });
});

describe('previewPlano', () => {
  it('reemplaza tokens y corta uno incompleto', () => {
    expect(previewPlano('hola @{3} y @{1')).toBe('hola @mención y ');
  });
});
