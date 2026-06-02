import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Eye,
  FileText,
  Truck,
  MapPin,
} from "lucide-react";
import { eventosDemo } from "../data/eventos.demo";

const PRESUPUESTOS_STORAGE_KEY = "demo_presupuestos";
const BORRADORES_STORAGE_KEY = "demo_eventos_borrador";

type EventoListItem = {
  IDEvento: string;
  NombreEvento: string;
  ClienteRef: string;
  FechaInicio: string;
  FechaFin: string;
  CiudadEvento: string;
  DireccionEvento: string;
  TransporteRef: string;
  Estado: "CONFIRMADO" | "BORRADOR" | "ENTREGADO" | "DEVUELTO" | "CERRADO";
  IVA?: boolean;
  KmEstimados?: number;
  TelefonoCliente?: string;
  EmailCliente?: string;
  Sena?: number;
  Observaciones?: string;
  source: "demo" | "presupuesto" | "borrador";
};

function safe(v?: string | null) {
  return (v ?? "").trim();
}

function readStorageArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function badgeEstado(e?: EventoListItem["Estado"]) {
  switch (e) {
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

function normalizeDemoEventos(): EventoListItem[] {
  return eventosDemo.map((ev) => ({
    IDEvento: safe(ev.IDEvento),
    NombreEvento: safe(ev.NombreEvento) || "Evento sin nombre",
    ClienteRef: safe(ev.ClienteRef) || "Cliente sin definir",
    FechaInicio: safe(ev.FechaInicio),
    FechaFin: safe(ev.FechaFin),
    CiudadEvento: safe(ev.CiudadEvento),
    DireccionEvento: safe(ev.DireccionEvento),
    TransporteRef: safe(ev.TransporteRef),
    Estado: (ev.Estado ?? "BORRADOR") as EventoListItem["Estado"],
    IVA: ev.IVA,
    KmEstimados: ev.KmEstimados,
    Observaciones: "",
    TelefonoCliente: "",
    EmailCliente: "",
    Sena: 0,
    source: "demo",
  }));
}

function normalizeFromStorage(
  data: any[],
  source: "presupuesto" | "borrador"
): EventoListItem[] {
  return data.map((ev, index) => ({
    IDEvento: safe(ev.id) || `${source === "presupuesto" ? "PRE" : "BOR"}-${index + 1}`,
    NombreEvento: safe(ev.nombreEvento) || "Evento sin nombre",
    ClienteRef: safe(ev.cliente) || "Cliente sin definir",
    FechaInicio: safe(ev.fechaInicio),
    FechaFin: safe(ev.fechaFin),
    CiudadEvento: safe(ev.ciudad),
    DireccionEvento: safe(ev.direccion),
    TransporteRef: safe(ev.transporte),
    Estado: source === "presupuesto" ? "CONFIRMADO" : "BORRADOR",
    IVA: Boolean(ev.iva),
    KmEstimados: Number(ev.kmEstimados ?? 0),
    TelefonoCliente: safe(ev.telefonoCliente),
    EmailCliente: safe(ev.emailCliente),
    Sena: Number(ev.sena ?? 0),
    Observaciones: safe(ev.observaciones),
    source,
  }));
}

function loadEventos(): EventoListItem[] {
  const demo = normalizeDemoEventos();
  const presupuestos = normalizeFromStorage(
    readStorageArray<any>(PRESUPUESTOS_STORAGE_KEY),
    "presupuesto"
  );
  const borradores = normalizeFromStorage(
    readStorageArray<any>(BORRADORES_STORAGE_KEY),
    "borrador"
  );

  const merged = [...presupuestos, ...borradores, ...demo];

  const uniqueMap = new Map<string, EventoListItem>();
  for (const item of merged) {
    uniqueMap.set(item.IDEvento, item);
  }

  return Array.from(uniqueMap.values()).sort((a, b) => {
    const aDate = safe(a.FechaInicio) || "0000-00-00";
    const bDate = safe(b.FechaInicio) || "0000-00-00";
    return bDate.localeCompare(aDate);
  });
}

export default function Eventos() {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    function refresh() {
      setReloadKey((k) => k + 1);
    }

    function onStorage(e: StorageEvent) {
      if (
        e.key === PRESUPUESTOS_STORAGE_KEY ||
        e.key === BORRADORES_STORAGE_KEY ||
        e.key === null
      ) {
        refresh();
      }
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("presupuestos-updated", refresh);
    window.addEventListener("borradores-updated", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("presupuestos-updated", refresh);
      window.removeEventListener("borradores-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const list = useMemo(() => {
    void reloadKey;
    const query = q.trim().toLowerCase();
    const eventos = loadEventos();

    return eventos
      .filter((ev) => (estado === "all" ? true : (ev.Estado ?? "BORRADOR") === estado))
      .filter((ev) => {
        if (!query) return true;
        const hay =
          `${ev.IDEvento} ${ev.NombreEvento} ${ev.ClienteRef} ${ev.CiudadEvento ?? ""} ${ev.TransporteRef ?? ""} ${ev.DireccionEvento ?? ""}`.toLowerCase();
        return hay.includes(query);
      });
  }, [q, estado, reloadKey]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-slate-950 leading-tight">
                Eventos
              </h1>
              <p className="text-sm font-medium text-slate-700 truncate">
                Confirmados y borradores en una sola lista
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950 underline"
            >
              Volver al menú
            </Link>

            <Link
              to="/eventos/nuevo"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 text-white px-4 py-2.5 hover:bg-black transition shadow-sm"
            >
              <Plus className="h-5 w-5" />
              <span className="font-bold">Nuevo</span>
            </Link>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por cliente, evento, ciudad, transporte o ID..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
            >
              <option value="all">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="DEVUELTO">Devuelto</option>
              <option value="CERRADO">Cerrado</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              type="button"
              onClick={() => {
                setQ("");
                setEstado("all");
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100 transition"
            >
              <Filter className="h-4 w-4" />
              Limpiar
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6">
        <div className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-slate-100 text-slate-900">
                <tr className="text-left">
                  <th className="px-4 py-3 font-extrabold">Fecha</th>
                  <th className="px-4 py-3 font-extrabold">Evento</th>
                  <th className="px-4 py-3 font-extrabold">Cliente</th>
                  <th className="px-4 py-3 font-extrabold">Ciudad</th>
                  <th className="px-4 py-3 font-extrabold">Transporte</th>
                  <th className="px-4 py-3 font-extrabold">Estado</th>
                  <th className="px-4 py-3 font-extrabold">Origen</th>
                  <th className="px-4 py-3 font-extrabold text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="text-slate-900">
                {list.map((ev) => (
                  <tr
                    key={ev.IDEvento}
                    className="border-t border-slate-200 hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-950">
                        {ev.FechaInicio || "Sin fecha"}
                      </div>
                      <div className="text-xs text-slate-600">
                        {ev.FechaFin ? `Fin: ${ev.FechaFin}` : "Fin sin definir"}
                      </div>
                    </td>

                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="font-extrabold text-slate-950">
                        {ev.NombreEvento}
                      </div>
                      <div className="text-xs text-slate-600">{ev.IDEvento}</div>
                    </td>

                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="font-bold text-slate-900">{ev.ClienteRef || "—"}</div>
                      <div className="text-xs text-slate-600 truncate">
                        {ev.DireccionEvento || "Dirección sin definir"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2 text-slate-900 font-medium">
                        <MapPin className="h-4 w-4 text-slate-600" />
                        {ev.CiudadEvento || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2 text-slate-900 font-medium">
                        <Truck className="h-4 w-4 text-slate-600" />
                        {ev.TransporteRef || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${badgeEstado(
                          ev.Estado
                        )}`}
                      >
                        {ev.Estado}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                        {ev.source === "presupuesto"
                          ? "Presupuesto"
                          : ev.source === "borrador"
                          ? "Borrador"
                          : "Demo"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/eventos/${ev.IDEvento}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100 transition"
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalle
                        </Link>

                        <Link
                          to={`/eventos/${ev.IDEvento}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-black transition"
                        >
                          <FileText className="h-4 w-4" />
                          Abrir
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {list.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-700 font-medium">
                      No se encontraron eventos con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}