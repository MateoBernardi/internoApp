const RADIX = 36n;
const DEFAULT_LENGTH = 6;
const DEFAULT_BUCKET = '0';
const APPEND_STEP = 1024n;

interface ParsedRank {
    bucket?: string;
    format: 'canonical' | 'raw';
    length: number;
    value: bigint;
}

function decodeBase36(value: string): bigint | null {
    let result = 0n;

    for (const character of value.toLowerCase()) {
        const digit = parseInt(character, 36);
        if (!Number.isFinite(digit) || digit < 0 || digit >= 36) return null;
        result = result * RADIX + BigInt(digit);
    }

    return result;
}

function encodeBase36(value: bigint, length: number): string {
    return value.toString(36).padStart(length, '0');
}

function parseRank(rank?: string | null): ParsedRank | null {
    if (!rank) return null;

    const canonicalMatch = rank.match(/^([^|]+)\|([0-9a-z]+):$/i);
    if (canonicalMatch) {
        const value = decodeBase36(canonicalMatch[2]);
        if (value === null) return null;
        return {
            bucket: canonicalMatch[1],
            format: 'canonical',
            length: canonicalMatch[2].length,
            value,
        };
    }

    if (/^[0-9a-z]+$/i.test(rank)) {
        const value = decodeBase36(rank);
        if (value === null) return null;
        return { format: 'raw', length: rank.length, value };
    }

    return null;
}

function formatRank(parsed: ParsedRank, value: bigint): string {
    const encoded = encodeBase36(value, parsed.length);
    return parsed.format === 'canonical' ? `${parsed.bucket}|${encoded}:` : encoded;
}

function sameRankSpace(left: ParsedRank, right: ParsedRank): boolean {
    return (
        left.format === right.format &&
        left.length === right.length &&
        left.bucket === right.bucket
    );
}

export function compareLexoRanks(left?: string, right?: string): number {
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Returns a sparse LexoRank between two existing ranks. It supports the
 * canonical `bucket|base36:` format and raw fixed-width base36 ranks.
 * `null` signals that the column needs a cheap rebalance.
 */
export function getLexoRankBetween(
    previous?: string | null,
    next?: string | null
): string | null {
    const previousRank = parseRank(previous);
    const nextRank = parseRank(next);

    if (!previous && !next) {
        const max = RADIX ** BigInt(DEFAULT_LENGTH);
        return `${DEFAULT_BUCKET}|${encodeBase36(max / 2n, DEFAULT_LENGTH)}:`;
    }

    if (previous && !previousRank) return null;
    if (next && !nextRank) return null;

    if (previousRank && nextRank) {
        if (!sameRankSpace(previousRank, nextRank)) return null;
        const gap = nextRank.value - previousRank.value;
        if (gap <= 1n) return null;
        return formatRank(previousRank, previousRank.value + gap / 2n);
    }

    if (previousRank) {
        const limit = RADIX ** BigInt(previousRank.length);
        const candidate = previousRank.value + APPEND_STEP;
        if (candidate >= limit) return null;
        return formatRank(previousRank, candidate);
    }

    if (nextRank) {
        if (nextRank.value <= 1n) return null;
        return formatRank(nextRank, nextRank.value / 2n);
    }

    return null;
}

export function createEvenLexoRanks(count: number): string[] {
    if (count <= 0) return [];

    const limit = RADIX ** BigInt(DEFAULT_LENGTH);
    const step = limit / BigInt(count + 1);

    return Array.from({ length: count }, (_, index) => {
        const value = step * BigInt(index + 1);
        return `${DEFAULT_BUCKET}|${encodeBase36(value, DEFAULT_LENGTH)}:`;
    });
}
