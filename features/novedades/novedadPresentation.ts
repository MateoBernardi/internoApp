export const TIPOS_NOVEDAD = [
    { id: 1, nombre: 'General' },
    { id: 2, nombre: 'Eventos' },
    { id: 3, nombre: 'Supermercado' },
    { id: 4, nombre: 'Mantenimiento' },
    { id: 5, nombre: 'Seguridad e Higiene' },
    { id: 6, nombre: 'Personas y Relaciones' },
    { id: 7, nombre: 'Capacitación' },
    { id: 8, nombre: 'Comunicados' },
    { id: 9, nombre: 'Insumos' },
    { id: 10, nombre: 'Otros' },
] as const;

const CATEGORY_COLORS = [
    '#D97706',
    '#7C3AED',
    '#059669',
    '#2563EB',
    '#C2410C',
    '#DB2777',
    '#EA580C',
    '#16A34A',
    '#DC2626',
    '#64748B',
] as const;

export function getNovedadCategory(id?: number): string {
    return TIPOS_NOVEDAD.find((tipo) => tipo.id === id)?.nombre ?? 'General';
}

export function getNovedadCategoryColor(id?: number): string {
    const normalizedId = Math.max(1, Math.min(CATEGORY_COLORS.length, id ?? 1));
    return CATEGORY_COLORS[normalizedId - 1];
}

export function getNovedadPriority(prioridad: number): {
    color: string;
    backgroundColor: string;
    label: string;
} {
    switch (prioridad) {
        case 1:
            return { color: '#DC2626', backgroundColor: '#FEF2F2', label: 'Alta' };
        case 2:
            return { color: '#B45309', backgroundColor: '#FFF7ED', label: 'Media' };
        case 3:
            return { color: '#15803D', backgroundColor: '#F0FDF4', label: 'Baja' };
        default:
            return { color: '#64748B', backgroundColor: '#F1F5F9', label: 'Sin prioridad' };
    }
}

export function formatNovedadDate(value?: Date | string): string {
    if (!value) return 'Sin fecha';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    return date
        .toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        .replace('.', '');
}
