export const informesKeys = {
  all: ['informes'] as const,
  lista: () => [...informesKeys.all, 'lista'] as const,
  detalle: (id: string) => [...informesKeys.all, 'detalle', id] as const,
};
