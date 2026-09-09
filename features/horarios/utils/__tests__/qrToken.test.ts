import { currentCounter, deriveQrCode, QR_STEP_SECONDS } from '../qrToken';

/**
 * Vectores de prueba fijos: (secretHex, counter) -> codigo de 8 digitos,
 * calculados independientemente con node:crypto (createHmac('sha256', ...)
 * + truncamiento dinamico RFC-4226), el MISMO primitivo que usa el backend
 * (appMayorista-backend/src/utils/qrToken.ts). Si esta prueba pasa,
 * deriveQrCode (implementado aca con js-sha256) reproduce byte a byte la
 * salida del backend para el mismo secreto+contador - ver "Token contract" en
 * el plan.
 */
describe('deriveQrCode', () => {
  // Vector OFICIAL, copiado literal de
  // appMayorista-backend/src/__tests__/horarios/qrToken.test.ts (mismo
  // secreto/instante que usa el backend para su propio test de interop). Si
  // este test pasa, el kiosco (esta implementación) y el backend producen
  // exactamente el mismo código de 8 dígitos para el mismo secreto+instante.
  it('reproduce el vector fijo OFICIAL compartido con el backend', () => {
    const FIXED_SECRET_HEX =
      '00112233445566778899aabbccddeeff00112233445566778899aabbccddee';
    const FIXED_NOW_MS = 1750000000000;
    const FIXED_EXPECTED_CODE = '93154168';

    const counter = Math.floor(FIXED_NOW_MS / 1000 / 30);
    expect(deriveQrCode(FIXED_SECRET_HEX, counter)).toBe(FIXED_EXPECTED_CODE);
    expect(deriveQrCode(FIXED_SECRET_HEX, currentCounter(FIXED_NOW_MS))).toBe(
      FIXED_EXPECTED_CODE
    );
  });

  it('reproduce el vector fijo #1 (secreto de 32 bytes, counter=1234567)', () => {
    const secretHex = '2c8235778ce3a9bdbc237cea442fc3a559c1d2027a3a82d94249b5639d1b3656';
    expect(deriveQrCode(secretHex, 1234567)).toBe('85896998');
  });

  it('reproduce el vector fijo #2 (secreto de 16 bytes, counter=0)', () => {
    const secretHex = '6acf3130894b579e1f308f6d7b1c7e96';
    expect(deriveQrCode(secretHex, 0)).toBe('73118612');
  });

  it('reproduce el vector fijo #3 (secreto distinto, mismo counter que #1)', () => {
    const secretHex = 'e2fc0f7914e841cc01b7e6d39e8dd7727fc49f1684d2ab2f3379a8d729f80b8a';
    expect(deriveQrCode(secretHex, 1234567)).toBe('04216369');
  });

  const genericSecretHex = '5384b427400f2a049e024b58422c37a4e5655a66';

  it('es deterministico: mismo secreto + mismo counter -> mismo codigo', () => {
    const a = deriveQrCode(genericSecretHex, 42);
    const b = deriveQrCode(genericSecretHex, 42);
    expect(a).toBe(b);
    expect(a).toBe('21944771');
  });

  it('cambia el codigo cuando cambia el counter', () => {
    expect(deriveQrCode(genericSecretHex, 1)).toBe('75303059');
    expect(deriveQrCode(genericSecretHex, 2)).toBe('79048937');
    expect(deriveQrCode(genericSecretHex, 1)).not.toBe(deriveQrCode(genericSecretHex, 2));
  });

  it('siempre devuelve 8 digitos, con padding de ceros a la izquierda si hace falta', () => {
    const expected: Record<number, string> = {
      0: '97167161',
      1: '75303059',
      2: '79048937',
      3: '63451738',
      100: '43043849',
      100000: '31554280',
    };
    for (const [counter, code] of Object.entries(expected)) {
      expect(deriveQrCode(genericSecretHex, Number(counter))).toBe(code);
      expect(code).toMatch(/^\d{8}$/);
    }
  });

  it('rechaza un secretHex de longitud impar', () => {
    expect(() => deriveQrCode('abc', 1)).toThrow();
  });
});

describe('currentCounter', () => {
  it('divide el epoch (segundos) por QR_STEP_SECONDS', () => {
    expect(QR_STEP_SECONDS).toBe(30);
    // 1000 * 30s = 30000ms -> epochSeconds=30 -> counter=1
    expect(currentCounter(30_000)).toBe(1);
    expect(currentCounter(0)).toBe(0);
    expect(currentCounter(29_999)).toBe(0);
  });
});
