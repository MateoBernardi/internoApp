const ARCHIVO_OPEN_AUDIT_START = new Date(2026, 3, 9, 0, 0, 0, 0);

export function isArchivoInAuditWindow(createdAt: Date | string): boolean {
    const date = createdAt instanceof Date ? createdAt : new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    return date.getTime() >= ARCHIVO_OPEN_AUDIT_START.getTime();
}
