export type EventoEstado =
  | "BORRADOR"
  | "CONFIRMADO"
  | "ENTREGADO"
  | "DEVUELTO"
  | "CERRADO";

export type Evento = {
  IDEvento: string;
  NombreEvento: string;
  ClienteRef: string;
  FechaInicio: string; // yyyy-mm-dd
  FechaFin: string; // yyyy-mm-dd
  ListaID?: string;
  DireccionEvento?: string;
  CiudadEvento?: string;
  TransporteRef?: string; // Sprinter / Camión / etc
  KmEstimados?: number;
  CostoTransporte?: number;
  Sena?: number;
  OtrosCostos?: number;
  FormaPago?: string;
  FacturaTipo?: "OFICIAL" | "NO_OFICIAL" | "";
  FacturaN?: string;
  FechaPago?: string;
  Observaciones?: string;
  IVA?: boolean;
  MontoFacturado?: number;
  MontoNoFacturado?: number;
  Estado?: EventoEstado;
  GenerarPDF?: boolean;
  PDFURL?: string;
};

export const eventosDemo: Evento[] = [
  {
    IDEvento: "E001",
    NombreEvento: "Casamiento Pérez",
    ClienteRef: "Eventos SRL",
    FechaInicio: "2025-09-15",
    FechaFin: "2025-09-16",
    DireccionEvento: "-27.374318, -55.893510",
    CiudadEvento: "Córdoba",
    TransporteRef: "Sprinter",
    KmEstimados: 43,
    CostoTransporte: 0,
    OtrosCostos: 100000,
    IVA: true,
    MontoFacturado: 100000,
    Estado: "CONFIRMADO",
    GenerarPDF: true,
  },
  {
    IDEvento: "E002",
    NombreEvento: "Fiesta Empresarial",
    ClienteRef: "Fiestas y Más",
    FechaInicio: "2025-10-01",
    FechaFin: "2025-10-01",
    ListaID: "T45",
    DireccionEvento: "Bv. Illia 200",
    CiudadEvento: "Villa María",
    TransporteRef: "Camión",
    KmEstimados: 120,
    CostoTransporte: 0,
    OtrosCostos: 150000,
    IVA: true,
    MontoFacturado: 150000,
    Estado: "BORRADOR",
    GenerarPDF: true,
  },
];