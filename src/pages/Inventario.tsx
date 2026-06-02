import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Upload,
  Plus,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Filter,
  X,
  FileSpreadsheet,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { inventarioDemo, type InventarioItem } from "../data/inventario.demo";

type ActiveFilter = "all" | "active" | "inactive";
type DuplicateAction = "overwrite" | "new" | "skip";

type PreviewRow = {
  tempId: string;
  rowNumber: number;
  item: InventarioItem;
  exists: boolean;
  existingItem?: InventarioItem;
  action: DuplicateAction;
  finalProductoID: string;
};

type ImportPreview = {
  rows: PreviewRow[];
  invalid: number;
  invalidRows: Array<{ rowNumber: number; reason: string }>;
  fileName: string;
};

type InventarioForm = {
  ProductoID: string;
  NombreProducto: string;
  Categoria: string;
  Subcategoria: string;
  GrupoFamilias: string;
  Dimensiones: string;
  Foto: string;
  Variante: string;
  Disponible: string;
  StockInicial: number;
  CostoReposicion: number;
  Activo: boolean;
  StockActual: number;
  StockMinimo: number;
  ReordenCantidad: number;
  UltimaActualizacion: string;
};

const STORAGE_KEY = "demo_inventario_importado_v4";
const TARGET_SHEET_NAME = "Productos";

function moneyARS(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function isLowStock(i: InventarioItem) {
  const a = i.StockActual ?? 0;
  const m = i.StockMinimo ?? 0;
  return a < m;
}

function needsReorder(i: InventarioItem) {
  const a = i.StockActual ?? 0;
  const m = i.StockMinimo ?? 0;
  const rq = i.ReordenCantidad ?? 0;
  return a < m || (rq > 0 && a <= m);
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[\/_-]/g, "");
}

function cleanText(value: unknown) {
  const v = String(value ?? "").trim();
  return v === "" ? undefined : v;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

function toBoolean(value: unknown, fallback = true) {
  const v = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "si", "sí", "yes", "activo"].includes(v)) return true;
  if (["false", "0", "no", "inactivo"].includes(v)) return false;
  return fallback;
}

function parseDisponible(value: unknown) {
  const v = String(value ?? "").trim().toLowerCase();
  if (["si", "sí", "yes", "true", "1", "disponible"].includes(v)) return "Si";
  if (["no", "false", "0", "nodisponible"].includes(v)) return "No";
  return "Si";
}

function createEmptyForm(): InventarioForm {
  return {
    ProductoID: "",
    NombreProducto: "",
    Categoria: "",
    Subcategoria: "",
    GrupoFamilias: "",
    Dimensiones: "",
    Foto: "",
    Variante: "",
    Disponible: "Si",
    StockInicial: 0,
    CostoReposicion: 0,
    Activo: true,
    StockActual: 0,
    StockMinimo: 0,
    ReordenCantidad: 0,
    UltimaActualizacion: new Date().toISOString(),
  };
}

function itemToForm(item: InventarioItem): InventarioForm {
  return {
    ProductoID: item.ProductoID ?? "",
    NombreProducto: item.NombreProducto ?? "",
    Categoria: item.Categoria ?? "",
    Subcategoria: item.Subcategoria ?? "",
    GrupoFamilias: item.GrupoFamilias ?? "",
    Dimensiones: item.Dimensiones ?? "",
    Foto: item.Foto ?? "",
    Variante: item.Variante ?? "",
    Disponible: item.Disponible?.trim() ? item.Disponible : "Si",
    StockInicial: item.StockInicial ?? 0,
    CostoReposicion: item.CostoReposicion ?? 0,
    Activo: item.Activo !== false,
    StockActual: item.StockActual ?? 0,
    StockMinimo: item.StockMinimo ?? 0,
    ReordenCantidad: item.ReordenCantidad ?? 0,
    UltimaActualizacion: item.UltimaActualizacion ?? new Date().toISOString(),
  };
}

function formToItem(form: InventarioForm): InventarioItem {
  return {
    ProductoID: form.ProductoID.trim(),
    NombreProducto: form.NombreProducto.trim(),
    Categoria: form.Categoria.trim(),
    Subcategoria: form.Subcategoria.trim(),
    GrupoFamilias: form.GrupoFamilias.trim(),
    Dimensiones: form.Dimensiones.trim(),
    Foto: form.Foto.trim(),
    Variante: form.Variante.trim(),
    Disponible: form.Disponible.trim() || "Si",
    StockInicial: Number(form.StockInicial) || 0,
    CostoReposicion: Number(form.CostoReposicion) || 0,
    Activo: !!form.Activo,
    StockActual: Number(form.StockActual) || 0,
    StockMinimo: Number(form.StockMinimo) || 0,
    ReordenCantidad: Number(form.ReordenCantidad) || 0,
    UltimaActualizacion: new Date().toISOString(),
  };
}

