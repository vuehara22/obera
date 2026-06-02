import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck2,
  Boxes,
  CalendarDays,
  Users,
  ClipboardList,
  Wrench,
  FileText,
  Truck,
  BarChart3,
  Settings,
  ListChecks,
  BadgeDollarSign,
  LayoutList,
  PackageX,
  Filter,
  FolderOpen,
} from "lucide-react";

export type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  to: string;
};

export const menuItems: MenuItem[] = [
  {
    id: "eventos",
    title: "Eventos",
    subtitle: "Ver todos los eventos",
    icon: FolderOpen,
    to: "/eventos",
  },
  {
    id: "nuevo-evento",
    title: "Crear reserva y cargar ítems",
    subtitle: "Nuevo Evento",
    icon: CalendarCheck2,
    to: "/eventos/nuevo-2",
  },
  {
    id: "inventario",
    title: "Catálogo y stock",
    subtitle: "Inventario",
    icon: Boxes,
    to: "/inventario",
  },
  {
    id: "calendario",
    title: "Agenda de eventos",
    subtitle: "Calendario",
    icon: CalendarDays,
    to: "/calendario",
  },
  {
    id: "clientes",
    title: "Altas y edición de clientes",
    subtitle: "Clientes",
    icon: Users,
    to: "/clientes",
  },
  {
    id: "entregas-devoluciones",
    title: "Control logístico y checklists",
    subtitle: "Entregas y Devoluciones",
    icon: ClipboardList,
    to: "/eventos/entregas",
  },
  {
    id: "reposiciones",
    title: "Daños, pérdidas y cobros",
    subtitle: "Reposiciones",
    icon: Wrench,
    to: "/inventario/reposiciones",
  },
  {
    id: "comprobantes",
    title: "Emitir comprobantes",
    subtitle: "Comprobantes",
    icon: FileText,
    to: "/comprobantes",
  },
  {
    id: "transporte",
    title: "Planificación y costos",
    subtitle: "Transporte",
    icon: Truck,
    to: "/eventos/transporte",
  },
  {
    id: "reportes",
    title: "KPIs y reportes",
    subtitle: "Reportes",
    icon: BarChart3,
    to: "/reportes",
  },
  {
    id: "config",
    title: "Precios, reglas y usuarios",
    subtitle: "Configuración",
    icon: Settings,
    to: "/configuracion",
  },
  {
    id: "items-evento",
    title: "Items activos en cada evento",
    subtitle: "Items Eventos",
    icon: ListChecks,
    to: "/eventos/items",
  },
  {
    id: "listas",
    title: "Precios de Listas",
    subtitle: "Listas",
    icon: BadgeDollarSign,
    to: "/listas",
  },
  {
    id: "detalle-evento",
    title: "Fecha, día, hora, cliente",
    subtitle: "Detalle Evento",
    icon: LayoutList,
    to: "/eventos/detalle",
  },
  {
    id: "cuenta-corriente",
    title: "Detalle, movimientos, saldos",
    subtitle: "Cuenta Corriente",
    icon: BadgeDollarSign,
    to: "/cuenta-corriente",
  },
  {
    id: "devoluciones-sin-precio",
    title: "Sin cantidades sin precio",
    subtitle: "Devoluciones",
    icon: PackageX,
    to: "/eventos/devoluciones",
  },
  {
    id: "pedidos-sin-precio",
    title: "",
    subtitle: "Pedidos Sin Precio",
    icon: FileText,
    to: "/eventos/pedidos-sin-precio",
  },
  {
    id: "filtros",
    title: "Filtra rango de fechas",
    subtitle: "Filtros",
    icon: Filter,
    to: "/filtros",
  },
];