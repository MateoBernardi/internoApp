import { ApiError, throwApiError } from '../apiRequest';

const response = (status: number, statusText = 'Err') => ({ status, statusText }) as Response;

const capturar = (fn: () => never): ApiError => {
  try {
    fn();
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('no lanzó');
};

describe('throwApiError / ApiError', () => {
  it('conserva status, code y details del body JSON y sigue siendo un Error con el mismo message', () => {
    const body = JSON.stringify({ message: 'Planilla inválida', code: 'UNPROCESSABLE_ENTITY', details: { errores: ['a', 'b'] } });

    const error = capturar(() => throwApiError(body, response(422)));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Planilla inválida');
    expect(error.status).toBe(422);
    expect(error.code).toBe('UNPROCESSABLE_ENTITY');
    expect(error.details).toEqual({ errores: ['a', 'b'] });
  });

  it('prefiere message sobre error, y usa error si no hay message', () => {
    expect(capturar(() => throwApiError('{"error":"x"}', response(400))).message).toBe('x');
    expect(capturar(() => throwApiError('{"message":"m","error":"x"}', response(400))).message).toBe('m');
  });

  it('con texto plano (no JSON) lo usa tal cual y sin code/details', () => {
    const error = capturar(() => throwApiError('Mensaje ya extraído', response(409)));
    expect(error.message).toBe('Mensaje ya extraído');
    expect(error.code).toBeUndefined();
    expect(error.details).toBeUndefined();
  });

  it('con body vacío cae al statusText', () => {
    expect(capturar(() => throwApiError('', response(500, 'Internal Server Error'))).message).toBe('Internal Server Error');
  });
});
