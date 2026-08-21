import {
    getNovedadCategory,
    getNovedadCategoryColor,
    getNovedadPriority,
} from '../novedadPresentation';

describe('novedad presentation', () => {
    it('keeps category and priority as independent visual dimensions', () => {
        expect(getNovedadCategory(9)).toBe('Insumos');
        expect(getNovedadCategoryColor(9)).toBe('#DC2626');
        expect(getNovedadPriority(3)).toMatchObject({
            label: 'Baja',
            color: '#15803D',
        });
    });

    it('uses explicit fallbacks for unknown backend values', () => {
        expect(getNovedadCategory(999)).toBe('General');
        expect(getNovedadPriority(999).label).toBe('Sin prioridad');
    });
});
