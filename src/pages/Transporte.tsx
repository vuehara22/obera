import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Truck,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
} from "lucide-react";

export type TransporteVehiculo = {
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

const TRANSPORTE_STORAGE_KEY = "demo_transporte_config_v1";

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

function safe(v?: string | null) {
  return (v ?? "").trim();
}

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function loadTransportes(): TransporteVehiculo[] {
  try {
    const raw = localStorage.getItem(TRANSPORTE_STORAGE_KEY);
    if (!raw) return DEFAULT_TRANSPORTES;

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    //
  }

  return DEFAULT_TRANSPORTES;
}

function saveTransportes(next: TransporteVehiculo[]) {
  localStorage.setItem(TRANSPORTE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("transporte-updated"));
}

function buildEmpty(): TransporteVehiculo {
  return {
    id: `vehiculo-${Date.now()}`,
    nombre: "",
    descripcion: "",
    activo: true,
    minimoKm: 5,
    precioMinimo: 10000,
    precioPorKm: 0,
    porcentajeVentaSinIva: 5,
    precioPorBulto: 0,
    observaciones: "",
  };
}

export default function Transporte() {
  const [transportes, setTransportes] = useState<TransporteVehiculo[]>(() =>
    loadTransportes()
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TransporteVehiculo>(() => buildEmpty());
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const q = safe(query).toLowerCase();

    if (!q) return transportes;

    return transportes.filter((t) =>
      `${t.nombre} ${t.descripcion} ${t.observaciones}`
        .toLowerCase()
        .includes(q)
    );
  }, [transportes, query]);

  function persist(next: TransporteVehiculo[]) {
    setTransportes(next);
    saveTransportes(next);
  }

  function nuevo() {
    setEditingId("nuevo");
    setForm(buildEmpty());
  }

  function editar(t: TransporteVehiculo) {
    setEditingId(t.id);
    setForm({ ...t });
  }

  function cancelar() {
    setEditingId(null);
    setForm(buildEmpty());
  }

  function guardar() {
    if (!safe(form.nombre)) {
      alert("Completá el nombre del vehículo.");
      return;
    }

    const normalized: TransporteVehiculo = {
      ...form,
      id: safe(form.id) || `vehiculo-${Date.now()}`,
      nombre: safe(form.nombre),
      descripcion: safe(form.descripcion),
      minimoKm: Number(form.minimoKm) || 0,
      precioMinimo: Number(form.precioMinimo) || 0,
      precioPorKm: Number(form.precioPorKm) || 0,
      porcentajeVentaSinIva: Number(form.porcentajeVentaSinIva) || 0,
      precioPorBulto: Number(form.precioPorBulto) || 0,
      observaciones: safe(form.observaciones),
    };

    const exists = transportes.some((t) => t.id === normalized.id);

    const next = exists
      ? transportes.map((t) => (t.id === normalized.id ? normalized : t))
      : [normalized, ...transportes];

    persist(next);
    cancelar();
  }

  function borrar(id: string) {
    const item = transportes.find((t) => t.id === id);
    if (!item) return;

    const ok = confirm(`¿Borrar "${item.nombre}"?`);
    if (!ok) return;

    persist(transportes.filter((t) => t.id !== id));
  }

  function toggleActivo(id: string) {
    persist(
      transportes.map((t) => (t.id === id ? { ...t, activo: !t.activo } : t))
    );
  }

  function restaurarDefault() {
    const ok = confirm("¿Restaurar las opciones iniciales de transporte?");
    if (!ok) return;

    persist(DEFAULT_TRANSPORTES);
    cancelar();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="px-4 py-4 sm:px-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/dashboard"
              className="h-10 w-10 rounded-2xl border border-slate-300 bg-white flex items-center justify-center text-slate-900 hover:bg-slate-100 transition"
              title="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="h-10 w-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-sm">
              <Truck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-slate-950 leading-tight">
                Transporte
              </h1>
              <p className="text-sm font-medium text-slate-700 truncate">
                Configurá vehículos, mínimos, km, bultos y porcentaje sobre venta sin IVA
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={restaurarDefault}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100"
            >
              Restaurar default
            </button>

            <button
              type="button"
              onClick={nuevo}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-black"
            >
              <Plus className="h-4 w-4" />
              Agregar transporte
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-4 space-y-4">
          <Card title={editingId ? "Editar transporte" : "Nuevo transporte"}>
            <div className="space-y-4">
              <Input
                label="Nombre del vehículo"
                value={form.nombre}
                onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}
                placeholder="Ej: Sprinter"
              />

              <Textarea
                label="Descripción"
                value={form.descripcion}
                onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}
                placeholder="Uso recomendado..."
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Mínimo km"
                  type="number"
                  value={String(form.minimoKm)}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, minimoKm: Number(v) || 0 }))
                  }
                />

                <Input
                  label="Precio mínimo"
                  type="number"
                  value={String(form.precioMinimo)}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, precioMinimo: Number(v) || 0 }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Precio por km"
                  type="number"
                  value={String(form.precioPorKm)}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, precioPorKm: Number(v) || 0 }))
                  }
                />

                <Input
                  label="% venta sin IVA"
                  type="number"
                  value={String(form.porcentajeVentaSinIva)}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      porcentajeVentaSinIva: Number(v) || 0,
                    }))
                  }
                />
              </div>

              <Input
                label="Precio por bulto"
                type="number"
                value={String(form.precioPorBulto)}
                onChange={(v) =>
                  setForm((f) => ({ ...f, precioPorBulto: Number(v) || 0 }))
                }
              />

              <Textarea
                label="Observaciones"
                value={form.observaciones}
                onChange={(v) => setForm((f) => ({ ...f, observaciones: v }))}
                placeholder="Reglas internas..."
              />

              <Toggle
                label="Activo"
                checked={form.activo}
                onChange={(v) => setForm((f) => ({ ...f, activo: v }))}
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={guardar}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-black"
                >
                  <Save className="h-4 w-4" />
                  Guardar
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={cancelar}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </Card>

          <Card title="Regla de cálculo">
            <div className="space-y-3 text-sm font-medium text-slate-800">
              <p>
                En Nuevo Evento se puede elegir si el transporte se calcula ahora o queda
                a definir.
              </p>
              <p>
                Cuando se calcula ahora, toma el mayor valor entre:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Precio mínimo.</li>
                <li>Kilómetros calculados por precio por km.</li>
                <li>Bultos por precio por bulto.</li>
                <li>Porcentaje del total de venta sin IVA.</li>
              </ul>
              <p>
                Para Sprinter podés dejar mínimo 5 km, $10000 y 5% como regla base.
              </p>
            </div>
          </Card>
        </section>

        <section className="xl:col-span-8 space-y-4">
          <Card title="Opciones disponibles">
            <div className="mb-4">
              <Input
                label="Buscar"
                value={query}
                onChange={setQuery}
                placeholder="Buscar vehículo..."
              />
            </div>

            <div className="overflow-auto rounded-2xl border border-slate-300">
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-slate-100 text-slate-900">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-extrabold">Vehículo</th>
                    <th className="px-4 py-3 font-extrabold">Estado</th>
                    <th className="px-4 py-3 font-extrabold">Mínimo</th>
                    <th className="px-4 py-3 font-extrabold">Km</th>
                    <th className="px-4 py-3 font-extrabold">Bulto</th>
                    <th className="px-4 py-3 font-extrabold">% venta sin IVA</th>
                    <th className="px-4 py-3 font-extrabold">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filtrados.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-950">
                          {t.nombre}
                        </div>
                        <div className="text-xs font-medium text-slate-700">
                          {t.descripcion || "Sin descripción"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleActivo(t.id)}
                          className={[
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold",
                            t.activo
                              ? "border-emerald-300 bg-emerald-100 text-emerald-950"
                              : "border-slate-300 bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t.activo ? "Activo" : "Inactivo"}
                        </button>
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900">
                        {t.minimoKm} km / {money(t.precioMinimo)}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900">
                        {money(t.precioPorKm)}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900">
                        {money(t.precioPorBulto)}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900">
                        {t.porcentajeVentaSinIva}%
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editar(t)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => borrar(t.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-900 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filtrados.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-slate-700 font-medium"
                      >
                        No hay transportes para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="text-sm font-extrabold text-slate-950">{title}</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-bold text-slate-900">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-slate-900/15"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-bold text-slate-900">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[90px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-slate-900/15"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-3 py-3">
      <div className="text-sm font-bold text-slate-900">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          "h-8 w-14 rounded-full border transition relative",
          checked ? "bg-slate-950 border-slate-950" : "bg-white border-slate-400",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white shadow-sm transition",
            checked ? "left-7" : "left-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}