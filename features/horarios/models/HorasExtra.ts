/**
 * Contrato real del backend (GET /horarios/extra): un array plano por usuario,
 * ya en horas reales (no deciHoras). NO existe desglose por día (`dias[]`), ni
 * `rol` ni `total`: el único agregado es `horas` para el rango pedido (o el
 * saldo actual si no se pasan fechas). `horas` puede ser negativo.
 */
export interface HorasExtraDTO {
  userContextId: number;
  nombre: string;
  apellido: string;
  horas: number;
}

/** Respuesta de POST /horarios/liquidar/:id, en horas reales. */
export interface LiquidarHorasExtraResult {
  horasDisponibles: number;
  horasConsumidas: number;
}

/**
 * Movimiento individual del historial de un usuario para un mes dado
 * (GET /horarios/movimientos). `cantidad` es siempre una magnitud positiva en
 * horas reales; el signo se deriva de `tipo` en la UI. `saldoResultante` puede
 * ser `null` cuando el backend no lo calculó para ese movimiento.
 */
export interface MovimientoDTO {
  id: number;
  tipo: string;
  cantidad: number;
  saldoResultante: number | null;
  createdAt: string;
}

/**
 * Objetivo semanal de horas de un usuario (GET/POST/PATCH /horarios/objetivos),
 * en horas reales. Sólo aparece en el GET si el usuario ya tiene objetivo
 * cargado; su ausencia es lo que decide si corresponde POST (alta) o PATCH
 * (modificación).
 */
export interface ObjetivoHorasDTO {
  userContextId: number;
  nombre?: string;
  apellido?: string;
  horas: number;
}

interface MovimientoTipoInfo {
  label: string;
  sign: '+' | '−';
}

/** Etiqueta en español y signo a mostrar según `tipo`. Fallback genérico para tipos no mapeados. */
export const MOVIMIENTO_TIPO_INFO: Record<string, MovimientoTipoInfo> = {
  acreditacion: { label: 'Acreditación', sign: '+' },
  reintegro: { label: 'Reintegro', sign: '+' },
  consumo: { label: 'Consumo', sign: '−' },
  liquidacion: { label: 'Liquidación', sign: '−' },
  ajuste_manual: { label: 'Ajuste', sign: '+' },
};

export function getMovimientoTipoInfo(tipo: string): MovimientoTipoInfo {
  return MOVIMIENTO_TIPO_INFO[tipo] ?? { label: tipo, sign: '+' };
}
