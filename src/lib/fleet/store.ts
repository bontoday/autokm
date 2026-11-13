// src/lib/fleet/store.ts
import { create } from "zustand";
import { currentKm, formatKm, lastOil } from "@/lib/fleet/format";
import type { MileageEntry, OilChange, TabId, Vehicle, VehicleType, User, SoatChange } from "@/lib/fleet/types"; // <-- Agregado User
import { 
  saveVehicleDb, 
  updateVehicleDb, 
  removeVehicleDb, 
  saveEntryDb, 
  removeEntryDb, 
  saveOilDb, 
  removeOilDb, 
  getFleetData,
  getDriversDb, 
  saveSoatDb, 
  removeSoatDb
} from "./actions";

export type VehicleInput = {
  plate: string; alias: string; type: VehicleType; driver: string;
  oilIntervalKm: number; openingKm: number; active: boolean; lastOilKm: number; userId?: string | null; lastOilDate: string;
};

export type MileageInput = {
  vehicleId: string; date: string; odometer: number; route: string; driver: string; notes: string;
};

export type OilInput = {
  vehicleId: string; date: string; km: number; cost: number; oilType: string; workshop: string; notes: string;
};
export type SoatInput = {
  vehicleId: string; startDate: string; endDate: string; company: string; cost: number; notes: string;
};

type FleetState = {
  initialized: boolean;
  tab: TabId;
  focusVehicleId: string | null;
  vehicles: Vehicle[];
  entries: MileageEntry[];
  oils: OilChange[];
  drivers: User[]; // <-- Agregado
  setTab: (tab: TabId) => void;
  openOilFor: (vehicleId: string) => void;
  clearFocus: () => void;
  loadData: () => Promise<void>;
  loadDrivers: () => Promise<void>; // <-- Agregado
  addVehicle: (input: VehicleInput) => Promise<string>;
  updateVehicle: (id: string, input: VehicleInput) => Promise<string>;
  removeVehicle: (id: string) => Promise<void>;
  addEntry: (input: MileageInput) => Promise<string>;
  removeEntry: (id: string) => Promise<void>;
  addOil: (input: OilInput) => Promise<string>;
  removeOil: (id: string) => Promise<void>;
  loadDemo: () => void;
  clearAll: () => void;
  soats: SoatChange[]; // <-- AGREGAR
  addSoat: (input: SoatInput) => Promise<string>; // <-- AGREGAR
  removeSoat: (id: string) => Promise<void>; // <-- AGREGAR
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
  if (!Number.isFinite(input.oilIntervalKm) || input.oilIntervalKm < 500) return "El intervalo de aceite debe ser de al menos 500 km.";
  if (!Number.isFinite(input.openingKm) || input.openingKm < 0) return "El kilometraje inicial no es válido.";
  if (!withOil) return "";
  if (!Number.isFinite(input.lastOilKm) || input.lastOilKm < 0) return "El km del último aceite no es válido.";
  if (!input.lastOilDate) return "Indica la fecha del último cambio de aceite.";
  if (input.lastOilKm > input.openingKm) return "El último aceite no puede estar por encima del kilometraje inicial.";
  return "";
}

