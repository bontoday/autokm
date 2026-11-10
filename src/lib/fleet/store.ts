import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSeed } from "@/lib/fleet/seed";
import { currentKm, formatKm, lastOil } from "@/lib/fleet/format";
import type { MileageEntry, OilChange, TabId, Vehicle, VehicleType } from "@/lib/fleet/types";

export type VehicleInput = {
  plate: string;
  alias: string;
  type: VehicleType;
  driver: string;
  oilIntervalKm: number;
  openingKm: number;
  active: boolean;
  lastOilKm: number;
  lastOilDate: string;
};

export type MileageInput = {
  vehicleId: string;
  date: string;
  odometer: number;
  route: string;
  driver: string;
  notes: string;
};

export type OilInput = {
  vehicleId: string;
  date: string;
  km: number;
  cost: number;
  oilType: string;
  workshop: string;
  notes: string;
};

type FleetState = {
  initialized: boolean;
  tab: TabId;
  focusVehicleId: string | null;
  vehicles: Vehicle[];
  entries: MileageEntry[];
  oils: OilChange[];
  setTab: (tab: TabId) => void;
  openOilFor: (vehicleId: string) => void;
  clearFocus: () => void;
  addVehicle: (input: VehicleInput) => string;
  updateVehicle: (id: string, input: VehicleInput) => string;
  removeVehicle: (id: string) => void;
  addEntry: (input: MileageInput) => string;
  removeEntry: (id: string) => void;
  addOil: (input: OilInput) => string;
  removeOil: (id: string) => void;
  loadDemo: () => void;
  clearAll: () => void;
};

function plateOf(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").trim();
}

function vehicleError(input: VehicleInput, vehicles: Vehicle[], ignoreId?: string, withOil = true): string {
  const plate = plateOf(input.plate);
  if (plate.length < 5) return "La placa necesita al menos 5 caracteres.";
  if (vehicles.some((v) => v.id !== ignoreId && v.plate === plate)) return "Esa placa ya está registrada.";
  if (input.alias.trim().length < 2) return "Ponle un alias a la unidad.";
  if (input.driver.trim().length < 2) return "Indica el conductor habitual.";
  if (!Number.isFinite(input.oilIntervalKm) || input.oilIntervalKm < 500) {
    return "El intervalo de aceite debe ser de al menos 500 km.";
  }
  if (!Number.isFinite(input.openingKm) || input.openingKm < 0) return "El kilometraje inicial no es válido.";
  if (!withOil) return "";
  if (!Number.isFinite(input.lastOilKm) || input.lastOilKm < 0) return "El km del último aceite no es válido.";
  if (!input.lastOilDate) return "Indica la fecha del último cambio de aceite.";
  if (input.lastOilKm > input.openingKm) {
    return "El último aceite no puede estar por encima del kilometraje inicial.";
  }
  return "";
}

const demo = createSeed();

