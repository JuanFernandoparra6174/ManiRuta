import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpRight, Clock, Gauge, Route as RouteIcon, Users } from "lucide-react";
import { AppShell } from "@/components/maniruta/AppShell";
import {
  Button,
  Card,
  CardHeader,
  MetricCard,
  Status,
  iconSize,
  type StatusTone,
} from "@/components/maniruta/primitives";

export const Route = createFileRoute("/panorama")({
  head: () => ({
    meta: [
      { title: "Panorama de red — ManiRuta Manizales" },
      {
        name: "description",
        content:
          "Panorama operativo de ManiRuta: buses en servicio, rutas activas, puntualidad, alertas y paraderos monitoreados en Manizales.",
      },
      { property: "og:title", content: "Panorama de red — ManiRuta" },
      {
        property: "og:description",
        content: "Métricas operativas de la red de transporte público de Manizales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Panorama,
});

const metrics = [
  { label: "Buses en servicio", value: "184", hint: "+6 vs ayer", icon: Gauge },
  { label: "Rutas activas", value: "27", hint: "3 con desvío", icon: RouteIcon },
  { label: "Pasajeros hoy", value: "62.4k", hint: "+8,2%", icon: Users },
  { label: "Puntualidad", value: "91%", hint: "meta 90%", icon: Clock },
];

const routes: {
  code: string;
  name: string;
  buses: number;
  eta: string;
  tone: StatusTone;
  label: string;
  load: number;
}[] = [
  { code: "R-12", name: "Chipre — Fundadores", buses: 14, eta: "4 min", tone: "active", label: "Normal", load: 62 },
  { code: "R-05", name: "La Enea — Cable Plaza", buses: 11, eta: "7 min", tone: "active", label: "Normal", load: 48 },
  { code: "R-21", name: "Villamaría — Centro", buses: 9, eta: "12 min", tone: "warning", label: "Demora", load: 84 },
  { code: "R-33", name: "Malhabar — Universidad", buses: 6, eta: "—", tone: "critical", label: "Suspendida", load: 12 },
];

function Panorama() {
  return (
    <AppShell>
      <section className="grid-backdrop relative mb-10 overflow-hidden rounded-xl border border-border px-8 py-10">
        <div className="max-w-2xl">
          <p className="label-caps">Panorama de red · Manizales</p>
          <h1 className="display-xl mt-4 text-5xl">
            Toda la red en <span className="text-primary">movimiento</span>, en un solo lugar.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Monitorea rutas, flota, paraderos y tiempos de viaje con datos claros y decisiones
            rápidas para la movilidad de la ciudad.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button>
              Ver red en vivo
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
            </Button>
            <Button variant="secondary">Reporte del día</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, hint, icon: Icon }) => (
          <MetricCard
            key={label}
            label={label}
            value={value}
            hint={hint}
            icon={<Icon className={iconSize} strokeWidth={1.8} />}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-0">
          <CardHeader
            title="Rutas en operación"
            subtitle="Actualizado hace 40 segundos"
            action={
              <Button variant="ghost" size="sm">
                Ver todas
              </Button>
            }
          />

          <div className="divide-y divide-border">
            {routes.map((r) => (
              <div
                key={r.code}
                className="flex items-center gap-5 px-5 py-4 transition-colors duration-200 hover:bg-surface-raised"
              >
                <span className="w-14 rounded-md border border-border px-2 py-1 text-center text-xs font-semibold tracking-[0.06em]">
                  {r.code}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${r.load}%` }}
                    />
                  </div>
                </div>
                <p className="hidden w-20 text-xs text-muted-foreground sm:block">{r.buses} buses</p>
                <p className="w-16 text-sm font-semibold">{r.eta}</p>
                <Status tone={r.tone}>{r.label}</Status>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-warning/30 text-warning">
                <AlertTriangle className={iconSize} strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-sm font-semibold">Cierre vial en Av. Santander</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Desvío temporal para las rutas R-21 y R-33 hasta las 18:00. Tiempos de viaje
                  aumentados en 6 minutos promedio.
                </p>
                <Button variant="ghost" size="sm" className="mt-3 px-0">
                  Gestionar alerta
                </Button>
              </div>
            </div>
          </Card>

          <Card variant="metric">
            <p className="label-caps">Tiempo medio de espera</p>
            <p className="mt-5 text-4xl font-semibold tracking-[-0.05em]">
              6,2 <span className="text-lg font-medium text-muted-foreground">min</span>
            </p>
            <div className="mt-6 flex h-24 items-end gap-1.5">
              {[38, 52, 44, 61, 73, 58, 47, 66, 81, 59, 70, 49].map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm transition-colors duration-200 ${
                    i === 8 ? "bg-primary" : "bg-secondary hover:bg-surface-raised"
                  }`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Últimas 12 horas · pico 15:00</p>
          </Card>

          <Card variant="metric">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Paraderos monitoreados</p>
              <Status>En línea</Status>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4">
              {[
                { k: "412", v: "Totales" },
                { k: "398", v: "Activos" },
                { k: "14", v: "Sin señal" },
              ].map((s) => (
                <div key={s.v}>
                  <p className="text-2xl font-semibold tracking-[-0.04em]">{s.k}</p>
                  <p className="mt-1 text-[11px] tracking-[0.05em] text-muted-foreground uppercase">
                    {s.v}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
