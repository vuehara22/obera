import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  PackageSearch,
  Pencil,
  Phone,
  Save,
  Search,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import { eventosDemo } from "../data/eventos.demo";
import { inventarioDemo } from "../data/inventario.demo";
import { eventoItemsDemo, type EventoItem } from "../data/eventoItems.demo";

const PRESUPUESTOS_STORAGE_KEY = "demo_presupuestos";
const BORRADORES_STORAGE_KEY = "demo_eventos_borrador";
const INVENTARIO_STORAGE_KEY = "demo_inventario_importado_v4";
const PRECIOS_FAMILIA_STORAGE_KEY = "demo_precios_familias_v1";
const CC_MOVS_KEY = "demo_cc_movimientos_v2";

type EventoEstado =
  | "CONFIRMADO"
  | "BORRADOR"
  | "ENTREGADO"
  | "DEVUELTO"
  | "CERRADO";

type EventoSource = "demo" | "presupuesto" | "borrador";

type ItemEvento = {
  ProductoID: string;
  Cantidad: number;
  precioUnitario?: number;
  grupoFamiliaId?: string;
  grupoFamiliaNombre?: string;
  precioPeriodo?: string;
};

type PrecioFamilia = {
  GrupoFamiliaID: string;
  NombreGrupo: string;
  precios: Record<string, number>;
};

type EventoDetalleData = {
  IDEvento: string;
  NombreEvento: string;
  ClienteRef: string;
  ClienteId?: string;
  FechaInicio: string;
  FechaFin: string;
  CiudadEvento: string;
  DireccionEvento: string;
  TransporteRef: string;
  Estado: EventoEstado;
  IVA: boolean;
  KmEstimados: number;
  TelefonoCliente: string;
  EmailCliente: string;
  Sena: number;
  Observaciones: string;
  precioPeriodo: string;
  subtotalItems: number;
  totalTransporte: number;
  ivaMonto: number;
  total: number;
  items: ItemEvento[];
  source: EventoSource;
};

type EventoFormState = Omit<EventoDetalleData, "source">;

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

const DEFAULT_PRECIOS: PrecioFamilia[] = [
  {
    GrupoFamiliaID: "GF001",
    NombreGrupo: "CHICA 70x70",
    precios: {
      "45": 3450,
      "45B": 1,
      "46": 3800,
      "46B": 1,
      "47": 4000,
      "48": 4370,
    },
  },
  {
    GrupoFamiliaID: "GF002",
    NombreGrupo: "LARGA 2,50",
    precios: {
      "45": 6300,
      "45B": 1,
      "46": 6950,
      "46B": 1,
      "47": 7300,
      "48": 8000,
    },
  },
  {
    GrupoFamiliaID: "GF003",
    NombreGrupo: "REDONDA 1,50",
    precios: {
      "45": 6300,
      "45B": 1,
      "46": 6950,
      "46B": 1,
      "47": 7300,
      "48": 8000,
    },
  },
  {
    GrupoFamiliaID: "0644248c",
    NombreGrupo: "Gazebos",
    precios: {
      "45": 40100,
      "45B": 1,
      "46": 45000,
      "46B": 1,
      "47": 46300,
      "48": 51000,
    },
  },
  {
    GrupoFamiliaID: "9eaa5e5e",
    NombreGrupo: "Sillas Plasticas",
    precios: {
      "45": 1000,
      "45B": 1,
      "46": 1100,
      "46B": 1,
      "47": 1160,
      "48": 1280,
    },
  },
];

function safe(v?: string | null) {
  return (v ?? "").trim();
}

function norm(v?: string | null) {
  return safe(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function moneyARS(n?: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(n)) ? Number(n) : 0);
}

