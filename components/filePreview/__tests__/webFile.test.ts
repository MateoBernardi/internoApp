import { abrirDocumentoWeb } from '../webFile';

describe('abrirDocumentoWeb', () => {
  const g = globalThis as any;
  const original = { window: g.window, document: g.document, fetch: g.fetch, URL: g.URL };

  afterEach(() => {
    Object.assign(g, original);
  });

  it('abre la pestaña al instante y le asigna la URL firmada', async () => {
    const pestana = { opener: 'x', location: { replace: jest.fn() }, close: jest.fn() };
    g.window = { open: jest.fn(() => pestana) };
    await abrirDocumentoWeb(async () => 'https://r2/doc.pdf', 'doc.pdf');
    expect(g.window.open).toHaveBeenCalledWith('', '_blank');
    expect(pestana.opener).toBeNull();
    expect(pestana.location.replace).toHaveBeenCalledWith('https://r2/doc.pdf');
  });

  it('cierra la pestaña vacía si falla la URL', async () => {
    const pestana = { opener: 'x', location: { replace: jest.fn() }, close: jest.fn() };
    g.window = { open: jest.fn(() => pestana) };
    await expect(abrirDocumentoWeb(async () => { throw new Error('boom'); }, 'doc.pdf')).rejects.toThrow('boom');
    expect(pestana.close).toHaveBeenCalled();
    expect(pestana.location.replace).not.toHaveBeenCalled();
  });

  it('descarga el archivo si el navegador bloquea la pestaña', async () => {
    jest.useFakeTimers();
    const enlace: any = { click: jest.fn(), remove: jest.fn() };
    g.window = { open: jest.fn(() => null) };
    g.document = { createElement: jest.fn(() => enlace), body: { appendChild: jest.fn() } };
    g.fetch = jest.fn(async () => ({ ok: true, status: 200, blob: async () => ({}) }));
    g.URL = { createObjectURL: jest.fn(() => 'blob:x'), revokeObjectURL: jest.fn() };
    await abrirDocumentoWeb(async () => 'https://r2/doc.pdf', 'doc.pdf');
    expect(g.fetch).toHaveBeenCalledWith('https://r2/doc.pdf');
    expect(enlace.download).toBe('doc.pdf');
    expect(enlace.href).toBe('blob:x');
    expect(enlace.click).toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(g.URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    jest.useRealTimers();
  });
});
