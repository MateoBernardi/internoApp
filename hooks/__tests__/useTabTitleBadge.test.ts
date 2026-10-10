import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { conContador, useTabTitleBadge } from '../useTabTitleBadge';

describe('conContador', () => {
  it('agrega el contador al frente', () => {
    expect(conContador('Mensajes', 3)).toBe('(3) Mensajes');
  });
  it('reemplaza un contador previo en vez de duplicarlo', () => {
    expect(conContador('(2) Mensajes', 5)).toBe('(5) Mensajes');
  });
  it('lo quita en 0', () => {
    expect(conContador('(2) Mensajes', 0)).toBe('Mensajes');
    expect(conContador('Mensajes', 0)).toBe('Mensajes');
  });
  it('limita a 99+', () => {
    expect(conContador('Mensajes', 150)).toBe('(99+) Mensajes');
    expect(conContador('(99+) Mensajes', 1)).toBe('(1) Mensajes');
  });
  it('no toca paréntesis que no son contador', () => {
    expect(conContador('Reporte (urgente)', 2)).toBe('(2) Reporte (urgente)');
  });
});

describe('useTabTitleBadge', () => {
  const g = globalThis as any;
  const original = { document: g.document, MutationObserver: g.MutationObserver };
  const originalOS = Platform.OS;
  let notificar: () => void;
  const disconnect = jest.fn();

  beforeEach(() => {
    Platform.OS = 'web';
    g.document = { title: 'Mensajes', head: {} };
    g.MutationObserver = class {
      constructor(cb: () => void) {
        notificar = cb;
      }
      observe() {}
      disconnect = disconnect;
    };
  });
  afterEach(() => {
    Platform.OS = originalOS;
    Object.assign(g, original);
    disconnect.mockClear();
  });

  it('aplica el contador, lo reaplica cuando la navegación cambia el título y lo restaura al salir', () => {
    const { rerender, unmount } = renderHook(({ n }: { n: number }) => useTabTitleBadge(n), { initialProps: { n: 3 } });
    expect(g.document.title).toBe('(3) Mensajes');

    g.document.title = 'Detalle de Empleado'; // la navegación pisa el título
    notificar();
    expect(g.document.title).toBe('(3) Detalle de Empleado');

    rerender({ n: 0 });
    expect(g.document.title).toBe('Detalle de Empleado');

    rerender({ n: 7 });
    unmount();
    expect(g.document.title).toBe('Detalle de Empleado');
    expect(disconnect).toHaveBeenCalled();
  });

  it('no hace nada fuera de web', () => {
    Platform.OS = 'ios';
    renderHook(() => useTabTitleBadge(4));
    expect(g.document.title).toBe('Mensajes');
  });
});
