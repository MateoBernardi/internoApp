import { QueryClient } from '@tanstack/react-query';

export type SyncDomain =
  | 'solicitudesActividades'
  | 'kanban'
  | 'reportes'
  | 'licencias'
  | 'documentos';

const DOMAIN_QUERY_KEYS: Record<SyncDomain, readonly (readonly unknown[])[]> = {
  solicitudesActividades: [
    ['solicitudes'],
    ['actividades', 'semanales'],
  ],
  kanban: [['objetivos']],
  reportes: [['reportes']],
  licencias: [
    ['solicitudes-licencias'],
    ['saldos-licencias'],
    ['tipos-licencias'],
  ],
  documentos: [['archivos']],
};

const DOMAIN_ALIASES: Record<string, SyncDomain> = {
  solicitudes: 'solicitudesActividades',
  'solicitudes-actividades': 'solicitudesActividades',
  solicitudesactividades: 'solicitudesActividades',
  activityrequests: 'solicitudesActividades',
  kanban: 'kanban',
  objetivos: 'kanban',
  reportes: 'reportes',
  misreportes: 'reportes',
  licencias: 'licencias',
  'solicitudes-licencias': 'licencias',
  solicitudeslicencias: 'licencias',
  mislicencias: 'licencias',
  documentos: 'documentos',
  archivos: 'documentos',
  empresadocumentos: 'documentos',
};

const ENDPOINT_HINTS: { includes: string; domain: SyncDomain }[] = [
  { includes: 'solicitudes-actividades', domain: 'solicitudesActividades' },
  { includes: 'actividades', domain: 'solicitudesActividades' },
  { includes: 'kanban', domain: 'kanban' },
  { includes: 'objetivos', domain: 'kanban' },
  { includes: 'reportes', domain: 'reportes' },
  { includes: 'licencias', domain: 'licencias' },
  { includes: 'documentos', domain: 'documentos' },
  { includes: 'archivos', domain: 'documentos' },
];

type AnyRecord = Record<string, unknown>;

interface PushContractAssessment {
  isValid: boolean;
  hasKnownDomainField: boolean;
  hasEventField: boolean;
  hasTimestampField: boolean;
  issues: string[];
}

function asRecord(value: unknown): AnyRecord {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as AnyRecord;
  }

  return {};
}

function normalizeDomainToken(value: string): SyncDomain | null {
  const compact = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return DOMAIN_ALIASES[compact] ?? null;
}

function collectTokens(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(/[,|\s]+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }

  return [];
}

function findDomainsFromEndpointHints(text: string): SyncDomain[] {
  const normalized = text.toLowerCase();
  return ENDPOINT_HINTS.filter(({ includes }) => normalized.includes(includes)).map(
    ({ domain }) => domain
  );
}

function resolveDomains(payload: AnyRecord): Set<SyncDomain> {
  const domains = new Set<SyncDomain>();

  const tokenFields = [
    payload.domain,
    payload.domains,
    payload.cache_invalidate,
    payload.module,
    payload.topic,
    payload.event,
    payload.type,
  ];

  tokenFields.forEach((field) => {
    collectTokens(field).forEach((token) => {
      if (token === 'all') {
        (Object.keys(DOMAIN_QUERY_KEYS) as SyncDomain[]).forEach((domain) => domains.add(domain));
        return;
      }

      const normalized = normalizeDomainToken(token);
      if (normalized) {
        domains.add(normalized);
      }
    });
  });

  const eventToken =
    (typeof payload.event === 'string' && payload.event) ||
    (typeof payload.type === 'string' && payload.type) ||
    '';
  const normalizedEvent = eventToken.toLowerCase();
  if (normalizedEvent === 'status_changed' || normalizedEvent === 'estado_actualizado') {
    domains.add('solicitudesActividades');
  }

  const endpointFields = [payload.endpoint, payload.path, payload.url, payload.resource];
  endpointFields.forEach((field) => {
    if (typeof field !== 'string') return;
    findDomainsFromEndpointHints(field).forEach((domain) => domains.add(domain));
  });

  if (domains.size === 0) {
    const nestedData = asRecord(payload.data);
    if (Object.keys(nestedData).length > 0) {
      resolveDomains(nestedData).forEach((domain) => domains.add(domain));
    }
  }

  return domains;
}

function extractPayload(raw: unknown): AnyRecord {
  const first = asRecord(raw);

  if (Object.keys(first).length === 0) {
    return {};
  }

  const data = asRecord(first.data);
  if (Object.keys(data).length > 0) {
    return data;
  }

  const notification = asRecord(first.notification);
  const notificationData = asRecord(notification.data);
  if (Object.keys(notificationData).length > 0) {
    return notificationData;
  }

  return first;
}

function assessPushContract(payload: AnyRecord): PushContractAssessment {
  const issues: string[] = [];
  const hasKnownDomainField =
    typeof payload.domain === 'string' ||
    typeof payload.cache_invalidate === 'string' ||
    Array.isArray(payload.domains);
  const hasEventField = typeof payload.event === 'string' || typeof payload.type === 'string';
  const hasTimestampField =
    typeof payload.updated_at === 'string' ||
    typeof payload.timestamp === 'string' ||
    typeof payload.ts === 'string';

  if (!hasKnownDomainField) {
    issues.push('missing_domain');
  }
  if (!hasEventField) {
    issues.push('missing_event');
  }
  if (!hasTimestampField) {
    issues.push('missing_timestamp');
  }

  return {
    isValid: issues.length === 0,
    hasKnownDomainField,
    hasEventField,
    hasTimestampField,
    issues,
  };
}

export function syncPushPayloadToCache(
  queryClient: QueryClient,
  rawPayload: unknown,
  source: 'native' | 'web-foreground' | 'web-service-worker' | 'unknown' = 'unknown'
): SyncDomain[] {
  const payload = extractPayload(rawPayload);
  const contract = assessPushContract(payload);
  const domains = resolveDomains(payload);

  if (!contract.isValid) {
    console.warn('[PushCacheSync] push_payload_invalid', {
      source,
      issues: contract.issues,
      payload,
    });
  }

  if (domains.size === 0) {
    console.warn('[PushCacheSync] push_domain_unresolved', {
      source,
      payload,
      contractIssues: contract.issues,
    });

    const fallbackDomains: SyncDomain[] = ['solicitudesActividades', 'reportes', 'licencias'];
    fallbackDomains.forEach((domain) => {
      DOMAIN_QUERY_KEYS[domain].forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    });

    console.log('[PushCacheSync] push_fallback_used', {
      source,
      domains: fallbackDomains,
      reason: 'unresolved_domain',
    });

    return fallbackDomains;
  }

  domains.forEach((domain) => {
    DOMAIN_QUERY_KEYS[domain].forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  });

  const matched = Array.from(domains);
  console.log('[PushCacheSync] Cache invalidated', { source, domains: matched, payload });
  return matched;
}

export const RealtimeQueryKeys = {
  solicitudesCreadas: ['solicitudes', 'creadas'] as const,
  invitaciones: ['solicitudes', 'invitaciones'] as const,
  actividadesSemanales: ['actividades', 'semanales'] as const,
  objetivos: ['objetivos'] as const,
  reportes: (usuarioId?: string) => ['reportes', usuarioId ?? 'all'] as const,
  licenciasAdmin: ['solicitudes-licencias', {}] as const,
  licenciasUsuario: ['solicitudes-licencias', 'usuario'] as const,
  saldosLicencias: ['saldos-licencias'] as const,
  tiposLicencias: ['tipos-licencias'] as const,
  archivosEmpresa: ['archivos', 'list'] as const,
};
