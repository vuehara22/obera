import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Search,
  Save,
  AlertTriangle,
} from "lucide-react";

import { inventarioDemo, type InventarioItem } from "../data/inventario.demo";

type MovimientoTipo = "DEBE" | "HABER" | "AJUSTE";

type EventoItem = {
  ProductoID: string;
  Cantidad: number;
  precioUnitario?: number;
  grupoFamiliaId?: string;
  grupoFamiliaNombre?: string;
  precioPeriodo?: string;
};

type EventoGuardado = {
  id: string;
  nombreEvento: string;
  cliente: string;
  clienteId: string;
  telefonoCliente?: string;
  emailCliente?: string;
  fechaInicio?: string;
  fechaFin?: string;
  ciudad?: string;
  direccion?: string;
  transporte?: string;
  total?: number;
  items: EventoItem[];
  createdAt?: string;
  estado?: string;
};

type DevolucionItem = {
  ProductoID: string;
  Cantidad: number;
  devuelto: boolean;
  cantidadDevuelta: number;
  cantidadRota: number;
  cantidadFaltante: number;
  costoReposicion: number;
  cobrar: boolean;
};

type RegistroDevolucion = {
  id: string;
  eventoId: string;
  eventoNombre: string;
  clienteId: string;
  clienteNombre: string;
  fechaDevolucion: string;
  observaciones: string;
  items: DevolucionItem[];
  totalExtra: number;
  facturaExtraGenerada: boolean;
  createdAt: string;
};

const INVENTARIO_STORAGE_KEY = "demo_inventario_importado_v4";
const PRESUPUESTOS_STORAGE_KEY = "demo_presupuestos";
const DEVOLUCIONES_STORAGE_KEY = "demo_devoluciones_v1";
const CC_MOVS_KEY = "demo_cc_movimientos_v2";

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

function today() {
  return new Date().toISOString().slice(0, 10);
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
  return readArray<InventarioItem>(INVENTARIO_STORAGE_KEY, inventarioDemo);
}

function loadEventos() {
  return readArray<EventoGuardado>(PRESUPUESTOS_STORAGE_KEY, []).filter(
    (e) => Array.isArray(e.items) && e.items.length > 0
  );
}

function getProductoNombre(producto?: InventarioItem, productoId?: string) {
  return safe(producto?.NombreProducto) || productoId || "Producto";
}

function getCostoReposicion(producto?: InventarioItem) {
  return Number((producto as any)?.CostoReposicion ?? 0) || 0;
}

function crearMovimientoCuentaCorriente(devolucion: RegistroDevolucion) {
  if (!devolucion.facturaExtraGenerada || devolucion.totalExtra <= 0) return;

  const prev = readArray<any>(CC_MOVS_KEY);

  const movimiento = {
    id: `DEV-${devolucion.id}`,
    clienteId: devolucion.clienteId,
    clienteNombre: devolucion.clienteNombre,
    fecha: new Date().toISOString(),
    tipo: "DEBE" as MovimientoTipo,
    concepto: `Factura extra devolución: ${devolucion.eventoNombre}`,
    referencia: devolucion.id,
    monto: devolucion.totalExtra,
    origen: "devolucion",
    createdAt: new Date().toISOString(),
  };

  const sinDuplicado = prev.filter((m) => m.id !== movimiento.id);

  writeArray(CC_MOVS_KEY, [movimiento, ...sinDuplicado]);
  window.dispatchEvent(new Event("cuenta-corriente-updated"));
}

