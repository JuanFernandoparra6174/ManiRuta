import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * ManiRuta component language
 * Shared scale: control height 44px (sm 36px), radius-lg, 14px/600 text,
 * 18px icons, 200ms transitions, 1px borders, no heavy shadows.
 * ------------------------------------------------------------------ */

export const controlHeight = "h-11";
export const iconSize = "h-[18px] w-[18px]";

type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold tracking-[0.01em] transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        size === "md" ? "h-11 px-5" : "h-9 px-3.5 text-xs",
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:brightness-110 hover:shadow-[var(--shadow-glow)]",
        variant === "secondary" &&
          "border border-border bg-surface text-foreground hover:border-primary/40 hover:bg-surface-raised",
        variant === "ghost" &&
          "border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        "disabled:pointer-events-none disabled:border-border disabled:bg-secondary disabled:text-muted-foreground/50 disabled:shadow-none",
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors duration-200",
        "hover:border-primary/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:text-muted-foreground/40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ----------------------------- Cards ----------------------------- */

type CardVariant = "standard" | "highlighted" | "metric" | "route";

export function Card({
  variant = "standard",
  interactive = false,
  className,
  children,
}: {
  variant?: CardVariant;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface transition-all duration-200",
        variant === "standard" && "p-6",
        variant === "metric" && "p-5",
        variant === "route" && "p-5",
        variant === "highlighted" && "border-primary/45 bg-accent/40 p-5",
        interactive && "cursor-pointer hover:border-primary/35 hover:bg-surface-raised",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold tracking-[-0.01em]">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card variant="metric">
      <div className="flex items-start justify-between">
        <p className="label-caps">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="mt-6 text-4xl font-semibold tracking-[-0.05em]">{value}</p>
      {hint && <p className="mt-2 text-xs font-medium text-muted-foreground">{hint}</p>}
    </Card>
  );
}

/* ------------------------- Status indicator ------------------------ */

export type StatusTone = "active" | "warning" | "neutral" | "critical";

const statusStyles: Record<StatusTone, { wrap: string; dot: string }> = {
  active: { wrap: "border-primary/30 bg-accent text-accent-foreground", dot: "glow-dot bg-primary" },
  warning: { wrap: "border-warning/30 text-warning", dot: "bg-warning" },
  neutral: { wrap: "border-border text-muted-foreground", dot: "bg-muted-foreground" },
  critical: { wrap: "border-destructive/35 text-destructive", dot: "bg-destructive" },
};

export function Status({ tone = "active", children }: { tone?: StatusTone; children: ReactNode }) {
  const s = statusStyles[tone];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-2 rounded-full border px-2.5 text-[11px] font-medium tracking-[0.05em] uppercase",
        s.wrap,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {children}
    </span>
  );
}

/* ------------------------------ Inputs ----------------------------- */

const fieldBase =
  "h-11 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground transition-colors duration-200 placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:text-muted-foreground/50";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input className={cn(fieldBase, "bg-surface pl-10")} {...props} />
    </div>
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(fieldBase, "appearance-none bg-surface pr-10")} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function Chip({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "h-8 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
