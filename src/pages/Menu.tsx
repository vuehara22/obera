import { useMemo, useState, type ReactNode } from "react";
import {
  Search,
  Plus,
  LayoutGrid,
  Filter,
  LogOut,
  User,
  Package,
  Wallet,
  CalendarDays,
  Tags,
  ClipboardCheck,
} from "lucide-react";
import { menuItems, type MenuItem } from "../data/menu";
import { MenuCardPro } from "../components/MenuCardPro";
import { useAuth } from "../auth/AuthContext";

type Category =
  | "Todo"
  | "Eventos"
  | "Inventario"
  | "Clientes"
  | "Finanzas"
  | "Config";

type MenuItemWithCategory = MenuItem & {
  _cat: Category;
};

function getCategory(id: string): Category {
  if (
    id === "eventos" ||
    id.includes("evento") ||
    id.includes("entreg") ||
    id.includes("devol")
  ) {
    return "Eventos";
  }

  if (id.includes("invent") || id.includes("repos")) return "Inventario";
  if (id.includes("cliente")) return "Clientes";

  if (
    id === "cuenta-corriente" ||
    id.includes("cuenta") ||
    id.includes("comprob") ||
    id.includes("listas")
  ) {
    return "Finanzas";
  }

  if (id.includes("config") || id.includes("precios-familia")) return "Config";

  return "Todo";
}

const cuentaCorrienteMenuItem: MenuItem = {
  id: "cuenta-corriente",
  title: "Cuenta Corriente",
  subtitle: "Saldos, pagos, movimientos y deudas por cliente",
  to: "/cuenta-corriente",
  icon: Wallet,
};

const preciosFamiliaMenuItem: MenuItem = {
  id: "precios-familia",
  title: "Precios Familia",
  subtitle: "Precios por grupo/familia para usar en Nuevo Evento",
  to: "/precios-familia",
  icon: Tags,
};

const devolucionesMenuItem: MenuItem = {
  id: "danos-reposiciones",
  title: "Devoluciones",
  subtitle: "Control de items devueltos, rotos, faltantes y factura extra",
  to: "/devoluciones",
  icon: ClipboardCheck,
};

export default function Menu() {
  const { user, logout } = useAuth();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category>("Todo");

  const allItems = useMemo<MenuItem[]>(() => {
    const baseItems = [
      ...menuItems.map((item) =>
        item.id === "danos-reposiciones" ||
        item.id === "daños-reposiciones" ||
        item.id === "danios-reposiciones" ||
        item.to === "/danos-reposiciones" ||
        item.to === "/daños-reposiciones" ||
        item.to === "/danios-reposiciones"
          ? devolucionesMenuItem
          : item
      ),
      cuentaCorrienteMenuItem,
      preciosFamiliaMenuItem,
      devolucionesMenuItem,
    ];

    return baseItems.filter(
      (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index
    );
  }, []);

  const items = useMemo<MenuItemWithCategory[]>(() => {
    const query = q.trim().toLowerCase();

    return allItems
      .map((it) => ({ ...it, _cat: getCategory(it.id) }))
      .filter((it) => (cat === "Todo" ? true : it._cat === cat))
      .filter((it) => {
        if (!query) return true;

        const haystack =
          `${it.title} ${it.subtitle} ${it.id} ${it.to}`.toLowerCase();

        return haystack.includes(query);
      });
  }, [q, cat, allItems]);

  const stats = useMemo(() => {
    const total = allItems.length;
    const eventos = allItems.filter((m) => getCategory(m.id) === "Eventos").length;
    const inv = allItems.filter((m) => getCategory(m.id) === "Inventario").length;
    const fin = allItems.filter((m) => getCategory(m.id) === "Finanzas").length;

    return { total, eventos, inv, fin };
  }, [allItems]);

  const chips: Category[] = [
    "Todo",
    "Eventos",
    "Inventario",
    "Clientes",
    "Finanzas",
    "Config",
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <LayoutGrid className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold leading-tight text-slate-950">
                  Oberá Eventos
                </h1>
                <p className="mt-1 max-w-xl text-sm font-medium leading-snug text-slate-600">
                  Gestión simple de eventos, stock, clientes y cobranzas
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-900">
                  <User className="h-5 w-5" />
                </div>

                <div className="min-w-0 leading-tight">
                  <div className="break-words text-sm font-bold text-slate-950">
                    {user?.name || "Usuario"}
                  </div>
                  <div className="break-words text-xs font-medium text-slate-600">
                    {user?.email || "sin email"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-white shadow-sm transition hover:bg-black"
                  onClick={() => alert("Demo: abrir modal para Agregar")}
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-bold">Agregar</span>
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-bold">Cerrar sesión</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="relative lg:col-span-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar módulos..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:col-span-7">
              <div className="mr-1 inline-flex items-center gap-2 whitespace-nowrap text-sm font-bold text-slate-900">
                <Filter className="h-4 w-4" />
                Categorías
              </div>

              {chips.map((c) => {
                const active = c === cat;

                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCat(c)}
                    className={[
                      "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition",
                      active
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Módulos"
            value={stats.total}
            icon={<LayoutGrid className="h-4 w-4" />}
          />
          <StatCard
            label="Eventos"
            value={stats.eventos}
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <StatCard
            label="Inventario"
            value={stats.inv}
            icon={<Package className="h-4 w-4" />}
          />
          <StatCard
            label="Finanzas"
            value={stats.fin}
            icon={<Wallet className="h-4 w-4" />}
          />
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">
                Módulos del sistema
              </h2>
              <p className="text-sm font-medium text-slate-600">
                Elegí una sección para continuar
              </p>
            </div>

            <div className="text-sm font-semibold text-slate-600">
              {items.length} resultado{items.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <MenuCardPro item={item} />
              </div>
            ))}

            {items.length === 0 && (
              <div className="col-span-full">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="text-base font-extrabold text-slate-950">
                    Sin resultados
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-600">
                    Probá con otro término o cambiá la categoría.
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-slate-700">{label}</div>

        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
            {icon}
          </div>
        ) : (
          <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-100" />
        )}
      </div>

      <div className="mt-3 text-3xl font-extrabold text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">
        Vista general
      </div>
    </div>
  );
}