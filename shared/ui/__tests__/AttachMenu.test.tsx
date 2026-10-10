import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Modal, Platform, Text, View } from 'react-native';
import { calcularPosicion, useAttachMenu } from '../AttachMenu';

const ventana = { width: 800, height: 600 };

describe('calcularPosicion', () => {
  it('abre debajo del botón alineado a su borde izquierdo', () => {
    const p = calcularPosicion({ x: 100, y: 100, width: 40, height: 40 }, ventana);
    expect(p).toMatchObject({ left: 100, top: 146, arriba: false });
  });

  it('abre arriba cuando el botón está al pie (composer de chat)', () => {
    const p = calcularPosicion({ x: 20, y: 560, width: 34, height: 34 }, ventana);
    expect(p.arriba).toBe(true);
    expect(p.top).toBeLessThan(560);
  });

  it('se alinea al borde derecho del botón si no entra a la derecha', () => {
    const p = calcularPosicion({ x: 760, y: 100, width: 34, height: 34 }, ventana);
    expect(p.left).toBe(800 - 224 - 8); // borde derecho del botón (570) acotado al margen de la ventana
  });

  it('nunca se sale de la ventana', () => {
    const p = calcularPosicion({ x: 0, y: 0, width: 10, height: 10 }, { width: 200, height: 200 });
    expect(p.left).toBeGreaterThanOrEqual(8);
    expect(p.top).toBeGreaterThanOrEqual(8);
  });
});