export const useFleet = create<FleetState>()((set, get) => ({
  initialized: false,
  tab: "tablero",
  focusVehicleId: null,
  vehicles: [],
  entries: [],
  oils: [],
  drivers: [], // <-- Inicializado vacío
  soats: [],
  
  setTab: (tab) => set({ tab }),
  openOilFor: (vehicleId) => set({ tab: "aceite", focusVehicleId: vehicleId }),
  clearFocus: () => set({ focusVehicleId: null }),
  
  loadData: async () => {
    try {
      const data = await getFleetData();
      set({ vehicles: data.vehicles, entries: data.entries, oils: data.oils, soats: (data as any).soats || [], initialized: true });
    } catch (e) {
      console.error(e);
      set({ initialized: true });
    }
  },

  loadDrivers: async () => { // <-- Nueva función
    try {
      const data = await getDriversDb();
      set({ drivers: data });
    } catch (e) {
      console.error("Error cargando choferes", e);
    }
  },

  addVehicle: async (input) => {
    const error = vehicleError(input, get().vehicles);
    if (error) return error;
    const id = crypto.randomUUID();
    
    // Agregamos userId al vehículo
    const vehicle: Vehicle = { 
      id, 
      plate: plateOf(input.plate), 
      alias: input.alias.trim(), 
      type: input.type, 
      driver: input.driver.trim(), 
      oilIntervalKm: Math.round(input.oilIntervalKm), 
      openingKm: Math.round(input.openingKm), 
      active: input.active,
      userId: input.userId || null // <-- ASIGNACIÓN
    };
    
    const oil: OilChange = { id: crypto.randomUUID(), vehicleId: id, date: input.lastOilDate, km: Math.round(input.lastOilKm), cost: 0, oilType: "Registro inicial", workshop: "Registro inicial", notes: "Cargado al dar de alta la unidad" };
    
    await saveVehicleDb({ data: { vehicle, oil } });
    set((s) => ({ vehicles: [vehicle, ...s.vehicles], oils: [oil, ...s.oils] }));
    return "";
  },

  updateVehicle: async (id, input) => {
    const current = get().vehicles.find((v) => v.id === id);
    if (!current) return "No se encontró la unidad.";
    const error = vehicleError(input, get().vehicles, id, false);
    if (error) return error;
    const opening = Math.round(input.openingKm);
    const live = currentKm(current, get().entries, get().oils);
    if (opening > live) return `El km inicial no puede superar la lectura actual (${formatKm(live)}).`;
    
    // Actualizamos userId
    const updatedVehicle: Vehicle = { 
      ...current, 
      plate: plateOf(input.plate), 
      alias: input.alias.trim(), 
      type: input.type, 
      driver: input.driver.trim(), 
      oilIntervalKm: Math.round(input.oilIntervalKm), 
      openingKm: opening, 
      active: input.active,
      userId: input.userId || null // <-- ASIGNACIÓN
    };
    
    await updateVehicleDb({ data: { id, vehicle: updatedVehicle } });
    set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? updatedVehicle : v)) }));
    return "";
  },

  removeVehicle: async (id) => {
    await removeVehicleDb({ data: id });
    set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id), entries: s.entries.filter((e) => e.vehicleId !== id), oils: s.oils.filter((o) => o.vehicleId !== id), focusVehicleId: s.focusVehicleId === id ? null : s.focusVehicleId }));
  },

  addEntry: async (input) => {
    const vehicle = get().vehicles.find((v) => v.id === input.vehicleId);
    if (!vehicle) return "Elige una unidad.";
    if (!input.date) return "Indica la fecha.";
    if (!Number.isFinite(input.odometer)) return "La lectura del odómetro no es válida.";
    const odometer = Math.round(input.odometer);
    const reading = currentKm(vehicle, get().entries, get().oils);
    if (odometer <= reading) return `La lectura debe ser mayor a ${formatKm(reading)}.`;
    
    const route = input.route.trim();
    if (route.length < 2) return "Indica la ruta o el destino.";
    const entry: MileageEntry = { id: crypto.randomUUID(), vehicleId: vehicle.id, date: input.date, odometer, deltaKm: odometer - reading, route, driver: input.driver.trim() || vehicle.driver, notes: input.notes.trim() };
    
    await saveEntryDb({ data: entry });
    set((s) => ({ entries: [entry, ...s.entries] }));
    return "";
  },

  removeEntry: async (id) => {
    await removeEntryDb({ data: id });
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },

  addOil: async (input) => {
    const vehicle = get().vehicles.find((v) => v.id === input.vehicleId);
    if (!vehicle) return "Elige una unidad.";
    if (!input.date) return "Indica la fecha.";
    if (!Number.isFinite(input.km)) return "El kilometraje del cambio no es válido.";
    const km = Math.round(input.km);
    const previous = lastOil(vehicle.id, get().oils);
    if (previous && km < previous.km) return `El cambio debe ser desde ${formatKm(previous.km)} (último registrado).`;
    if (!Number.isFinite(input.cost) || input.cost < 0) return "El costo no es válido.";
    if (input.oilType.trim().length < 2) return "Indica el tipo de aceite.";
    
    const reading = currentKm(vehicle, get().entries, get().oils);
    const extra: MileageEntry | null = km > reading ? { id: crypto.randomUUID(), vehicleId: vehicle.id, date: input.date, odometer: km, deltaKm: km - reading, route: "Lectura en cambio de aceite", driver: vehicle.driver, notes: input.workshop.trim() } : null;
    const oil: OilChange = { id: crypto.randomUUID(), vehicleId: vehicle.id, date: input.date, km, cost: Math.round(input.cost), oilType: input.oilType.trim(), workshop: input.workshop.trim(), notes: input.notes.trim() };
    
    await saveOilDb({ data: { oil, extraEntry: extra } });
    set((s) => ({ oils: [oil, ...s.oils], entries: extra ? [extra, ...s.entries] : s.entries }));
    return "";
  },
  addSoat: async (input) => {
    const vehicle = get().vehicles.find((v) => v.id === input.vehicleId);
    if (!vehicle) return "Elige una unidad.";
    if (!input.startDate || !input.endDate) return "Indica las fechas de vigencia.";
    if (input.company.trim().length < 2) return "Indica la aseguradora.";
    
    const soat: SoatChange = {
      id: crypto.randomUUID(),
      vehicleId: vehicle.id,
      startDate: input.startDate,
      endDate: input.endDate,
      company: input.company.trim(),
      cost: Math.round(input.cost),
      notes: input.notes.trim(),
    };
    
    await saveSoatDb({ data: soat });
    set((s) => ({ soats: [soat, ...s.soats] }));
    return "";
  },

  removeSoat: async (id) => {
    await removeSoatDb({ data: id });
    set((s) => ({ soats: s.soats.filter((o) => o.id !== id) }));
  },

  removeOil: async (id) => {
    await removeOilDb({ data: id });
    set((s) => ({ oils: s.oils.filter((o) => o.id !== id) }));
  },
  
  loadDemo: () => {
    console.warn("Demo no disponible en la nube.");
  },
  clearAll: () => set({ vehicles: [], entries: [], oils: [], initialized: true, focusVehicleId: null }),
}));