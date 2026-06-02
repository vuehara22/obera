export type Cliente = {
  IDCliente: string;
  NombreRazonSocial: string;
  CUITCUIL?: string;
  Telefono?: string;
  Email?: string;
  Direccion?: string;
  DireccionEnvio?: string;        // ✅ agregado
  DireccionFacturacion?: string;  // ✅ agregado
  Ciudad?: string;
  PrefFactura?: string; // A/B/si/etc
  Notas?: string;
  OtroContacto?: string;
  TieneCuentaCorriente?: boolean;
  LimiteCredito?: number;
  CondicionesPago?: string;
  SaldoInicio?: number;
};

export const clientesDemo: Cliente[] = [
  {
    IDCliente: "C001",
    NombreRazonSocial: "Eventos SRL",
    CUITCUIL: "30-12345678-9",
    Telefono: "3511234567",
    Email: "eventos@example.com",
    Direccion: "Av. Colón 123",
    DireccionEnvio: "Av. Colón 123",         // ✅ agregado
    DireccionFacturacion: "Av. Colón 123",   // ✅ agregado
    Ciudad: "Córdoba",
    PrefFactura: "B",
    Notas: "Cliente habitual",
    TieneCuentaCorriente: false,
  },
  {
    IDCliente: "C002",
    NombreRazonSocial: "Fiestas y Más",
    CUITCUIL: "27-98765432-1",
    Telefono: "3519876543",
    Email: "fiestasymas@example.com",
    Direccion: "San Martín 456",
    DireccionEnvio: "San Martín 456",
    DireccionFacturacion: "San Martín 456",
    Ciudad: "Villa María",
    PrefFactura: "A",
    Notas: "Factura parcial",
    TieneCuentaCorriente: true,
  },
  {
    IDCliente: "C003",
    NombreRazonSocial: "María López",
    CUITCUIL: "27-12398765-4",
    Telefono: "3513216549",
    Email: "marialopez@example.com",
    Direccion: "Belgrano 789",
    DireccionEnvio: "Belgrano 789",
    DireccionFacturacion: "Belgrano 789",
    Ciudad: "Río Cuarto",
    PrefFactura: "B",
    Notas: "Nuevo cliente",
    TieneCuentaCorriente: false,
  },
  {
    IDCliente: "b3635015",
    NombreRazonSocial: "nico",
    CUITCUIL: "2039390303003",
    Telefono: "wqwqw",
    Email: "valeria.uehara@gmail.com",
    Direccion: "Antartida Argentina 164",
    DireccionEnvio: "Antartida Argentina 164",
    DireccionFacturacion: "Antartida Argentina 164",
    Ciudad: "",
    PrefFactura: "si",
    TieneCuentaCorriente: true,
  },
];