export default function Devoluciones() {
  const [inventario, setInventario] = useState<InventarioItem[]>(() =>
    loadInventario()
  );
  const [eventos, setEventos] = useState<EventoGuardado[]>(() => loadEventos());

  const [query, setQuery] = useState("");
  const [eventoSeleccionado, setEventoSeleccionado] =
    useState<EventoGuardado | null>(null);

  const [fechaDevolucion, setFechaDevolucion] = useState(today());
  const [observaciones, setObservaciones] = useState("");
  const [generarFacturaExtra, setGenerarFacturaExtra] = useState(true);
  const [items, setItems] = useState<DevolucionItem[]>([]);

  useEffect(() => {
    function refresh() {
      setInventario(loadInventario());
      setEventos(loadEventos());
    }

    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("inventario-updated", refresh);
    window.addEventListener("presupuestos-updated", refresh);
    window.addEventListener("eventos-updated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("inventario-updated", refresh);
      window.removeEventListener("presupuestos-updated", refresh);
      window.removeEventListener("eventos-updated", refresh);
    };
  }, []);

  const eventosFiltrados = useMemo(() => {
    const q = norm(query);

    return eventos
      .filter((evento) => {
        if (!q) return true;

        const haystack = norm(
          `${evento.id} ${evento.nombreEvento} ${evento.cliente} ${evento.clienteId} ${evento.ciudad} ${evento.direccion}`
        );

        return haystack.includes(q);
      })
      .slice(0, 20);
  }, [eventos, query]);

  const itemRows = useMemo(() => {
    return items.map((item) => {
      const producto = inventario.find(
        (p) => normalizeId(p.ProductoID) === normalizeId(item.ProductoID)
      );

      const cantidadRota = Math.max(0, Number(item.cantidadRota) || 0);
      const cantidadFaltante = Math.max(0, Number(item.cantidadFaltante) || 0);
      const costoReposicion = Math.max(0, Number(item.costoReposicion) || 0);

      const totalItem = item.cobrar
        ? (cantidadRota + cantidadFaltante) * costoReposicion
        : 0;

      return {
        ...item,
        producto,
        nombreProducto: getProductoNombre(producto, item.ProductoID),
        cantidadRota,
        cantidadFaltante,
        costoReposicion,
        totalItem,
      };
    });
  }, [items, inventario]);

  const totalExtra = useMemo(() => {
    return itemRows.reduce((acc, item) => acc + item.totalItem, 0);
  }, [itemRows]);

  const cantidadTotalItems = useMemo(() => {
    return itemRows.reduce((acc, item) => acc + Number(item.Cantidad || 0), 0);
  }, [itemRows]);

  const cantidadConProblema = useMemo(() => {
    return itemRows.reduce(
      (acc, item) => acc + item.cantidadRota + item.cantidadFaltante,
      0
    );
  }, [itemRows]);

  function seleccionarEvento(evento: EventoGuardado) {
    setEventoSeleccionado(evento);
    setQuery(`${evento.id} · ${evento.nombreEvento} · ${evento.cliente}`);

    const nextItems = evento.items.map((item) => {
      const producto = inventario.find(
        (p) => normalizeId(p.ProductoID) === normalizeId(item.ProductoID)
      );

      const cantidad = Math.max(0, Number(item.Cantidad) || 0);

      return {
        ProductoID: normalizeId(item.ProductoID),
        Cantidad: cantidad,
        devuelto: true,
        cantidadDevuelta: cantidad,
        cantidadRota: 0,
        cantidadFaltante: 0,
        costoReposicion: getCostoReposicion(producto),
        cobrar: true,
      };
    });

    setItems(nextItems);
  }

  function toggleDevuelto(productoId: string, checked: boolean) {
    const id = normalizeId(productoId);

    setItems((prev) =>
      prev.map((item) =>
        normalizeId(item.ProductoID) === id
          ? {
              ...item,
              devuelto: checked,
              cantidadDevuelta: checked ? item.Cantidad : 0,
              cantidadFaltante: checked ? item.cantidadFaltante : item.Cantidad,
            }
          : item
      )
    );
  }

  function updateItem(productoId: string, patch: Partial<DevolucionItem>) {
    const id = normalizeId(productoId);

    setItems((prev) =>
      prev.map((item) => {
        if (normalizeId(item.ProductoID) !== id) return item;

        const next = {
          ...item,
          ...patch,
        };

        const cantidadTotal = Math.max(0, Number(next.Cantidad) || 0);
        const rotos = Math.max(0, Number(next.cantidadRota) || 0);
        const faltantes = Math.max(0, Number(next.cantidadFaltante) || 0);
        const devueltos = Math.max(
          0,
          Math.min(cantidadTotal, cantidadTotal - faltantes)
        );

        return {
          ...next,
          cantidadRota: Math.min(rotos, cantidadTotal),
          cantidadFaltante: Math.min(faltantes, cantidadTotal),
          cantidadDevuelta: devueltos,
          devuelto: devueltos > 0,
        };
      })
    );
  }

  function limpiar() {
    setEventoSeleccionado(null);
    setQuery("");
    setFechaDevolucion(today());
    setObservaciones("");
    setGenerarFacturaExtra(true);
    setItems([]);
  }

  function guardarDevolucion() {
    if (!eventoSeleccionado) {
      alert("Seleccioná un evento.");
      return;
    }

    if (items.length === 0) {
      alert("El evento no tiene items para devolver.");
      return;
    }

    const registro: RegistroDevolucion = {
      id: `DEV-${Date.now()}`,
      eventoId: eventoSeleccionado.id,
      eventoNombre: eventoSeleccionado.nombreEvento,
      clienteId: eventoSeleccionado.clienteId,
      clienteNombre: eventoSeleccionado.cliente,
      fechaDevolucion,
      observaciones,
      items,
      totalExtra,
      facturaExtraGenerada: generarFacturaExtra && totalExtra > 0,
      createdAt: new Date().toISOString(),
    };

    const prev = readArray<RegistroDevolucion>(DEVOLUCIONES_STORAGE_KEY);
    writeArray(DEVOLUCIONES_STORAGE_KEY, [registro, ...prev]);

    crearMovimientoCuentaCorriente(registro);

    window.dispatchEvent(new Event("devoluciones-updated"));
    window.dispatchEvent(new Event("cuenta-corriente-updated"));

    alert(
      registro.facturaExtraGenerada
        ? "Devolución guardada y factura extra generada en cuenta corriente."
        : "Devolución guardada correctamente."
    );

    limpiar();
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
              <ClipboardCheck className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-xl font-extrabold text-slate-950">
                Devoluciones
              </h1>
              <p className="text-sm font-medium text-slate-900">
                Control de items devueltos, rotos, faltantes y factura extra.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-sm">
            Fecha devolución: {fechaDevolucion}
          </div>
        </div>
      </header>

      <main className="space-y-5 p-4 sm:p-6">
        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
            <Search className="h-5 w-5" />
            Buscar evento
          </h2>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="relative lg:col-span-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-slate-800" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setEventoSeleccionado(null);
                    setItems([]);
                  }}
                  placeholder="Buscar por evento, cliente, número o ciudad..."
                  className="w-full outline-none text-slate-950 placeholder:text-slate-700"
                />
              </div>

              {!eventoSeleccionado && query && (
                <div className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-slate-300 bg-white shadow-xl">
                  {eventosFiltrados.map((evento) => (
                    <button
                      key={evento.id}
                      type="button"
                      onClick={() => seleccionarEvento(evento)}
                      className="block w-full border-b border-slate-100 px-3 py-3 text-left text-slate-950 hover:bg-slate-100"
                    >
                      <span className="block font-extrabold">
                        {evento.id} · {evento.nombreEvento}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {evento.cliente} · {evento.fechaInicio || "Sin fecha"} ·{" "}
                        {money(Number(evento.total || 0))}
                      </span>
                    </button>
                  ))}

                  {eventosFiltrados.length === 0 && (
                    <div className="px-3 py-4 text-sm font-bold text-slate-900">
                      No se encontraron eventos.
                    </div>
                  )}
                </div>
              )}
            </div>

            <label className="text-sm font-bold text-slate-950">
              Fecha de devolución
              <input
                type="date"
                value={fechaDevolucion}
                onChange={(e) => setFechaDevolucion(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-950"
              />
            </label>
          </div>
        </section>

        {eventoSeleccionado && (
          <>
            <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
                <PackageCheck className="h-5 w-5" />
                Datos del evento
              </h2>

              <div className="grid gap-4 md:grid-cols-4">
                <Info label="Evento" value={eventoSeleccionado.nombreEvento} />
                <Info label="Cliente" value={eventoSeleccionado.cliente} />
                <Info label="Fecha inicio" value={eventoSeleccionado.fechaInicio || "-"} />
                <Info label="Fecha fin" value={eventoSeleccionado.fechaFin || "-"} />
                <Info label="Ciudad" value={eventoSeleccionado.ciudad || "-"} />
                <Info label="Dirección" value={eventoSeleccionado.direccion || "-"} />
                <Info label="Transporte" value={eventoSeleccionado.transporte || "-"} />
                <Info label="Total evento" value={money(Number(eventoSeleccionado.total || 0))} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
                <ClipboardCheck className="h-5 w-5" />
                Items devueltos
              </h2>

              <div className="overflow-auto rounded-xl border border-slate-300">
                <table className="w-full min-w-[1050px] text-sm text-slate-950">
                  <thead className="bg-slate-100 text-left text-slate-950">
                    <tr>
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2">Cant. evento</th>
                      <th className="px-3 py-2">Devuelto</th>
                      <th className="px-3 py-2">Cant. rota</th>
                      <th className="px-3 py-2">Cant. faltante</th>
                      <th className="px-3 py-2">Costo reposición</th>
                      <th className="px-3 py-2">Cobrar</th>
                      <th className="px-3 py-2">Extra</th>
                    </tr>
                  </thead>

                  <tbody>
                    {itemRows.map((item) => (
                      <tr
                        key={item.ProductoID}
                        className="border-t border-slate-200 text-slate-950"
                      >
                        <td className="px-3 py-2">
                          <div className="font-extrabold text-slate-950">
                            {item.nombreProducto}
                          </div>
                          <div className="text-xs font-bold text-slate-900">
                            {item.ProductoID}
                          </div>
                        </td>

                        <td className="px-3 py-2 font-bold text-slate-950">
                          {item.Cantidad}
                        </td>

                        <td className="px-3 py-2">
                          <label className="inline-flex items-center gap-2 font-bold text-slate-950">
                            <input
                              type="checkbox"
                              checked={item.devuelto}
                              onChange={(e) =>
                                toggleDevuelto(item.ProductoID, e.target.checked)
                              }
                            />
                            Sí
                          </label>
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={item.Cantidad}
                            value={item.cantidadRota}
                            onChange={(e) =>
                              updateItem(item.ProductoID, {
                                cantidadRota: Number(e.target.value || 0),
                              })
                            }
                            className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-slate-950"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={item.Cantidad}
                            value={item.cantidadFaltante}
                            onChange={(e) =>
                              updateItem(item.ProductoID, {
                                cantidadFaltante: Number(e.target.value || 0),
                              })
                            }
                            className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-slate-950"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={item.costoReposicion}
                            onChange={(e) =>
                              updateItem(item.ProductoID, {
                                costoReposicion: Number(e.target.value || 0),
                              })
                            }
                            className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-slate-950"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <label className="inline-flex items-center gap-2 font-bold text-slate-950">
                            <input
                              type="checkbox"
                              checked={item.cobrar}
                              onChange={(e) =>
                                updateItem(item.ProductoID, {
                                  cobrar: e.target.checked,
                                })
                              }
                            />
                            Cobrar
                          </label>
                        </td>

                        <td className="px-3 py-2 font-extrabold text-slate-950">
                          {money(item.totalItem)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="mt-4 block text-sm font-bold text-slate-950">
                Observaciones
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej: faltan 2 sillas, 1 mesa rota, se cobra reposición..."
                  className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-950 placeholder:text-slate-700"
                />
              </label>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
                  <AlertTriangle className="h-5 w-5" />
                  Resumen devolución
                </h2>

                <div className="space-y-3 text-sm font-bold text-slate-950">
                  <div className="flex justify-between">
                    <span>Items del evento</span>
                    <span>{cantidadTotalItems}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Roturas / faltantes</span>
                    <span>{cantidadConProblema}</span>
                  </div>

                  <div className="flex justify-between border-t border-slate-300 pt-3 text-xl font-extrabold">
                    <span>Total extra a cobrar</span>
                    <span>{money(totalExtra)}</span>
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-950">
                  <input
                    type="checkbox"
                    checked={generarFacturaExtra}
                    onChange={(e) => setGenerarFacturaExtra(e.target.checked)}
                  />
                  Generar factura extra en cuenta corriente
                </label>
              </div>

              <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
                  <FileText className="h-5 w-5" />
                  Acciones
                </h2>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={guardarDevolucion}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 font-bold text-white shadow-sm hover:bg-black"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Guardar devolución
                  </button>

                  <button
                    type="button"
                    onClick={limpiar}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-950 shadow-sm hover:bg-slate-100"
                  >
                    <Save className="h-4 w-4" />
                    Limpiar
                  </button>
                </div>

                <p className="mt-4 text-sm font-bold text-slate-900">
                  Si hay roturas o faltantes, se calcula automáticamente usando
                  el costo de reposición del inventario. El costo se puede editar
                  antes de guardar.
                </p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
      <div className="text-xs font-extrabold uppercase text-slate-900">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-950">{value}</div>
    </div>
  );
}