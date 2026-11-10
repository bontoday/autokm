import type { ReactNode } from "react";
import type { OilState } from "@/lib/fleet/types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const controlClass =
  "h-12 w-full rounded-md border border-line bg-surface-2 px-3 text-base text-ink outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

export function ErrorNote({ children }: { children: string }) {
  return (
    <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-accent">
      {children}
    </p>
  );
}

export function PrimaryButton({
  children,
  type = "button",
  onClick,
  disabled,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-base font-semibold text-primary-ink transition active:scale-[0.99] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-md border px-3 text-sm font-medium transition",
        danger ? "border-accent/30 bg-danger-bg text-accent" : "border-line bg-surface-2 text-ink",
      )}
    >
      {children}
    </button>
  );
}

const PILL: Record<OilState, string> = {
  ok: "bg-ok-bg text-primary",
  soon: "bg-warn-bg text-warn",
  overdue: "bg-danger-bg text-accent",
  missing: "bg-surface text-muted",
};

export function StatusPill({ status, label }: { status: OilState; label: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold", PILL[status])}>
      {label}
    </span>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-line bg-surface-2 p-4", className)}>{children}</section>
  );
}

export function SectionTitle({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return (
    <header className="mb-4">
      {eyebrow ? (
        <p className="font-mono text-xs font-medium tracking-widest text-primary uppercase">{eyebrow}</p>
      ) : null}
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{title}</h2>
      {detail ? <p className="mt-1 text-sm text-pretty text-muted">{detail}</p> : null}
    </header>
  );
}
