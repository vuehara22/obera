import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Menu from "./pages/Menu";
import Placeholder from "./pages/Placeholder";
import Inventario from "./pages/Inventario";
import Eventos from "./pages/Eventos";
import EventoDetalle from "./pages/EventoDetalle";
import NuevoEvento from "./pages/NuevoEvento";
import Clientes from "./pages/Clientes";
import EventoEntregasDevoluciones from "./pages/EventoEntregasDevoluciones";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Calendario from "./pages/Calendario";
import Transporte from "./pages/Transporte";
import CuentaCorriente from "./pages/CuentaCorriente";
import PreciosFamilias from "./pages/PreciosFamilias";
import Devoluciones from "./pages/Devoluciones";
import DetalleSinPrecio from "./pages/DetalleSinPrecio";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Menu />} />
          <Route path="/menu" element={<Menu />} />

          {/* Eventos */}
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/eventos/nuevo" element={<NuevoEvento />} />
          <Route path="/eventos/nuevo-2" element={<NuevoEvento />} />
          <Route path="/eventos/:id" element={<EventoDetalle />} />
          <Route path="/eventos/:id/entregas" element={<EventoEntregasDevoluciones />} />
          <Route path="/eventos/items" element={<Placeholder title="Items del Evento" />} />
          <Route path="/eventos/entregas" element={<Placeholder title="Entregas y Devoluciones" />} />
          <Route path="/eventos/devoluciones" element={<Placeholder title="Devoluciones (sin precio)" />} />
          <Route path="/eventos/pedidos-sin-precio" element={<Placeholder title="Pedidos sin precio" />} />

          {/* Core */}
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/inventario/reposiciones" element={<Placeholder title="Reposiciones" />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/transporte" element={<Transporte />} />
          <Route path="/cuenta-corriente" element={<CuentaCorriente />} />
          <Route path="/precios-familia" element={<PreciosFamilias />} />
          <Route path="/devoluciones" element={<Devoluciones />} />
          <Route path="/detalle-sin-precio" element={<DetalleSinPrecio />} />

          {/* Finanzas / extras */}
          <Route path="/listas" element={<Placeholder title="Listas de precios" />} />
          <Route path="/comprobantes" element={<Placeholder title="Comprobantes" />} />
          <Route path="/reportes" element={<Placeholder title="Reportes" />} />
          <Route path="/configuracion" element={<Placeholder title="Configuración" />} />
          <Route path="/filtros" element={<Placeholder title="Filtros" />} />

          <Route path="*" element={<Placeholder title="404 / Ruta no encontrada" />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}