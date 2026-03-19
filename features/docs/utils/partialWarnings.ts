import type { ApiWarningDetail } from '@/shared/types/apiStatus';

const dedupe = (values: string[] = []) => Array.from(new Set(values.filter(Boolean)));

const dedupeNumbers = (values: number[] = []) => Array.from(new Set(values.filter((value) => Number.isInteger(value) && value > 0)));

export function formatPartialWarnings(warnings?: ApiWarningDetail[]): string {
  if (!warnings || warnings.length === 0) {
    return 'Se guardo con advertencias.';
  }

  const invalidRoles = dedupe(warnings.flatMap((w) => w.invalid_roles || []));
  const invalidUsers = dedupe(warnings.flatMap((w) => w.invalid_users || []));
  const invalidUserIds = dedupeNumbers(warnings.flatMap((w) => w.invalid_user_ids || []));
  const reasons = dedupe(warnings.flatMap((w) => (w.reason ? [w.reason] : [])));

  const chunks: string[] = [];

  if (invalidRoles.length > 0) {
    chunks.push(`Roles invalidos: ${invalidRoles.join(', ')}`);
  }

  if (invalidUsers.length > 0) {
    chunks.push(`Usuarios invalidos: ${invalidUsers.join(', ')}`);
  } else if (invalidUserIds.length > 0) {
    chunks.push('Algunos usuarios no tienen permisos validos para esta operacion.');
  }

  if (reasons.length > 0) {
    chunks.push(`Motivo: ${reasons.join(' | ')}`);
  }

  return chunks.length > 0 ? chunks.join('\n') : 'Se guardo con advertencias.';
}
