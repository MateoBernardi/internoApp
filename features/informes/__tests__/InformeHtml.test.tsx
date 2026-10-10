import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { InformeHtml } from '../components/InformeHtml';
import type { Adjunto } from '../dto/InformeDTO';

const mockUrl = jest.fn();
jest.mock('../viewmodels/useUrlAdjunto', () => ({ useUrlAdjunto: (...args: unknown[]) => mockUrl(...args) }));

beforeEach(() => mockUrl.mockReturnValue({ url: null, isLoading: false, isError: false, error: null }));

const doc = (orden: number, nombre: string): Adjunto => ({
  id: String(orden + 10),
  entrada_id: '1',
  tipo: 'documento',
  nombre,
  mime: 'application/pdf',
  tamano: 2048,
  orden,
});

describe('InformeHtml', () => {
  it('muestra el nombre en la píldora de mención, nunca el id', () => {
    const { getByText, queryByText } = render(
      <InformeHtml html='<p>Hola <span data-mention="2">Ana Pérez</span></p>' miId={5} />,
    );
    expect(getByText(/Ana Pérez/)).toBeTruthy();
    expect(queryByText(/@2/)).toBeNull();
  });

  it('ignora scripts, imágenes y enlaces no http(s)', () => {
    const { queryByText, getByText } = render(
      <InformeHtml html='<p>ok<script>alert(1)</script><img src="x"><a href="javascript:alert(1)">link</a></p>' />,
    );
    expect(queryByText(/alert/)).toBeNull();
    expect(getByText(/link/).props.onPress).toBeUndefined();
  });

  it('renderiza listas', () => {
    const { getByText, getAllByText } = render(<InformeHtml html="<ul><li>uno</li><li>dos</li></ul><ol><li>tres</li></ol>" />);
    expect(getByText('uno')).toBeTruthy();
    expect(getAllByText('•')).toBeTruthy();
    expect(getByText('1.')).toBeTruthy();
  });

  it('dibuja el adjunto en línea en su lugar y deja pasar el que no existe', () => {
    const onAbrir = jest.fn();
    const { getAllByText, queryByText, getByLabelText } = render(
      <InformeHtml
        html='<p>antes</p><div data-adjunto="1"></div><p>después</p><div data-adjunto="9"></div>'
        enLinea={{ informeId: 'i', adjuntos: [doc(0, 'a.pdf'), doc(1, 'b.pdf')], onAbrir }}
      />,
    );
    expect(getAllByText('b.pdf')).toHaveLength(1);
    expect(queryByText('a.pdf')).toBeNull();
    fireEvent.press(getByLabelText('Abrir b.pdf'));
    expect(onAbrir).toHaveBeenCalledWith(expect.objectContaining({ orden: 1 }));
  });

  it('la imagen en línea tiene ancho propio (un % colapsaba a 0 y dejaba un hueco)', () => {
    mockUrl.mockReturnValue({ url: null, isLoading: true, isError: false, error: null });
    const imagen: Adjunto = { ...doc(0, 'foto.png'), tipo: 'imagen', mime: 'image/png' };
    const { getByLabelText, UNSAFE_getByType } = render(
      <InformeHtml
        html='<div data-adjunto="0"></div>'
        enLinea={{ informeId: 'i', adjuntos: [imagen], onAbrir: jest.fn() }}
      />,
    );
    const tile = getByLabelText('Abrir foto.png');
    const thumb = tile.children[0] as any;
    const estilo = StyleSheet.flatten(thumb.props.style);
    expect(typeof estilo.width).toBe('number');
    expect(estilo.height).toBeGreaterThan(0);
    expect(UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
  });
});