function mapRawRowToInventarioItem(
  raw: Record<string, unknown>
):
  | {
      ok: true;
      item: InventarioItem;
    }
  | {
      ok: false;
      reason: string;
    } {
  const normalized: Record<string, unknown> = {};

  Object.entries(raw).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = value;
  });

  const productoID = cleanText(
    normalized["productoid"] ??
      normalized["idproducto"] ??
      normalized["codigo"] ??
      normalized["sku"]
  );

  const nombreProducto = cleanText(
    normalized["nombreproducto"] ?? normalized["nombre"] ?? normalized["producto"]
  );

  if (!productoID) {
    return { ok: false, reason: "Falta ProductoID" };
  }

  if (!nombreProducto) {
    return { ok: false, reason: "Falta Nombre Producto" };
  }

  const item: InventarioItem = {
    ProductoID: productoID,
    NombreProducto: nombreProducto,
    Categoria: cleanText(normalized["categoria"]) ?? "",
    Subcategoria: cleanText(normalized["subcategoria"]) ?? "",
    GrupoFamilias:
      cleanText(normalized["grupofamilias"] ?? normalized["grupofamilia"]) ?? "",
    Dimensiones: cleanText(normalized["dimensiones"]) ?? "",
    Foto: cleanText(normalized["foto"]) ?? "",
    Variante: cleanText(normalized["variante"]) ?? "",
    Disponible: parseDisponible(normalized["disponible"]),
    StockInicial: toNumber(normalized["stockinicial"], 0),
    CostoReposicion: toNumber(normalized["costoreposicion"], 0),
    Activo: toBoolean(normalized["activo"], true),
    StockActual: toNumber(normalized["stockactual"], 0),
    StockMinimo: toNumber(normalized["stockminimo"], 0),
    ReordenCantidad: toNumber(normalized["reordencantidad"], 0),
    UltimaActualizacion:
      cleanText(normalized["ultimaactualizacion"]) ?? new Date().toISOString(),
  };

  return { ok: true, item };
}

function buildUniqueProductoID(baseId: string, usedIds: Set<string>) {
  let counter = 1;
  let candidate = `${baseId}-COPIA-${counter}`;
  while (usedIds.has(candidate)) {
    counter++;
    candidate = `${baseId}-COPIA-${counter}`;
  }
  return candidate;
}

