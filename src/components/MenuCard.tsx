import { Link } from "react-router-dom";
import type { MenuItem } from "../data/menu";

export function MenuCard({ item }: { item: MenuItem }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className="
        group block rounded-xl border border-slate-200 bg-white
        hover:bg-slate-50 hover:border-slate-300
        transition shadow-sm
      "
    >
      <div className="flex items-center gap-4 p-5">
        <div
          className="
            h-12 w-12 rounded-lg border border-slate-200
            flex items-center justify-center
            text-slate-700 bg-white
            group-hover:bg-slate-100 transition
          "
        >
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0">
          {item.title ? (
            <div className="text-sm text-slate-700 font-semibold leading-tight truncate">
              {item.title}
            </div>
          ) : (
            <div className="text-sm text-transparent select-none">.</div>
          )}

          <div className="text-xl font800 font-extrabold text-slate-500 leading-tight truncate">
            {item.subtitle}
          </div>
        </div>
      </div>
    </Link>
  );
}