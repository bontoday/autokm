import {
  currentKm,
  deltaMap,
  formatDay,
  inPeriod,
  oilSnapshot,
  todayISO,
} from "@/lib/fleet/format";
import type { MileageEntry, OilChange, OilState, Period, Vehicle } from "@/lib/fleet/types";

export type UnitStatus = {
  vehicle: Vehicle;
  km: number;
  periodKm: number;
  status: OilState;
  remaining: number;
  dueAt: number;
  ratio: number;
};

export type FleetMetrics = {
  periodKm: number;
  avgPerUnit: number;
  compliance: number;
  overdue: number;
  soon: number;
  missing: number;
  oilCost: number;
  perThousand: number | null;
  top: { alias: string; plate: string; km: number } | null;
  units: UnitStatus[];
  byVehicle: { label: string; km: number }[];
  weeks: { label: string; km: number }[];
  alerts: UnitStatus[];
};

export function fleetMetrics(
  vehicles: Vehicle[],
  entries: MileageEntry[],
  oils: OilChange[],
  period: Period,
  now = new Date(),
): FleetMetrics {
  const active = vehicles.filter((v) => v.active);
  const activeIds = new Set(active.map((v) => v.id));
  const deltas = deltaMap(vehicles, entries);

  const periodByVehicle = new Map<string, number>();
  let periodKm = 0;
  for (const entry of entries) {
    if (!inPeriod(entry.date, period, now)) continue;
    if (!activeIds.has(entry.vehicleId)) continue;
    const delta = deltas.get(entry.id) ?? 0;
    periodKm += delta;
    periodByVehicle.set(entry.vehicleId, (periodByVehicle.get(entry.vehicleId) ?? 0) + delta);
  }

  const units: UnitStatus[] = active
    .map((vehicle) => {
      const km = currentKm(vehicle, entries, oils);
      const oil = oilSnapshot(vehicle, km, oils);
      return {
        vehicle,
        km,
        periodKm: periodByVehicle.get(vehicle.id) ?? 0,
        status: oil.status,
        remaining: oil.remaining,
        dueAt: oil.dueAt,
        ratio: oil.ratio,
      };
    })
    .sort((a, b) => b.periodKm - a.periodKm);

  const overdue = units.filter((u) => u.status === "overdue").length;
  const soon = units.filter((u) => u.status === "soon").length;
  const missing = units.filter((u) => u.status === "missing").length;
  const compliance = active.length === 0 ? 0 : (active.length - overdue - missing) / active.length;

  let oilCost = 0;
  for (const oil of oils) {
    if (!inPeriod(oil.date, period, now)) continue;
    if (!activeIds.has(oil.vehicleId)) continue;
    oilCost += oil.cost;
  }

  const topUnit = units[0];
  const top =
    topUnit && topUnit.periodKm > 0
      ? { alias: topUnit.vehicle.alias, plate: topUnit.vehicle.plate, km: topUnit.periodKm }
      : null;

  const weeks = buildWeeks(entries, activeIds, deltas, now);

  const rank: Record<OilState, number> = { overdue: 0, missing: 1, soon: 2, ok: 3 };
  const alerts = units
    .filter((u) => u.status !== "ok")
    .sort((a, b) => rank[a.status] - rank[b.status] || a.remaining - b.remaining);

  return {
    periodKm,
    avgPerUnit: active.length ? periodKm / active.length : 0,
    compliance,
    overdue,
    soon,
    missing,
    oilCost,
    perThousand: periodKm > 0 ? oilCost / (periodKm / 1000) : null,
    top,
    units,
    byVehicle: units.map((u) => ({ label: u.vehicle.plate, km: u.periodKm })),
    weeks,
    alerts,
  };
}

function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(y || 1970, (m || 1) - 1, (d || 1) + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function mondayISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
  const day = utc.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return shiftISO(iso, -diff);
}

function buildWeeks(
  entries: MileageEntry[],
  activeIds: Set<string>,
  deltas: Map<string, number>,
  now: Date,
) {
  const start = shiftISO(mondayISO(todayISO(now)), -7 * 7);
  const buckets = Array.from({ length: 8 }, (_, i) => {
    const from = shiftISO(start, i * 7);
    return { from, km: 0, label: formatDay(from) };
  });
  for (const entry of entries) {
    if (!activeIds.has(entry.vehicleId)) continue;
    for (let i = 0; i < buckets.length; i++) {
      const from = buckets[i].from;
      const to = i < buckets.length - 1 ? buckets[i + 1].from : shiftISO(from, 7);
      if (entry.date >= from && entry.date < to) {
        buckets[i].km += deltas.get(entry.id) ?? 0;
        break;
      }
    }
  }
  return buckets.map(({ label, km }) => ({ label, km }));
}
