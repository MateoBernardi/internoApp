import { formatMinutos, horasAMinutos, minutosDe } from '@/shared/utils/duracion';
import { formatCantidadLicencia } from '@/features/solicitudesLicencias/utils/formatCantidad';

describe('duracion', () => {
  it('formatMinutos muestra horas y minutos exactos', () => {
    expect(formatMinutos(45)).toBe('45 minutos');
    expect(formatMinutos(750)).toBe('12 hs, 30 minutos');
    expect(formatMinutos(61)).toBe('1 hs, 1 minuto');
    expect(formatMinutos(480)).toBe('8 hs');
    expect(formatMinutos(250)).toBe('4 hs, 10 minutos');
    expect(formatMinutos(-90)).toBe('-1 hs, 30 minutos');
    expect(formatMinutos(0)).toBe('0 minutos');
  });

  it('minutosDe prefiere los minutos del backend y si no, deriva de las horas', () => {
    expect(minutosDe(45, 0.75)).toBe(45);
    expect(minutosDe(undefined, 1.25)).toBe(75);
    expect(minutosDe(null, null)).toBeNull();
    expect(horasAMinutos(0.5)).toBe(30);
  });

  it('formatCantidadLicencia usa cantidad_minutos y cae a cantidad_horas (×10) con un backend viejo', () => {
    expect(formatCantidadLicencia(null, 15, 90)).toBe('1 hs, 30 minutos');
    expect(formatCantidadLicencia(null, 15)).toBe('1.5 hs');
    expect(formatCantidadLicencia(10, null, null)).toBe('1 día');
    expect(formatCantidadLicencia(null, null, null)).toBe('-');
  });
});