describe('useAttachMenu', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
  });

  function Prueba({ handlers }: { handlers: { onGallery: () => void; onCamera: () => void; onFile: () => void } }) {
    const { openAttachMenu, AttachMenu } = useAttachMenu(handlers);
    const ref = React.useRef<any>(null);
    return (
      <View>
        <View
          ref={(nodo: any) => {
            if (nodo) nodo.measureInWindow = (cb: (x: number, y: number, w: number, h: number) => void) => cb(10, 560, 34, 34);
            ref.current = nodo;
          }}
        />
        <Text onPress={() => openAttachMenu(ref)}>abrir</Text>
        {AttachMenu}
      </View>
    );
  }

  it('muestra las tres opciones y ejecuta la elegida', () => {
    Platform.OS = 'android';
    const handlers = { onGallery: jest.fn(), onCamera: jest.fn(), onFile: jest.fn() };
    const { getByText, queryByText } = render(<Prueba handlers={handlers} />);
    expect(queryByText('Galería')).toBeNull();

    act(() => fireEvent.press(getByText('abrir')));
    expect(getByText('Galería')).toBeTruthy();
    expect(getByText('Cámara')).toBeTruthy();
    expect(getByText('Documento')).toBeTruthy();

    act(() => fireEvent.press(getByText('Cámara')));
    expect(handlers.onCamera).toHaveBeenCalledTimes(1);
    expect(handlers.onGallery).not.toHaveBeenCalled();
  });

  describe('menú centrado', () => {
    function PruebaCentrada({ handlers }: { handlers: { onGallery: () => void; onCamera: () => void; onFile: () => void } }) {
      const { openAttachMenuCentered, AttachMenu } = useAttachMenu(handlers);
      return (
        <View>
          <Text onPress={() => openAttachMenuCentered()}>abrir</Text>
          {AttachMenu}
        </View>
      );
    }

    it('muestra título, las tres opciones y Cancelar, y ejecuta la elegida', () => {
      Platform.OS = 'android';
      const handlers = { onGallery: jest.fn(), onCamera: jest.fn(), onFile: jest.fn() };
      const { getByText, queryByText } = render(<PruebaCentrada handlers={handlers} />);
      act(() => fireEvent.press(getByText('abrir')));
      expect(getByText('Adjuntar archivo')).toBeTruthy();
      expect(getByText('Galería')).toBeTruthy();
      expect(getByText('Documento')).toBeTruthy();
      expect(getByText('Cancelar')).toBeTruthy();

      act(() => fireEvent.press(getByText('Documento')));
      expect(handlers.onFile).toHaveBeenCalledTimes(1);
      expect(queryByText('Adjuntar archivo')).toBeNull();
    });

    it('Cancelar cierra sin ejecutar nada', () => {
      Platform.OS = 'android';
      const handlers = { onGallery: jest.fn(), onCamera: jest.fn(), onFile: jest.fn() };
      const { getByText, queryByText } = render(<PruebaCentrada handlers={handlers} />);
      act(() => fireEvent.press(getByText('abrir')));
      act(() => fireEvent.press(getByText('Cancelar')));
      expect(queryByText('Adjuntar archivo')).toBeNull();
      expect(handlers.onFile).not.toHaveBeenCalled();
    });
  });

  describe('iOS: la acción espera a que el modal termine de cerrarse', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    function PruebaIos({ handlers }: { handlers: { onGallery: () => void; onCamera: () => void; onFile: () => void } }) {
      const { openAttachMenuCentered, AttachMenu } = useAttachMenu(handlers);
      return (
        <View>
          <Text onPress={() => openAttachMenuCentered()}>abrir</Text>
          {AttachMenu}
        </View>
      );
    }

    it('no ejecuta al tocar; ejecuta una sola vez cuando llega onDismiss', () => {
      const handlers = { onGallery: jest.fn(), onCamera: jest.fn(), onFile: jest.fn() };
      const { getByText, UNSAFE_getByType } = render(<PruebaIos handlers={handlers} />);
      act(() => fireEvent.press(getByText('abrir')));
      act(() => fireEvent.press(getByText('Cámara')));
      expect(handlers.onCamera).not.toHaveBeenCalled();

      act(() => UNSAFE_getByType(Modal).props.onDismiss());
      expect(handlers.onCamera).toHaveBeenCalledTimes(1);

      act(() => UNSAFE_getByType(Modal).props.onDismiss());
      act(() => jest.advanceTimersByTime(5000));
      expect(handlers.onCamera).toHaveBeenCalledTimes(1);
    });

    it('si iOS no emite onDismiss, el respaldo ejecuta la acción igual (una vez)', () => {
      const handlers = { onGallery: jest.fn(), onCamera: jest.fn(), onFile: jest.fn() };
      const { getByText } = render(<PruebaIos handlers={handlers} />);
      act(() => fireEvent.press(getByText('abrir')));
      act(() => fireEvent.press(getByText('Galería')));
      expect(handlers.onGallery).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(1300));
      expect(handlers.onGallery).toHaveBeenCalledTimes(1);
    });

    it('un doble toque ejecuta una sola acción', () => {
      const handlers = { onGallery: jest.fn(), onCamera: jest.fn(), onFile: jest.fn() };
      const { getByText, UNSAFE_getByType } = render(<PruebaIos handlers={handlers} />);
      act(() => fireEvent.press(getByText('abrir')));
      act(() => {
        fireEvent.press(getByText('Documento'));
        fireEvent.press(getByText('Documento'));
      });
      act(() => UNSAFE_getByType(Modal).props.onDismiss());
      expect(handlers.onFile).toHaveBeenCalledTimes(1);
    });

    it('al reabrir se descarta una acción vieja que había quedado pendiente', () => {
      const handlers = { onGallery: jest.fn(), onCamera: jest.fn(), onFile: jest.fn() };
      const { getByText, UNSAFE_getByType } = render(<PruebaIos handlers={handlers} />);
      act(() => fireEvent.press(getByText('abrir')));
      act(() => fireEvent.press(getByText('Galería'))); // queda pendiente: onDismiss nunca llegó
      act(() => fireEvent.press(getByText('abrir'))); // el usuario reabre antes del respaldo
      act(() => UNSAFE_getByType(Modal).props.onDismiss());
      act(() => jest.advanceTimersByTime(5000));
      expect(handlers.onGallery).not.toHaveBeenCalled();
    });
  });
});
