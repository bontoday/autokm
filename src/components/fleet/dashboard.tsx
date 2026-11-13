import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { differenceInDays, parseISO } from "date-fns";
import { ShieldAlert, ShieldCheck, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { formatKm, formatMoney, formatNumber, OIL_LABEL, PERIOD_LABEL } from "@/lib/fleet/format";
import { fleetMetrics } from "@/lib/fleet/metrics";
import { useFleet } from "@/lib/fleet/store";
import type { Period } from "@/lib/fleet/types";
import { cn, Panel, StatusPill } from "@/components/fleet/bits";

const PERIODS: Period[] = ["month", "30d", "all"];

export function Dashboard() {
  const vehicles = useFleet((s) => s.vehicles);
  const entries = useFleet((s) => s.entries);
  const oils = useFleet((s) => s.oils);
  const soats = useFleet((s) => s.soats);
  const drivers = useFleet((s) => s.drivers); // <-- Para el correo
  const openOilFor = useFleet((s) => s.openOilFor);
  
  const [period, setPeriod] = useState<Period>("month");
  const [chartsReady, setChartsReady] = useState(false);
  useEffect(() => setChartsReady(true), []);
  
  const metrics = useMemo(
    () => fleetMetrics(vehicles, entries, oils, period),
    [vehicles, entries, oils, period],
  );

  // LÓGICA DE ALERTAS DE SOAT
  const soatAlerts = useMemo(() => {
    return vehicles
      .filter((v) => v.active)
      .map((vehicle) => {
        const current = soats
          .filter((s) => s.vehicleId === vehicle.id)
          .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];

        if (!current) return { vehicle, status: "missing", days: 0, text: "Sin SOAT registrado", color: "bg-surface text-muted" };

        const daysLeft = differenceInDays(parseISO(current.endDate), new Date());

        if (daysLeft < 0) return { vehicle, status: "overdue", days: daysLeft, text: `Vencido hace ${Math.abs(daysLeft)} días`, color: "bg-accent/10 text-accent border border-accent/20" };
        if (daysLeft <= 15) return { vehicle, status: "critical", days: daysLeft, text: `¡Vence en ${daysLeft} días!`, color: "bg-accent/10 text-accent border border-accent/20" };
        if (daysLeft <= 30) return { vehicle, status: "warning", days: daysLeft, text: `Vence en ${daysLeft} días`, color: "bg-warn/10 text-warn border border-warn/20" };
        return { vehicle, status: "ok", days: daysLeft, text: `Vigente (${daysLeft} días)`, color: "bg-ok-bg text-primary" };
      })
      .sort((a, b) => a.days - b.days);
  }, [vehicles, soats]);

  // FUNCIÓN PARA EXPORTAR A EXCEL
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Helper para buscar la placa por ID
    const getPlate = (id: string) => vehicles.find(v => v.id === id)?.plate || "Desconocido";

    // 1. Hoja KM
    const kmData = entries.map(e => ({
      Fecha: e.date, Placa: getPlate(e.vehicleId), Odómetro: e.odometer,
      Recorrido: e.deltaKm, Ruta: e.route, Conductor: e.driver, Observaciones: e.notes
    }));
    if(kmData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kmData), "KM");

    // 2. Hoja Aceite
    const oilData = oils.map(o => ({
      Fecha: o.date, Placa: getPlate(o.vehicleId), Kilometraje: o.km,
      Costo: o.cost, Tipo: o.oilType, Taller: o.workshop, Notas: o.notes
    }));
    if(oilData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(oilData), "Aceite");

    // 3. Hoja SOAT
    const soatData = soats.map(s => ({
      Inicio: s.startDate, Vencimiento: s.endDate, Placa: getPlate(s.vehicleId),
      Aseguradora: s.company, Costo: s.cost, Notas: s.notes
    }));
    if(soatData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(soatData), "SOAT");

    // 4. Hoja Unidades
    const unitsData = vehicles.map(v => {
      const assigned = drivers.find(d => d.id === v.userId);
      return {
        Placa: v.plate, Alias: v.alias, Tipo: v.type, Conductor: v.driver,
        Cuenta_App: assigned ? assigned.email : "Sin asignar",
        Intervalo_Aceite: v.oilIntervalKm, Km_Inicial: v.openingKm,
        Estado: v.active ? "Activo" : "Inactivo"
      };
    });
    if(unitsData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unitsData), "Unidades");

    // Descargar archivo
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Bitacora_Anden_${dateStr}.xlsx`);
  };

  if (vehicles.filter((v) => v.active).length === 0) {
    return (
      <Panel>
        <h2 className="text-base font-semibold">Sin unidades activas</h2>
        <p className="mt-1 text-sm text-pretty text-muted">Da de alta una unidad o restaura el ejemplo para ver kilometraje, aceite y KPIs.</p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* CABECERA CON FILTROS Y BOTÓN DE EXCEL */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {PERIODS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={cn(
                "h-10 rounded-full px-3.5 text-sm font-medium",
                period === item ? "bg-ink text-surface-2" : "border border-line bg-surface-2 text-muted",
              )}
            >
              {PERIOD_LABEL[item]}
            </button>
          ))}
        </div>
        
        <button
          onClick={exportToExcel}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-ink hover:bg-primary/90 transition-colors"
        >
          <Download className="size-4" />
          Descargar Bitácora
        </button>
      </div>

      {metrics.alerts.length > 0 ? (
        <Panel className="border-accent/30 bg-danger-bg/50">
          <h2 className="text-sm font-semibold text-accent">Aceite por atender</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {metrics.alerts.map((alert) => (
              <li key={alert.vehicle.id}>
                <button type="button" onClick={() => openOilFor(alert.vehicle.id)} className="flex w-full items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-3 text-left">
                  <span>
                    <span className="block font-mono text-sm font-semibold">{alert.vehicle.plate}</span>
                    <span className="block text-sm text-muted">{alert.vehicle.alias}</span>
                  </span>
                  <span className="text-right">
                    <StatusPill status={alert.status} label={OIL_LABEL[alert.status]} />
                    <span className="mt-1 block text-xs text-muted">
                      {alert.status === "missing" ? "Sin cambio cargado" : alert.remaining <= 0 ? `Pasó ${formatKm(Math.abs(alert.remaining))}` : `Faltan ${formatKm(alert.remaining)}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <Panel className="bg-ok-bg">
          <p className="text-sm font-semibold text-primary">Flota al día con el aceite</p>
          <p className="mt-1 text-sm text-primary/80">Ninguna unidad activa está vencida ni por vencer.</p>
        </Panel>
      )}

      <Panel>
        <h2 className="text-sm font-semibold">Estado de SOAT</h2>
        <p className="mb-4 text-sm text-muted">Alertas de vencimiento de las unidades activas.</p>
        <ul className="flex flex-col divide-y divide-line">
          {soatAlerts.map(({ vehicle, status, text, color }) => (
            <li key={vehicle.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                {status === "overdue" || status === "critical" ? <ShieldAlert className="size-5 shrink-0 text-accent" /> : status === "warning" ? <ShieldAlert className="size-5 shrink-0 text-warn" /> : status === "missing" ? <ShieldAlert className="size-5 shrink-0 text-muted" /> : <ShieldCheck className="size-5 shrink-0 text-primary" />}
                <div>
                  <p className="font-mono text-sm font-semibold">{vehicle.plate}</p>
                  <p className="text-xs text-muted">{vehicle.alias}</p>
                </div>
              </div>
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md whitespace-nowrap", color)}>{text}</span>
            </li>
          ))}
          {soatAlerts.length === 0 && <p className="py-2 text-sm text-muted">No hay unidades activas.</p>}
        </ul>
      </Panel>

      {/* KPIs Y GRÁFICOS (Se mantienen igual) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Km recorridos" value={formatNumber(metrics.periodKm)} hint={PERIOD_LABEL[period]} />
        <Kpi label="Promedio / unidad" value={formatNumber(metrics.avgPerUnit)} hint="Solo unidades activas" />
        <Kpi label="Cumplimiento" value={`${Math.round(metrics.compliance * 100)}%`} hint={`${metrics.overdue} vencida${metrics.overdue === 1 ? "" : "s"} · ${metrics.soon} por vencer`} tone={metrics.overdue > 0 ? "bad" : "good"} />
        <Kpi label="Costo de aceite" value={formatMoney(metrics.oilCost)} hint={metrics.perThousand == null ? "Sin km en el periodo" : `${formatMoney(metrics.perThousand)} / 1.000 km`} />
      </div>

      {metrics.top ? (
        <p className="text-sm text-muted">
          Más recorrido: <span className="font-medium text-ink">{metrics.top.alias} ({metrics.top.plate})</span> con {formatKm(metrics.top.km)}.
        </p>
      ) : null}

      <Panel>
        <h2 className="text-sm font-semibold">Km por unidad</h2>
        <p className="mb-2 text-sm text-muted">{PERIOD_LABEL[period]}</p>
        {metrics.byVehicle.every((row) => row.km === 0) ? (
          <p className="py-8 text-sm text-muted">Todavía no hay recorridos en este periodo.</p>
        ) : chartsReady ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.byVehicle} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis hide />
                <Tooltip content={<ChartTip suffix=" km" />} cursor={{ fill: "var(--color-ok-bg)" }} />
                <Bar dataKey="km" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <BarFallback rows={metrics.byVehicle} />
        )}
      </Panel>

      <Panel>
        <h2 className="text-sm font-semibold">Últimas 8 semanas</h2>
        <p className="mb-2 text-sm text-muted">Kilómetros de la flota activa, de lunes a domingo.</p>
        {chartsReady ? (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.weeks} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<ChartTip suffix=" km" />} />
                <Area type="monotone" dataKey="km" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.18} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <BarFallback rows={metrics.weeks} />
        )}
      </Panel>

      <Panel>
        <h2 className="text-sm font-semibold">Intervalo de aceite</h2>
        <p className="mb-4 text-sm text-muted">Se vence al cumplir el intervalo de cada unidad. “Por vencer” avisa dentro del 15% o de los últimos 500 km.</p>
        <ul className="flex flex-col gap-4">
          {metrics.units.map((unit) => (
            <li key={unit.vehicle.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-mono text-sm font-semibold">{unit.vehicle.plate}</span>
                  <span className="ml-2 text-sm text-muted">{unit.vehicle.alias}</span>
                </span>
                <StatusPill status={unit.status} label={OIL_LABEL[unit.status]} />
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className={cn("h-full rounded-full", unit.status === "overdue" || unit.status === "missing" ? "bg-accent" : unit.status === "soon" ? "bg-warn" : "bg-primary")} style={{ width: `${Math.min(100, Math.max(4, unit.ratio * 100))}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted tabular-nums">
                {unit.status === "missing" ? "Registra el último cambio" : `${formatKm(unit.km)} · próximo a los ${formatNumber(unit.dueAt)} · cada ${formatNumber(unit.vehicle.oilIntervalKm)}`}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

// Helper components (BarFallback, Kpi, ChartTip) se mantienen exactamente igual...
function BarFallback({ rows }: { rows: { label: string; km: number }[] }) {
  const max = Math.max(...rows.map((row) => row.km), 1);
  return (
    <div className="flex h-56 items-end gap-2">
      {rows.map((row) => (
        <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-44 w-full items-end">
            <div className="w-full rounded-t-md bg-primary" style={{ height: `${Math.max(4, (row.km / max) * 100)}%` }} />
          </div>
          <span className="w-full truncate text-center text-xs text-muted">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function Kpi({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint: string; tone?: "neutral" | "good" | "bad" }) {
  return (
    <article className="rounded-lg border border-line bg-surface-2 p-3.5">
      <p className="text-sm text-muted">{label}</p>
      <p className={cn("mt-1 font-mono text-2xl font-medium tracking-tight tabular-nums", tone === "bad" ? "text-accent" : tone === "good" ? "text-primary" : "text-ink")}>{value}</p>
      <p className="mt-1 text-xs text-pretty text-muted">{hint}</p>
    </article>
  );
}

function ChartTip({ active, payload, label, suffix }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string; suffix: string }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className="rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-xs shadow-none">
      <p className="text-muted">{label}</p>
      <p className="font-mono font-medium tabular-nums">{formatNumber(value)}{suffix}</p>
    </div>
  );
}