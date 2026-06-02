import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  Truck,
  Undo2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { eventosDemo } from "../data/eventos.demo";
import { inventarioDemo } from "../data/inventario.demo";
import { eventoItemsDemo } from "../data/eventoItems.demo";

type EstadoLogistica = "PENDIENTE_ENTREGA" | "ENTREGADO" | "DEVOLUCION_PARCIAL" | "DEVUELTO";

type DevolucionItemState = {
  ProductoID: string;
  CantidadAlquilada: number;
  Devuelto: boolean;
  CantidadRota: number;   // roto/perdido
};

function moneyARS(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function clampInt(n: number) {
  const v = Math.floor(Number(n) || 0);
  return Math.max(0, v);
}

export default function EventoEntregasDevoluciones() {
  const { id } = useParams();
  const evento = eventosDemo.find((e) => e.IDEvento === id);

  // Base de items del evento
  const baseItems = useMemo(() => {
    const items = eventoItemsDemo.filter((x) => x.IDEvento === id);
    return items.map((it) => ({
      ProductoID: it.ProductoID,
      CantidadAlquilada: it.Cantidad,
    }));
  }, [id]);

  // Estado UI (demo)
  const [estado, setEstado] = useState<EstadoLogistica>("PENDIENTE_ENTREGA");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [fechaDevolucion, setFechaDevolucion] = useState("");
  const [items, setItems] = useState<DevolucionItemState[]>(
    baseItems.map((b) => ({
      ProductoID: b.ProductoID,
      CantidadAlquilada: b.CantidadAlquilada,
      Devuelto: false,
      CantidadRota: 0,
    }))
  );

  if (!evento) {
    return (
      <div className="min-h-screen bg-transparent p-8">
        <div className="rounded-2xl border border-white/10 bg-white/8 backdrop-blur p-6 text-white">
          <div className="font-extrabold">Evento no encontrado</div>
          <Link to="/eventos" className="underline text-white/80 font-semibold">
            Volver a eventos
          </Link>
        </div>
      </div>
    );
  }

  const rows = useMemo(() => {
    return items.map((it) => {
      const p = inventarioDemo.find((x) => x.ProductoID === it.ProductoID);
      const costoRepo = p?.CostoReposicion ?? 0;
      const cargo = it.CantidadRota * costoRepo;
      const faltanDev = it.Devuelto ? 0 : it.CantidadAlquilada;
      return { ...it, producto: p, costoRepo, cargo, faltanDev };
    });
  }, [items]);

  const resumen = useMemo(() => {
    const totalAlquilado = items.reduce((acc, it) => acc + it.CantidadAlquilada, 0);
    const totalDevueltos = items.reduce((acc, it) => acc + (it.Devuelto ? it.CantidadAlquilada : 0), 0);
    const totalRoto = items.reduce((acc, it) => acc + it.CantidadRota, 0);
    const cargoExtra = rows.reduce((acc, r) => acc + r.cargo, 0);

    const algunNoDev = items.some((it) => !it.Devuelto);
    const algunRoto = totalRoto > 0;

    let estadoSug: EstadoLogistica = estado;
    if (estado === "PENDIENTE_ENTREGA") estadoSug = "PENDIENTE_ENTREGA";
    else if (!algunNoDev && !algunRoto) estadoSug = "DEVUELTO";
    else if (!algunNoDev && algunRoto) estadoSug = "DEVUELTO";
    else if (algunNoDev) estadoSug = "DEVOLUCION_PARCIAL";

    return { totalAlquilado, totalDevueltos, totalRoto, cargoExtra, estadoSug };
  }, [items, rows, estado]);

  const toggleDevuelto = (productoID: string, checked: boolean) => {
    setItems((prev) =>
      prev.map((x) =>
        x.ProductoID === productoID ? { ...x, Devuelto: checked } : x
      )
    );
  };

  const setRoto = (productoID: string, value: number) => {
    setItems((prev) =>
      prev.map((x) => {
        if (x.ProductoID !== productoID) return x;
        const v = clampInt(value);
        // no permitir más roto que alquilado
        return { ...x, CantidadRota: Math.min(v, x.CantidadAlquilada) };
      })
    );
  };

  const marcarTodoDevuelto = () => {
    setItems((prev) => prev.map((x) => ({ ...x, Devuelto: true })));
  };

  const marcarNadaDevuelto = () => {
    setItems((prev) => prev.map((x) => ({ ...x, Devuelto: false })));
  };

  const generarFacturaExtraDemo = () => {
    alert(
      `Demo: Generar factura extra\nCargo extra: ${moneyARS(resumen.cargoExtra)}\n(Próximo paso: PDF + backend Node)`
    );
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-white/5 backdrop-blur">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={`/eventos/${evento.IDEvento}`}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 text-white flex items-center justify-center hover:bg-white/10"
              title="Volver al evento"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="text-xs text-white/60 font-semibold">
                {evento.IDEvento} • {evento.ClienteRef}
              </div>
              <h1 className="text-xl font-extrabold text-white truncate">
                Entregas y devoluciones
              </h1>
              <p className="text-sm text-white/70 truncate">
                Check de ítems devueltos • roturas • cargo extra automático
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={generarFacturaExtraDemo}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 px-4 py-2 hover:bg-white/90 transition font-semibold"
          >
            <FileText className="h-4 w-4" />
            Generar factura extra
          </button>
        </div>
      </header>

      <main className="px-6 py-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left panel */}
        <section className="xl:col-span-4 space-y-4">
          <Card title="Logística del evento">
            <div className="grid grid-cols-2 gap-3">
              <Mini label="Evento" value={evento.NombreEvento} colSpan />
              <Mini label="Inicio" value={evento.FechaInicio} />
              <Mini label="Fin" value={evento.FechaFin} />
              <Mini label="Ciudad" value={evento.CiudadEvento ?? "—"} />
              <Mini label="Dirección" value={evento.DireccionEvento ?? "—"} colSpan />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <div className="text-xs font-semibold text-white/70 mb-1">
                  Fecha entrega
                </div>
                <input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 text-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/20"
                />
              </label>

              <label className="block">
                <div className="text-xs font-semibold text-white/70 mb-1">
                  Fecha devolución
                </div>
                <input
                  type="date"
                  value={fechaDevolucion}
                  onChange={(e) => setFechaDevolucion(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 text-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/20"
                />
              </label>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-white/70 mb-2">Estado</div>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoLogistica)}
                className="w-full rounded-xl border border-white/10 bg-white/10 text-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/20"
              >
                <option value="PENDIENTE_ENTREGA" className="text-slate-900">Pendiente entrega</option>
                <option value="ENTREGADO" className="text-slate-900">Entregado</option>
                <option value="DEVOLUCION_PARCIAL" className="text-slate-900">Devolución parcial</option>
                <option value="DEVUELTO" className="text-slate-900">Devuelto</option>
              </select>

              <div className="mt-3 rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white/80 flex items-start gap-2">
                <Truck className="h-5 w-5 mt-0.5 text-white/80" />
                <div>
                  <div className="font-extrabold text-white">
                    {evento.TransporteRef ?? "Transporte"}
                  </div>
                  <div className="text-xs text-white/70">
                    Km estimados: {evento.KmEstimados ?? "—"} • costos en facturación/presupuesto
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Resumen rápido">
            <Row label="Cantidad alquilada" value={String(resumen.totalAlquilado)} />
            <Row label="Devuelto (marcado)" value={String(resumen.totalDevueltos)} />
            <Row label="Roto / perdido" value={String(resumen.totalRoto)} warn={resumen.totalRoto > 0} />
            <div className="h-px bg-white/10 my-3" />
            <Row label="Cargo extra (repos.)" value={moneyARS(resumen.cargoExtra)} strong warn={resumen.cargoExtra > 0} />

            {resumen.cargoExtra > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200/30 bg-amber-100/10 p-3 text-amber-100 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div className="text-sm">
                  <div className="font-extrabold">Hay cargos por reposición</div>
                  <div className="text-xs opacity-90">
                    Se calcula automáticamente usando <b>CostoReposición</b> del inventario.
                  </div>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Right panel */}
        <section className="xl:col-span-8 space-y-4">
          <Card
            title="Checklist de devolución"
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={marcarTodoDevuelto}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 text-white px-3 py-2 text-sm font-semibold hover:bg-white/15 transition"
                >
                  <Undo2 className="h-4 w-4" />
                  Marcar todo devuelto
                </button>
                <button
                  type="button"
                  onClick={marcarNadaDevuelto}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 text-white px-3 py-2 text-sm font-semibold hover:bg-white/15 transition"
                >
                  Reset
                </button>
              </div>
            }
          >
            <div className="overflow-auto rounded-2xl border border-white/10">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-white/10 text-xs text-white/80">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Producto</th>
                    <th className="px-4 py-3 font-semibold">Alquilado</th>
                    <th className="px-4 py-3 font-semibold">Devuelto</th>
                    <th className="px-4 py-3 font-semibold">Roto / perdido</th>
                    <th className="px-4 py-3 font-semibold">Costo reposición</th>
                    <th className="px-4 py-3 font-semibold">Cargo</th>
                  </tr>
                </thead>

                <tbody className="text-white/90">
                  {rows.map((r) => (
                    <tr key={r.ProductoID} className="border-t border-white/10 hover:bg-white/5 transition">
                      <td className="px-4 py-4">
                        <div className="text-xs text-white/60 font-semibold">{r.ProductoID}</div>
                        <div className="text-lg font-extrabold text-white">
                          {r.producto?.NombreProducto ?? r.ProductoID}
                        </div>
                        <div className="text-xs text-white/70">
                          {r.producto?.Categoria ?? "—"} • {r.producto?.Subcategoria ?? "—"} • {r.producto?.Variante ?? "—"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-semibold">
                          {r.CantidadAlquilada}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <label className="inline-flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={r.Devuelto}
                            onChange={(e) => toggleDevuelto(r.ProductoID, e.target.checked)}
                            className="h-5 w-5 accent-white"
                          />
                          <span className="text-sm font-semibold text-white/80">
                            {r.Devuelto ? "Sí" : "No"}
                          </span>
                        </label>
                        {!r.Devuelto && (
                          <div className="text-xs text-amber-100/90 mt-2">
                            Falta devolver: <b>{r.faltanDev}</b>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min={0}
                          max={r.CantidadAlquilada}
                          value={r.CantidadRota}
                          onChange={(e) => setRoto(r.ProductoID, Number(e.target.value))}
                          className="w-28 rounded-xl border border-white/10 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                        />
                        <div className="text-xs text-white/60 mt-1">
                          máx: {r.CantidadAlquilada}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-extrabold text-white">
                          {moneyARS(r.costoRepo)}
                        </div>
                        <div className="text-xs text-white/60">
                          (editable en Inventario)
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                            r.cargo > 0
                              ? "border-amber-200/30 bg-amber-100/10 text-amber-100"
                              : "border-white/10 bg-white/10 text-white/80",
                          ].join(" ")}
                        >
                          {moneyARS(r.cargo)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Salida para factura extra (detalle)">
            <div className="text-sm text-white/70">
              Esto es lo que se enviaría a facturación como “cargo por reposición”.
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/8 backdrop-blur p-4">
              {rows.filter((r) => r.cargo > 0).length === 0 ? (
                <div className="text-white/70">No hay cargos extra.</div>
              ) : (
                <div className="space-y-2">
                  {rows
                    .filter((r) => r.cargo > 0)
                    .map((r) => (
                      <div
                        key={r.ProductoID}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="text-white">
                          <span className="font-extrabold">{r.CantidadRota}x</span>{" "}
                          {r.producto?.NombreProducto ?? r.ProductoID}
                          <span className="text-white/60"> • {r.ProductoID}</span>
                        </div>
                        <div className="font-extrabold text-white">
                          {moneyARS(r.cargo)}
                        </div>
                      </div>
                    ))}

                  <div className="h-px bg-white/10 my-3" />
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-white">Total</div>
                    <div className="font-extrabold text-white">{moneyARS(resumen.cargoExtra)}</div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 backdrop-blur shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="text-sm font-extrabold text-white">{title}</div>
        {right}
      </div>
      <div className="p-5">{children}</div>
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
    <div className={`rounded-xl border border-white/10 bg-white/10 px-3 py-2 ${colSpan ? "col-span-2" : ""}`}>
      <div className="text-xs text-white/60 font-semibold">{label}</div>
      <div className="text-sm font-bold text-white truncate">{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  warn,
}: {
  label: string;
  value: string;
  strong?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className={`text-white/80 ${strong ? "font-extrabold" : "font-semibold"}`}>{label}</div>
      <div className={`${strong ? "font-extrabold" : "font-bold"} ${warn ? "text-amber-100" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}