import { apiRequest, throwApiError } from '@/shared/apiRequest';
import type { HorarioDTO } from '../models/HorarioDTO';

async function extractError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return json.message || json.error || text;
  } catch {
    return text || res.statusText;
  }
}

function toISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export async function getTurnosPorPeriodo(
  token: string,
  fechaInicio: Date,
  fechaFin: Date,
): Promise<HorarioDTO[]> {
  const params = new URLSearchParams({
    fechaInicio: toISODate(fechaInicio),
    fechaFin: toISODate(fechaFin),
  });
  const res = await apiRequest({
    method: 'GET',
    endpoint: `/horarios/user?${params.toString()}`,
    token,
  });
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}
