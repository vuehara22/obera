import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  PackageSearch,
  Save,
  Search,
  Trash2,
  Truck,
  UserRound,
  TicketPercent,
} from "lucide-react";

import { inventarioDemo, type InventarioItem } from "../data/inventario.demo";
import { clientesDemo, type Cliente } from "../data/clientes.demo";
import { crearEventoApi } from "../services/api";

type TransporteModo = "sin_transporte" | "calcular" | "a_definir";
type MovimientoTipo = "DEBE" | "HABER" | "AJUSTE";
type EstadoCobro = "PENDIENTE" | "SEÑADO" | "PAGADO";

type PrecioFamilia = {
  GrupoFamiliaID: string;
  NombreGrupo: string;
  precios: Record<string, number>;
};

type DraftItem = {
  ProductoID: string;
  Cantidad: number;
  precioUnitario?: number;
  grupoFamiliaId?: string;
  grupoFamiliaNombre?: string;
  precioPeriodo?: string;
};

type TransporteVehiculo = {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  minimoKm: number;
  precioMinimo: number;
  precioPorKm: number;
  porcentajeVentaSinIva: number;
  precioPorBulto: number;
  observaciones: string;
};

type TransporteDetalle = {
  modo: TransporteModo;
  vehiculoId: string;
  vehiculoNombre: string;
  domicilioRelacionado: string;
  ciudadRelacionada: string;
  kmEstimados: number;
  bultos: number;
  totalVentaSinIva: number;
  precioMinimo: number;
  precioPorKm: number;
  precioPorBulto: number;
  porcentajeVentaSinIva: number;
  calculoPorMinimo: number;
  calculoPorKm: number;
  calculoPorBultos: number;
  calculoPorPorcentaje: number;
  montoCalculado: number;
  montoManual: number;
  usarMontoManual: boolean;
  observaciones: string;
};

type EventoDraft = {
  nombreEvento: string;
  cliente: string;
  clienteId: string;
  telefonoCliente: string;
  emailCliente: string;

  fechaEventoInicio: string;
  fechaEventoFin: string;
  fechaStockDesde: string;
  fechaStockHasta: string;
  fechaCobro: string;
  estadoCobro: EstadoCobro;
  diasAlquilerCobrados: number;
  cobrarPorDia: boolean;

  ciudad: string;
  direccion: string;
  transporte: string;
  kmEstimados: number;
  iva: boolean;
  sena: number;
  observaciones: string;
  precioPeriodo: string;
  descuentoNombre: string;
  descuentoPorcentaje: number;
  transporteDetalle: TransporteDetalle;
};

type RegistroEvento = EventoDraft & {
  id: string;
  items: DraftItem[];
  createdAt: string;
  tipo: "presupuesto" | "borrador";
  estado: "pendiente" | "borrador";
  subtotalItems: number;
  totalTransporte: number;
  subtotalAntesDescuento: number;
  descuentoMonto: number;
  baseSinIva: number;
  ivaMonto: number;
  total: number;
};

const INVENTARIO_STORAGE_KEY = "demo_inventario_importado_v4";
const CLIENTES_STORAGE_KEY = "demo_clientes";
const PRESUPUESTOS_STORAGE_KEY = "demo_presupuestos";
const BORRADORES_STORAGE_KEY = "demo_eventos_borrador";
const TRANSPORTE_STORAGE_KEY = "demo_transporte_config_v1";
const PRECIOS_FAMILIA_STORAGE_KEY = "demo_precios_familias_v1";
const CC_MOVS_KEY = "demo_cc_movimientos_v2";

const PERIODOS_PRECIO = [
  "45",
  "45B",
  "46",
  "46B",
  "47",
  "47B",
  "48",
  "48B",
  "49",
  "49B",
  "50",
  "50B",
  "51",
  "51B",
  "52",
  "52B",
];

const DESCUENTOS = [0, 10, 20, 30, 40];

