import type { ApiWarningDetail } from '@/shared/types/apiStatus';

const dedupe = (values: string[] = []) => Array.from(new Set(values.filter(Boolean)));

export function formatPartialWarnings(warnings?: ApiWarningDetail[]): string {
  if (!warnings || warnings.length === 0) {
    return 'Se guardo con advertencias.';
  }

  const invalidRoles = dedupe(warnings.flatMap((w) => w.invalid_roles || []));
  const invalidUsers = dedupe(warnings.flatMap((w) => w.invalid_users || []));
  const reasons = dedupe(warnings.flatMap((w) => (w.reason ? [w.reason] : [])));

  const chunks: string[] = [];

  if (invalidRoles.length > 0) {
    chunks.push(`Roles invalidos: ${invalidRoles.join(', ')}`);
  }

  if (invalidUsers.length > 0) {
    chunks.push(`Usuarios invalidos: ${invalidUsers.join(', ')}`);
  }

  if (reasons.length > 0) {
    chunks.push(`Motivo: ${reasons.join(' | ')}`);
  }

  return chunks.length > 0 ? chunks.join('\n') : 'Se guardo con advertencias.';
}