export default function Inventario() {
  const [items, setItems] = useState<InventarioItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as InventarioItem[];
    } catch {
      //
    }
    return inventarioDemo.map((item) => ({
      ...item,
      Disponible: item.Disponible?.trim() ? item.Disponible : "Si",
    }));
  });

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [subcat, setSubcat] = useState<string>("all");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [onlyLow, setOnlyLow] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingOriginalId, setEditingOriginalId] = useState<string | null>(null);
  const [form, setForm] = useState<InventarioForm>(createEmptyForm());

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!preview && !editorOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [preview, editorOpen]);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.Categoria).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [items]);

  const subcategories = useMemo(() => {
    const data = cat === "all" ? items : items.filter((i) => i.Categoria === cat);
    const set = new Set(data.map((i) => i.Subcategoria).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [items, cat]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return items
      .filter((i) => (cat === "all" ? true : i.Categoria === cat))
      .filter((i) => (subcat === "all" ? true : i.Subcategoria === subcat))
      .filter((i) => {
        if (active === "all") return true;
        const isActive = i.Activo !== false;
        return active === "active" ? isActive : !isActive;
      })
      .filter((i) => (onlyLow ? isLowStock(i) : true))
      .filter((i) => {
        if (!query) return true;
        const hay =
          `${i.ProductoID} ${i.NombreProducto} ${i.Categoria} ${i.Subcategoria} ${
            i.Variante ?? ""
          } ${i.GrupoFamilias ?? ""} ${i.Disponible ?? ""}`.toLowerCase();

        return hay.includes(query);
      });
  }, [items, q, cat, subcat, active, onlyLow]);

  const stats = useMemo(() => {
    const total = items.length;
    const activos = items.filter((i) => i.Activo !== false).length;
    const disponibles = items.filter((i) => (i.Disponible ?? "").toLowerCase() === "si").length;
    const low = items.filter(isLowStock).length;
    const reorder = items.filter(needsReorder).length;
    return { total, activos, disponibles, low, reorder };
  }, [items]);

  const previewStats = useMemo(() => {
    if (!preview) {
      return {
        newRows: 0,
        overwriteRows: 0,
        skipRows: 0,
        invalidRows: 0,
      };
    }

    return {
      newRows: preview.rows.filter((r) => r.action === "new").length,
      overwriteRows: preview.rows.filter((r) => r.action === "overwrite").length,
      skipRows: preview.rows.filter((r) => r.action === "skip").length,
      invalidRows: preview.invalid,
    };
  }, [preview]);

  const clearFilters = () => {
    setQ("");
    setCat("all");
    setSubcat("all");
    setActive("all");
    setOnlyLow(false);
  };

  const openImportDialog = () => {
    fileInputRef.current?.click();
  };

  const recomputePreviewFinalIds = (rows: PreviewRow[]) => {
    const usedIds = new Set(items.map((i) => i.ProductoID));
    const seenNewIds = new Set<string>();

    return rows.map((row) => {
      if (row.action === "overwrite") {
        return {
          ...row,
          finalProductoID: row.item.ProductoID,
        };
      }

      if (row.action === "skip") {
        return {
          ...row,
          finalProductoID: row.item.ProductoID,
        };
      }

      let candidateBase = row.item.ProductoID;
      let candidate = candidateBase;

      if (usedIds.has(candidate) || seenNewIds.has(candidate)) {
        candidate = buildUniqueProductoID(candidateBase, new Set([...usedIds, ...seenNewIds]));
      }

      seenNewIds.add(candidate);

      return {
        ...row,
        finalProductoID: candidate,
      };
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingImport(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const targetSheet =
        workbook.Sheets[TARGET_SHEET_NAME] ?? workbook.Sheets[workbook.SheetNames[0]];

      if (!targetSheet) {
        alert("No se encontró una hoja válida en el archivo.");
        return;
      }

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(targetSheet, {
        defval: "",
        range: 0,
      });

      const parsedPreviewRows: PreviewRow[] = [];
      const invalidRows: Array<{ rowNumber: number; reason: string }> = [];

      rawRows.forEach((raw, index) => {
        const result = mapRawRowToInventarioItem(raw);

        if (!result.ok) {
          invalidRows.push({
            rowNumber: index + 2,
            reason: result.reason,
          });
          return;
        }

        const normalizedItem: InventarioItem = {
          ...result.item,
          Disponible: result.item.Disponible?.trim() ? result.item.Disponible : "Si",
        };

        const existingItem = items.find((it) => it.ProductoID === normalizedItem.ProductoID);
        const exists = !!existingItem;

        parsedPreviewRows.push({
          tempId: `${normalizedItem.ProductoID}-${index}-${Date.now()}`,
          rowNumber: index + 2,
          item: normalizedItem,
          exists,
          existingItem,
          action: exists ? "overwrite" : "new",
          finalProductoID: normalizedItem.ProductoID,
        });
      });

      const recalculatedRows = recomputePreviewFinalIds(parsedPreviewRows);

      setPreview({
        rows: recalculatedRows,
        invalid: invalidRows.length,
        invalidRows,
        fileName: file.name,
      });
    } catch (error) {
      console.error(error);
      alert(
        "No se pudo leer el archivo. Revisá que la hoja se llame 'Productos' y que el Excel sea válido."
      );
    } finally {
      setLoadingImport(false);
      e.target.value = "";
    }
  };

  const updatePreviewRowAction = (tempId: string, action: DuplicateAction) => {
    setPreview((prev) => {
      if (!prev) return prev;

      const rows = prev.rows.map((row) =>
        row.tempId === tempId
          ? {
              ...row,
              action,
            }
          : row
      );

      return {
        ...prev,
        rows: recomputePreviewFinalIds(rows),
      };
    });
  };

  const updatePreviewRowField = (
    tempId: string,
    field: keyof InventarioItem,
    value: string | number | boolean
  ) => {
    setPreview((prev) => {
      if (!prev) return prev;

      const rows = prev.rows.map((row) => {
        if (row.tempId !== tempId) return row;

        return {
          ...row,
          item: {
            ...row.item,
            [field]: value,
          },
        };
      });

      return {
        ...prev,
        rows: recomputePreviewFinalIds(rows),
      };
    });
  };

  const applyImport = () => {
    if (!preview) return;

    const map = new Map<string, InventarioItem>(items.map((item) => [item.ProductoID, item]));

    for (const row of preview.rows) {
      if (row.action === "skip") continue;

      const normalizedItem: InventarioItem = {
        ...row.item,
        Disponible: row.item.Disponible?.trim() ? row.item.Disponible : "Si",
        UltimaActualizacion: new Date().toISOString(),
      };

      if (row.action === "overwrite") {
        const existing = map.get(row.item.ProductoID);

        if (existing) {
          map.set(row.item.ProductoID, {
            ...existing,
            ...normalizedItem,
            ProductoID: row.item.ProductoID,
            UltimaActualizacion: new Date().toISOString(),
          });
        } else {
          map.set(row.item.ProductoID, {
            ...normalizedItem,
            ProductoID: row.item.ProductoID,
            UltimaActualizacion: new Date().toISOString(),
          });
        }
        continue;
      }

      if (row.action === "new") {
        map.set(row.finalProductoID, {
          ...normalizedItem,
          ProductoID: row.finalProductoID,
          UltimaActualizacion: new Date().toISOString(),
        });
      }
    }

    const merged = Array.from(map.values()).sort((a, b) =>
      String(a.ProductoID).localeCompare(String(b.ProductoID))
    );

    setItems(merged);
    setPreview(null);
  };

  const resetInventario = () => {
    const ok = window.confirm(
      "¿Querés volver al inventario demo original? Esto reemplaza lo importado."
    );
    if (!ok) return;

    setItems(
      inventarioDemo.map((item) => ({
        ...item,
        Disponible: item.Disponible?.trim() ? item.Disponible : "Si",
      }))
    );
    localStorage.removeItem(STORAGE_KEY);
    setPreview(null);
  };

  const openCreateEditor = () => {
    setEditorMode("create");
    setEditingOriginalId(null);
    setForm(createEmptyForm());
    setEditorOpen(true);
  };

  const openEditEditor = (item: InventarioItem) => {
    setEditorMode("edit");
    setEditingOriginalId(item.ProductoID);
    setForm(itemToForm(item));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingOriginalId(null);
    setForm(createEmptyForm());
  };

  const handleFormText =
    (field: keyof InventarioForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleFormNumber =
    (field: keyof InventarioForm) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({
        ...prev,
        [field]: value === "" ? 0 : Number(value),
      }));
    };

  const handleFormBoolean =
    (field: keyof InventarioForm) => (e: ChangeEvent<HTMLSelectElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value === "true",
      }));
    };

  const saveEditor = () => {
    const normalizedId = form.ProductoID.trim();
    const normalizedName = form.NombreProducto.trim();

    if (!normalizedId) {
      alert("ProductoID es obligatorio.");
      return;
    }

    if (!normalizedName) {
      alert("Nombre Producto es obligatorio.");
      return;
    }

    const duplicated = items.some((item) => {
      if (editorMode === "edit" && item.ProductoID === editingOriginalId) return false;
      return item.ProductoID === normalizedId;
    });

    if (duplicated) {
      alert("Ya existe un producto con ese ProductoID.");
      return;
    }

    const newItem = formToItem({
      ...form,
      ProductoID: normalizedId,
      NombreProducto: normalizedName,
      Disponible: form.Disponible || "Si",
    });

    setItems((prev) => {
      let next: InventarioItem[];

      if (editorMode === "edit" && editingOriginalId) {
        next = prev
          .map((item) => (item.ProductoID === editingOriginalId ? newItem : item))
          .sort((a, b) => String(a.ProductoID).localeCompare(String(b.ProductoID)));
      } else {
        next = [...prev, newItem].sort((a, b) =>
          String(a.ProductoID).localeCompare(String(b.ProductoID))
        );
      }

      return next;
    });

    closeEditor();
  };

  const deleteItem = (item: InventarioItem) => {
    const ok = window.confirm(
      `¿Querés eliminar el producto ${item.ProductoID} - ${item.NombreProducto}?`
    );
    if (!ok) return;

    setItems((prev) => prev.filter((p) => p.ProductoID !== item.ProductoID));
  };

  const updateItemDisponible = (productoID: string, disponible: "Si" | "No") => {
    setItems((prev) =>
      prev.map((item) =>
        item.ProductoID === productoID
          ? {
              ...item,
              Disponible: disponible,
              UltimaActualizacion: new Date().toISOString(),
            }
          : item
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <header className="sticky top-0 z-10 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-tight text-slate-950">
                Inventario
              </h1>
              <p className="truncate text-sm font-medium text-slate-800">
                Hoja Excel: Productos • editable • disponible por defecto
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              to="/"
              className="hidden text-sm font-semibold text-slate-900 underline hover:text-black sm:inline-flex"
            >
              Volver al menú
            </Link>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={openImportDialog}
              title="Importar Excel"
              disabled={loadingImport}
            >
              {loadingImport ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <span className="hidden font-semibold md:inline">
                {loadingImport ? "Leyendo..." : "Importar"}
              </span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-900 shadow-sm transition hover:bg-slate-100"
              onClick={resetInventario}
            >
              <RefreshCw className="h-5 w-5" />
              <span className="hidden font-semibold md:inline">Reset</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-white shadow-sm transition hover:bg-black"
              onClick={openCreateEditor}
            >
              <Plus className="h-5 w-5" />
              <span className="hidden font-semibold md:inline">Agregar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-4 pb-4 lg:grid-cols-12 sm:px-6">
          <div className="relative lg:col-span-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, ID, categoría, variante…"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-600 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              value={cat}
              onChange={(e) => {
                setCat(e.target.value);
                setSubcat("all");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/15"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "Todas las categorías" : c}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={subcat}
              onChange={(e) => setSubcat(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/15"
            >
              {subcategories.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "Todas las subcategorías" : s}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={active}
              onChange={(e) => setActive(e.target.value as ActiveFilter)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/15"
            >
              <option value="all">Activo + Inactivo</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>

          <div className="flex items-center gap-2 lg:col-span-1">
            <button
              type="button"
              onClick={() => setOnlyLow((v) => !v)}
              className={[
                "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                onlyLow
                  ? "border-amber-300 bg-amber-100 text-amber-950"
                  : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
              ].join(" ")}
              title="Solo bajo mínimo"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden xl:inline">Bajo</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-800 lg:col-span-12">
            <div className="font-medium">
              Mostrando{" "}
              <span className="font-extrabold text-slate-950">{filtered.length}</span> ítems
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 font-bold text-slate-900 hover:text-black"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          </div>
        </div>
      </header>

      <main className="space-y-6 px-4 py-6 sm:px-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Kpi label="Items" value={stats.total} icon={<Boxes className="h-4 w-4" />} />
          <Kpi label="Activos" value={stats.activos} />
          <Kpi label="Disponibles" value={stats.disponibles} />
          <Kpi label="Bajo mínimo" value={stats.low} tone="warn" />
          <Kpi label="Reorden" value={stats.reorder} tone="warn" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <div className="text-sm font-extrabold text-slate-950">Listado</div>
              <div className="text-xs font-medium text-slate-800">
                Importación desde hoja Productos • edición manual • eliminación • disponible editable
              </div>
            </div>

            <div className="hidden text-xs font-medium text-slate-800 md:block">
              Stock actual vs mínimo • reposición • estado
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[1280px] w-full">
              <thead className="bg-slate-100 text-left text-xs text-slate-900">
                <tr>
                  <Th>Producto</Th>
                  <Th>Categoría</Th>
                  <Th>Variante</Th>
                  <Th>Stock</Th>
                  <Th>Disponible</Th>
                  <Th>Reposición</Th>
                  <Th>Estado</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>

              <tbody className="text-sm text-slate-900">
                {filtered.map((i) => {
                  const low = isLowStock(i);
                  const reorder = needsReorder(i);
                  const disponible = (i.Disponible ?? "Si").toLowerCase() === "si";

                  return (
                    <tr
                      key={i.ProductoID}
                      className="border-t border-slate-200 transition hover:bg-slate-100/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 font-bold text-slate-900">
                            {i.Categoria?.slice(0, 1) ?? "I"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-extrabold text-slate-950">
                              {i.NombreProducto}
                            </div>
                            <div className="text-xs font-medium text-slate-800">
                              <span className="font-bold">{i.ProductoID}</span>
                              {i.Dimensiones ? ` • ${i.Dimensiones}` : ""}
                              {i.GrupoFamilias ? ` • ${i.GrupoFamilias}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-950">{i.Categoria || "—"}</div>
                        <div className="text-xs font-medium text-slate-800">
                          {i.Subcategoria || "—"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-950">{i.Variante || "—"}</div>
                        <div className="text-xs font-medium text-slate-800">
                          Inicial: {i.StockInicial ?? 0}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-extrabold text-slate-950">
                            {i.StockActual ?? 0}
                          </div>
                          <div className="text-xs font-medium text-slate-800">
                            / min {i.StockMinimo ?? 0}
                          </div>
                        </div>

                        {low && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-950">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Bajo mínimo
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <Badge tone={disponible ? "ok" : "warn"}>
                            {disponible ? "Sí" : "No"}
                          </Badge>

                          <select
                            value={disponible ? "Si" : "No"}
                            onChange={(e) =>
                              updateItemDisponible(
                                i.ProductoID,
                                e.target.value === "No" ? "No" : "Si"
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                          >
                            <option value="Si">Disponible</option>
                            <option value="No">No disponible</option>
                          </select>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-950">
                          {moneyARS(i.CostoReposicion)}
                        </div>
                        <div className="text-xs font-medium text-slate-800">
                          Reorden: {i.ReordenCantidad ?? 0}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {i.Activo === false ? (
                          <Badge tone="neutral">Inactivo</Badge>
                        ) : reorder ? (
                          <Badge tone="warn">Reorden</Badge>
                        ) : (
                          <Badge tone="ok">
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              OK
                            </span>
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditEditor(i)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 transition hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteItem(i)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-100 px-3 py-2 text-xs font-bold text-red-900 transition hover:bg-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm font-medium text-slate-800">
                      No hay resultados para los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="text-sm font-extrabold text-slate-950">Cómo queda el flujo</div>
          <p className="mt-1 text-sm leading-6 font-medium text-slate-800">
            Se lee la hoja <b>Productos</b> desde <b>A1</b>. Antes de importar se abre un
            modal con todos los ítems detectados. Si un <b>ProductoID</b> ya existe, podés
            elegir si querés <b>sobrescribirlo</b>, <b>crearlo como nuevo</b> o <b>omitirlo</b>.
            Además, desde la vista previa ahora podés cambiar <b>disponibilidad</b>, <b>stock</b>,
            <b>activo</b> y otros valores antes de confirmar.
          </p>
        </section>
      </main>

      {preview && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-3 backdrop-blur-[3px] sm:p-4">
          <div className="flex h-full items-center justify-center">
            <div className="flex h-[94vh] w-full max-w-[96vw] flex-col overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-2xl">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-lg font-extrabold text-slate-950">
                    <FileSpreadsheet className="h-5 w-5 shrink-0" />
                    <span className="truncate">Confirmar importación</span>
                  </div>
                  <div className="mt-1 break-all text-sm font-semibold text-slate-800">
                    Archivo: <span className="font-extrabold">{preview.fileName}</span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-700">
                    Hoja usada: <span className="font-bold">{TARGET_SHEET_NAME}</span> ·
                    desde <span className="font-bold">A1</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerrar</span>
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-5">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <InfoBox label="Nuevos" value={previewStats.newRows} tone="ok" />
                    <InfoBox label="Sobrescribir" value={previewStats.overwriteRows} tone="warn" />
                    <InfoBox label="Omitidos" value={previewStats.skipRows} tone="neutral" />
                    <InfoBox label="Inválidos" value={previewStats.invalidRows} tone="warn" />
                  </div>

                  <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4">
                    <div className="text-sm font-extrabold text-slate-950">
                      Revisá y corregí antes de importar
                    </div>
                    <p className="mt-1 text-sm leading-6 font-medium text-slate-800">
                      Todo lo que venga sin disponibilidad queda por defecto como <b>Disponible = Sí</b>.
                      En esta vista previa también podés ajustar disponibilidad, activo, stock y costos
                      antes de guardar.
                    </p>
                  </div>

                  {preview.invalidRows.length > 0 && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-100 p-4">
                      <div className="text-sm font-extrabold text-amber-950">
                        Filas con problemas
                      </div>
                      <div className="mt-3 max-h-44 overflow-y-auto rounded-xl border border-amber-300 bg-white p-3 text-sm font-medium text-amber-950">
                        <div className="space-y-1.5">
                          {preview.invalidRows.map((r) => (
                            <div key={`${r.rowNumber}-${r.reason}`}>
                              <span className="font-extrabold">Fila {r.rowNumber}:</span> {r.reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-2xl border border-slate-300">
                    <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
                      <div className="text-sm font-extrabold text-slate-950">Vista previa completa</div>
                      <div className="mt-1 text-xs font-medium text-slate-800">
                        Podés decidir fila por fila qué hacer y editar sus datos antes de importar.
                      </div>
                    </div>

                    <div className="max-h-[500px] overflow-auto bg-white">
                      <table className="w-full min-w-[1700px] text-sm">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-left text-slate-950">
                          <tr>
                            <Th>Fila</Th>
                            <Th>ProductoID</Th>
                            <Th>Nombre</Th>
                            <Th>Categoría</Th>
                            <Th>Disponible</Th>
                            <Th>Activo</Th>
                            <Th>Stock actual</Th>
                            <Th>Stock mín.</Th>
                            <Th>Reorden</Th>
                            <Th>Costo</Th>
                            <Th>Estado actual</Th>
                            <Th>Acción</Th>
                            <Th>ID final</Th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-900">
                          {preview.rows.map((row) => (
                            <tr
                              key={row.tempId}
                              className="border-t border-slate-200 hover:bg-slate-100/70"
                            >
                              <td className="px-5 py-3 font-bold text-slate-800">
                                {row.rowNumber}
                              </td>

                              <td className="px-5 py-3">
                                <input
                                  value={row.item.ProductoID ?? ""}
                                  onChange={(e) =>
                                    updatePreviewRowField(
                                      row.tempId,
                                      "ProductoID",
                                      e.target.value
                                    )
                                  }
                                  className="w-[170px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                                />
                              </td>

                              <td className="px-5 py-3">
                                <input
                                  value={row.item.NombreProducto ?? ""}
                                  onChange={(e) =>
                                    updatePreviewRowField(
                                      row.tempId,
                                      "NombreProducto",
                                      e.target.value
                                    )
                                  }
                                  className="w-[220px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                                />
                              </td>

                              <td className="px-5 py-3">
                                <input
                                  value={row.item.Categoria ?? ""}
                                  onChange={(e) =>
                                    updatePreviewRowField(
                                      row.tempId,
                                      "Categoria",
                                      e.target.value
                                    )
                                  }
                                  className="w-[160px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                                />
                              </td>

                              <td className="px-5 py-3">
                                <select
                                  value={row.item.Disponible ?? "Si"}
                                  onChange={(e) =>
                                    updatePreviewRowField(
                                      row.tempId,
                                      "Disponible",
                                      e.target.value === "No" ? "No" : "Si"
                                    )
                                  }
                                  className="w-[140px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                                >
                                  <option value="Si">Disponible</option>
                                  <option value="No">No disponible</option>
                                </select>
                              </td>

                              <td className="px-5 py-3">
                                <select
                                  value={String(row.item.Activo !== false)}
                                  onChange={(e) =>
                                    updatePreviewRowField(
                                      row.tempId,
                                      "Activo",
                                      e.target.value === "true"
                                    )
                                  }
                                  className="w-[120px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                                >
                                  <option value="true">Activo</option>
                                  <option value="false">Inactivo</option>
                                </select>
                              </td>

                              <td className="px-5 py-3">
                                <input
                                  type="number"
                                  value={row.item.StockActual ?? 0}
                                  onChange={(e) =>
                                    updatePreviewRowField(
                                      row.tempId,
                                      "StockActual",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-[120px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                                />
                              </td>

                              <td className="px-5 py-3">
                                <input
                                  type="number"
                                  value={row.item.StockMinimo ?? 0}
                                  onChange={(e) =>
                                    updatePreviewRowField(
                                      row.tempId,
                                      "StockMinimo",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-[120px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                                />
                              </td>

                              <td className="px-5 py-3">
                                <input
                                  type="number"
                                  value={row.item.ReordenCantidad ?? 0}
                                  onChange={(e) =>
                                    updatePreviewRowField(
                                      row.tempId,
                                      "ReordenCantidad",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-[120px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                                />
                              </td>

                              <td className="px-5 py-3">
                                <input
                                  type="number"
                                  value={row.item.CostoReposicion ?? 0}
                                  onChange={(e) =>
                                    updatePreviewRowField(
                                      row.tempId,
                                      "CostoReposicion",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-[140px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                                />
                              </td>

                              <td className="px-5 py-3">
                                {row.exists ? (
                                  <div className="space-y-1">
                                    <Badge tone="warn">Ya existe</Badge>
                                    <div className="text-xs font-medium text-slate-800">
                                      Stock actual guardado:{" "}
                                      <span className="font-extrabold">
                                        {row.existingItem?.StockActual ?? 0}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <Badge tone="ok">Nuevo</Badge>
                                )}
                              </td>

                              <td className="px-5 py-3">
                                <select
                                  value={row.action}
                                  onChange={(e) =>
                                    updatePreviewRowAction(
                                      row.tempId,
                                      e.target.value as DuplicateAction
                                    )
                                  }
                                  className="w-[160px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                                >
                                  {row.exists && <option value="overwrite">Sobrescribir</option>}
                                  <option value="new">Crear como nuevo</option>
                                  <option value="skip">Omitir</option>
                                </select>
                              </td>

                              <td className="px-5 py-3">
                                <div className="font-extrabold text-slate-950">
                                  {row.action === "skip" ? "—" : row.finalProductoID}
                                </div>
                                {row.action === "new" && row.finalProductoID !== row.item.ProductoID && (
                                  <div className="text-xs font-medium text-slate-800">
                                    generado automático
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}

                          {preview.rows.length === 0 && (
                            <tr>
                              <td
                                colSpan={13}
                                className="px-5 py-8 text-center text-sm font-medium text-slate-800"
                              >
                                No hay filas válidas para importar.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-800">
                      Total de filas válidas detectadas:{" "}
                      <span className="font-extrabold text-slate-950">{preview.rows.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-5">
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={applyImport}
                  disabled={preview.rows.every((r) => r.action === "skip")}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirmar importación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 p-3 backdrop-blur-[3px] sm:p-4">
          <div className="flex h-full items-center justify-center">
            <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
                <div>
                  <div className="text-lg font-extrabold text-slate-950">
                    {editorMode === "edit" ? "Editar producto" : "Agregar producto"}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    Podés modificar todos los campos del inventario.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeEditor}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                  Cerrar
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="ProductoID *">
                    <input
                      value={form.ProductoID}
                      onChange={handleFormText("ProductoID")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="Nombre Producto *">
                    <input
                      value={form.NombreProducto}
                      onChange={handleFormText("NombreProducto")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="Categoría">
                    <input
                      value={form.Categoria}
                      onChange={handleFormText("Categoria")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="Subcategoría">
                    <input
                      value={form.Subcategoria}
                      onChange={handleFormText("Subcategoria")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="Grupo/Familias">
                    <input
                      value={form.GrupoFamilias}
                      onChange={handleFormText("GrupoFamilias")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="Dimensiones">
                    <input
                      value={form.Dimensiones}
                      onChange={handleFormText("Dimensiones")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="Foto">
                    <input
                      value={form.Foto}
                      onChange={handleFormText("Foto")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="Variante">
                    <input
                      value={form.Variante}
                      onChange={handleFormText("Variante")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="Disponible">
                    <select
                      value={form.Disponible}
                      onChange={handleFormText("Disponible")}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                    >
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                  </Field>

                  <Field label="Activo">
                    <select
                      value={String(form.Activo)}
                      onChange={handleFormBoolean("Activo")}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                    >
                      <option value="true">TRUE</option>
                      <option value="false">FALSE</option>
                    </select>
                  </Field>

                  <Field label="StockInicial">
                    <input
                      type="number"
                      value={form.StockInicial}
                      onChange={handleFormNumber("StockInicial")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="CostoReposicion">
                    <input
                      type="number"
                      value={form.CostoReposicion}
                      onChange={handleFormNumber("CostoReposicion")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="StockActual">
                    <input
                      type="number"
                      value={form.StockActual}
                      onChange={handleFormNumber("StockActual")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="StockMinimo">
                    <input
                      type="number"
                      value={form.StockMinimo}
                      onChange={handleFormNumber("StockMinimo")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="ReordenCantidad">
                    <input
                      type="number"
                      value={form.ReordenCantidad}
                      onChange={handleFormNumber("ReordenCantidad")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>

                  <Field label="UltimaActualizacion">
                    <input
                      value={form.UltimaActualizacion}
                      onChange={handleFormText("UltimaActualizacion")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-slate-900/15"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-5">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={saveEditor}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-5 py-3 font-bold text-slate-950">{children}</th>;
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

function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "ok" | "warn" | "neutral";
  children: ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-300 bg-emerald-100 text-emerald-950"
      : tone === "warn"
      ? "border-amber-300 bg-amber-100 text-amber-950"
      : "border-slate-300 bg-slate-200 text-slate-900";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${cls}`}
    >
      {children}
    </span>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn";
  icon?: ReactNode;
}) {
  const box =
    tone === "warn" ? "border-amber-300 bg-amber-100" : "border-slate-300 bg-white";
  const title = tone === "warn" ? "text-amber-950" : "text-slate-950";
  const sub = tone === "warn" ? "text-amber-900" : "text-slate-800";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${box}`}>
      <div className="flex items-center justify-between">
        <div className={`text-sm font-bold ${sub}`}>{label}</div>
        {icon ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white">
            {icon}
          </div>
        ) : (
          <div className="h-8 w-8 rounded-xl bg-slate-200" />
        )}
      </div>
      <div className={`mt-2 text-3xl font-extrabold ${title}`}>{value}</div>
      <div className={`mt-1 text-xs font-medium ${sub}`}>Actualizado</div>
    </div>
  );
}

function InfoBox({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "neutral";
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-300 bg-emerald-100 text-emerald-950"
      : tone === "warn"
      ? "border-amber-300 bg-amber-100 text-amber-950"
      : "border-slate-300 bg-slate-100 text-slate-950";

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="text-sm font-bold">{label}</div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
    </div>
  );
}