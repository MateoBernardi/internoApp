import { elegirCamara } from '../utils/adjuntos';

jest.mock('@/shared/ui/pickFromGallery', () => ({ pickFromGallery: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

describe('elegirCamara', () => {
  it('convierte una foto en un adjunto de tipo imagen', async () => {
    const r = await elegirCamara(async () => ({
      ok: true,
      file: { name: 'foto.jpg', uri: 'file:///foto.jpg', type: 'image/jpeg', size: 10 },
    }));
    expect(r.adjuntos).toEqual([
      { uri: 'file:///foto.jpg', nombre: 'foto.jpg', mime: 'image/jpeg', tamano: 10, tipo: 'imagen' },
    ]);
  });

  it('reconoce un video', async () => {
    const r = await elegirCamara(async () => ({
      ok: true,
      file: { name: 'v.mp4', uri: 'file:///v.mp4', type: 'video/mp4' },
    }));
    expect(r.adjuntos[0]).toMatchObject({ tipo: 'video', tamano: 0 });
  });

  it('no devuelve nada si se cancela y avisa si falta permiso o cámara', async () => {
    expect(await elegirCamara(async () => ({ ok: false, reason: 'canceled' }))).toEqual({ adjuntos: [] });
    expect((await elegirCamara(async () => ({ ok: false, reason: 'permission-denied' }))).error).toMatch(/permiso/i);
    expect((await elegirCamara(async () => ({ ok: false, reason: 'unavailable' }))).error).toMatch(/disponible/i);
  });
});
