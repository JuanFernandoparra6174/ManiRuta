import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpDown,
  Bus,
  CircleDot,
  Clock,
  Footprints,
  Layers,
  Locate,
  MapPin,
  Minus,
  Plus,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/maniruta/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  IconButton,
  Status,
  TextInput,
  iconSize,
} from "@/components/maniruta/primitives";
import { MockMap } from "@/components/maniruta/MockMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ManiRuta — Planea tu viaje en Manizales" },
      {
        name: "description",
        content:
          "Busca tu ruta de origen a destino, consulta buses cercanos, paraderos y tiempos de llegada del transporte público de Manizales.",
      },
      { property: "og:title", content: "ManiRuta — Planea tu viaje en Manizales" },
      {
        property: "og:description",
        content: "Rutas, buses cercanos, paraderos y tiempos de llegada en Manizales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Viajar,
});

const arrivals = [
  { code: "R-12", dest: "Fundadores", eta: "3 min", stop: "Cra 23 · Calle 21", live: true },
  { code: "R-05", dest: "Cable Plaza", eta: "8 min", stop: "Av. Santander", live: true },
  { code: "R-21", dest: "Centro", eta: "14 min", stop: "Parque Caldas", live: false },
];

const options = [
  {
    code: "R-12",
    name: "Directo · Chipre — Fundadores",
    time: "24 min",
    detail: "1 bus · 6 paradas · 350 m a pie",
    price: "$2.900",
    best: true,
  },
  {
    code: "R-05 + R-33",
    name: "Con transbordo · Cable Plaza",
    time: "31 min",
    detail: "2 buses · 9 paradas · 500 m a pie",
    price: "$2.900",
    best: false,
  },
];

function Viajar() {
  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <Card variant="metric">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-1 items-stretch gap-3">
                <div className="flex flex-col items-center pt-3.5">
                  <CircleDot className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                  <span className="my-1 w-px flex-1 bg-border" />
                  <MapPin className="h-4 w-4 text-primary" strokeWidth={2} />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <TextInput defaultValue="Mi ubicación · Palogrande" aria-label="Origen" />
                  <TextInput placeholder="¿A dónde vas?" aria-label="Destino" />
                </div>
                <IconButton className="self-center" aria-label="Invertir origen y destino">
                  <ArrowUpDown className="h-4 w-4" strokeWidth={1.8} />
                </IconButton>
              </div>
              <Button className="w-full lg:w-40">
                Buscar ruta
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Centro", "Universidad de Caldas", "Terminal", "Cable Plaza"].map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </div>
          </Card>

          <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
            <MockMap />

            <div className="pointer-events-none absolute left-5 top-5 rounded-full bg-background/85 backdrop-blur">
              <Status>12 buses cerca</Status>
            </div>

            <div className="absolute right-5 top-5 flex flex-col gap-2">
              {[
                { Icon: Plus, label: "Acercar" },
                { Icon: Minus, label: "Alejar" },
                { Icon: Locate, label: "Centrar en mi ubicación" },
                { Icon: Layers, label: "Capas del mapa" },
              ].map(({ Icon, label }) => (
                <IconButton key={label} aria-label={label} className="bg-background/85 backdrop-blur">
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </IconButton>
              ))}
            </div>

            <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-background/85 px-4 py-3 text-xs text-muted-foreground backdrop-blur">
              <span className="flex items-center gap-2">
                <span className="h-1 w-6 rounded-full bg-primary" /> Ruta activa
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1 w-6 rounded-full bg-secondary" /> Otras rutas
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full border border-primary" /> Paradero
              </span>
              <span className="ml-auto hidden sm:inline">Manizales · Centro–Palogrande</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card variant="metric" className="border-warning/25">
            <div className="flex items-start gap-3">
              <TriangleAlert className={`mt-0.5 shrink-0 text-warning ${iconSize}`} strokeWidth={1.8} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Cierre vial en Av. Santander</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  R-21 y R-33 con desvío hasta las 18:00.
                </p>
              </div>
              <Status tone="warning">Aviso</Status>
            </div>
          </Card>

          <Card className="p-0">
            <CardHeader title="Próximas llegadas" action={<Status>En vivo</Status>} />
            <div className="divide-y divide-border">
              {arrivals.map((a) => (
                <div
                  key={a.code}
                  className="flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-surface-raised"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border">
                    <Bus className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      <span className="tracking-[0.06em]">{a.code}</span>
                      <span className="text-muted-foreground"> · {a.dest}</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.stop}</p>
                  </div>
                  <p
                    className={`text-sm font-semibold tracking-[-0.03em] ${
                      a.live ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {a.eta}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            <p className="label-caps">Opciones de viaje</p>
            {options.map((o) => (
              <Card key={o.code} variant={o.best ? "highlighted" : "route"} interactive={!o.best}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold tracking-[0.04em]">{o.code}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{o.name}</p>
                  </div>
                  <p
                    className={`text-xl font-semibold tracking-[-0.04em] ${
                      o.best ? "text-primary" : ""
                    }`}
                  >
                    {o.time}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Footprints className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {o.detail}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {o.price}
                  </span>
                </div>
              </Card>
            ))}
            <Button variant="secondary" size="sm" disabled className="w-full">
              Más opciones disponibles al buscar
            </Button>
          </div>

          <Card variant="metric">
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Clock, k: "6,2 min", v: "Espera media" },
                { icon: MapPin, k: "8", v: "Paraderos cerca" },
                { icon: Bus, k: "27", v: "Rutas activas" },
              ].map(({ icon: Icon, k, v }) => (
                <div key={v}>
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                  <p className="mt-3 text-lg font-semibold tracking-[-0.04em]">{k}</p>
                  <p className="mt-0.5 text-[11px] tracking-[0.04em] text-muted-foreground">{v}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
