import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Truck,
  UserRound,
  FileText,
} from "lucide-react";
import { eventosDemo } from "../data/eventos.demo";

const PRESUPUESTOS_STORAGE_KEY = "demo_presupuestos";
const BORRADORES_STORAGE_KEY = "demo_eventos_borrador";

type CalendarEvent = {
  id: string;
  nombreEvento: string;
  cliente: string;
  fechaInicio: string;
  fechaFin: string;
  ciudad: string;
  direccion: string;
  transporte: string;
  estado: "CONFIRMADO" | "BORRADOR" | "ENTREGADO" | "DEVUELTO" | "CERRADO";
  observaciones?: string;
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

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDayNumber(date: Date) {
  return date.getDate();
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function badgeEstado(estado: CalendarEvent["estado"]) {
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

function getEventDot(estado: CalendarEvent["estado"]) {
  switch (estado) {
    case "CONFIRMADO":
      return "bg-emerald-500";
    case "BORRADOR":
      return "bg-slate-400";
    case "ENTREGADO":
      return "bg-blue-500";
    case "DEVUELTO":
      return "bg-violet-500";
    case "CERRADO":
      return "bg-amber-500";
    default:
      return "bg-slate-400";
  }
}

function normalizeDemoEvents(): CalendarEvent[] {
  return eventosDemo.map((ev) => ({
    id: safe(ev.IDEvento),
    nombreEvento: safe(ev.NombreEvento) || "Evento sin nombre",
    cliente: safe(ev.ClienteRef) || "Cliente sin definir",
    fechaInicio: safe(ev.FechaInicio),
    fechaFin: safe(ev.FechaFin) || safe(ev.FechaInicio),
    ciudad: safe(ev.CiudadEvento),
    direccion: safe(ev.DireccionEvento),
    transporte: safe(ev.TransporteRef),
    estado: (ev.Estado ?? "BORRADOR") as CalendarEvent["estado"],
    observaciones: "",
    source: "demo",
  }));
}

function normalizeStorageEvents(): CalendarEvent[] {
  const presupuestos = readStorageArray<any>(PRESUPUESTOS_STORAGE_KEY).map((ev) => ({
    id: safe(ev.id),
    nombreEvento: safe(ev.nombreEvento) || "Evento sin nombre",
    cliente: safe(ev.cliente) || "Cliente sin definir",
    fechaInicio: safe(ev.fechaInicio),
    fechaFin: safe(ev.fechaFin) || safe(ev.fechaInicio),
    ciudad: safe(ev.ciudad),
    direccion: safe(ev.direccion),
    transporte: safe(ev.transporte),
    estado: "CONFIRMADO" as const,
    observaciones: safe(ev.observaciones),
    source: "presupuesto" as const,
  }));

  const borradores = readStorageArray<any>(BORRADORES_STORAGE_KEY).map((ev) => ({
    id: safe(ev.id),
    nombreEvento: safe(ev.nombreEvento) || "Evento sin nombre",
    cliente: safe(ev.cliente) || "Cliente sin definir",
    fechaInicio: safe(ev.fechaInicio),
    fechaFin: safe(ev.fechaFin) || safe(ev.fechaInicio),
    ciudad: safe(ev.ciudad),
    direccion: safe(ev.direccion),
    transporte: safe(ev.transporte),
    estado: "BORRADOR" as const,
    observaciones: safe(ev.observaciones),
    source: "borrador" as const,
  }));

  return [...presupuestos, ...borradores];
}

function loadAllEvents(): CalendarEvent[] {
  const merged = [...normalizeStorageEvents(), ...normalizeDemoEvents()];

  const map = new Map<string, CalendarEvent>();
  for (const item of merged) {
    map.set(item.id, item);
  }

  return Array.from(map.values()).sort((a, b) =>
    (a.fechaInicio || "").localeCompare(b.fechaInicio || "")
  );
}

function getMonthMatrix(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = (firstDayOfMonth.getDay() + 6) % 7; // lunes = 0
  const firstCell = new Date(year, month, 1 - startDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return date;
  });
}

function eventOccursOnDate(event: CalendarEvent, date: Date) {
  const start = parseISODate(event.fechaInicio);
  const end = parseISODate(event.fechaFin || event.fechaInicio);
  if (!start || !end) return false;

  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  return current >= startDate && current <= endDate;
}

export default function Calendario() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const allEvents = useMemo(() => loadAllEvents(), []);

  const days = useMemo(() => getMonthMatrix(currentMonth), [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    days.forEach((day) => {
      const key = toISODate(day);
      const events = allEvents.filter((event) => eventOccursOnDate(event, day));
      map.set(key, events);
    });

    return map;
  }, [days, allEvents]);

  const selectedDateKey = toISODate(selectedDate);

  const selectedEvents = useMemo(() => {
    return allEvents.filter((event) => eventOccursOnDate(event, selectedDate));
  }, [allEvents, selectedDate]);

  const monthStats = useMemo(() => {
    const inMonth = allEvents.filter((event) => {
      const start = parseISODate(event.fechaInicio);
      const end = parseISODate(event.fechaFin || event.fechaInicio);
      if (!start || !end) return false;

      const monthStart = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const monthEnd = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      );

      return start <= monthEnd && end >= monthStart;
    });

    return {
      total: inMonth.length,
      confirmados: inMonth.filter((e) => e.estado === "CONFIRMADO").length,
      borradores: inMonth.filter((e) => e.estado === "BORRADOR").length,
    };
  }, [allEvents, currentMonth]);

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                <CalendarDays className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold text-slate-950">
                  Calendario
                </h1>
                <p className="truncate text-sm font-medium text-slate-700">
                  Vista mensual con eventos confirmados y borradores
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/menu"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100 transition"
              >
                Volver al menú
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="Eventos del mes" value={monthStats.total} />
          <StatCard label="Confirmados" value={monthStats.confirmados} />
          <StatCard label="Borradores" value={monthStats.borradores} />
        </section>

        <section className="mt-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 rounded-3xl border border-slate-300 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">
                  {capitalize(formatMonthYear(currentMonth))}
                </h2>
                <p className="text-sm font-medium text-slate-700">
                  Seleccioná un día para ver el detalle
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1,
                        1
                      )
                    )
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 transition"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelectedDate(now);
                  }}
                  className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100 transition"
                >
                  Hoy
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1,
                        1
                      )
                    )
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 transition"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-sm font-extrabold text-slate-800"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day) => {
                const iso = toISODate(day);
                const dayEvents = eventsByDate.get(iso) ?? [];
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = iso === toISODate(today);
                const isSelected = iso === selectedDateKey;

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={[
                      "min-h-[118px] border-b border-r border-slate-200 p-2 text-left align-top transition",
                      isSelected ? "bg-slate-100" : "bg-white hover:bg-slate-50",
                      !isCurrentMonth ? "text-slate-400" : "text-slate-900",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={[
                          "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold",
                          isToday
                            ? "bg-slate-950 text-white"
                            : isSelected
                            ? "bg-slate-200 text-slate-950"
                            : "text-inherit",
                        ].join(" ")}
                      >
                        {formatDayNumber(day)}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[11px] font-bold text-white">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={`${iso}-${event.id}`}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1"
                        >
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${getEventDot(
                              event.estado
                            )}`}
                          />
                          <span className="truncate text-[11px] font-bold text-slate-800">
                            {event.nombreEvento}
                          </span>
                        </div>
                      ))}

                      {dayEvents.length > 3 && (
                        <div className="text-[11px] font-bold text-slate-500">
                          +{dayEvents.length - 3} más
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="xl:col-span-4 rounded-3xl border border-slate-300 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-extrabold text-slate-950">
                {capitalize(formatFullDate(selectedDate))}
              </h3>
              <p className="text-sm font-medium text-slate-700">
                {selectedEvents.length} evento{selectedEvents.length === 1 ? "" : "s"} en esta fecha
              </p>
            </div>

            <div className="p-5 space-y-4">
              {selectedEvents.length > 0 ? (
                selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-300 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-lg font-extrabold text-slate-950 truncate">
                          {event.nombreEvento}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <UserRound className="h-4 w-4" />
                          <span className="truncate">{event.cliente || "Cliente sin definir"}</span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${badgeEstado(
                          event.estado
                        )}`}
                      >
                        {event.estado}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <InfoLine
                        icon={<MapPin className="h-4 w-4" />}
                        text={event.ciudad || "Ciudad sin definir"}
                      />
                      <InfoLine
                        icon={<Truck className="h-4 w-4" />}
                        text={event.transporte || "Transporte sin definir"}
                      />
                      <InfoLine
                        icon={<FileText className="h-4 w-4" />}
                        text={
                          event.fechaInicio === event.fechaFin || !event.fechaFin
                            ? `Fecha: ${event.fechaInicio || "Sin fecha"}`
                            : `Del ${event.fechaInicio} al ${event.fechaFin}`
                        }
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500">
                        {event.source === "presupuesto"
                          ? "Creado desde presupuesto"
                          : event.source === "borrador"
                          ? "Creado como borrador"
                          : "Evento demo"}
                      </span>

                      <Link
                        to={`/eventos/${event.id}`}
                        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100 transition"
                      >
                        Ver detalle
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-300 bg-slate-50 p-6 text-center">
                  <div className="text-base font-extrabold text-slate-950">
                    Sin eventos
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-700">
                    No hay eventos registrados para este día.
                  </div>
                </div>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="text-sm font-bold text-slate-700">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">Vista mensual</div>
    </div>
  );
}

function InfoLine({
  icon,
  text,
}: {
  icon?: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
      <span className="text-slate-500">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}