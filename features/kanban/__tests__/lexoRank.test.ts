import {
    compareLexoRanks,
    createEvenLexoRanks,
    getLexoRankBetween,
} from '../lexoRank';

describe('LexoRank helpers', () => {
    it('creates a rank between two canonical ranks', () => {
        expect(getLexoRankBetween('0|000100:', '0|000300:')).toBe('0|000200:');
    });

    it('appends a sparse rank after the last card', () => {
        const current = '0|000100:';
        const next = getLexoRankBetween(current, null);

        expect(next).not.toBeNull();
        expect(compareLexoRanks(current, next!)).toBeLessThan(0);
    });

    it('signals a rebalance when adjacent ranks have no available midpoint', () => {
        expect(getLexoRankBetween('0|000100:', '0|000101:')).toBeNull();
    });

    it('generates evenly spaced, sortable ranks for a column rebalance', () => {
        const ranks = createEvenLexoRanks(4);

        expect(ranks).toHaveLength(4);
        expect([...ranks].sort(compareLexoRanks)).toEqual(ranks);
        expect(new Set(ranks).size).toBe(4);
    });
});
