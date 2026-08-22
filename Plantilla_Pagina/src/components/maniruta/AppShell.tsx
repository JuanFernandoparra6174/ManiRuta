import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Bus,
  Compass,
  LayoutGrid,
  LifeBuoy,
  MapPin,
  Settings,
  Signal,
  TrendingUp,
} from "lucide-react";
import { IconButton, SearchInput, Select, Status, iconSize } from "./primitives";

/** Shared navigation item styling: default / hover / active. */
const navItemClass =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium tracking-[0.01em] text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground";
const navItemActiveClass = "data-[status=active]:bg-accent data-[status=active]:text-accent-foreground";

const navItems = [
  { label: "Viajar", icon: Compass, to: "/" as const },
  { label: "Panorama", icon: LayoutGrid, to: "/panorama" as const },
];

const staticNav = [
  { label: "Buses", icon: Bus },
  { label: "Paraderos", icon: MapPin },
  { label: "Demanda", icon: TrendingUp },
  { label: "Alertas", icon: Signal },
];

function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-border px-6">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Bus className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <span className="text-lg font-semibold tracking-[-0.04em]">ManiRuta</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
        <p className="label-caps px-3 pb-3">Operación</p>
        {navItems.map(({ label, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            activeOptions={{ exact: true }}
            className={`${navItemClass} ${navItemActiveClass}`}
          >
            <Icon className={iconSize} strokeWidth={1.8} />
            {label}
          </Link>
        ))}
        {staticNav.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={navItemClass}
          >
            <Icon className={iconSize} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        {[
          { label: "Ajustes", icon: Settings },
          { label: "Soporte", icon: LifeBuoy },
        ].map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={`${navItemClass} w-full`}
          >
            <Icon className={iconSize} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="flex h-20 items-center gap-4 border-b border-border px-8">
      <SearchInput className="w-full max-w-md" placeholder="Buscar ruta, bus o paradero" />
      <Select className="hidden w-44 xl:block" defaultValue="hoy">
        <option value="hoy">Hoy · Tiempo real</option>
        <option value="semana">Últimos 7 días</option>
        <option value="mes">Último mes</option>
      </Select>

      <div className="ml-auto flex items-center gap-3">
        <Status>Red en servicio</Status>
        <IconButton className="relative" aria-label="Notificaciones">
          <Bell className={iconSize} strokeWidth={1.8} />
          <span className="glow-dot absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-primary" />
        </IconButton>
        <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-secondary text-xs font-semibold">
            JF
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-semibold">Juan Fernández</p>
            <p className="text-[11px] text-muted-foreground">Operaciones</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-8 py-10">
          <div className="mx-auto w-full max-w-[1240px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
