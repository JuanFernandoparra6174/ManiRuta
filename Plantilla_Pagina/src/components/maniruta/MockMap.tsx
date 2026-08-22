import { Bus, MapPin, Navigation } from "lucide-react";

const stops = [
  { x: 22, y: 68, label: "Palogrande" },
  { x: 40, y: 52, label: "Cra 23" },
  { x: 58, y: 44, label: "Parque Caldas" },
  { x: 76, y: 24, label: "Fundadores" },
];

export function MockMap() {
  return (
    <div
      className="relative h-[440px] w-full overflow-hidden lg:h-[560px]"
      role="img"
      aria-label="Mapa de la red de transporte de Manizales con la ruta activa y buses cercanos"
    >
      <div className="absolute inset-0 bg-background" />
      <div className="grid-backdrop absolute inset-0 opacity-70" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
        {/* street network */}
        <g stroke="var(--color-border)" strokeWidth="0.9" fill="none">
          <path d="M-5 44 L45 28 L105 34" />
          <path d="M-5 14 L38 22 L70 12 L105 18" />
          <path d="M12 -5 L20 60" />
          <path d="M52 -5 L46 60" />
          <path d="M84 -5 L80 60" />
          <path d="M-5 54 L105 50" />
        </g>
        {/* secondary routes */}
        <g stroke="var(--color-surface-raised)" strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path d="M4 56 L30 40 L64 46 L96 38" />
          <path d="M8 8 L34 18 L62 8 L94 14" />
        </g>
        {/* active route */}
        <path
          d="M22 41 L40 31 L58 26 L76 14"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22 41 L40 31 L58 26 L76 14"
          fill="none"
          stroke="var(--color-primary-glow)"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.14"
        />
      </svg>

      {stops.map((s) => (
        <div
          key={s.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          <span className="block h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
        </div>
      ))}

      {/* origin marker */}
      <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: "22%", top: "68%" }}>
        <span className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium">
          <Navigation className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
          Origen
        </span>
      </div>

      {/* destination marker */}
      <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: "76%", top: "24%" }}>
        <span className="flex items-center gap-2 rounded-full bg-primary whitespace-nowrap px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
          <MapPin className="h-3 w-3" strokeWidth={2.2} />
          Fundadores · 24 min
        </span>
      </div>

      {/* live buses */}
      {[
        { x: 34, y: 57, active: true },
        { x: 63, y: 41, active: false },
        { x: 48, y: 76, active: false },
      ].map((b, i) => (
        <div
          key={i}
          className={`absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border ${
            b.active
              ? "border-primary/60 bg-surface shadow-[var(--shadow-glow)]"
              : "border-border bg-surface"
          }`}
          style={{ left: `${b.x}%`, top: `${b.y}%` }}
        >
          <Bus
            className={`h-3.5 w-3.5 ${b.active ? "text-primary" : "text-muted-foreground"}`}
            strokeWidth={1.9}
          />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_35%,color-mix(in_oklab,var(--color-background)_75%,transparent)_100%)]" />
    </div>
  );
}
