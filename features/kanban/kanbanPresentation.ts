import type { Objetivo } from './models/Objetivo';

export interface ObjectiveAssignee {
    id?: number;
    name: string;
    initials: string;
}

function getInitials(name: string): string {
    const initials = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toLocaleUpperCase('es-AR'))
        .join('');

    return initials || '—';
}

export function getObjectiveAssignee(objetivo: Objetivo): ObjectiveAssignee {
    const assignee = objetivo.invitados?.find((invitado) => invitado.rol === 'ASSIGNEE');

    if (assignee) {
        const name = [assignee.invitado_nombre, assignee.invitado_apellido]
            .filter(Boolean)
            .join(' ')
            .trim();

        if (name) {
            return { id: assignee.user_id, name, initials: getInitials(name) };
        }
    }

    const creatorName = objetivo.created_by_username?.trim();
    if (creatorName) {
        return {
            id: objetivo.created_by,
            name: creatorName,
            initials: getInitials(creatorName),
        };
    }

    return { name: 'Sin asignar', initials: '—' };
}

export function formatObjectiveDate(value?: string): string {
    if (!value) return 'Sin fecha';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    return date
        .toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        .replace('.', '');
}

export function getLatestObjectiveUpdate(objetivos: Objetivo[]): Date | null {
    const timestamps = objetivos
        .map((objetivo) => new Date(objetivo.updated_at || objetivo.created_at).getTime())
        .filter(Number.isFinite);

    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps));
}

export function formatBoardUpdatedAt(value: Date | null): string {
    if (!value || Number.isNaN(value.getTime())) return 'Sin actualizaciones';

    return value.toLocaleString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
