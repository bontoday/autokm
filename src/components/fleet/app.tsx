import { ClipboardList, Droplets, LayoutDashboard, Truck } from "lucide-react";
import { formatTodayLabel } from "@/lib/fleet/format";
import { useFleet } from "@/lib/fleet/store";
import type { TabId } from "@/lib/fleet/types";
import { cn } from "@/components/fleet/bits";
import { Dashboard } from "@/components/fleet/dashboard";
import { MileageLog } from "@/components/fleet/mileage";
import { OilPanel } from "@/components/fleet/oil";
import { Units } from "@/components/fleet/units";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "tablero", label: "Tablero", icon: LayoutDashboard },
  { id: "km", label: "Km", icon: ClipboardList },
  { id: "aceite", label: "Aceite", icon: Droplets },
  { id: "unidades", label: "Unidades", icon: Truck },
];

export function App() {
  const tab = useFleet((s) => s.tab);
  const setTab = useFleet((s) => s.setTab);

  return (
    <div className="min-h-screen bg-bg text-ink md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Secciones">
          {TABS.map((item) => (
            <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />
          ))}
        </nav>
        <p className="mt-auto text-xs text-pretty text-muted">
          Kilometraje, aceite por intervalo y KPIs de la flota. Los datos quedan en este navegador.
        </p>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-8 md:pt-6">
          <div className="md:hidden">
            <Brand compact />
          </div>
          <div className="hidden items-end justify-between md:flex">
            <div>
              <p className="font-mono text-xs tracking-widest text-primary uppercase">{formatTodayLabel()}</p>
              <h1 className="text-2xl font-semibold tracking-tight">{titleFor(tab)}</h1>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-28 md:px-8 md:pb-16">
          <h1 className="mb-4 text-xl font-semibold tracking-tight md:hidden">{titleFor(tab)}</h1>
          {tab === "tablero" ? <Dashboard /> : null}
          {tab === "km" ? <MileageLog /> : null}
          {tab === "aceite" ? <OilPanel /> : null}
          {tab === "unidades" ? <Units /> : null}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface-2 pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Secciones"
      >
        <ul className="grid grid-cols-4">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-md bg-primary font-mono text-base font-semibold text-primary-ink">
        A
      </div>
      <div>
        <p className="text-base leading-none font-semibold tracking-tight">Andén</p>
        <p className={cn("text-muted", compact ? "text-xs" : "mt-1 text-sm")}>Control de transporte</p>
      </div>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: (typeof TABS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-md px-3 text-sm font-medium",
        active ? "bg-primary text-primary-ink" : "text-ink hover:bg-surface-2",
      )}
    >
      <Icon className="size-4" />
      {item.label === "Km" ? "Kilometraje" : item.label}
    </button>
  );
}

function titleFor(tab: TabId) {
  if (tab === "tablero") return "Tablero de flota";
  if (tab === "km") return "Kilometraje";
  if (tab === "aceite") return "Aceite";
  return "Unidades";
}
