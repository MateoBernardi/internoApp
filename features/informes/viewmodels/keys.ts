export const informesKeys = {
  all: ['informes'] as const,
  lista: () => [...informesKeys.all, 'lista'] as const,
  empleado: (empleadoId: number) => [...informesKeys.all, 'empleado', empleadoId] as const,
  adjuntoUrl: (informeId: string, adjuntoId: string) => [...informesKeys.all, 'adjunto-url', informeId, adjuntoId] as const,
  detalle: (id: string) => [...informesKeys.all, 'detalle', id] as const,
};