function readStorageArray<T>(key: string, fallback: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeStorageArray<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getInventarioActual() {
  const saved = readStorageArray<any>(INVENTARIO_STORAGE_KEY);
  return saved.length ? saved : inventarioDemo;
}

function getPreciosFamilias() {
  const saved = readStorageArray<PrecioFamilia>(PRECIOS_FAMILIA_STORAGE_KEY);
  return saved.length ? saved : DEFAULT_PRECIOS;
}

function getGrupoFamiliaProducto(producto?: any) {
  return safe(
    producto?.GrupoFamilias ??
      producto?.GrupoFamilia ??
      producto?.grupoFamilia ??
      producto?.Familia ??
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

function badgeEstado(estado: EventoEstado) {
  switch (estado) {
    case "CONFIRMADO":
      return "border-emerald-300 bg-emerald-100 text-emerald-900";
    case "BORRADOR":
      return "border-slate-300 bg-slate-100 text-slate-800";
    case "ENTREGADO":
      return "border-blue-300 bg-blue-100 text-blue-900";
    case "DEVUELTO":
      return "border-violet-300 bg-violet-100 text-violet-900";
    case "CERRADO":
      return "border-amber-300 bg-amber-100 text-amber-900";
    default:
      return "border-slate-300 bg-slate-100 text-slate-800";
  }
}

function mapStorageEvento(
  raw: any,
  source: EventoSource
): EventoDetalleData {
  const estado: EventoEstado =
    source === "presupuesto"
      ? "CONFIRMADO"
      : (safe(raw.Estado ?? raw.estado ?? "BORRADOR").toUpperCase() as EventoEstado);

  const items: ItemEvento[] = Array.isArray(raw.items)
    ? raw.items.map((it: any) => ({
        ProductoID: safe(it.ProductoID ?? it.productoID ?? it.id),
        Cantidad: Number(it.Cantidad ?? it.cantidad ?? 0),
        precioUnitario: Number(it.precioUnitario ?? it.PrecioUnitario ?? 0),
        grupoFamiliaId: safe(it.grupoFamiliaId ?? it.GrupoFamiliaID),
        grupoFamiliaNombre: safe(it.grupoFamiliaNombre ?? it.NombreGrupo),
        precioPeriodo: safe(it.precioPeriodo ?? raw.precioPeriodo ?? "45"),
      }))
    : [];

  return {
    IDEvento: safe(raw.id ?? raw.IDEvento),
    NombreEvento: safe(raw.nombreEvento ?? raw.NombreEvento),
    ClienteRef: safe(raw.cliente ?? raw.ClienteRef),
    ClienteId: safe(raw.clienteId ?? raw.ClienteId),
    FechaInicio: safe(raw.fechaInicio ?? raw.FechaInicio),
    FechaFin: safe(raw.fechaFin ?? raw.FechaFin),
    CiudadEvento: safe(raw.ciudad ?? raw.CiudadEvento),
    DireccionEvento: safe(raw.direccion ?? raw.DireccionEvento),
    TransporteRef: safe(raw.transporte ?? raw.TransporteRef),
    Estado: estado,
    IVA: Boolean(raw.iva ?? raw.IVA),
    KmEstimados: Number(raw.kmEstimados ?? raw.KmEstimados ?? 0),
    TelefonoCliente: safe(raw.telefonoCliente ?? raw.TelefonoCliente),
    EmailCliente: safe(raw.emailCliente ?? raw.EmailCliente),
    Sena: Number(raw.sena ?? raw.Sena ?? 0),
    Observaciones: safe(raw.observaciones ?? raw.Observaciones),
    precioPeriodo: safe(raw.precioPeriodo ?? "45"),
    subtotalItems: Number(raw.subtotalItems ?? 0),
    totalTransporte: Number(raw.totalTransporte ?? 0),
    ivaMonto: Number(raw.ivaMonto ?? 0),
    total: Number(raw.total ?? 0),
    items,
    source,
  };
}

function getEventoById(id?: string): EventoDetalleData | null {
  const presupuestos = readStorageArray<any>(PRESUPUESTOS_STORAGE_KEY);
  const borradores = readStorageArray<any>(BORRADORES_STORAGE_KEY);

  const foundPresupuesto = presupuestos.find(
    (x) => safe(x.id ?? x.IDEvento) === safe(id)
  );

  if (foundPresupuesto) {
    return mapStorageEvento(foundPresupuesto, "presupuesto");
  }

  const foundBorrador = borradores.find(
    (x) => safe(x.id ?? x.IDEvento) === safe(id)
  );

  if (foundBorrador) {
    return mapStorageEvento(foundBorrador, "borrador");
  }

  const demo = eventosDemo.find((e: any) => safe(e.IDEvento) === safe(id));

  if (!demo) return null;

  const demoItems = eventoItemsDemo
    .filter((x: EventoItem) => safe(x.IDEvento) === safe(id))
    .map((x) => ({
      ProductoID: safe(x.ProductoID),
      Cantidad: Number(x.Cantidad ?? 0),
    }));

  return mapStorageEvento(
    {
      ...demo,
      items: demoItems,
      precioPeriodo: "45",
      subtotalItems: 0,
      totalTransporte: 0,
      ivaMonto: 0,
      total: 0,
    },
    "demo"
  );
}

function eventoToForm(evento: EventoDetalleData): EventoFormState {
  return {
    IDEvento: evento.IDEvento,
    NombreEvento: evento.NombreEvento,
    ClienteRef: evento.ClienteRef,
    ClienteId: evento.ClienteId ?? "",
    FechaInicio: evento.FechaInicio,
    FechaFin: evento.FechaFin,
    CiudadEvento: evento.CiudadEvento,
    DireccionEvento: evento.DireccionEvento,
    TransporteRef: evento.TransporteRef,
    Estado: evento.Estado,
    IVA: Boolean(evento.IVA),
    KmEstimados: Number(evento.KmEstimados ?? 0),
    TelefonoCliente: evento.TelefonoCliente ?? "",
    EmailCliente: evento.EmailCliente ?? "",
    Sena: Number(evento.Sena ?? 0),
    Observaciones: evento.Observaciones ?? "",
    precioPeriodo: evento.precioPeriodo || "45",
    subtotalItems: Number(evento.subtotalItems ?? 0),
    totalTransporte: Number(evento.totalTransporte ?? 0),
    ivaMonto: Number(evento.ivaMonto ?? 0),
    total: Number(evento.total ?? 0),
    items: Array.isArray(evento.items) ? evento.items : [],
  };
}

function formToStoragePayload(
  form: EventoFormState,
  totals: {
    subtotalItems: number;
    totalTransporte: number;
    ivaMonto: number;
    total: number;
  },
  tipo: "presupuesto" | "borrador"
) {
  return {
    id: safe(form.IDEvento),
    nombreEvento: safe(form.NombreEvento),
    cliente: safe(form.ClienteRef),
    clienteId: safe(form.ClienteId),
    fechaInicio: safe(form.FechaInicio),
    fechaFin: safe(form.FechaFin),
    ciudad: safe(form.CiudadEvento),
    direccion: safe(form.DireccionEvento),
    transporte: safe(form.TransporteRef),
    iva: Boolean(form.IVA),
    kmEstimados: Number(form.KmEstimados ?? 0),
    telefonoCliente: safe(form.TelefonoCliente),
    emailCliente: safe(form.EmailCliente),
    sena: Number(form.Sena ?? 0),
    observaciones: safe(form.Observaciones),
    precioPeriodo: safe(form.precioPeriodo) || "45",
    items: form.items
      .filter((it) => safe(it.ProductoID))
      .map((it) => ({
        ProductoID: safe(it.ProductoID),
        Cantidad: Math.max(0, Number(it.Cantidad ?? 0)),
        precioUnitario: Number(it.precioUnitario ?? 0),
        grupoFamiliaId: safe(it.grupoFamiliaId),
        grupoFamiliaNombre: safe(it.grupoFamiliaNombre),
        precioPeriodo: safe(it.precioPeriodo || form.precioPeriodo || "45"),
      })),
    createdAt: new Date().toISOString(),
    tipo,
    estado: tipo === "presupuesto" ? "pendiente" : "borrador",
    subtotalItems: totals.subtotalItems,
    totalTransporte: totals.totalTransporte,
    ivaMonto: totals.ivaMonto,
    total: totals.total,
  };
}

function createCuentaCorrienteMovimiento(payload: any) {
  const prev = readStorageArray<any>(CC_MOVS_KEY);

  const movimiento = {
    id: `CC-${payload.id}`,
    clienteId: payload.clienteId,
    clienteNombre: payload.cliente,
    fecha: new Date().toISOString(),
    tipo: "DEBE",
    concepto: `Evento confirmado: ${payload.nombreEvento}`,
    referencia: payload.id,
    monto: Number(payload.total ?? 0),
    origen: "evento",
    createdAt: new Date().toISOString(),
  };

  const sinDuplicado = prev.filter((x) => x.id !== movimiento.id);

  writeStorageArray(CC_MOVS_KEY, [movimiento, ...sinDuplicado]);
  window.dispatchEvent(new Event("cuenta-corriente-updated"));
}

export default function EventoDetalle() {
  const { id } = useParams();

  const [evento, setEvento] = useState<EventoDetalleData | null>(() =>
    getEventoById(id)
  );

  const [form, setForm] = useState<EventoFormState | null>(() => {
    const current = getEventoById(id);
    return current ? eventoToForm(current) : null;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const current = getEventoById(id);
    setEvento(current);
    setForm(current ? eventoToForm(current) : null);
    setIsEditing(false);
    setProductSearch("");
  }, [id]);

  const inventarioActual = useMemo(() => getInventarioActual(), [evento, isEditing]);
  const preciosFamilias = useMemo(() => getPreciosFamilias(), [evento, isEditing]);

  const editable = Boolean(evento && evento.source !== "demo");
  const canConfirm = Boolean(
    evento && evento.source === "borrador" && evento.Estado === "BORRADOR"
  );

  const currentData = isEditing && form ? form : evento;

  const itemRows = useMemo(() => {
    return (currentData?.items ?? []).map((item, index) => {
      const producto = inventarioActual.find(
        (p: any) => safe(p.ProductoID) === safe(item.ProductoID)
      );

      const grupoProducto = getGrupoFamiliaProducto(producto);
      const precioFamilia = findPrecioFamilia(preciosFamilias, grupoProducto);
      const periodo =
        safe(currentData?.precioPeriodo) || safe(item.precioPeriodo) || "45";

      const precioDesdeFamilia =
        precioFamilia?.precios?.[periodo] ??
        precioFamilia?.precios?.[String(periodo)] ??
        0;

      const precioUnitario =
        Number(item.precioUnitario) > 0
          ? Number(item.precioUnitario)
          : Number(precioDesdeFamilia) > 0
          ? Number(precioDesdeFamilia)
          : Number(producto?.Precio ?? producto?.CostoReposicion ?? 0);

      const cantidad = Math.max(0, Number(item.Cantidad ?? 0));

      return {
        key: `${safe(item.ProductoID)}-${index}`,
        index,
        ProductoID: safe(item.ProductoID),
        Cantidad: cantidad,
        producto,
        grupoFamiliaId:
          safe(item.grupoFamiliaId) ||
          safe(precioFamilia?.GrupoFamiliaID) ||
          safe(grupoProducto),
        grupoFamiliaNombre:
          safe(item.grupoFamiliaNombre) ||
          safe(precioFamilia?.NombreGrupo) ||
          safe(grupoProducto),
        precioPeriodo: periodo,
        precioUnitario,
        total: precioUnitario * cantidad,
        stockActual: Number(producto?.StockActual ?? 0),
        stockDespues: Number(producto?.StockActual ?? 0) - cantidad,
      };
    });
  }, [currentData, inventarioActual, preciosFamilias]);

  const subtotalItems = useMemo(
    () => itemRows.reduce((acc, item) => acc + item.total, 0),
    [itemRows]
  );

  const totalTransporte = Number(currentData?.totalTransporte ?? 0);
  const baseSinIva = subtotalItems + totalTransporte;
  const ivaMonto = currentData?.IVA ? Math.round(baseSinIva * 0.21) : 0;
  const total = baseSinIva + ivaMonto;

  const stockIssues = useMemo(() => {
    return itemRows.filter((item) => item.Cantidad > item.stockActual);
  }, [itemRows]);

  const availableProductsToAdd = useMemo(() => {
    if (!form) return [];

    const used = new Set(form.items.map((it) => safe(it.ProductoID)));
    const q = norm(productSearch);

    return inventarioActual
      .filter((producto: any) => !used.has(safe(producto.ProductoID)))
      .filter((producto: any) => {
        if (!q) return true;

        const haystack = norm(
          `${producto.ProductoID} ${producto.NombreProducto} ${
            producto.Categoria ?? ""
          } ${producto.Subcategoria ?? ""} ${producto.Variante ?? ""} ${getGrupoFamiliaProducto(
            producto
          )}`
        );

        return haystack.includes(q);
      })
      .slice(0, 80);
  }, [form, inventarioActual, productSearch]);

  function setField<K extends keyof EventoFormState>(
    key: K,
    value: EventoFormState[K]
  ) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setFechaInicio(value: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            FechaInicio: value,
            FechaFin: value,
          }
        : prev
    );
  }

  function setItemCantidad(index: number, cantidad: number) {
    setForm((prev) => {
      if (!prev) return prev;

      const nextItems = [...prev.items];
      const current = nextItems[index];

      if (!current) return prev;

      const qty = Math.max(0, Number(cantidad) || 0);

      if (qty === 0) {
        return {
          ...prev,
          items: nextItems.filter((_, i) => i !== index),
        };
      }

      nextItems[index] = {
        ...current,
        Cantidad: qty,
      };

      return {
        ...prev,
        items: nextItems,
      };
    });
  }

  function setItemPrecio(index: number, precio: number) {
    setForm((prev) => {
      if (!prev) return prev;

      const nextItems = [...prev.items];
      const current = nextItems[index];

      if (!current) return prev;

      nextItems[index] = {
        ...current,
        precioUnitario: Math.max(0, Number(precio) || 0),
      };

      return {
        ...prev,
        items: nextItems,
      };
    });
  }

  function removeItem(index: number) {
    setForm((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      };
    });
  }

  function addItem(productoId: string) {
    if (!form) return;

    const producto = inventarioActual.find(
      (p: any) => safe(p.ProductoID) === safe(productoId)
    );

    if (!producto) return;

    const grupoProducto = getGrupoFamiliaProducto(producto);
    const precioFamilia = findPrecioFamilia(preciosFamilias, grupoProducto);
    const periodo = safe(form.precioPeriodo) || "45";

    const precioDesdeFamilia = precioFamilia?.precios?.[periodo] ?? 0;

    const precioUnitario =
      Number(precioDesdeFamilia) > 0
        ? Number(precioDesdeFamilia)
        : Number(producto?.Precio ?? producto?.CostoReposicion ?? 0);

    setForm((prev) => {
      if (!prev) return prev;

      if (prev.items.some((it) => safe(it.ProductoID) === safe(productoId))) {
        return prev;
      }

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            ProductoID: safe(productoId),
            Cantidad: 1,
            precioUnitario,
            grupoFamiliaId: safe(precioFamilia?.GrupoFamiliaID),
            grupoFamiliaNombre: safe(precioFamilia?.NombreGrupo || grupoProducto),
            precioPeriodo: periodo,
          },
        ],
      };
    });

    setProductSearch("");
  }

  function cancelEdit() {
    if (!evento) return;

    setForm(eventoToForm(evento));
    setIsEditing(false);
    setProductSearch("");
  }

  function validarFormulario() {
    if (!form) return false;

    if (!safe(form.NombreEvento)) {
      alert("Completá el nombre del evento.");
      return false;
    }

    if (!safe(form.ClienteRef)) {
      alert("Completá el cliente.");
      return false;
    }

    if (!safe(form.FechaInicio)) {
      alert("Completá la fecha de inicio.");
      return false;
    }

    if (!safe(form.FechaFin)) {
      alert("Completá la fecha de fin.");
      return false;
    }

    if (form.items.length === 0) {
      alert("Agregá al menos un item.");
      return false;
    }

    return true;
  }

  function saveChanges() {
    if (!evento || !form || !editable) return;
    if (!validarFormulario()) return;

    setSaving(true);

    try {
      const totals = {
        subtotalItems,
        totalTransporte,
        ivaMonto,
        total,
      };

      if (evento.source === "borrador") {
        const payload = formToStoragePayload(form, totals, "borrador");

        const borradores = readStorageArray<any>(BORRADORES_STORAGE_KEY);
        const nextBorradores = borradores.map((x) =>
          safe(x.id ?? x.IDEvento) === safe(evento.IDEvento) ? payload : x
        );

        writeStorageArray(BORRADORES_STORAGE_KEY, nextBorradores);

        const updated = mapStorageEvento(payload, "borrador");

        setEvento(updated);
        setForm(eventoToForm(updated));
        setIsEditing(false);

        window.dispatchEvent(new Event("borradores-updated"));
        window.dispatchEvent(new Event("eventos-updated"));

        alert("Borrador actualizado correctamente.");
      }

      if (evento.source === "presupuesto") {
        const payload = formToStoragePayload(form, totals, "presupuesto");

        const presupuestos = readStorageArray<any>(PRESUPUESTOS_STORAGE_KEY);
        const nextPresupuestos = presupuestos.map((x) =>
          safe(x.id ?? x.IDEvento) === safe(evento.IDEvento) ? payload : x
        );

        writeStorageArray(PRESUPUESTOS_STORAGE_KEY, nextPresupuestos);
        createCuentaCorrienteMovimiento(payload);

        const updated = mapStorageEvento(payload, "presupuesto");

        setEvento(updated);
        setForm(eventoToForm(updated));
        setIsEditing(false);

        window.dispatchEvent(new Event("presupuestos-updated"));
        window.dispatchEvent(new Event("eventos-updated"));

        alert("Evento actualizado correctamente.");
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar el evento.");
    } finally {
      setSaving(false);
    }
  }

  function confirmarEvento() {
    if (!evento || !form || !canConfirm) return;
    if (!validarFormulario()) return;

    if (stockIssues.length > 0) {
      const ok = window.confirm(
        `Hay productos con stock insuficiente:\n\n${stockIssues
          .map(
            (item) =>
              `• ${item.ProductoID} - solicitado: ${item.Cantidad}, stock: ${item.stockActual}`
          )
          .join("\n")}\n\n¿Querés confirmar igual?`
      );

      if (!ok) return;
    }

    setConfirming(true);

    try {
      const totals = {
        subtotalItems,
        totalTransporte,
        ivaMonto,
        total,
      };

      const payload = formToStoragePayload(
        {
          ...form,
          Estado: "CONFIRMADO",
        },
        totals,
        "presupuesto"
      );

      const borradores = readStorageArray<any>(BORRADORES_STORAGE_KEY);
      const presupuestos = readStorageArray<any>(PRESUPUESTOS_STORAGE_KEY);
      const inventario = getInventarioActual();

      const nextBorradores = borradores.filter(
        (x) => safe(x.id ?? x.IDEvento) !== safe(evento.IDEvento)
      );

      const nextPresupuestos = [
        payload,
        ...presupuestos.filter(
          (x) => safe(x.id ?? x.IDEvento) !== safe(evento.IDEvento)
        ),
      ];

      const nextInventario = inventario.map((producto: any) => {
        const item = form.items.find(
          (it) => safe(it.ProductoID) === safe(producto.ProductoID)
        );

        if (!item) return producto;

        const stockActual = Number(producto.StockActual ?? 0);
        const cantidad = Number(item.Cantidad ?? 0);
        const nuevoStock = stockActual - cantidad;

        return {
          ...producto,
          StockActual: nuevoStock,
          Disponible: nuevoStock > 0 ? "Si" : "No",
          UltimaActualizacion: new Date().toISOString(),
        };
      });

      writeStorageArray(BORRADORES_STORAGE_KEY, nextBorradores);
      writeStorageArray(PRESUPUESTOS_STORAGE_KEY, nextPresupuestos);
      writeStorageArray(INVENTARIO_STORAGE_KEY, nextInventario);

      createCuentaCorrienteMovimiento(payload);

      const updated = mapStorageEvento(payload, "presupuesto");

      setEvento(updated);
      setForm(eventoToForm(updated));
      setIsEditing(false);
      setProductSearch("");

      window.dispatchEvent(new Event("borradores-updated"));
      window.dispatchEvent(new Event("presupuestos-updated"));
      window.dispatchEvent(new Event("inventario-updated"));
      window.dispatchEvent(new Event("eventos-updated"));

      alert(
        "Evento confirmado correctamente. Se descontó stock e impactó en cuenta corriente."
      );
    } catch (error) {
      console.error(error);
      alert("No se pudo confirmar el evento.");
    } finally {
      setConfirming(false);
    }
  }

  if (!evento || !form) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <Link
          to="/eventos"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-900 shadow-sm hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-950">
            Evento no encontrado
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-700">
            No se encontró un evento con ese identificador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-300 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/eventos"
              className="rounded-xl border border-slate-300 bg-white p-2 text-slate-900 shadow-sm hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="rounded-2xl bg-slate-950 p-2 text-white">
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold text-slate-950">
                {evento.NombreEvento || "Evento"}
              </h1>
              <p className="text-sm font-medium text-slate-700">
                {evento.IDEvento} · {evento.source}
              </p>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-extrabold ${badgeEstado(
                evento.Estado
              )}`}
            >
              {evento.Estado}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {editable && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-900 shadow-sm hover:bg-slate-100"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
            )}

            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-900 shadow-sm hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 font-bold text-white shadow-sm hover:bg-black disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </>
            )}

            {canConfirm && (
              <button
                type="button"
                onClick={confirmarEvento}
                disabled={confirming}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {confirming ? "Confirmando..." : "Confirmar evento"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="space-y-5 p-4 sm:p-6">
        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
            <UserRound className="h-5 w-5" />
            Datos del evento
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-bold text-slate-900">
              Nombre del evento
              <input
                disabled={!isEditing}
                value={form.NombreEvento}
                onChange={(e) => setField("NombreEvento", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm font-bold text-slate-900">
              Cliente
              <input
                disabled={!isEditing}
                value={form.ClienteRef}
                onChange={(e) => setField("ClienteRef", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm font-bold text-slate-900">
              Lista de precio
              <select
                disabled={!isEditing}
                value={form.precioPeriodo || "45"}
                onChange={(e) => setField("precioPeriodo", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
              >
                {PERIODOS_PRECIO.map((periodo) => (
                  <option key={periodo} value={periodo}>
                    Precio {periodo}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-900">
              Fecha inicio
              <input
                disabled={!isEditing}
                type="date"
                value={form.FechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm font-bold text-slate-900">
              Fecha fin
              <input
                disabled={!isEditing}
                type="date"
                value={form.FechaFin}
                onChange={(e) => setField("FechaFin", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-900">
              <input
                disabled={!isEditing}
                type="checkbox"
                checked={Boolean(form.IVA)}
                onChange={(e) => setField("IVA", e.target.checked)}
              />
              Aplicar IVA
            </label>

            <label className="text-sm font-bold text-slate-900">
              Teléfono
              <input
                disabled={!isEditing}
                value={form.TelefonoCliente}
                onChange={(e) => setField("TelefonoCliente", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm font-bold text-slate-900">
              Email
              <input
                disabled={!isEditing}
                value={form.EmailCliente}
                onChange={(e) => setField("EmailCliente", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm font-bold text-slate-900">
              Seña %
              <input
                disabled={!isEditing}
                type="number"
                value={form.Sena}
                onChange={(e) => setField("Sena", Number(e.target.value || 0))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm font-bold text-slate-900">
              Ciudad
              <input
                disabled={!isEditing}
                value={form.CiudadEvento}
                onChange={(e) => setField("CiudadEvento", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm font-bold text-slate-900 md:col-span-2">
              Dirección
              <input
                disabled={!isEditing}
                value={form.DireccionEvento}
                onChange={(e) => setField("DireccionEvento", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm font-bold text-slate-900 md:col-span-3">
              Observaciones
              <textarea
                disabled={!isEditing}
                value={form.Observaciones}
                onChange={(e) => setField("Observaciones", e.target.value)}
                className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
            <PackageSearch className="h-5 w-5" />
            Items
          </h2>

          {isEditing && (
            <div className="relative mb-4">
              <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar producto para agregar..."
                  className="w-full outline-none"
                />
              </div>

              {productSearch && (
                <div className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-slate-300 bg-white shadow-xl">
                  {availableProductsToAdd.map((producto: any) => (
                    <button
                      key={producto.ProductoID}
                      type="button"
                      onClick={() => addItem(producto.ProductoID)}
                      className="block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-100"
                    >
                      <span className="block font-bold text-slate-950">
                        {producto.NombreProducto}
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {producto.ProductoID} ·{" "}
                        {getGrupoFamiliaProducto(producto) || "Sin familia"} ·
                        Stock: {producto.StockActual ?? 0}
                      </span>
                    </button>
                  ))}

                  {availableProductsToAdd.length === 0 && (
                    <div className="px-3 py-4 text-sm font-medium text-slate-600">
                      No se encontraron productos.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="overflow-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-100 text-left text-slate-800">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Familia</th>
                  <th className="px-3 py-2">Lista</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2">Precio unitario</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>

              <tbody>
                {itemRows.map((item) => (
                  <tr key={item.key} className="border-t border-slate-200">
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-950">
                        {item.producto?.NombreProducto || item.ProductoID}
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        {item.ProductoID}
                      </div>
                    </td>

                    <td className="px-3 py-2 font-medium text-slate-700">
                      {item.grupoFamiliaNombre || "Sin familia"}
                    </td>

                    <td className="px-3 py-2 font-bold text-slate-700">
                      {item.precioPeriodo}
                    </td>

                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={item.Cantidad}
                          onChange={(e) =>
                            setItemCantidad(item.index, Number(e.target.value || 0))
                          }
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                        />
                      ) : (
                        <span className="font-bold">{item.Cantidad}</span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={item.precioUnitario}
                          onChange={(e) =>
                            setItemPrecio(item.index, Number(e.target.value || 0))
                          }
                          className="w-32 rounded-lg border border-slate-300 px-2 py-1"
                        />
                      ) : (
                        <span className="font-bold">
                          {moneyARS(item.precioUnitario)}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2 font-extrabold text-slate-950">
                      {moneyARS(item.total)}
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={
                          item.stockDespues < 0
                            ? "font-extrabold text-red-700"
                            : "font-bold text-slate-700"
                        }
                      >
                        {item.stockActual}
                      </span>
                    </td>

                    <td className="px-3 py-2">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.index)}
                          className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {itemRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center font-medium text-slate-600"
                    >
                      Este evento no tiene items cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
              <Truck className="h-5 w-5" />
              Transporte
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-slate-900 md:col-span-2">
                Transporte
                <input
                  disabled={!isEditing}
                  value={form.TransporteRef}
                  onChange={(e) => setField("TransporteRef", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                />
              </label>

              <label className="text-sm font-bold text-slate-900">
                Km estimados
                <input
                  disabled={!isEditing}
                  type="number"
                  value={form.KmEstimados}
                  onChange={(e) =>
                    setField("KmEstimados", Number(e.target.value || 0))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                />
              </label>

              <label className="text-sm font-bold text-slate-900">
                Total transporte
                <input
                  disabled={!isEditing}
                  type="number"
                  value={form.totalTransporte}
                  onChange={(e) =>
                    setField("totalTransporte", Number(e.target.value || 0))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
              <CalendarDays className="h-5 w-5" />
              Resumen
            </h2>

            <div className="space-y-3 text-sm font-bold text-slate-800">
              <div className="flex justify-between">
                <span>Total items</span>
                <span>{moneyARS(subtotalItems)}</span>
              </div>

              <div className="flex justify-between">
                <span>Transporte</span>
                <span>{moneyARS(totalTransporte)}</span>
              </div>

              <div className="flex justify-between">
                <span>Base sin IVA</span>
                <span>{moneyARS(baseSinIva)}</span>
              </div>

              <div className="flex justify-between">
                <span>IVA</span>
                <span>{moneyARS(ivaMonto)}</span>
              </div>

              <div className="flex justify-between border-t border-slate-300 pt-3 text-xl font-extrabold text-slate-950">
                <span>Total</span>
                <span>{moneyARS(total)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
              <MapPin className="h-5 w-5" />
              Ubicación
            </h2>

            <p className="font-bold text-slate-950">
              {form.CiudadEvento || "Sin ciudad"}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {form.DireccionEvento || "Sin dirección"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
              <UserRound className="h-5 w-5" />
              Contacto
            </h2>

            <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Phone className="h-4 w-4" />
              {form.TelefonoCliente || "Sin teléfono"}
            </p>

            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Mail className="h-4 w-4" />
              {form.EmailCliente || "Sin email"}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}