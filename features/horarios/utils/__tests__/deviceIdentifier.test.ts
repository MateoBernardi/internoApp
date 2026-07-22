/**
 * Tests de `getDeviceIdentifier`: cubren el fallback Android SSAID -> UUID
 * persistido, y el saneamiento al charset/longitud del contrato
 * `device_identifier` (8-128 chars, [A-Za-z0-9._-]).
 *
 * Cada test hace `jest.resetModules()` y vuelve a `require`-ear el módulo
 * bajo test (y sus mocks) para evitar que la memoización en memoria de
 * módulo (`memoizedIdentifier`) filtre resultados entre tests.
 */

const FIXED_UUID = '11111111-1111-4111-8111-111111111111';

function mockPlatform(os: 'android' | 'ios' | 'web') {
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
}

function mockApplication(getAndroidId: () => string) {
  jest.doMock('expo-application', () => ({
    getAndroidId,
  }));
}

function mockSecureStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  const getItem = jest.fn((key: string) => Promise.resolve(store[key] ?? null));
  const setItem = jest.fn((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  });
  const deleteItem = jest.fn((key: string) => {
    delete store[key];
    return Promise.resolve();
  });

  jest.doMock('@/shared/secureStorage', () => ({
    secureStorage: { getItem, setItem, deleteItem },
  }));

  return { store, getItem, setItem, deleteItem };
}

function mockIdempotency(uuid: string = FIXED_UUID) {
  jest.doMock('@/shared/idempotency', () => ({
    generateIdempotencyKey: jest.fn(() => uuid),
  }));
}

describe('getDeviceIdentifier', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('Android: usa el SSAID saneado (lowercase) cuando está disponible', async () => {
    mockPlatform('android');
    mockApplication(() => '9774D56D682E549C');
    mockSecureStorage();
    mockIdempotency();

    const { getDeviceIdentifier } = require('../deviceIdentifier');
    const id = await getDeviceIdentifier();

    expect(id).toBe('9774d56d682e549c');
  });

  it('Android: si getAndroidId() lanza, cae al UUID persistido', async () => {
    mockPlatform('android');
    mockApplication(() => {
      throw new Error('androidId unavailable');
    });
    const { setItem } = mockSecureStorage();
    mockIdempotency();

    const { getDeviceIdentifier } = require('../deviceIdentifier');
    const id = await getDeviceIdentifier();

    expect(id).toBe(FIXED_UUID);
    expect(setItem).toHaveBeenCalledWith('device_identifier', FIXED_UUID);
  });

  it('Android: si getAndroidId() devuelve "unknown", cae al UUID persistido', async () => {
    mockPlatform('android');
    mockApplication(() => 'unknown');
    mockSecureStorage();
    mockIdempotency();

    const { getDeviceIdentifier } = require('../deviceIdentifier');
    const id = await getDeviceIdentifier();

    expect(id).toBe(FIXED_UUID);
  });

  it('Android: si getAndroidId() devuelve vacío, cae al UUID persistido', async () => {
    mockPlatform('android');
    mockApplication(() => '');
    mockSecureStorage();
    mockIdempotency();

    const { getDeviceIdentifier } = require('../deviceIdentifier');
    const id = await getDeviceIdentifier();

    expect(id).toBe(FIXED_UUID);
  });

  it('iOS: genera y persiste un UUID nuevo cuando no hay nada guardado', async () => {
    mockPlatform('ios');
    mockApplication(() => {
      throw new Error('not android');
    });
    const { setItem } = mockSecureStorage();
    mockIdempotency();

    const { getDeviceIdentifier } = require('../deviceIdentifier');
    const id = await getDeviceIdentifier();

    expect(id).toBe(FIXED_UUID);
    expect(setItem).toHaveBeenCalledWith('device_identifier', FIXED_UUID);
  });

  it('iOS: reutiliza el UUID ya persistido sin generar uno nuevo', async () => {
    mockPlatform('ios');
    mockApplication(() => {
      throw new Error('not android');
    });
    const existingUuid = '22222222-2222-4222-8222-222222222222';
    mockSecureStorage({ device_identifier: existingUuid });
    const generateIdempotencyKey = jest.fn(() => FIXED_UUID);
    jest.doMock('@/shared/idempotency', () => ({ generateIdempotencyKey }));

    const { getDeviceIdentifier } = require('../deviceIdentifier');
    const id = await getDeviceIdentifier();

    expect(id).toBe(existingUuid);
    expect(generateIdempotencyKey).not.toHaveBeenCalled();
  });

  it('sanea el valor persistido a [A-Za-z0-9._-] antes de usarlo', async () => {
    mockPlatform('web');
    mockApplication(() => {
      throw new Error('not android');
    });
    mockSecureStorage({ device_identifier: 'ab cd!!ef@@12345' });
    mockIdempotency();

    const { getDeviceIdentifier } = require('../deviceIdentifier');
    const id = await getDeviceIdentifier();

    expect(id).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(id).toBe('abcdef12345');
  });

  it('si el valor persistido saneado queda demasiado corto, genera uno nuevo', async () => {
    mockPlatform('web');
    mockApplication(() => {
      throw new Error('not android');
    });
    const { setItem } = mockSecureStorage({ device_identifier: '!!!' });
    mockIdempotency();

    const { getDeviceIdentifier } = require('../deviceIdentifier');
    const id = await getDeviceIdentifier();

    expect(id).toBe(FIXED_UUID);
    expect(setItem).toHaveBeenCalledWith('device_identifier', FIXED_UUID);
  });

  it('memoiza en memoria de módulo: solo lee storage una vez por llamada concurrente', async () => {
    mockPlatform('ios');
    mockApplication(() => {
      throw new Error('not android');
    });
    const { getItem } = mockSecureStorage();
    mockIdempotency();

    const { getDeviceIdentifier } = require('../deviceIdentifier');
    const [a, b] = await Promise.all([getDeviceIdentifier(), getDeviceIdentifier()]);
    const c = await getDeviceIdentifier();

    expect(a).toBe(FIXED_UUID);
    expect(b).toBe(FIXED_UUID);
    expect(c).toBe(FIXED_UUID);
    expect(getItem).toHaveBeenCalledTimes(1);
  });
});
