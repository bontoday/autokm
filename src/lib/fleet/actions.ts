// src/lib/fleet/actions.ts
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSql } from "../db";
import { auth } from "../auth/server";
import type { MileageEntry, OilChange, Vehicle, User, SoatChange } from "./types";

const mapVehicle = (r: any): Vehicle => ({
  id: r.id, plate: r.plate, alias: r.alias, type: r.type,
  driver: r.driver, oilIntervalKm: r.oil_interval_km,
  openingKm: r.opening_km, active: r.active,
  userId: r.user_id, // <--- Mapeamos el nuevo campo
});
const mapEntry = (r: any): MileageEntry => ({
  id: r.id, vehicleId: r.vehicle_id, date: r.date,
  odometer: r.odometer, deltaKm: r.delta_km, route: r.route,
  driver: r.driver, notes: r.notes,
});
const mapSoat = (r: any): SoatChange => ({
  id: r.id, vehicleId: r.vehicle_id, startDate: r.start_date,
  endDate: r.end_date, company: r.company, cost: r.cost, notes: r.notes,
});
const mapOil = (r: any): OilChange => ({
  id: r.id, vehicleId: r.vehicle_id, date: r.date, km: r.km,
  cost: r.cost, oilType: r.oil_type, workshop: r.workshop, notes: r.notes,
});

// NUEVA FUNCIÓN: Traer todos los usuarios con rol 'driver'
export const getDriversDb = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql`select id, name, email, role from "user" where role = 'driver'`;
  return rows as User[];
});

export const getFleetData = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  
  if (!session) throw new Error("No autorizado");

  const userRole = (session.user as any).role;
  const userId = session.user.id;

  // Si es admin, ve TODO
  if (userRole === "admin") {
    const vRows = await sql`select * from vehicles order by created_at desc`;
    const eRows = await sql`select * from entries order by created_at desc`;
    const oRows = await sql`select * from oils order by created_at desc`;
    const sRows = await sql`select * from soats order by created_at desc`;
    return {
      vehicles: vRows.map(mapVehicle),
      entries: eRows.map(mapEntry),
      oils: oRows.map(mapOil),
      soats: sRows.map(mapSoat),
    };
  } 
  
  // Si es chofer, SOLO ve su vehículo y sus registros
  const vRows = await sql`select * from vehicles where user_id = ${userId}`;
  const vehicleIds = vRows.map((v: any) => v.id);
  
  if (vehicleIds.length === 0) {
    return { vehicles: [], entries: [], oils: [] }; // No tiene camión asignado
  }

  // Traemos los registros solo de su camión
  const eRows = await sql`select * from entries where vehicle_id = ANY(${vehicleIds}) order by created_at desc`;
  const oRows = await sql`select * from oils where vehicle_id = ANY(${vehicleIds}) order by created_at desc`;
  const sRows = await sql`select * from soats order by created_at desc`;
  return {
    vehicles: vRows.map(mapVehicle),
    entries: eRows.map(mapEntry),
    oils: oRows.map(mapOil),
    soats: sRows.map(mapSoat),
  };
});

export const saveVehicleDb = createServerFn({ method: "POST" })
  .handler(async (ctx) => {
    const { vehicle, oil } = ctx.data as { vehicle: Vehicle; oil: OilChange };
    const sql = await getSql();
    await sql`insert into vehicles (id, plate, alias, type, driver, oil_interval_km, opening_km, active, user_id) 
              values (${vehicle.id}, ${vehicle.plate}, ${vehicle.alias}, ${vehicle.type}, ${vehicle.driver}, ${vehicle.oilIntervalKm}, ${vehicle.openingKm}, ${vehicle.active}, ${vehicle.userId || null})`;
    await sql`insert into oils (id, vehicle_id, date, km, cost, oil_type, workshop, notes) 
              values (${oil.id}, ${oil.vehicleId}, ${oil.date}, ${oil.km}, ${oil.cost}, ${oil.oilType}, ${oil.workshop}, ${oil.notes})`;
    return { success: true };
  });

export const updateVehicleDb = createServerFn({ method: "POST" })
  .handler(async (ctx) => {
    const { id, vehicle } = ctx.data as { id: string; vehicle: Vehicle };
    const sql = await getSql();
    await sql`update vehicles set plate = ${vehicle.plate}, alias = ${vehicle.alias}, type = ${vehicle.type}, 
              driver = ${vehicle.driver}, oil_interval_km = ${vehicle.oilIntervalKm}, opening_km = ${vehicle.openingKm}, 
              active = ${vehicle.active}, user_id = ${vehicle.userId || null} 
              where id = ${id}`;
    return { success: true };
  });

// ... (Deja las demás funciones: removeVehicleDb, saveEntryDb, removeEntryDb, saveOilDb, removeOilDb exactamente igual que antes)
export const removeVehicleDb = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const id = ctx.data as string; const sql = await getSql(); await sql`delete from vehicles where id = ${id}`; return { success: true };
});
export const saveEntryDb = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const data = ctx.data as MileageEntry; const sql = await getSql(); await sql`insert into entries (id, vehicle_id, date, odometer, delta_km, route, driver, notes) values (${data.id}, ${data.vehicleId}, ${data.date}, ${data.odometer}, ${data.deltaKm}, ${data.route}, ${data.driver}, ${data.notes})`; return { success: true };
});
export const removeEntryDb = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const id = ctx.data as string; const sql = await getSql(); await sql`delete from entries where id = ${id}`; return { success: true };
});
export const saveOilDb = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const { oil, extraEntry } = ctx.data as { oil: OilChange; extraEntry?: MileageEntry | null }; const sql = await getSql(); await sql`insert into oils (id, vehicle_id, date, km, cost, oil_type, workshop, notes) values (${oil.id}, ${oil.vehicleId}, ${oil.date}, ${oil.km}, ${oil.cost}, ${oil.oilType}, ${oil.workshop}, ${oil.notes})`; if (extraEntry) { await sql`insert into entries (id, vehicle_id, date, odometer, delta_km, route, driver, notes) values (${extraEntry.id}, ${extraEntry.vehicleId}, ${extraEntry.date}, ${extraEntry.odometer}, ${extraEntry.deltaKm}, ${extraEntry.route}, ${extraEntry.driver}, ${extraEntry.notes})`; } return { success: true };
});
export const removeOilDb = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const id = ctx.data as string; const sql = await getSql(); await sql`delete from oils where id = ${id}`; return { success: true };
});
export const saveSoatDb = createServerFn({ method: "POST" })
  .handler(async (ctx) => {
    const data = ctx.data as SoatChange;
    const sql = await getSql();
    await sql`insert into soats (id, vehicle_id, start_date, end_date, company, cost, notes) 
              values (${data.id}, ${data.vehicleId}, ${data.startDate}, ${data.endDate}, ${data.company}, ${data.cost}, ${data.notes})`;
    return { success: true };
  });

export const removeSoatDb = createServerFn({ method: "POST" })
  .handler(async (ctx) => {
    const id = ctx.data as string;
    const sql = await getSql();
    await sql`delete from soats where id = ${id}`;
    return { success: true };
  });