const DEFAULT_TRANSPORTES: TransporteVehiculo[] = [
  {
    id: "sprinter",
    nombre: "Sprinter",
    descripcion: "Traslados medianos / eventos chicos y medianos",
    activo: true,
    minimoKm: 5,
    precioMinimo: 10000,
    precioPorKm: 2000,
    porcentajeVentaSinIva: 5,
    precioPorBulto: 0,
    observaciones:
      "Siempre toma el mayor valor entre mínimo, kilometraje, bultos y 5% del total sin IVA.",
  },
  {
    id: "camioneta",
    nombre: "Camioneta",
    descripcion: "Traslado chico",
    activo: true,
    minimoKm: 5,
    precioMinimo: 10000,
    precioPorKm: 1800,
    porcentajeVentaSinIva: 5,
    precioPorBulto: 0,
    observaciones: "",
  },
  {
    id: "camion",
    nombre: "Camión",
    descripcion: "Traslado grande",
    activo: true,
    minimoKm: 5,
    precioMinimo: 18000,
    precioPorKm: 2800,
    porcentajeVentaSinIva: 5,
    precioPorBulto: 0,
    observaciones: "",
  },
  {
    id: "trailer",
    nombre: "Trailer",
    descripcion: "Traslado con trailer",
    activo: true,
    minimoKm: 5,
    precioMinimo: 15000,
    precioPorKm: 2500,
    porcentajeVentaSinIva: 5,
    precioPorBulto: 0,
    observaciones: "",
  },
];

