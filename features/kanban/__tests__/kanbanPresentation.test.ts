import type { Objetivo } from '../models/Objetivo';
import {
    getLatestObjectiveUpdate,
    getObjectiveAssignee,
} from '../kanbanPresentation';

function createObjetivo(overrides: Partial<Objetivo> = {}): Objetivo {
    return {
        id: 1,
        titulo: 'Objetivo',
        descripcion: 'Descripción',
        estado: 'PENDIENTE',
        rank_position: '0|h00000:',
        created_by: 8,
        created_at: '2026-08-18T10:00:00.000Z',
        updated_at: '2026-08-19T10:00:00.000Z',
        bitacora: [],
        ...overrides,
    };
}

describe('kanban presentation', () => {
    it('uses the assigned participant as the responsible person', () => {
        const objetivo = createObjetivo({
            invitados: [
                {
                    user_id: 14,
                    invitado_nombre: 'Mateo',
                    invitado_apellido: 'Bernardi',
                    rol: 'ASSIGNEE',
                },
            ],
        });

        expect(getObjectiveAssignee(objetivo)).toEqual({
            id: 14,
            name: 'Mateo Bernardi',
            initials: 'MB',
        });
    });

    it('falls back to the creator without inventing an assignee', () => {
        const objetivo = createObjetivo({ created_by_username: 'Mateo' });

        expect(getObjectiveAssignee(objetivo)).toEqual({
            id: 8,
            name: 'Mateo',
            initials: 'M',
        });
    });

    it('finds the latest backend update across the board', () => {
        const latest = getLatestObjectiveUpdate([
            createObjetivo(),
            createObjetivo({ id: 2, updated_at: '2026-08-20T09:15:00.000Z' }),
        ]);

        expect(latest?.toISOString()).toBe('2026-08-20T09:15:00.000Z');
    });
});
