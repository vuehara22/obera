export type EventoItem = {
  IDEvento: string;
  ProductoID: string;
  Cantidad: number;
  PrecioUnitario?: number; // luego vendrá de Listas/Temporadas
  NotaInterna?: string;    // ej: "Defecto leve" (solo interno)
};

export const eventoItemsDemo: EventoItem[] = [
  { IDEvento: "E001", ProductoID: "P0002", Cantidad: 2 },
  { IDEvento: "E001", ProductoID: "P0003", Cantidad: 4 },
  { IDEvento: "E002", ProductoID: "P0004", Cantidad: 8 },
];