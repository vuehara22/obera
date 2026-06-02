import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Save, Search, Trash2, Pencil, X } from "lucide-react";

export type PrecioFamilia = {
  GrupoFamiliaID: string;
  NombreGrupo: string;
  precios: Record<string, number>;
};

export const PRECIOS_FAMILIA_STORAGE_KEY = "demo_precios_familias_v1";

const PERIODOS = ["45", "46", "47", "48", "49", "50", "51", "52"];

const DEFAULT_PRECIOS_FAMILIA: PrecioFamilia[] = [
  { GrupoFamiliaID: "GF001", NombreGrupo: "CHICA 70x70", precios: { "45": 3450, "45B": 1, "46": 3800, "46B": 1, "47": 4000, "48": 4370 } },
  { GrupoFamiliaID: "GF002", NombreGrupo: "LARGA 2,50", precios: { "45": 6300, "45B": 1, "46": 6950, "46B": 1, "47": 7300, "48": 8000 } },
  { GrupoFamiliaID: "GF003", NombreGrupo: "REDONDA 1,50", precios: { "45": 6300, "45B": 1, "46": 6950, "46B": 1, "47": 7300, "48": 8000 } },
  { GrupoFamiliaID: "0644248c", NombreGrupo: "Gazebos", precios: { "45": 40100, "45B": 1, "46": 45000, "46B": 1, "47": 46300, "48": 51000 } },
  { GrupoFamiliaID: "9eaa5e5e", NombreGrupo: "Sillas Plasticas", precios: { "45": 1000, "45B": 1, "46": 1100, "46B": 1, "47": 1160, "48": 1280 } },
];

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
}

function readPrecios(): PrecioFamilia[] {
  try {
    const raw = localStorage.getItem(PRECIOS_FAMILIA_STORAGE_KEY);
    if (!raw) return DEFAULT_PRECIOS_FAMILIA;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_PRECIOS_FAMILIA;
  } catch {
    return DEFAULT_PRECIOS_FAMILIA;
  }
}

function savePrecios(data: PrecioFamilia[]) {
  localStorage.setItem(PRECIOS_FAMILIA_STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("precios-familias-updated"));
}

function emptyForm(): PrecioFamilia {
  return { GrupoFamiliaID: crypto.randomUUID().slice(0, 8), NombreGrupo: "", precios: {} };
}

export default function PreciosFamilias() {
  const [rows, setRows] = useState<PrecioFamilia[]>(() => readPrecios());
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<PrecioFamilia | null>(null);

  useEffect(() => savePrecios(rows), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => `${r.GrupoFamiliaID} ${r.NombreGrupo}`.toLowerCase().includes(term));
  }, [rows, q]);

  function saveForm() {
    if (!editing) return;
    if (!editing.GrupoFamiliaID.trim() || !editing.NombreGrupo.trim()) {
      alert("Completá ID y nombre del grupo.");
      return;
    }
    setRows((prev) => {
      const exists = prev.some((r) => r.GrupoFamiliaID === editing.GrupoFamiliaID);
      return exists ? prev.map((r) => (r.GrupoFamiliaID === editing.GrupoFamiliaID ? editing : r)) : [...prev, editing];
    });
    setEditing(null);
  }

  function changePrice(key: string, e: ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value || 0);
    setEditing((prev) => (prev ? { ...prev, precios: { ...prev.precios, [key]: value } } : prev));
  }

  function remove(id: string) {
    if (!confirm("¿Eliminar este grupo de precios?")) return;
    setRows((prev) => prev.filter((r) => r.GrupoFamiliaID !== id));
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-300 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="rounded-xl border border-slate-300 bg-white p-2 hover:bg-slate-100"><ArrowLeft className="h-5 w-5 text-slate-950" /></Link>
            <div><h1 className="text-xl font-extrabold text-slate-950">Precios por grupo/familia</h1><p className="text-sm font-medium text-slate-900">Estos precios los toma Nuevo Evento según el campo Grupo/Familias del producto.</p></div>
          </div>
          <button onClick={() => setEditing(emptyForm())} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 font-bold text-white"><Plus className="h-4 w-4" />Nuevo grupo</button>
        </div>
      </header>

      <main className="p-4 sm:p-6 text-slate-950">
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-800" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar grupo..." className="w-full outline-none text-slate-950 placeholder:text-slate-700" />
        </div>

        <div className="overflow-auto rounded-2xl border border-slate-300 bg-white shadow-sm">
          <table className="min-w-[1100px] w-full text-sm text-slate-950">
            <thead className="bg-slate-100 text-left text-slate-950">
              <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Grupo</th>{PERIODOS.flatMap((p) => [p, `${p}B`]).map((p) => <th key={p} className="px-4 py-3">Precio {p}</th>)}<th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => <tr key={r.GrupoFamiliaID} className="border-t border-slate-200 text-slate-950">
                <td className="px-4 py-3 font-bold text-slate-950">{r.GrupoFamiliaID}</td><td className="px-4 py-3 font-bold text-slate-950">{r.NombreGrupo}</td>
                {PERIODOS.flatMap((p) => [p, `${p}B`]).map((p) => <td key={p} className="px-4 py-3 text-slate-950">{r.precios[p] ? money(r.precios[p]) : "—"}</td>)}
                <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => setEditing(r)} className="rounded-lg border p-2"><Pencil className="h-4 w-4 text-slate-950" /></button><button onClick={() => remove(r.GrupoFamiliaID)} className="rounded-lg border p-2 text-red-700"><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </main>

      {editing && <div className="fixed inset-0 z-50 bg-slate-950/60 p-4"><div className="mx-auto max-h-[92vh] max-w-5xl overflow-auto rounded-3xl bg-white p-5 shadow-2xl text-slate-950">
        <div className="mb-4 flex items-start justify-between"><h2 className="text-lg font-extrabold text-slate-950">Editar grupo de precios</h2><button onClick={() => setEditing(null)} className="rounded-xl border p-2"><X className="h-4 w-4 text-slate-950" /></button></div>
        <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-slate-950">ID<input value={editing.GrupoFamiliaID} onChange={(e) => setEditing({ ...editing, GrupoFamiliaID: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2 text-slate-950" /></label><label className="text-sm font-bold text-slate-950">Nombre grupo<input value={editing.NombreGrupo} onChange={(e) => setEditing({ ...editing, NombreGrupo: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2 text-slate-950" /></label></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">{PERIODOS.flatMap((p) => [p, `${p}B`]).map((p) => <label key={p} className="text-sm font-bold text-slate-950">Precio {p}<input type="number" value={editing.precios[p] ?? 0} onChange={(e) => changePrice(p, e)} className="mt-1 w-full rounded-xl border px-3 py-2 text-slate-950" /></label>)}</div>
        <div className="mt-5 flex justify-end"><button onClick={saveForm} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 font-bold text-white"><Save className="h-4 w-4" />Guardar</button></div>
      </div></div>}
    </div>
  );
}