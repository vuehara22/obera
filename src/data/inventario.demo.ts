export type InventarioItem = {
  ProductoID: string;
  NombreProducto: string;
  Categoria: string;
  Subcategoria: string;
  GrupoFamilias?: string;
  Dimensiones?: string;
  Foto?: string;
  Variante?: string;
  Disponible?: string; // "Si" / "" / etc
  StockInicial?: number;
  CostoReposicion?: number;
  Activo?: boolean;
  StockActual?: number;
  StockMinimo?: number;
  ReordenCantidad?: number;
  UltimaActualizacion?: string;
};

export const inventarioDemo: InventarioItem[] = [
  {
    ProductoID: "P0002",
    NombreProducto: "MESA CHICA 70 X 70",
    Categoria: "Mesas",
    Subcategoria: "Chica 70x70",
    GrupoFamilias: "GF001",
    Dimensiones: "70x70",
    Variante: "SIN FORRO",
    Disponible: "",
    StockInicial: 1,
    CostoReposicion: 80000,
    Activo: true,
    StockActual: 2,
    StockMinimo: 1,
    ReordenCantidad: 1,
    UltimaActualizacion: "",
  },
  {
    ProductoID: "P0003",
    NombreProducto: "MESA CHICA 70 X 70",
    Categoria: "Mesas",
    Subcategoria: "Chica 70x70 Touch",
    GrupoFamilias: "GF001",
    Dimensiones: "70x70",
    Variante: "TOUCH - TAPA",
    Disponible: "Si",
    StockInicial: 18,
    CostoReposicion: 80000,
    Activo: true,
    StockActual: 4,
    StockMinimo: 1,
    ReordenCantidad: 1,
    UltimaActualizacion: "",
  },
  {
    ProductoID: "P0004",
    NombreProducto: "MESA CHICA 70 X 70",
    Categoria: "Mesas",
    Subcategoria: "Chica 70x70 Machimbre",
    GrupoFamilias: "GF001",
    Dimensiones: "70x70",
    Variante: "TAPA - MACHIMBRE",
    Disponible: "",
    StockInicial: 6,
    CostoReposicion: 80000,
    Activo: true,
    StockActual: 25,
    StockMinimo: 1,
    ReordenCantidad: 1,
    UltimaActualizacion: "",
  },
];