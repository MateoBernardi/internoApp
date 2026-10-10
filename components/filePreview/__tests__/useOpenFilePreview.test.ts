import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useOpenFilePreview } from '../useOpenFilePreview';

jest.mock('@/features/docs/viewmodels/useArchivos', () => ({
  useGetArchivoUrlFirmada: () => ({ getArchivoUrlFirmada: async () => 'https://r2/archivo?firma=1' }),
}));

describe('useOpenFilePreview en web', () => {
  const g = globalThis as any;
  const originalOS = Platform.OS;
  const originalWindow = g.window;

  beforeEach(() => {
    Platform.OS = 'web';
    g.window = { open: jest.fn() };
  });
  afterEach(() => {
    Platform.OS = originalOS;
    g.window = originalWindow;
  });

  it('abre las imágenes en el visor de la página, sin pestaña nueva', async () => {
    const { result } = renderHook(() => useOpenFilePreview());
    await act(async () => {
      await result.current.openFile({ id: 1, nombre: 'foto.png', tipo: 'image/png' });
    });
    expect(result.current.previewFile).toMatchObject({ kind: 'image', uri: 'https://r2/archivo?firma=1', name: 'foto.png' });
    expect(g.window.open).not.toHaveBeenCalled();
  });

  it('abre los PDF en una pestaña aparte', async () => {
    const { result } = renderHook(() => useOpenFilePreview());
    await act(async () => {
      await result.current.openFile({ id: 2, nombre: 'doc.pdf', tipo: 'application/pdf' });
    });
    expect(g.window.open).toHaveBeenCalledWith('https://r2/archivo?firma=1', '_blank', 'noopener,noreferrer');
    expect(result.current.previewFile).toBeNull();
  });

  it('openWithUri: imagen al visor, el resto a una pestaña', () => {
    const { result } = renderHook(() => useOpenFilePreview());
    act(() => result.current.openWithUri({ id: '3', kind: 'image', name: 'a.jpg', ext: 'jpg', uri: 'https://cf/a' }));
    expect(result.current.previewFile?.uri).toBe('https://cf/a');
    expect(g.window.open).not.toHaveBeenCalled();

    act(() => result.current.closePreview());
    act(() => result.current.openWithUri({ id: '4', kind: 'file', name: 'a.pdf', ext: 'pdf', uri: 'https://cf/b' }));
    expect(g.window.open).toHaveBeenCalledWith('https://cf/b', '_blank', 'noopener,noreferrer');
    expect(result.current.previewFile).toBeNull();
  });
});
