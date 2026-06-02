import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  Mail,
  MapPin,
  PackageSearch,
  Phone,
  Printer,
  Truck,
  UserRound,
} from "lucide-react";

import { eventosDemo } from "../data/eventos.demo";
import { inventarioDemo } from "../data/inventario.demo";
import { eventoItemsDemo, type EventoItem } from "../data/eventoItems.demo";

const PRESUPUESTOS_STORAGE_KEY = "demo_presupuestos";
const BORRADORES_STORAGE_KEY = "demo_eventos_borrador";
const INVENTARIO_STORAGE_KEY = "demo_inventario_importado_v4";

type EventoSource = "demo" | "presupuesto" | "borrador";

type ItemEvento = {
  ProductoID: string;
  Cantidad: number;
  grupoFamiliaId?: string;
  grupoFamiliaNombre?: string;
  precioPeriodo?: string;
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
  KmEstimados: number;
  TelefonoCliente: string;
  EmailCliente: string;
  Observaciones: string;
  items: ItemEvento[];
  source: EventoSource;
};

function safe(v?: string | null) {
  return (v ?? "").trim();
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

function getInventarioActual() {
  const saved = readStorageArray<any>(INVENTARIO_STORAGE_KEY);
  return saved.length ? saved : inventarioDemo;
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

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function mapStorageEvento(raw: any, source: EventoSource): EventoDetalleData {
  const items: ItemEvento[] = Array.isArray(raw.items)
    ? raw.items.map((it: any) => ({
        ProductoID: safe(it.ProductoID ?? it.productoID ?? it.id),
        Cantidad: Number(it.Cantidad ?? it.cantidad ?? 0),
        grupoFamiliaId: safe(it.grupoFamiliaId ?? it.GrupoFamiliaID),
        grupoFamiliaNombre: safe(it.grupoFamiliaNombre ?? it.NombreGrupo),
        precioPeriodo: safe(it.precioPeriodo ?? raw.precioPeriodo ?? ""),
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
    KmEstimados: Number(raw.kmEstimados ?? raw.KmEstimados ?? 0),
    TelefonoCliente: safe(raw.telefonoCliente ?? raw.TelefonoCliente),
    EmailCliente: safe(raw.emailCliente ?? raw.EmailCliente),
    Observaciones: safe(raw.observaciones ?? raw.Observaciones),
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
    },
    "demo"
  );
}

export default function DetalleSinPrecio() {
  const { id } = useParams();

  const evento = useMemo(() => getEventoById(id), [id]);
  const inventarioActual = useMemo(() => getInventarioActual(), []);

  const itemRows = useMemo(() => {
    return (evento?.items ?? []).map((item, index) => {
      const producto = inventarioActual.find(
        (p: any) => safe(p.ProductoID) === safe(item.ProductoID)
      );

      return {
        key: `${safe(item.ProductoID)}-${index}`,
        ProductoID: safe(item.ProductoID),
        Cantidad: Number(item.Cantidad ?? 0),
        NombreProducto: safe(producto?.NombreProducto) || safe(item.ProductoID),
        Categoria: safe(producto?.Categoria),
        Subcategoria: safe(producto?.Subcategoria),
        Variante: safe(producto?.Variante),
        Familia:
          safe(item.grupoFamiliaNombre) ||
          safe(item.grupoFamiliaId) ||
          getGrupoFamiliaProducto(producto) ||
          "Sin familia",
      };
    });
  }, [evento, inventarioActual]);

  function imprimir() {
    window.print();
  }

  function descargarPdf() {
    window.print();
  }

  if (!evento) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-950">
        <Link
          to="/eventos"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-950 shadow-sm hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-950">
            Evento no encontrado
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-900">
            No se encontró un evento con ese identificador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            .no-print {
              display: none !important;
            }

            .print-page {
              padding: 0 !important;
              background: white !important;
            }

            .print-card {
              box-shadow: none !important;
              border-color: #111827 !important;
              break-inside: avoid;
            }

            table {
              page-break-inside: auto;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        `}
      </style>

      <header className="no-print sticky top-0 z-20 border-b border-slate-300 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to={`/eventos/${evento.IDEvento}`}
              className="rounded-xl border border-slate-300 bg-white p-2 text-slate-950 shadow-sm hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="rounded-2xl bg-slate-950 p-2 text-white">
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold text-slate-950">
                Detalle sin precio
              </h1>
              <p className="text-sm font-bold text-slate-900">
                Hoja para transporte / entrega
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={imprimir}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-950 shadow-sm hover:bg-slate-100"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>

            <button
              type="button"
              onClick={descargarPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 font-bold text-white shadow-sm hover:bg-black"
            >
              <Download className="h-4 w-4" />
              Descargar / PDF
            </button>
          </div>
        </div>
      </header>

      <main className="print-page mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        <section className="print-card rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-300 pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-950">
                Orden de transporte
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-900">
                Sin detalle de precios
              </p>
            </div>

            <div className="text-left md:text-right">
              <div className="text-xs font-extrabold uppercase text-slate-900">
                Evento
              </div>
              <div className="text-lg font-extrabold text-slate-950">
                {evento.IDEvento}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Info
              icon={<CalendarDays className="h-5 w-5" />}
              label="Nombre del evento"
              value={evento.NombreEvento || "-"}
            />

            <Info
              icon={<UserRound className="h-5 w-5" />}
              label="Cliente"
              value={evento.ClienteRef || "-"}
            />

            <Info
              icon={<CalendarDays className="h-5 w-5" />}
              label="Fecha inicio"
              value={formatDate(evento.FechaInicio)}
            />

            <Info
              icon={<CalendarDays className="h-5 w-5" />}
              label="Fecha fin"
              value={formatDate(evento.FechaFin)}
            />

            <Info
              icon={<MapPin className="h-5 w-5" />}
              label="Ciudad"
              value={evento.CiudadEvento || "-"}
            />

            <Info
              icon={<MapPin className="h-5 w-5" />}
              label="Dirección"
              value={evento.DireccionEvento || "-"}
            />

            <Info
              icon={<Truck className="h-5 w-5" />}
              label="Transporte"
              value={evento.TransporteRef || "Sin transporte"}
            />

            <Info
              icon={<Truck className="h-5 w-5" />}
              label="Km estimados"
              value={evento.KmEstimados ? `${evento.KmEstimados} km` : "-"}
            />
          </div>
        </section>

        <section className="print-card rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
            <PackageSearch className="h-5 w-5" />
            Items a transportar
          </h2>

          <div className="overflow-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[760px] text-sm text-slate-950">
              <thead className="bg-slate-100 text-left text-slate-950">
                <tr>
                  <th className="px-3 py-3">Código</th>
                  <th className="px-3 py-3">Producto</th>
                  <th className="px-3 py-3">Familia</th>
                  <th className="px-3 py-3">Detalle</th>
                  <th className="px-3 py-3 text-center">Cantidad</th>
                  <th className="px-3 py-3 text-center">Control</th>
                </tr>
              </thead>

              <tbody>
                {itemRows.map((item) => (
                  <tr key={item.key} className="border-t border-slate-200">
                    <td className="px-3 py-3 font-bold text-slate-950">
                      {item.ProductoID}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-extrabold text-slate-950">
                        {item.NombreProducto}
                      </div>
                    </td>

                    <td className="px-3 py-3 font-bold text-slate-950">
                      {item.Familia}
                    </td>

                    <td className="px-3 py-3 font-bold text-slate-900">
                      {[item.Categoria, item.Subcategoria, item.Variante]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </td>

                    <td className="px-3 py-3 text-center text-lg font-extrabold text-slate-950">
                      {item.Cantidad}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex h-6 w-6 rounded border border-slate-500" />
                    </td>
                  </tr>
                ))}

                {itemRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center font-bold text-slate-900"
                    >
                      Este evento no tiene items cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <section className="print-card rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
              <UserRound className="h-5 w-5" />
              Contacto
            </h2>

            <p className="flex items-center gap-2 text-sm font-bold text-slate-950">
              <Phone className="h-4 w-4" />
              {evento.TelefonoCliente || "Sin teléfono"}
            </p>

            <p className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-950">
              <Mail className="h-4 w-4" />
              {evento.EmailCliente || "Sin email"}
            </p>
          </section>

          <section className="print-card rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-950">
              <FileText className="h-5 w-5" />
              Observaciones
            </h2>

            <p className="min-h-20 whitespace-pre-wrap rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-bold text-slate-950">
              {evento.Observaciones || "Sin observaciones."}
            </p>
          </section>
        </section>

        <section className="print-card rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-extrabold text-slate-950">
            Control de entrega / transporte
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <Firma label="Preparado por" />
            <Firma label="Transportado por" />
            <Firma label="Recibido por" />
          </div>
        </section>
      </main>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-900">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-base font-extrabold text-slate-950">
        {value}
      </div>
    </div>
  );
}

function Firma({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-slate-300 p-4">
      <div className="text-sm font-extrabold text-slate-950">{label}</div>
      <div className="mt-12 border-t border-slate-500 pt-2 text-xs font-bold text-slate-900">
        Firma / aclaración
      </div>
    </div>
  );
}