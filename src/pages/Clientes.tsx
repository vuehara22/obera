import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Search,
  Plus,
  Filter,
  LayoutGrid,
  List,
  BadgeCheck,
  Mail,
  Pencil,
  Trash2,
  X,
  Save,
  Wallet,
} from "lucide-react";
import { clientesDemo, type Cliente } from "../data/clientes.demo";

type ViewMode = "table" | "cards";
type EditorMode = "create" | "edit";

const CLIENTES_STORAGE_KEY = "demo_clientes";

type ClienteForm = {
  IDCliente: string;
  NombreRazonSocial: string;
  CUITCUIL: string;
  Telefono: string;
  Email: string;
  Ciudad: string;
  Direccion: string;
  DireccionEnvio: string;
  DireccionFacturacion: string;
  PrefFactura: string;
  TieneCuentaCorriente: boolean;
  Notas: string;
};

function safe(v?: string | null) {
  return (v ?? "").trim();
}

function hasEmail(c: Cliente) {
  return !!safe(c.Email);
}

function badgePref(pref?: string) {
  const p = safe(pref).toUpperCase();
  if (p === "A") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (p === "B") return "bg-blue-50 text-blue-800 border-blue-200";
  if (p === "C") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function badgeCC(v?: boolean) {
  return v
    ? "bg-violet-50 text-violet-800 border-violet-200"
    : "bg-slate-100 text-slate-700 border-slate-200";
}

function loadClientes(): Cliente[] {
  try {
    const saved = localStorage.getItem(CLIENTES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Cliente[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    //
  }

  return clientesDemo;
}

function saveClientes(next: Cliente[]) {
  localStorage.setItem(CLIENTES_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("clientes-updated"));
}

function emptyForm(): ClienteForm {
  return {
    IDCliente: "",
    NombreRazonSocial: "",
    CUITCUIL: "",
    Telefono: "",
    Email: "",
    Ciudad: "",
    Direccion: "",
    DireccionEnvio: "",
    DireccionFacturacion: "",
    PrefFactura: "A",
    TieneCuentaCorriente: false,
    Notas: "",
  };
}

function clienteToForm(c: Cliente): ClienteForm {
  return {
    IDCliente: safe(c.IDCliente),
    NombreRazonSocial: safe(c.NombreRazonSocial),
    CUITCUIL: safe(c.CUITCUIL),
    Telefono: safe(c.Telefono),
    Email: safe(c.Email),
    Ciudad: safe(c.Ciudad),
    Direccion: safe(c.Direccion),
    DireccionEnvio: safe(c.DireccionEnvio),
    DireccionFacturacion: safe(c.DireccionFacturacion),
    PrefFactura: safe(c.PrefFactura) || "A",
    TieneCuentaCorriente: !!c.TieneCuentaCorriente,
    Notas: safe(c.Notas),
  };
}

function formToCliente(form: ClienteForm): Cliente {
  return {
    IDCliente: safe(form.IDCliente),
    NombreRazonSocial: safe(form.NombreRazonSocial),
    CUITCUIL: safe(form.CUITCUIL),
    Telefono: safe(form.Telefono),
    Email: safe(form.Email),
    Ciudad: safe(form.Ciudad),
    Direccion: safe(form.Direccion),
    DireccionEnvio: safe(form.DireccionEnvio) || safe(form.Direccion),
    DireccionFacturacion: safe(form.DireccionFacturacion) || safe(form.Direccion),
    PrefFactura: safe(form.PrefFactura) || "A",
    TieneCuentaCorriente: !!form.TieneCuentaCorriente,
    Notas: safe(form.Notas),
  };
}

function buildNextClienteId(clientes: Cliente[]) {
  const nums = clientes
    .map((c) => Number(String(c.IDCliente ?? "").replace(/[^\d]/g, "")))
    .filter((n) => Number.isFinite(n));

  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `CLI-${String(next).padStart(4, "0")}`;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>(() => loadClientes());

  const [q, setQ] = useState("");
  const [ciudad, setCiudad] = useState("all");
  const [pref, setPref] = useState("all");
  const [cc, setCC] = useState<"all" | "si" | "no">("all");
  const [view, setView] = useState<ViewMode>("table");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteForm>(emptyForm());

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === CLIENTES_STORAGE_KEY || e.key === null) {
        setClientes(loadClientes());
      }
    }

    function onClientesUpdated() {
      setClientes(loadClientes());
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("clientes-updated", onClientesUpdated);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("clientes-updated", onClientesUpdated);
    };
  }, []);

  const ciudades = useMemo(() => {
    const set = new Set(clientes.map((c) => safe(c.Ciudad)).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [clientes]);

  const prefs = useMemo(() => {
    const set = new Set(clientes.map((c) => safe(c.PrefFactura)).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [clientes]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return clientes
      .filter((c) => (ciudad === "all" ? true : safe(c.Ciudad) === ciudad))
      .filter((c) => (pref === "all" ? true : safe(c.PrefFactura) === pref))
      .filter((c) => {
        if (cc === "all") return true;
        const val = !!c.TieneCuentaCorriente;
        return cc === "si" ? val : !val;
      })
      .filter((c) => {
        if (!query) return true;
        const hay = `${c.IDCliente} ${c.NombreRazonSocial} ${c.CUITCUIL ?? ""} ${
          c.Telefono ?? ""
        } ${c.Email ?? ""} ${c.Ciudad ?? ""} ${c.Direccion ?? ""}`.toLowerCase();

        return hay.includes(query);
      });
  }, [clientes, q, ciudad, pref, cc]);

  const stats = useMemo(() => {
    const total = clientes.length;
    const conCC = clientes.filter((c) => !!c.TieneCuentaCorriente).length;
    const conEmail = clientes.filter(hasEmail).length;
    const cantCiudades = new Set(clientes.map((c) => safe(c.Ciudad)).filter(Boolean)).size;
    return { total, conCC, conEmail, cantCiudades };
  }, [clientes]);

  function openCreate() {
    setEditorMode("create");
    setEditingId(null);
    setForm({
      ...emptyForm(),
      IDCliente: buildNextClienteId(clientes),
    });
    setEditorOpen(true);
  }

  function openEdit(cliente: Cliente) {
    setEditorMode("edit");
    setEditingId(safe(cliente.IDCliente));
    setForm(clienteToForm(cliente));
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function saveEditor() {
    const id = safe(form.IDCliente) || buildNextClienteId(clientes);
    const nombre = safe(form.NombreRazonSocial);

    if (!nombre) {
      alert("El nombre o razón social es obligatorio.");
      return;
    }

    const duplicateId = clientes.some((c) => {
      if (editorMode === "edit" && safe(c.IDCliente) === safe(editingId)) return false;
      return safe(c.IDCliente) === id;
    });

    if (duplicateId) {
      alert("Ya existe un cliente con ese ID.");
      return;
    }

    const nextCliente = formToCliente({
      ...form,
      IDCliente: id,
    });

    let next: Cliente[];

    if (editorMode === "edit" && editingId) {
      next = clientes.map((c) =>
        safe(c.IDCliente) === safe(editingId) ? nextCliente : c
      );
    } else {
      next = [...clientes, nextCliente];
    }

    next = next.sort((a, b) =>
      safe(a.NombreRazonSocial).localeCompare(safe(b.NombreRazonSocial))
    );

    setClientes(next);
    saveClientes(next);
    closeEditor();
  }

  function deleteCliente(cliente: Cliente) {
    const ok = window.confirm(
      `¿Querés eliminar el cliente ${safe(cliente.NombreRazonSocial)}?`
    );
    if (!ok) return;

    const next = clientes.filter(
      (c) => safe(c.IDCliente) !== safe(cliente.IDCliente)
    );

    setClientes(next);
    saveClientes(next);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="px-4 py-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-sm">
              <Users className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-slate-950 leading-tight">
                Clientes
              </h1>
              <p className="text-sm font-medium text-slate-700 truncate">
                Altas • edición • guardado real para usar en Nuevo Evento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden sm:inline-flex text-sm font-semibold text-slate-900 underline hover:text-black"
            >
              Volver al menú
            </Link>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 text-white px-4 py-2 hover:bg-black transition shadow-sm"
              onClick={openCreate}
            >
              <Plus className="h-5 w-5" />
              <span className="font-semibold">Agregar</span>
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, CUIT, teléfono, email, ciudad…"
              className="w-full rounded-xl border border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white text-slate-950 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
            >
              {ciudades.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "Todas las ciudades" : c}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={pref}
              onChange={(e) => setPref(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white text-slate-950 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
            >
              {prefs.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "Pref factura (todas)" : p}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={cc}
              onChange={(e) => setCC(e.target.value as "all" | "si" | "no")}
              className="w-full rounded-xl border border-slate-300 bg-white text-slate-950 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
            >
              <option value="all">Cuenta corriente (todas)</option>
              <option value="si">Con cuenta corriente</option>
              <option value="no">Sin cuenta corriente</option>
            </select>
          </div>

          <div className="lg:col-span-12 flex items-center justify-between">
            <div className="text-xs text-slate-700">
              Mostrando{" "}
              <span className="font-extrabold text-slate-950">{filtered.length}</span>{" "}
              clientes
            </div>

            <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setView("table")}
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                  view === "table"
                    ? "bg-slate-950 text-white"
                    : "text-slate-700 hover:text-slate-950 hover:bg-slate-100",
                ].join(" ")}
              >
                <List className="h-4 w-4" /> Tabla
              </button>

              <button
                type="button"
                onClick={() => setView("cards")}
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                  view === "cards"
                    ? "bg-slate-950 text-white"
                    : "text-slate-700 hover:text-slate-950 hover:bg-slate-100",
                ].join(" ")}
              >
                <LayoutGrid className="h-4 w-4" /> Cards
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Kpi label="Clientes" value={stats.total} />
          <Kpi label="Cuenta corriente" value={stats.conCC} icon={<Wallet className="h-4 w-4" />} />
          <Kpi label="Con email" value={stats.conEmail} icon={<Mail className="h-4 w-4" />} />
          <Kpi label="Ciudades" value={stats.cantCiudades} icon={<Filter className="h-4 w-4" />} />
        </section>

        {view === "table" ? (
          <section className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-[1180px] w-full text-sm">
                <thead className="bg-slate-100 text-xs text-slate-900">
                  <tr className="text-left">
                    <Th>Cliente</Th>
                    <Th>Contacto</Th>
                    <Th>Ubicación</Th>
                    <Th>Factura</Th>
                    <Th>Cuenta</Th>
                    <Th>Notas</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>

                <tbody className="text-slate-900">
                  {filtered.map((c) => (
                    <tr key={c.IDCliente} className="border-t border-slate-200 hover:bg-slate-50 transition">
                      <td className="px-5 py-4">
                        <div className="text-xs text-slate-500 font-semibold">{c.IDCliente}</div>
                        <div className="text-base font-extrabold text-slate-950">{c.NombreRazonSocial}</div>
                        <div className="text-xs text-slate-600">{c.CUITCUIL ?? "—"}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{c.Telefono ?? "—"}</div>
                        <div className="text-xs text-slate-600">{c.Email ?? "—"}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{c.Ciudad || "—"}</div>
                        <div className="text-xs text-slate-600">{c.Direccion ?? "—"}</div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgePref(c.PrefFactura)}`}>
                          {c.PrefFactura ? `Tipo ${c.PrefFactura}` : "Sin pref"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeCC(c.TieneCuentaCorriente)}`}>
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {c.TieneCuentaCorriente ? "Cuenta corriente" : "Sin cuenta"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="max-w-[260px] truncate text-sm text-slate-700">
                          {c.Notas ?? "—"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {c.TieneCuentaCorriente && (
                            <Link
                              to={`/cuenta-corriente?clienteId=${encodeURIComponent(safe(c.IDCliente))}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900 hover:bg-violet-100"
                            >
                              <Wallet className="h-4 w-4" />
                              Ver cuenta
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteCliente(c)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-100 px-3 py-2 text-xs font-bold text-red-900 hover:bg-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-700">
                        Sin resultados. Probá otro filtro o agregá un cliente nuevo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <div key={c.IDCliente} className="rounded-2xl border border-slate-300 bg-white shadow-sm p-5 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-semibold">{c.IDCliente}</div>
                    <div className="text-lg font-extrabold text-slate-950 truncate">{c.NombreRazonSocial}</div>
                    <div className="text-xs text-slate-600 truncate">{c.CUITCUIL ?? "—"}</div>
                  </div>

                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgePref(c.PrefFactura)}`}>
                    {c.PrefFactura ? `Tipo ${c.PrefFactura}` : "Sin pref"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Mini label="Teléfono" value={c.Telefono ?? "—"} />
                  <Mini label="Ciudad" value={c.Ciudad || "—"} />
                  <Mini label="Email" value={c.Email ?? "—"} colSpan />
                  <Mini label="Dirección" value={c.Direccion ?? "—"} colSpan />
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeCC(c.TieneCuentaCorriente)}`}>
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {c.TieneCuentaCorriente ? "Cuenta corriente" : "Sin cuenta"}
                  </span>

                  <div className="flex items-center gap-2">
                    {c.TieneCuentaCorriente && (
                      <Link
                        to={`/cuenta-corriente?clienteId=${encodeURIComponent(safe(c.IDCliente))}`}
                        className="text-sm font-semibold text-violet-700 hover:text-violet-900 underline"
                      >
                        Cuenta
                      </Link>
                    )}

                    <button
                      type="button"
                      className="text-sm font-semibold text-slate-700 hover:text-slate-950 underline"
                      onClick={() => openEdit(c)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="text-sm font-semibold text-red-700 hover:text-red-900 underline"
                      onClick={() => deleteCliente(c)}
                    >
                      Borrar
                    </button>
                  </div>
                </div>

                {c.Notas && (
                  <div className="mt-4 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">Notas:</span> {c.Notas}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </main>

      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-3 sm:p-6 backdrop-blur-[2px]">
          <div className="mx-auto flex h-full max-h-[calc(100vh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-2xl sm:max-h-[calc(100vh-48px)]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-slate-950">
                  {editorMode === "edit" ? "Editar cliente" : "Agregar cliente"}
                </div>
                <div className="text-sm text-slate-600 truncate">
                  Guardá datos comerciales. La cuenta corriente se consulta en su propia sección.
                </div>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <Field label="ID Cliente">
                    <Input value={form.IDCliente} onChange={(v) => setForm((f) => ({ ...f, IDCliente: v }))} />
                  </Field>
                </div>

                <div className="lg:col-span-8">
                  <Field label="Nombre / Razón Social *">
                    <Input value={form.NombreRazonSocial} onChange={(v) => setForm((f) => ({ ...f, NombreRazonSocial: v }))} />
                  </Field>
                </div>

                <div className="lg:col-span-4">
                  <Field label="CUIT / CUIL">
                    <Input value={form.CUITCUIL} onChange={(v) => setForm((f) => ({ ...f, CUITCUIL: v }))} />
                  </Field>
                </div>

                <div className="lg:col-span-4">
                  <Field label="Teléfono">
                    <Input value={form.Telefono} onChange={(v) => setForm((f) => ({ ...f, Telefono: v }))} />
                  </Field>
                </div>

                <div className="lg:col-span-4">
                  <Field label="Email">
                    <Input value={form.Email} onChange={(v) => setForm((f) => ({ ...f, Email: v }))} />
                  </Field>
                </div>

                <div className="lg:col-span-4">
                  <Field label="Ciudad">
                    <Input value={form.Ciudad} onChange={(v) => setForm((f) => ({ ...f, Ciudad: v }))} />
                  </Field>
                </div>

                <div className="lg:col-span-8">
                  <Field label="Dirección principal">
                    <Input value={form.Direccion} onChange={(v) => setForm((f) => ({ ...f, Direccion: v }))} />
                  </Field>
                </div>

                <div className="lg:col-span-6">
                  <Field label="Dirección envío">
                    <Input value={form.DireccionEnvio} onChange={(v) => setForm((f) => ({ ...f, DireccionEnvio: v }))} />
                  </Field>
                </div>

                <div className="lg:col-span-6">
                  <Field label="Dirección facturación">
                    <Input value={form.DireccionFacturacion} onChange={(v) => setForm((f) => ({ ...f, DireccionFacturacion: v }))} />
                  </Field>
                </div>

                <div className="lg:col-span-4">
                  <Field label="Preferencia factura">
                    <select
                      value={form.PrefFactura}
                      onChange={(e) => setForm((f) => ({ ...f, PrefFactura: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </Field>
                </div>

                <div className="lg:col-span-4">
                  <Field label="Cuenta corriente">
                    <select
                      value={String(form.TieneCuentaCorriente)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          TieneCuentaCorriente: e.target.value === "true",
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                    >
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </Field>
                </div>

                <div className="lg:col-span-4">
                  <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3">
                    <div className="flex items-start gap-2">
                      <Wallet className="mt-0.5 h-4 w-4 text-violet-900" />
                      <div>
                        <div className="text-sm font-extrabold text-violet-950">
                          Cuenta corriente
                        </div>
                        <div className="mt-1 text-xs font-medium text-violet-900">
                          Acá solo activás el cliente. Los movimientos conviene verlos en Cuenta Corriente.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-12">
                  <Field label="Notas">
                    <textarea
                      value={form.Notas}
                      onChange={(e) => setForm((f) => ({ ...f, Notas: e.target.value }))}
                      className="w-full min-h-[90px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveEditor}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-bold hover:bg-black"
              >
                <Save className="h-4 w-4" />
                Guardar cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-5 py-3 font-semibold">{children}</th>;
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">{label}</div>
        {icon ? (
          <div className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 flex items-center justify-center">
            {icon}
          </div>
        ) : (
          <div className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-300" />
        )}
      </div>
      <div className="mt-2 text-3xl font-extrabold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">Guardado local</div>
    </div>
  );
}

function Mini({
  label,
  value,
  colSpan,
}: {
  label: string;
  value: string;
  colSpan?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 ${
        colSpan ? "col-span-2" : ""
      }`}
    >
      <div className="text-xs text-slate-500 font-semibold">{label}</div>
      <div className="text-sm font-bold text-slate-950 truncate">{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-bold text-slate-900">{label}</div>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
    />
  );
}