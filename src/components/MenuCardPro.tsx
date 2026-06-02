import { Link } from "react-router-dom";
import type { MenuItem } from "../data/menu";

export function MenuCardPro({ item }: { item: MenuItem }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className="
        group block overflow-hidden rounded-2xl border border-slate-200
        bg-white
        shadow-sm transition
        hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300
        focus:outline-none focus:ring-2 focus:ring-slate-900/10
      "
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className="
              flex h-12 w-12 shrink-0 items-center justify-center rounded-xl
              border border-slate-200 bg-slate-50 text-slate-800
              transition group-hover:bg-slate-100
            "
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold text-slate-950 truncate">
              {item.title}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-600 leading-5 line-clamp-2">
              {item.subtitle}
            </div>
          </div>

          <div
            className="
              hidden md:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
              border border-slate-200 bg-white text-slate-500
              transition group-hover:bg-slate-50 group-hover:text-slate-800
            "
            aria-hidden
          >
            →
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            Acceso rápido
          </span>

          <span className="text-xs font-bold text-slate-800 opacity-0 transition group-hover:opacity-100">
            Abrir
          </span>
        </div>
      </div>
    </Link>
  );
}