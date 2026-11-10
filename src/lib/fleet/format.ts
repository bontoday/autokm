import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { OilChange, OilState, Period, Vehicle, VehicleType } from "@/lib/fleet/types";

export function formatNumber(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatKm(n: number): string {
  return `${formatNumber(n)} km`;
}

export function formatMoney(n: number): string {
  return `S/ ${formatNumber(n)}`;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

function limaISO(now = new Date()): string {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return formatted.slice(0, 10);
}

export function todayISO(now = new Date()): string {
  return limaISO(now);
}

export function daysAgo(n: number, now = new Date()): string {
  const [y, m, d] = limaISO(now).split("-").map(Number);
  const utc = new Date(Date.UTC(y || 1970, (m || 1) - 1, (d || 1) - n));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function formatDay(iso: string): string {
  return format(parseLocalDate(iso), "d MMM", { locale: es });
}

export function formatTodayLabel(now = new Date()): string {
  const iso = limaISO(now);
  const [y, m, d] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
  return `${WEEKDAYS[utc.getUTCDay()]} ${d} ${MONTHS[(m || 1) - 1]}`;
}

export function inPeriod(iso: string, period: Period, now = new Date()): boolean {
  if (period === "all") return true;
  const today = limaISO(now);
  if (iso > today) return false;
  if (period === "month") return iso.slice(0, 7) === today.slice(0, 7);
  return iso >= daysAgo(29, now);
}

export const TYPE_LABEL: Record<VehicleType, string> = {
  camion: "Camión",
  van: "Van",
  bus: "Bus",
  auto: "Auto",
  moto: "Moto",
};

export const PERIOD_LABEL: Record<Period, string> = {
  month: "Este mes",
  "30d": "30 días",
  all: "Todo",
};

export const OIL_LABEL: Record<OilState, string> = {
  ok: "Al día",
  soon: "Por vencer",
  overdue: "Vencido",
  missing: "Sin registro",
};

export function deltaMap(
  vehicles: { id: string; openingKm: number }[],
  entries: { id: string; vehicleId: string; odometer: number; date: string }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const vehicle of vehicles) {
    const mine = entries
      .filter((entry) => entry.vehicleId === vehicle.id)
      .sort((a, b) => a.odometer - b.odometer || a.date.localeCompare(b.date));
    let prev = vehicle.openingKm;
    for (const entry of mine) {
      map.set(entry.id, Math.max(0, entry.odometer - prev));
      if (entry.odometer > prev) prev = entry.odometer;
    }
  }
  return map;
}

export function currentKm(
  vehicle: Vehicle,
  entries: { vehicleId: string; odometer: number }[],
  oils: { vehicleId: string; km: number }[],
): number {
  let max = vehicle.openingKm;
  for (const entry of entries) {
    if (entry.vehicleId === vehicle.id && entry.odometer > max) max = entry.odometer;
  }
  for (const oil of oils) {
    if (oil.vehicleId === vehicle.id && oil.km > max) max = oil.km;
  }
  return max;
}

export function lastOil(vehicleId: string, oils: OilChange[]): OilChange | null {
  let best: OilChange | null = null;
  for (const oil of oils) {
    if (oil.vehicleId !== vehicleId) continue;
    if (!best || oil.km > best.km || (oil.km === best.km && oil.date > best.date)) best = oil;
  }
  return best;
}

export function oilSnapshot(vehicle: Vehicle, km: number, oils: OilChange[]) {
  const last = lastOil(vehicle.id, oils);
  if (!last || vehicle.oilIntervalKm <= 0) {
    return {
      status: "missing" as OilState,
      remaining: 0,
      dueAt: km,
      used: 0,
      ratio: 0,
      last,
    };
  }
  const dueAt = last.km + vehicle.oilIntervalKm;
  const remaining = dueAt - km;
  const used = Math.max(0, km - last.km);
  const ratio = used / vehicle.oilIntervalKm;
  const soonLimit = Math.max(500, vehicle.oilIntervalKm * 0.15);
  let status: OilState = "ok";
  if (remaining <= 0) status = "overdue";
  else if (remaining <= soonLimit) status = "soon";
  return { status, remaining, dueAt, used, ratio, last };
}
