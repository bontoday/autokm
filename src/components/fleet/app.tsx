import { useEffect } from "react";
import { ClipboardList, Droplets, LayoutDashboard, Truck } from "lucide-react";
import { formatTodayLabel } from "@/lib/fleet/format";
import { useFleet } from "@/lib/fleet/store";
import type { TabId } from "@/lib/fleet/types";
import { cn } from "@/components/fleet/bits";
import { Dashboard } from "@/components/fleet/dashboard";
import { MileageLog } from "@/components/fleet/mileage";
import { OilPanel } from "@/components/fleet/oil";
import { Units } from "@/components/fleet/units";
import { Login } from "./Login";
import { authClient } from "@/lib/auth/client";
import { SoatPanel } from "@/components/fleet/soat";
import { Shield } from "lucide-react"; // O usa FileText

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "tablero", label: "Tablero", icon: LayoutDashboard },
  { id: "km", label: "Km", icon: ClipboardList },
  { id: "aceite", label: "Aceite", icon: Droplets },
  { id: "soat", label: "SOAT", icon: Shield },
  { id: "unidades", label: "Unidades", icon: Truck },
];

export function App() {
  const { data: session, isPending } = authClient.useSession();
  
  const tab = useFleet((s) => s.tab);
  const setTab = useFleet((s) => s.setTab);
  const loadData = useFleet((s) => s.loadData);
  const initialized = useFleet((s) => s.initialized);

  // 1. Detectar si es Admin o Driver
  const userRole = (session?.user as any)?.role ?? "driver";
  
  // 2. Filtrar las pestañas
  const visibleTabs = userRole === "admin" 
    ? TABS 
    : TABS.filter(t => t.id === "km"); // El chofer solo ve "Km"

  // 3. Si el chofer entra y por error está en otra pestaña, forzarlo a Km
  useEffect(() => {
    if (session && userRole !== "admin" && tab !== "km") {
      setTab("km");
    }
  }, [session, userRole, tab, setTab]);

  useEffect(() => {
    if (session) loadData();
  }, [session, loadData]);

  if (isPending) return <div className="flex h-screen items-center justify-center font-medium">Verificando sesión...</div>;
  if (!session) return <Login />;
  if (!initialized) return <div className="flex h-screen items-center justify-center font-medium">Cargando datos...</div>;

  return (
    <div className="min-h-screen bg-bg text-ink md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Secciones">
          {visibleTabs.map((item) => (
            <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />
          ))}
        </nav>
        <div className="mt-auto">
          <button 
            onClick={async () => { await authClient.signOut(); window.location.reload(); }}
            className="text-xs text-muted hover:text-accent font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-8 md:pt-6">
          
          {/* AQUÍ ESTÁ EL BOTÓN PARA CELULAR */}
          <div className="flex items-center justify-between md:hidden">
            <Brand compact />
            <button 
              onClick={async () => { await authClient.signOut(); window.location.reload(); }}
              className="text-xs font-semibold text-muted hover:text-accent px-3 py-1.5 border border-line rounded-md"
            >
              Cerrar sesión
            </button>
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
          {tab === "soat" ? <SoatPanel /> : null} 
          {tab === "unidades" ? <Units /> : null}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface-2 pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Secciones"
      >
        <ul className={cn("grid", visibleTabs.length === 1 ? "grid-cols-1" : "grid-cols-5")}>
          {visibleTabs.map((item) => {
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
        L
      </div>
      <div>
        <p className="text-base leading-none font-semibold tracking-tight">Leo</p>
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