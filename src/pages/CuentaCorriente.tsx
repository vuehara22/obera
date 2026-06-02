import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Wallet,
  Search,
  Plus,
  Trash2,
  Save,
  X,
  Filter,
  BadgeCheck,
  ReceiptText,
  CreditCard,
  Download,
  Pencil,
} from "lucide-react";
import { clientesDemo, type Cliente } from "../data/clientes.demo";

type MovimientoTipo = "DEBE" | "HABER" | "AJUSTE";
type EditorMode = "create" | "edit";

type MovimientoCC = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  fecha: string;
  tipo: MovimientoTipo;
  concepto: string;
  referencia: string;
  monto: number;
  origen: "manual";
  createdAt: string;
  updatedAt?: string;
};

const CLIENTES_STORAGE_KEY = "demo_clientes";
const CC_STORAGE_KEY = "obera_cc_movimientos_v1";

function safe(v?: unknown) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
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

function loadClientes(): Cliente[] {
  try {
    const raw = localStorage.getItem(CLIENTES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Cliente[];
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

function readMovimientos(): MovimientoCC[] {
  try {
    const raw = localStorage.getItem(CC_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.map((m) => ({
      id: safe(m.id) || `MOV-${Date.now()}-${Math.random()}`,
      clienteId: safe(m.clienteId),
      clienteNombre: safe(m.clienteNombre),
      fecha: safe(m.fecha) || today(),
      tipo: ["DEBE", "HABER", "AJUSTE"].includes(safe(m.tipo))
        ? (safe(m.tipo) as MovimientoTipo)
        : "HABER",
      concepto: safe(m.concepto),
      referencia: safe(m.referencia),
      monto: Math.abs(Number(m.monto) || 0),
      origen: "manual",
      createdAt: safe(m.createdAt) || new Date().toISOString(),
      updatedAt: safe(m.updatedAt),
    }));
  } catch {
    return [];
  }
}

function saveMovimientos(next: MovimientoCC[]) {
  localStorage.setItem(CC_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("cuenta-corriente-updated"));
}

function emptyMovimiento(cliente?: Cliente): MovimientoCC {
  return {
    id: `MOV-${Date.now()}`,
    clienteId: safe(cliente?.IDCliente),
    clienteNombre: safe(cliente?.NombreRazonSocial),
    fecha: today(),
    tipo: "HABER",
    concepto: "Pago",
    referencia: "",
    monto: 0,
    origen: "manual",
    createdAt: new Date().toISOString(),
  };
}

export default function CuentaCorriente() {
  const [params, setParams] = useSearchParams();

  const [clientes, setClientes] = useState<Cliente[]>(() => loadClientes());
  const [movimientos, setMovimientos] = useState<MovimientoCC[]>(() =>
    readMovimientos()
  );

  const [q, setQ] = useState("");
  const [clienteId, setClienteId] = useState(params.get("clienteId") || "all");
  const [tipo, setTipo] = useState<"all" | MovimientoTipo>("all");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MovimientoCC>(() => emptyMovimiento());

  useEffect(() => {
    function refreshClientes() {
      setClientes(loadClientes());
    }

    function refreshCC() {
      setMovimientos(readMovimientos());
    }

    function onStorage(e: StorageEvent) {
      if (e.key === CLIENTES_STORAGE_KEY || e.key === CC_STORAGE_KEY || e.key === null) {
        refreshClientes();
        refreshCC();
      }
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("clientes-updated", refreshClientes);
    window.addEventListener("cuenta-corriente-updated", refreshCC);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("clientes-updated", refreshClientes);
      window.removeEventListener("cuenta-corriente-updated", refreshCC);
    };
  }, []);

  useEffect(() => {
    const nextParams = new URLSearchParams(params);

    if (clienteId === "all") nextParams.delete("clienteId");
    else nextParams.set("clienteId", clienteId);

    setParams(nextParams, { replace: true });
  }, [clienteId, params, setParams]);

  const clientesOrdenados = useMemo(() => {
    return clientes
      .slice()
      .sort((a, b) =>
        safe(a.NombreRazonSocial).localeCompare(safe(b.NombreRazonSocial))
      );
  }, [clientes]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return movimientos
      .filter((m) => (clienteId === "all" ? true : safe(m.clienteId) === safe(clienteId)))
      .filter((m) => (tipo === "all" ? true : m.tipo === tipo))
      .filter((m) => (!desde ? true : m.fecha >= desde))
      .filter((m) => (!hasta ? true : m.fecha <= hasta))
      .filter((m) => {
        if (!query) return true;

        const hay =
          `${m.clienteNombre} ${m.clienteId} ${m.concepto} ${m.referencia}`.toLowerCase();

        return hay.includes(query);
      })
      .sort((a, b) => {
        const dateDiff = safe(b.fecha).localeCompare(safe(a.fecha));
        if (dateDiff !== 0) return dateDiff;
        return safe(b.createdAt).localeCompare(safe(a.createdAt));
      });
  }, [movimientos, clienteId, tipo, desde, hasta, q]);

  const resumen = useMemo(() => {
    const debe = filtered
      .filter((m) => m.tipo === "DEBE")
      .reduce((acc, m) => acc + Number(m.monto || 0), 0);

    const haber = filtered
      .filter((m) => m.tipo === "HABER")
      .reduce((acc, m) => acc + Number(m.monto || 0), 0);

    const ajuste = filtered
      .filter((m) => m.tipo === "AJUSTE")
      .reduce((acc, m) => acc + Number(m.monto || 0), 0);

    const saldo = debe - haber + ajuste;

    return { debe, haber, ajuste, saldo };
  }, [filtered]);

  function marcarClienteConCuenta(cliente: Cliente) {
    const nextClientes = clientes.map((c) =>
      safe(c.IDCliente) === safe(cliente.IDCliente)
        ? { ...c, TieneCuentaCorriente: true }
        : c
    );

    setClientes(nextClientes);
    saveClientes(nextClientes);
  }

  function openCreate() {
    const cliente =
      clienteId !== "all"
        ? clientes.find((c) => safe(c.IDCliente) === safe(clienteId))
        : undefined;

    setEditorMode("create");
    setEditingId(null);
    setForm(emptyMovimiento(cliente));
    setEditorOpen(true);
  }

  function openEdit(mov: MovimientoCC) {
    setEditorMode("edit");
    setEditingId(mov.id);
    setForm({ ...mov });
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditorMode("create");
    setEditingId(null);
    setForm(emptyMovimiento());
  }

  function saveEditor() {
    const cliente = clientes.find((c) => safe(c.IDCliente) === safe(form.clienteId));

    if (!cliente) {
      alert("Seleccioná un cliente.");
      return;
    }

    if (!safe(form.concepto)) {
      alert("Completá el concepto.");
      return;
    }

    if (!Number(form.monto)) {
      alert("Completá un monto mayor a 0.");
      return;
    }

    const now = new Date().toISOString();

    const nextMov: MovimientoCC = {
      ...form,
      id: editorMode === "edit" && editingId ? editingId : safe(form.id) || `MOV-${Date.now()}`,
      clienteId: safe(cliente.IDCliente),
      clienteNombre: safe(cliente.NombreRazonSocial),
      monto: Math.abs(Number(form.monto) || 0),
      origen: "manual",
      createdAt: safe(form.createdAt) || now,
      updatedAt: editorMode === "edit" ? now : undefined,
    };

    const next =
      editorMode === "edit" && editingId
        ? movimientos.map((m) => (m.id === editingId ? nextMov : m))
        : [nextMov, ...movimientos];

    setMovimientos(next);
    saveMovimientos(next);
    marcarClienteConCuenta(cliente);
    closeEditor();
  }

  function deleteMovimiento(id: string) {
    const mov = movimientos.find((m) => m.id === id);
    if (!mov) return;

    const ok = confirm(`¿Eliminar movimiento "${mov.concepto}"?`);
    if (!ok) return;

    const next = movimientos.filter((m) => m.id !== id);

    setMovimientos(next);
    saveMovimientos(next);
  }

  function limpiarMovimientosViejos() {
    const ok = confirm(
      "Esto no borra clientes. Solo limpia los movimientos de cuenta corriente de esta pantalla. ¿Continuar?"
    );

    if (!ok) return;

    setMovimientos([]);
    saveMovimientos([]);
  }

  function exportCSV() {
    const headers = [
      "Fecha",
      "Cliente ID",
      "Cliente",
      "Tipo",
      "Concepto",
      "Referencia",
      "Monto",
    ];

    const rows = filtered.map((m) => [
      m.fecha,
      m.clienteId,
      m.clienteNombre,
      m.tipo,
      m.concepto,
      m.referencia,
      String(m.monto),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `cuenta-corriente-${today()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="px-4 py-4 sm:px-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/clientes"
              className="h-10 w-10 rounded-2xl border border-slate-300 bg-white flex items-center justify-center text-slate-900 hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="h-10 w-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-sm">
              <Wallet className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-slate-950 leading-tight">
                Cuenta Corriente
              </h1>
              <p className="text-sm font-medium text-slate-700 truncate">
                Movimientos manuales editables por cliente
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={limpiarMovimientosViejos}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-900 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar movimientos
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-black"
            >
              <Plus className="h-4 w-4" />
              Nuevo movimiento
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente, concepto, referencia..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
            >
              <option value="all">Todos los clientes</option>
              {clientesOrdenados.map((c) => (
                <option key={safe(c.IDCliente)} value={safe(c.IDCliente)}>
                  {safe(c.NombreRazonSocial)}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "all" | MovimientoTipo)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
            >
              <option value="all">Todos los tipos</option>
              <option value="DEBE">Debe</option>
              <option value="HABER">Haber / Pago</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </div>

          <div className="lg:col-span-1">
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          <div className="lg:col-span-1">
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          <div className="lg:col-span-1 flex items-center">
            <button
              type="button"
              onClick={() => {
                setQ("");
                setTipo("all");
                setDesde("");
                setHasta("");
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Kpi label="Debe" value={money(resumen.debe)} icon={<ReceiptText className="h-4 w-4" />} />
          <Kpi label="Haber / Pagos" value={money(resumen.haber)} icon={<CreditCard className="h-4 w-4" />} />
          <Kpi label="Ajustes" value={money(resumen.ajuste)} icon={<BadgeCheck className="h-4 w-4" />} />
          <Kpi
            label="Saldo"
            value={money(resumen.saldo)}
            icon={<Wallet className="h-4 w-4" />}
            danger={resumen.saldo > 0}
            success={resumen.saldo <= 0}
          />
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-sm font-extrabold text-slate-950">Movimientos</div>
            <div className="text-xs font-medium text-slate-600">
              {filtered.length} movimiento{filtered.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[1150px] w-full text-sm">
              <thead className="bg-slate-100 text-xs text-slate-900">
                <tr className="text-left">
                  <Th>Fecha</Th>
                  <Th>Cliente</Th>
                  <Th>Tipo</Th>
                  <Th>Concepto</Th>
                  <Th>Referencia</Th>
                  <Th>Monto</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold text-slate-900">{m.fecha || "—"}</td>

                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-950">{m.clienteNombre}</div>
                      <div className="text-xs font-medium text-slate-600">{m.clienteId}</div>
                    </td>

                    <td className="px-5 py-4">
                      <TipoBadge tipo={m.tipo} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{m.concepto}</div>
                    </td>

                    <td className="px-5 py-4 text-slate-700">{m.referencia || "—"}</td>

                    <td className="px-5 py-4 font-extrabold text-slate-950">
                      {money(m.monto)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteMovimiento(m.id)}
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
                      No hay movimientos para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-3 sm:p-6 backdrop-blur-[2px]">
          <div className="mx-auto flex h-full max-h-[calc(100vh-24px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-2xl sm:max-h-[calc(100vh-48px)]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
              <div>
                <div className="text-lg font-extrabold text-slate-950">
                  {editorMode === "edit" ? "Editar movimiento" : "Nuevo movimiento"}
                </div>
                <div className="text-sm text-slate-600">
                  Al guardar, el cliente queda marcado con cuenta corriente.
                </div>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Cliente">
                  <select
                    value={form.clienteId}
                    onChange={(e) => {
                      const c = clientes.find(
                        (x) => safe(x.IDCliente) === safe(e.target.value)
                      );

                      setForm((f) => ({
                        ...f,
                        clienteId: safe(c?.IDCliente),
                        clienteNombre: safe(c?.NombreRazonSocial),
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                  >
                    <option value="">Seleccionar cliente</option>
                    {clientesOrdenados.map((c) => (
                      <option key={safe(c.IDCliente)} value={safe(c.IDCliente)}>
                        {safe(c.NombreRazonSocial)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Fecha">
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </Field>

                <Field label="Tipo">
                  <select
                    value={form.tipo}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        tipo: e.target.value as MovimientoTipo,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                  >
                    <option value="HABER">Haber / Pago</option>
                    <option value="DEBE">Debe / Deuda</option>
                    <option value="AJUSTE">Ajuste</option>
                  </select>
                </Field>

                <Field label="Monto">
                  <input
                    type="number"
                    value={String(form.monto)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, monto: Number(e.target.value) || 0 }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Concepto">
                    <input
                      value={form.concepto}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, concepto: e.target.value }))
                      }
                      placeholder="Ej: Pago efectivo, transferencia, ajuste..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field label="Referencia">
                    <input
                      value={form.referencia}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, referencia: e.target.value }))
                      }
                      placeholder="Ej: comprobante, presupuesto, transferencia..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
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
                {editorMode === "edit" ? "Guardar cambios" : "Guardar movimiento"}
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
  danger,
  success,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border bg-white p-4 shadow-sm",
        danger
          ? "border-red-300"
          : success
          ? "border-emerald-300"
          : "border-slate-300",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">{label}</div>
        {icon ? (
          <div
            className={[
              "h-8 w-8 rounded-xl border flex items-center justify-center",
              danger
                ? "bg-red-100 border-red-300 text-red-900"
                : success
                ? "bg-emerald-100 border-emerald-300 text-emerald-950"
                : "bg-slate-100 border-slate-300 text-slate-900",
            ].join(" ")}
          >
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">Según filtros actuales</div>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: MovimientoTipo }) {
  const cls =
    tipo === "DEBE"
      ? "border-red-300 bg-red-100 text-red-900"
      : tipo === "HABER"
      ? "border-emerald-300 bg-emerald-100 text-emerald-950"
      : "border-amber-300 bg-amber-100 text-amber-900";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${cls}`}>
      {tipo === "DEBE" ? "Debe" : tipo === "HABER" ? "Haber" : "Ajuste"}
    </span>
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