export const useFleet = create<FleetState>()(
  persist(
    (set, get) => ({
      initialized: true,
      tab: "tablero",
      focusVehicleId: null,
      vehicles: demo.vehicles,
      entries: demo.entries,
      oils: demo.oils,
      setTab: (tab) => set({ tab }),
      openOilFor: (vehicleId) => set({ tab: "aceite", focusVehicleId: vehicleId }),
      clearFocus: () => set({ focusVehicleId: null }),
      addVehicle: (input) => {
        const error = vehicleError(input, get().vehicles);
        if (error) return error;
        const id = crypto.randomUUID();
        const vehicle: Vehicle = {
          id,
          plate: plateOf(input.plate),
          alias: input.alias.trim(),
          type: input.type,
          driver: input.driver.trim(),
          oilIntervalKm: Math.round(input.oilIntervalKm),
          openingKm: Math.round(input.openingKm),
          active: input.active,
        };
        const oil: OilChange = {
          id: crypto.randomUUID(),
          vehicleId: id,
          date: input.lastOilDate,
          km: Math.round(input.lastOilKm),
          cost: 0,
          oilType: "Registro inicial",
          workshop: "Registro inicial",
          notes: "Cargado al dar de alta la unidad",
        };
        set((s) => ({ vehicles: [vehicle, ...s.vehicles], oils: [oil, ...s.oils] }));
        return "";
      },
      updateVehicle: (id, input) => {
        const current = get().vehicles.find((v) => v.id === id);
        if (!current) return "No se encontró la unidad.";
        const error = vehicleError(input, get().vehicles, id, false);
        if (error) return error;
        const opening = Math.round(input.openingKm);
        const live = currentKm(current, get().entries, get().oils);
        if (opening > live) {
          return `El km inicial no puede superar la lectura actual (${formatKm(live)}). Para subir el odómetro, registra una lectura.`;
        }
        set((s) => ({
          vehicles: s.vehicles.map((v) =>
            v.id === id
              ? {
                  ...v,
                  plate: plateOf(input.plate),
                  alias: input.alias.trim(),
                  type: input.type,
                  driver: input.driver.trim(),
                  oilIntervalKm: Math.round(input.oilIntervalKm),
                  openingKm: opening,
                  active: input.active,
                }
              : v,
          ),
        }));
        return "";
      },
      removeVehicle: (id) =>
        set((s) => ({
          vehicles: s.vehicles.filter((v) => v.id !== id),
          entries: s.entries.filter((e) => e.vehicleId !== id),
          oils: s.oils.filter((o) => o.vehicleId !== id),
          focusVehicleId: s.focusVehicleId === id ? null : s.focusVehicleId,
        })),
      addEntry: (input) => {
        const vehicle = get().vehicles.find((v) => v.id === input.vehicleId);
        if (!vehicle) return "Elige una unidad.";
        if (!input.date) return "Indica la fecha.";
        if (!Number.isFinite(input.odometer)) return "La lectura del odómetro no es válida.";
        const odometer = Math.round(input.odometer);
        const reading = currentKm(vehicle, get().entries, get().oils);
        if (odometer <= reading) {
          return `La lectura debe ser mayor a ${formatKm(reading)}.`;
        }
        const route = input.route.trim();
        if (route.length < 2) return "Indica la ruta o el destino.";
        const entry: MileageEntry = {
          id: crypto.randomUUID(),
          vehicleId: vehicle.id,
          date: input.date,
          odometer,
          deltaKm: odometer - reading,
          route,
          driver: input.driver.trim() || vehicle.driver,
          notes: input.notes.trim(),
        };
        set((s) => ({ entries: [entry, ...s.entries] }));
        return "";
      },
      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      addOil: (input) => {
        const vehicle = get().vehicles.find((v) => v.id === input.vehicleId);
        if (!vehicle) return "Elige una unidad.";
        if (!input.date) return "Indica la fecha.";
        if (!Number.isFinite(input.km)) return "El kilometraje del cambio no es válido.";
        const km = Math.round(input.km);
        const previous = lastOil(vehicle.id, get().oils);
        if (previous && km < previous.km) {
          return `El cambio debe ser desde ${formatKm(previous.km)} (último registrado).`;
        }
        if (!Number.isFinite(input.cost) || input.cost < 0) return "El costo no es válido.";
        if (input.oilType.trim().length < 2) return "Indica el tipo de aceite.";
        const reading = currentKm(vehicle, get().entries, get().oils);
        const extra: MileageEntry | null =
          km > reading
            ? {
                id: crypto.randomUUID(),
                vehicleId: vehicle.id,
                date: input.date,
                odometer: km,
                deltaKm: km - reading,
                route: "Lectura en cambio de aceite",
                driver: vehicle.driver,
                notes: input.workshop.trim(),
              }
            : null;
        const oil: OilChange = {
          id: crypto.randomUUID(),
          vehicleId: vehicle.id,
          date: input.date,
          km,
          cost: Math.round(input.cost),
          oilType: input.oilType.trim(),
          workshop: input.workshop.trim(),
          notes: input.notes.trim(),
        };
        set((s) => ({
          oils: [oil, ...s.oils],
          entries: extra ? [extra, ...s.entries] : s.entries,
        }));
        return "";
      },
      removeOil: (id) => set((s) => ({ oils: s.oils.filter((o) => o.id !== id) })),
      loadDemo: () => {
        const demo = createSeed();
        set({ ...demo, initialized: true, tab: "tablero", focusVehicleId: null });
      },
      clearAll: () => set({ vehicles: [], entries: [], oils: [], initialized: true, focusVehicleId: null }),
    }),
    {
      name: "anden-flota-v1",
      partialize: (s) => ({
        initialized: s.initialized,
        tab: s.tab,
        vehicles: s.vehicles,
        entries: s.entries,
        oils: s.oils,
      }),
    },
  ),
);
