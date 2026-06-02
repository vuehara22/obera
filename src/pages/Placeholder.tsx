import { Link } from "react-router-dom";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <Link
            to="/"
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 underline"
          >
            Volver al menú
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-700">
            Demo lista. Esta pantalla ya está conectada desde el menú.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-800">Siguiente</div>
              <div className="text-sm text-slate-600">
                UI de formulario + validaciones
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-800">Luego</div>
              <div className="text-sm text-slate-600">
                Reglas de negocio (temporadas, IVA, transporte)
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-800">Después</div>
              <div className="text-sm text-slate-600">
                Conectar a Node/DB + PDF
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}