const DEFAULT_PRECIOS: PrecioFamilia[] = [
  {
    GrupoFamiliaID: "GF001",
    NombreGrupo: "CHICA 70x70",
    precios: { "45": 3450, "45B": 1, "46": 3800, "46B": 1, "47": 4000, "48": 4370 },
  },
  {
    GrupoFamiliaID: "GF002",
    NombreGrupo: "LARGA 2,50",
    precios: { "45": 6300, "45B": 1, "46": 6950, "46B": 1, "47": 7300, "48": 8000 },
  },
  {
    GrupoFamiliaID: "GF003",
    NombreGrupo: "REDONDA 1,50",
    precios: { "45": 6300, "45B": 1, "46": 6950, "46B": 1, "47": 7300, "48": 8000 },
  },
  {
    GrupoFamiliaID: "0644248c",
    NombreGrupo: "Gazebos",
    precios: { "45": 40100, "45B": 1, "46": 45000, "46B": 1, "47": 46300, "48": 51000 },
  },
  {
    GrupoFamiliaID: "9eaa5e5e",
    NombreGrupo: "Sillas Plasticas",
    precios: { "45": 1000, "45B": 1, "46": 1100, "46B": 1, "47": 1160, "48": 1280 },
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safe(v?: string | null) {
  return (v ?? "").trim();
}

function norm(v?: string | null) {
  return safe(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeId(v?: string | null) {
  return safe(v).toUpperCase();
}

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function readArray<T>(key: string, fallback: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeArray<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadInventario() {
  return readArray<InventarioItem>(INVENTARIO_STORAGE_KEY, inventarioDemo).map(
    (item) => ({
      ...item,
      Disponible: safe(item.Disponible) || "Si",
    })
  );
}

function loadClientes() {
  return readArray<Cliente>(CLIENTES_STORAGE_KEY, clientesDemo);
}

function loadTransportes() {
  return readArray<TransporteVehiculo>(
    TRANSPORTE_STORAGE_KEY,
    DEFAULT_TRANSPORTES
  );
}

function loadPreciosFamilias() {
  return readArray<PrecioFamilia>(
    PRECIOS_FAMILIA_STORAGE_KEY,
    DEFAULT_PRECIOS
  );
}

function getGrupoFamiliaProducto(producto?: InventarioItem) {
  return safe(
    (producto as any)?.GrupoFamilias ??
      (producto as any)?.GrupoFamilia ??
      (producto as any)?.grupoFamilia ??
      ""
  );
}

function findPrecioFamilia(precios: PrecioFamilia[], grupo: string) {
  const grupoNorm = norm(grupo);

  return precios.find(
    (p) =>
      norm(p.GrupoFamiliaID) === grupoNorm ||
      norm(p.NombreGrupo) === grupoNorm
  );
}

function diffDiasInclusive(desde: string, hasta: string) {
  if (!desde || !hasta) return 1;

  const d1 = new Date(`${desde}T00:00:00`);
  const d2 = new Date(`${hasta}T00:00:00`);

  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 1;

  const diff = Math.floor((d2.getTime() - d1.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

function buildEmptyTransporteDetalle(): TransporteDetalle {
  return {
    modo: "sin_transporte",
    vehiculoId: "",
    vehiculoNombre: "",
    domicilioRelacionado: "",
    ciudadRelacionada: "",
    kmEstimados: 0,
    bultos: 0,
    totalVentaSinIva: 0,
    precioMinimo: 10000,
    precioPorKm: 0,
    precioPorBulto: 0,
    porcentajeVentaSinIva: 5,
    calculoPorMinimo: 0,
    calculoPorKm: 0,
    calculoPorBultos: 0,
    calculoPorPorcentaje: 0,
    montoCalculado: 0,
    montoManual: 0,
    usarMontoManual: false,
    observaciones: "",
  };
}

function buildEmptyDraft(): EventoDraft {
  const fecha = today();

  return {
    nombreEvento: "",
    cliente: "",
    clienteId: "",
    telefonoCliente: "",
    emailCliente: "",

    fechaEventoInicio: fecha,
    fechaEventoFin: fecha,
    fechaStockDesde: fecha,
    fechaStockHasta: fecha,
    fechaCobro: fecha,
    estadoCobro: "PENDIENTE",
    diasAlquilerCobrados: 1,
    cobrarPorDia: true,

    ciudad: "",
    direccion: "",
    transporte: "Sin transporte",
    kmEstimados: 0,
    iva: true,
    sena: 40,
    observaciones: "",
    precioPeriodo: "45",
    descuentoNombre: "",
    descuentoPorcentaje: 0,
    transporteDetalle: buildEmptyTransporteDetalle(),
  };
}

function calcularTransporte(detalle: TransporteDetalle): TransporteDetalle {
  if (detalle.modo !== "calcular") {
    return {
      ...detalle,
      calculoPorMinimo: 0,
      calculoPorKm: 0,
      calculoPorBultos: 0,
      calculoPorPorcentaje: 0,
      montoCalculado: 0,
    };
  }

  const calculoPorMinimo = Number(detalle.precioMinimo) || 0;
  const calculoPorKm =
    (Number(detalle.kmEstimados) || 0) * (Number(detalle.precioPorKm) || 0);
  const calculoPorBultos =
    (Number(detalle.bultos) || 0) * (Number(detalle.precioPorBulto) || 0);
  const calculoPorPorcentaje =
    ((Number(detalle.totalVentaSinIva) || 0) *
      (Number(detalle.porcentajeVentaSinIva) || 0)) /
    100;

  return {
    ...detalle,
    calculoPorMinimo,
    calculoPorKm,
    calculoPorBultos,
    calculoPorPorcentaje,
    montoCalculado: Math.max(
      calculoPorMinimo,
      calculoPorKm,
      calculoPorBultos,
      calculoPorPorcentaje
    ),
  };
}

function crearMovimientoCuentaCorriente(evento: RegistroEvento) {
  const prev = readArray<any>(CC_MOVS_KEY);

  const descuentoTexto =
    evento.descuentoPorcentaje > 0
      ? ` - Descuento ${evento.descuentoPorcentaje}% ${
          evento.descuentoNombre ? `(${evento.descuentoNombre})` : ""
        }`
      : "";

  const movimiento = {
    id: `CC-${evento.id}`,
    clienteId: evento.clienteId,
    clienteNombre: evento.cliente,
    fecha: evento.fechaCobro || new Date().toISOString().slice(0, 10),
    tipo: "DEBE" as MovimientoTipo,
    concepto: `Evento confirmado: ${evento.nombreEvento}${descuentoTexto}`,
    referencia: evento.id,
    monto: evento.total,
    origen: "evento",
    estadoCobro: evento.estadoCobro,
    fechaEventoInicio: evento.fechaEventoInicio,
    fechaEventoFin: evento.fechaEventoFin,
    fechaStockDesde: evento.fechaStockDesde,
    fechaStockHasta: evento.fechaStockHasta,
    diasAlquilerCobrados: evento.diasAlquilerCobrados,
    createdAt: new Date().toISOString(),
  };

  const sinDuplicado = prev.filter((m) => m.id !== movimiento.id);

  writeArray(CC_MOVS_KEY, [movimiento, ...sinDuplicado]);
  window.dispatchEvent(new Event("cuenta-corriente-updated"));
}

export default function NuevoEvento() {
  const [inventario, setInventario] = useState<InventarioItem[]>(() =>
    loadInventario()
  );
  const [clientes, setClientes] = useState<Cliente[]>(() => loadClientes());
  const [transportes, setTransportes] = useState<TransporteVehiculo[]>(() =>
    loadTransportes()
  );
  const [preciosFamilias, setPreciosFamilias] = useState<PrecioFamilia[]>(() =>
    loadPreciosFamilias()
  );

  const [draft, setDraft] = useState<EventoDraft>(() => buildEmptyDraft());
  const [items, setItems] = useState<DraftItem[]>([]);

  const [clienteQuery, setClienteQuery] = useState("");
  const [productoQuery, setProductoQuery] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);
  const [productoOpen, setProductoOpen] = useState(false);

  const clienteRef = useRef<HTMLDivElement | null>(null);
  const productoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function refresh() {
      setInventario(loadInventario());
      setClientes(loadClientes());
      setTransportes(loadTransportes());
      setPreciosFamilias(loadPreciosFamilias());
    }

    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;

      if (clienteRef.current && !clienteRef.current.contains(target)) {
        setClienteOpen(false);
      }

      if (productoRef.current && !productoRef.current.contains(target)) {
        setProductoOpen(false);
      }
    }

    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("inventario-updated", refresh);
    window.addEventListener("clientes-updated", refresh);
    window.addEventListener("transporte-updated", refresh);
    window.addEventListener("precios-familias-updated", refresh);
    document.addEventListener("mousedown", onMouseDown);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("inventario-updated", refresh);
      window.removeEventListener("clientes-updated", refresh);
      window.removeEventListener("transporte-updated", refresh);
      window.removeEventListener("precios-familias-updated", refresh);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  const transportesActivos = useMemo(
    () => transportes.filter((t) => t.activo !== false),
    [transportes]
  );

  const clientesFiltrados = useMemo(() => {
    const q = norm(clienteQuery);

    return clientes
      .filter((c) => {
        if (!q) return true;

        const haystack = norm(
          `${(c as any).IDCliente ?? ""} ${(c as any).NombreRazonSocial ?? ""} ${
            (c as any).CUITCUIL ?? ""
          } ${(c as any).Telefono ?? ""} ${(c as any).Email ?? ""} ${
            (c as any).Ciudad ?? ""
          }`
        );

        return haystack.includes(q);
      })
      .slice(0, 10);
  }, [clientes, clienteQuery]);

  const productosFiltrados = useMemo(() => {
    const q = norm(productoQuery);

    return inventario
      .filter((p) => p.Activo !== false)
      .filter((p) => {
        if (!q) return true;

        const haystack = norm(
          `${p.ProductoID} ${p.NombreProducto} ${p.Categoria} ${
            p.Subcategoria
          } ${p.Variante ?? ""} ${getGrupoFamiliaProducto(p)}`
        );

        return haystack.includes(q);
      })
      .slice(0, 30);
  }, [inventario, productoQuery]);

  const itemRows = useMemo(() => {
    return items.map((item) => {
      const producto = inventario.find(
        (p) => normalizeId(p.ProductoID) === normalizeId(item.ProductoID)
      );

      const grupoProducto = getGrupoFamiliaProducto(producto);
      const precioFamilia = findPrecioFamilia(preciosFamilias, grupoProducto);

      const precioDesdeFamilia =
        precioFamilia?.precios?.[draft.precioPeriodo] ??
        precioFamilia?.precios?.[String(draft.precioPeriodo)] ??
        0;

      const precioUnitario =
        Number(item.precioUnitario) > 0
          ? Number(item.precioUnitario)
          : Number(precioDesdeFamilia) > 0
          ? Number(precioDesdeFamilia)
          : Number((producto as any)?.Precio ?? producto?.CostoReposicion ?? 0);

      const cantidad = Math.max(0, Number(item.Cantidad) || 0);

      return {
        ...item,
        producto,
        Cantidad: cantidad,
        grupoFamiliaId: precioFamilia?.GrupoFamiliaID ?? item.grupoFamiliaId ?? "",
        grupoFamiliaNombre:
          precioFamilia?.NombreGrupo ?? item.grupoFamiliaNombre ?? grupoProducto,
        precioPeriodo: draft.precioPeriodo,
        precioUnitario,
        total: precioUnitario * cantidad * Math.max(1, Number(draft.diasAlquilerCobrados) || 1),
        stock: Number(producto?.StockActual ?? 0),
      };
    });
  }, [items, inventario, preciosFamilias, draft.precioPeriodo, draft.diasAlquilerCobrados]);

  const subtotalItems = useMemo(() => {
    return itemRows.reduce((acc, item) => acc + item.total, 0);
  }, [itemRows]);

  const transporteCalculado = useMemo(() => {
    return calcularTransporte({
      ...draft.transporteDetalle,
      totalVentaSinIva: subtotalItems,
    });
  }, [draft.transporteDetalle, subtotalItems]);

  const totalTransporte = transporteCalculado.usarMontoManual
    ? Number(transporteCalculado.montoManual) || 0
    : Number(transporteCalculado.montoCalculado) || 0;

  const subtotalAntesDescuento = subtotalItems + totalTransporte;
  const descuentoPorcentaje = Math.max(0, Number(draft.descuentoPorcentaje) || 0);
  const descuentoMonto = Math.round(
    subtotalAntesDescuento * (descuentoPorcentaje / 100)
  );
  const baseSinIva = Math.max(0, subtotalAntesDescuento - descuentoMonto);
  const ivaMonto = draft.iva ? Math.round(baseSinIva * 0.21) : 0;
  const total = baseSinIva + ivaMonto;

  function seleccionarCliente(cliente: Cliente) {
    const nombre = safe((cliente as any).NombreRazonSocial);
    const ciudad = safe((cliente as any).Ciudad);
    const direccion = safe(
      (cliente as any).DireccionEnvio || (cliente as any).Direccion
    );

    setDraft((prev) => ({
      ...prev,
      cliente: nombre,
      clienteId: safe((cliente as any).IDCliente),
      telefonoCliente: safe((cliente as any).Telefono),
      emailCliente: safe((cliente as any).Email),
      ciudad: prev.ciudad || ciudad,
      direccion: prev.direccion || direccion,
      transporteDetalle: {
        ...prev.transporteDetalle,
        ciudadRelacionada: prev.transporteDetalle.ciudadRelacionada || ciudad,
        domicilioRelacionado:
          prev.transporteDetalle.domicilioRelacionado || direccion,
      },
    }));

    setClienteQuery(nombre);
    setClienteOpen(false);
  }

  function seleccionarProducto(producto: InventarioItem) {
    const productoId = normalizeId(producto.ProductoID);

    setItems((prev) => {
      const exists = prev.find(
        (item) => normalizeId(item.ProductoID) === productoId
      );

      if (exists) {
        return prev.map((item) =>
          normalizeId(item.ProductoID) === productoId
            ? { ...item, Cantidad: Number(item.Cantidad || 0) + 1 }
            : item
        );
      }

      const grupoProducto = getGrupoFamiliaProducto(producto);
      const precioFamilia = findPrecioFamilia(preciosFamilias, grupoProducto);
      const precioDesdeFamilia =
        precioFamilia?.precios?.[draft.precioPeriodo] ?? 0;

      return [
        ...prev,
        {
          ProductoID: productoId,
          Cantidad: 1,
          precioUnitario:
            Number(precioDesdeFamilia) > 0
              ? Number(precioDesdeFamilia)
              : Number((producto as any)?.Precio ?? producto.CostoReposicion ?? 0),
          grupoFamiliaId: precioFamilia?.GrupoFamiliaID ?? "",
          grupoFamiliaNombre: precioFamilia?.NombreGrupo ?? grupoProducto,
          precioPeriodo: draft.precioPeriodo,
        },
      ];
    });

    setProductoQuery("");
    setProductoOpen(false);
  }

  function setItemCantidad(productoId: string, cantidad: number) {
    const id = normalizeId(productoId);
    const qty = Math.max(0, Number(cantidad) || 0);

    setItems((prev) => {
      if (qty === 0) {
        return prev.filter((item) => normalizeId(item.ProductoID) !== id);
      }

      return prev.map((item) =>
        normalizeId(item.ProductoID) === id ? { ...item, Cantidad: qty } : item
      );
    });
  }

  function setItemPrecio(productoId: string, precio: number) {
    const id = normalizeId(productoId);

    setItems((prev) =>
      prev.map((item) =>
        normalizeId(item.ProductoID) === id
          ? { ...item, precioUnitario: Math.max(0, Number(precio) || 0) }
          : item
      )
    );
  }

  function updateTransporteDetalle(patch: Partial<TransporteDetalle>) {
    setDraft((prev) => {
      const nextDetalle = calcularTransporte({
        ...prev.transporteDetalle,
        ...patch,
        totalVentaSinIva: subtotalItems,
      });

      return {
        ...prev,
        transporte:
          nextDetalle.modo === "sin_transporte"
            ? "Sin transporte"
            : nextDetalle.modo === "a_definir"
            ? "A definir"
            : nextDetalle.vehiculoNombre || "Transporte",
        kmEstimados: Number(nextDetalle.kmEstimados) || 0,
        transporteDetalle: nextDetalle,
      };
    });
  }

  function seleccionarVehiculoTransporte(vehiculoId: string) {
    const vehiculo = transportesActivos.find((t) => t.id === vehiculoId);

    if (!vehiculo) {
      updateTransporteDetalle({
        vehiculoId: "",
        vehiculoNombre: "",
      });
      return;
    }

    updateTransporteDetalle({
      vehiculoId: vehiculo.id,
      vehiculoNombre: vehiculo.nombre,
      precioMinimo: vehiculo.precioMinimo,
      precioPorKm: vehiculo.precioPorKm,
      precioPorBulto: vehiculo.precioPorBulto,
      porcentajeVentaSinIva: vehiculo.porcentajeVentaSinIva,
      observaciones: vehiculo.observaciones,
    });
  }

  function actualizarFechaEventoInicio(fecha: string) {
    setDraft((prev) => ({
      ...prev,
      fechaEventoInicio: fecha,
      fechaEventoFin: fecha,
      fechaStockDesde: fecha,
      fechaStockHasta: fecha,
      fechaCobro: prev.fechaCobro || fecha,
      diasAlquilerCobrados: 1,
    }));
  }

  function actualizarFechaEventoFin(fecha: string) {
    setDraft((prev) => ({
      ...prev,
      fechaEventoFin: fecha,
      diasAlquilerCobrados: diffDiasInclusive(prev.fechaEventoInicio, fecha),
    }));
  }

  function validar(tipo: "presupuesto" | "borrador") {
    if (tipo === "borrador") return true;

    if (!safe(draft.nombreEvento)) {
      alert("Completá el nombre del evento.");
      return false;
    }

    if (!safe(draft.cliente)) {
      alert("Completá o seleccioná un cliente.");
      return false;
    }

    if (items.length === 0) {
      alert("Agregá al menos un item al evento.");
      return false;
    }

    if (draft.fechaEventoFin < draft.fechaEventoInicio) {
      alert("La fecha fin del evento no puede ser anterior al inicio.");
      return false;
    }

    if (draft.fechaStockHasta < draft.fechaStockDesde) {
      alert("La fecha hasta de stock no puede ser anterior a la fecha desde.");
      return false;
    }

    if (Number(draft.diasAlquilerCobrados) <= 0) {
      alert("Los días cobrados deben ser al menos 1.");
      return false;
    }

    if (
      draft.transporteDetalle.modo === "calcular" &&
      !safe(draft.transporteDetalle.vehiculoId)
    ) {
      alert("Seleccioná un vehículo para calcular el transporte.");
      return false;
    }

    if (Number(draft.descuentoPorcentaje) > 0 && !safe(draft.descuentoNombre)) {
      alert("Completá el nombre o motivo del descuento.");
      return false;
    }

    return true;
  }

  function buildRegistro(tipo: "presupuesto" | "borrador"): RegistroEvento {
    const id = `${tipo === "presupuesto" ? "EVT" : "BOR"}-${Date.now()}`;

    return {
      ...draft,
      id,
      createdAt: new Date().toISOString(),
      tipo,
      estado: tipo === "presupuesto" ? "pendiente" : "borrador",
      transporteDetalle: transporteCalculado,
      transporte:
        transporteCalculado.modo === "calcular"
          ? transporteCalculado.vehiculoNombre
          : draft.transporte,
      kmEstimados: transporteCalculado.kmEstimados,
      items: itemRows.map((item) => ({
        ProductoID: item.ProductoID,
        Cantidad: item.Cantidad,
        precioUnitario: item.precioUnitario,
        grupoFamiliaId: item.grupoFamiliaId,
        grupoFamiliaNombre: item.grupoFamiliaNombre,
        precioPeriodo: draft.precioPeriodo,
      })),
      subtotalItems,
      totalTransporte,
      subtotalAntesDescuento,
      descuentoMonto,
      baseSinIva,
      ivaMonto,
      total,
    };
  }

  function limpiarFormulario() {
    setDraft(buildEmptyDraft());
    setItems([]);
    setClienteQuery("");
    setProductoQuery("");
    setClienteOpen(false);
    setProductoOpen(false);
  }

  async function guardar(tipo: "presupuesto" | "borrador") {
  if (!validar(tipo)) return;

  const payload = buildRegistro(tipo);

  try {
    if (tipo === "presupuesto") {
      await crearEventoApi(payload);

      window.dispatchEvent(new Event("presupuestos-updated"));
      window.dispatchEvent(new Event("eventos-updated"));

      alert("Evento confirmado. Se guardó en PostgreSQL.");
    } else {
      const prev = readArray<RegistroEvento>(BORRADORES_STORAGE_KEY);
      writeArray(BORRADORES_STORAGE_KEY, [payload, ...prev]);

      window.dispatchEvent(new Event("borradores-updated"));
      window.dispatchEvent(new Event("eventos-updated"));

      alert("Borrador guardado localmente.");
    }

    limpiarFormulario();
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar el evento en PostgreSQL.");
  }
}

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-300 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/eventos"
              className="rounded-xl border border-slate-300 bg-white p-2 text-slate-950 shadow-sm hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="rounded-2xl bg-slate-950 p-2 text-white">
              <CalendarCheck2 className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-xl font-extrabold text-slate-950">
                Nuevo Evento
              </h1>
              <p className="text-sm font-medium text-slate-900">
                Evento, bloqueo de stock, días cobrados, transporte y cuenta corriente
              </p>
            </div>
          </div>

          <Link
            to="/precios-familias"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-sm hover:bg-slate-100"
          >
            Configurar precios por familia
          </Link>
        </div>
      </header>

      <main className="space-y-5 p-4 sm:p-6 text-slate-950">
        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
            <UserRound className="h-5 w-5" />
            Datos del evento
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-bold">
              Nombre del evento
              <input
                value={draft.nombreEvento}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, nombreEvento: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Ej: Casamiento López"
              />
            </label>

            <div ref={clienteRef} className="relative text-sm font-bold">
              Cliente
              <input
                value={clienteQuery || draft.cliente}
                onFocus={() => setClienteOpen(true)}
                onChange={(e) => {
                  setClienteQuery(e.target.value);
                  setDraft((prev) => ({
                    ...prev,
                    cliente: e.target.value,
                    clienteId: "",
                  }));
                  setClienteOpen(true);
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Buscar cliente..."
              />

              {clienteOpen && (
                <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-300 bg-white shadow-xl">
                  {clientesFiltrados.map((cliente) => (
                    <button
                      key={safe((cliente as any).IDCliente)}
                      type="button"
                      onClick={() => seleccionarCliente(cliente)}
                      className="block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-100"
                    >
                      <span className="block font-bold">
                        {(cliente as any).NombreRazonSocial}
                      </span>
                      <span className="text-xs font-medium text-slate-700">
                        {(cliente as any).Telefono || "Sin teléfono"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="text-sm font-bold">
              Lista de precio
              <select
                value={draft.precioPeriodo}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, precioPeriodo: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              >
                {PERIODOS_PRECIO.map((periodo) => (
                  <option key={periodo} value={periodo}>
                    Precio {periodo}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              Inicio evento
              <input
                type="date"
                value={draft.fechaEventoInicio}
                onChange={(e) => actualizarFechaEventoInicio(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-bold">
              Fin evento
              <input
                type="date"
                value={draft.fechaEventoFin}
                onChange={(e) => actualizarFechaEventoFin(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-bold">
              Fecha de cobro
              <input
                type="date"
                value={draft.fechaCobro}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, fechaCobro: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-bold">
              Stock bloqueado desde
              <input
                type="date"
                value={draft.fechaStockDesde}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    fechaStockDesde: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-bold">
              Stock bloqueado hasta
              <input
                type="date"
                value={draft.fechaStockHasta}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    fechaStockHasta: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-bold">
              Días cobrados
              <input
                type="number"
                min={1}
                value={draft.diasAlquilerCobrados}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    diasAlquilerCobrados: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-bold">
              Estado cobro
              <select
                value={draft.estadoCobro}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    estadoCobro: e.target.value as EstadoCobro,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="SEÑADO">Señado</option>
                <option value="PAGADO">Pagado</option>
              </select>
            </label>

            <label className="text-sm font-bold">
              Seña %
              <input
                type="number"
                value={draft.sena}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, sena: Number(e.target.value || 0) }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-bold">
              Ciudad
              <input
                value={draft.ciudad}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, ciudad: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-bold md:col-span-2">
              Dirección
              <input
                value={draft.direccion}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, direccion: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
            <PackageSearch className="h-5 w-5" />
            Productos
          </h2>

          <div ref={productoRef} className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              value={productoQuery}
              onFocus={() => setProductoOpen(true)}
              onChange={(e) => {
                setProductoQuery(e.target.value);
                setProductoOpen(true);
              }}
              className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3"
              placeholder="Buscar producto..."
            />

            {productoOpen && (
              <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-300 bg-white shadow-xl">
                {productosFiltrados.map((producto) => (
                  <button
                    key={producto.ProductoID}
                    type="button"
                    onClick={() => seleccionarProducto(producto)}
                    className="block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-100"
                  >
                    <span className="block font-bold">{producto.NombreProducto}</span>
                    <span className="text-xs text-slate-700">
                      {producto.ProductoID} • Stock {producto.StockActual ?? 0} •{" "}
                      {getGrupoFamiliaProducto(producto) || "Sin grupo"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Grupo</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Precio día</th>
                  <th className="px-4 py-3">Días</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Acción</th>
                </tr>
              </thead>

              <tbody>
                {itemRows.map((item) => (
                  <tr key={item.ProductoID} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-bold">
                      {item.producto?.NombreProducto || item.ProductoID}
                      <div className="text-xs font-medium text-slate-600">
                        Stock actual: {item.stock}
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.grupoFamiliaNombre || "—"}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        value={item.Cantidad}
                        onChange={(e) =>
                          setItemCantidad(item.ProductoID, Number(e.target.value))
                        }
                        className="w-24 rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.precioUnitario}
                        onChange={(e) =>
                          setItemPrecio(item.ProductoID, Number(e.target.value))
                        }
                        className="w-32 rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {draft.diasAlquilerCobrados}
                    </td>
                    <td className="px-4 py-3 font-extrabold">{money(item.total)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setItemCantidad(item.ProductoID, 0)}
                        className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {itemRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-600">
                      Agregá productos al evento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
            <Truck className="h-5 w-5" />
            Transporte
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-bold">
              Modo transporte
              <select
                value={draft.transporteDetalle.modo}
                onChange={(e) =>
                  updateTransporteDetalle({
                    modo: e.target.value as TransporteModo,
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              >
                <option value="sin_transporte">Sin transporte</option>
                <option value="calcular">Calcular ahora</option>
                <option value="a_definir">A definir</option>
              </select>
            </label>

            {draft.transporteDetalle.modo === "calcular" && (
              <>
                <label className="text-sm font-bold">
                  Vehículo
                  <select
                    value={draft.transporteDetalle.vehiculoId}
                    onChange={(e) => seleccionarVehiculoTransporte(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Seleccionar</option>
                    {transportesActivos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-bold">
                  Km estimados
                  <input
                    type="number"
                    value={draft.transporteDetalle.kmEstimados}
                    onChange={(e) =>
                      updateTransporteDetalle({
                        kmEstimados: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="text-sm font-bold">
                  Bultos
                  <input
                    type="number"
                    value={draft.transporteDetalle.bultos}
                    onChange={(e) =>
                      updateTransporteDetalle({
                        bultos: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="text-sm font-bold">
                  Usar monto manual
                  <select
                    value={draft.transporteDetalle.usarMontoManual ? "si" : "no"}
                    onChange={(e) =>
                      updateTransporteDetalle({
                        usarMontoManual: e.target.value === "si",
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </label>

                {draft.transporteDetalle.usarMontoManual && (
                  <label className="text-sm font-bold">
                    Monto manual
                    <input
                      type="number"
                      value={draft.transporteDetalle.montoManual}
                      onChange={(e) =>
                        updateTransporteDetalle({
                          montoManual: Number(e.target.value) || 0,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                    />
                  </label>
                )}
              </>
            )}
          </div>

          <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm font-medium">
            Transporte calculado: <b>{money(totalTransporte)}</b>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
            <TicketPercent className="h-5 w-5" />
            Totales
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-sm font-bold">
              Descuento %
              <select
                value={draft.descuentoPorcentaje}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    descuentoPorcentaje: Number(e.target.value) || 0,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              >
                {DESCUENTOS.map((d) => (
                  <option key={d} value={d}>
                    {d}%
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold">
              Motivo descuento
              <input
                value={draft.descuentoNombre}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    descuentoNombre: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-bold">
              IVA
              <select
                value={draft.iva ? "si" : "no"}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, iva: e.target.value === "si" }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              >
                <option value="si">Con IVA</option>
                <option value="no">Sin IVA</option>
              </select>
            </label>

            <label className="text-sm font-bold">
              Observaciones
              <input
                value={draft.observaciones}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    observaciones: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            <TotalBox label="Items" value={money(subtotalItems)} />
            <TotalBox label="Transporte" value={money(totalTransporte)} />
            <TotalBox label="Descuento" value={money(descuentoMonto)} />
            <TotalBox label="IVA" value={money(ivaMonto)} />
            <TotalBox label="Total" value={money(total)} strong />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => guardar("presupuesto")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-black"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar evento
            </button>

            <button
              type="button"
              onClick={() => guardar("borrador")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100"
            >
              <Save className="h-4 w-4" />
              Guardar borrador
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function TotalBox({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        strong
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-300 bg-slate-100 text-slate-950",
      ].join(" ")}
    >
      <div className="text-xs font-bold uppercase opacity-80">{label}</div>
      <div className="mt-1 text-lg font-extrabold">{value}</div>
    </div>
  );
}