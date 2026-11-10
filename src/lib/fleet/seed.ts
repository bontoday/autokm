import { daysAgo } from "@/lib/fleet/format";
import type { MileageEntry, OilChange, Vehicle, VehicleType } from "@/lib/fleet/types";

type Trip = { kind: "trip"; daysAgo: number; delta: number; route: string; notes?: string };
type Oil = {
  kind: "oil";
  daysAgo: number;
  cost: number;
  oilType: string;
  workshop: string;
  notes?: string;
};

type Spec = {
  id: string;
  plate: string;
  alias: string;
  type: VehicleType;
  driver: string;
  oilIntervalKm: number;
  openingKm: number;
  events: Array<Trip | Oil>;
};

function build(spec: Spec, now = new Date()) {
  let km = spec.openingKm;
  const entries: MileageEntry[] = [];
  const oils: OilChange[] = [];
  spec.events.forEach((event, index) => {
    if (event.kind === "trip") {
      km += event.delta;
      entries.push({
        id: `${spec.id}-t${index}`,
        vehicleId: spec.id,
        date: daysAgo(event.daysAgo, now),
        odometer: km,
        deltaKm: event.delta,
        route: event.route,
        driver: spec.driver,
        notes: event.notes ?? "",
      });
      return;
    }
    oils.push({
      id: `${spec.id}-o${index}`,
      vehicleId: spec.id,
      date: daysAgo(event.daysAgo, now),
      km,
      cost: event.cost,
      oilType: event.oilType,
      workshop: event.workshop,
      notes: event.notes ?? "",
    });
  });
  const vehicle: Vehicle = {
    id: spec.id,
    plate: spec.plate,
    alias: spec.alias,
    type: spec.type,
    driver: spec.driver,
    oilIntervalKm: spec.oilIntervalKm,
    openingKm: spec.openingKm,
    active: true,
  };
  return { vehicle, entries, oils };
}

const SPECS: Spec[] = [
  {
    id: "v-ate",
    plate: "ABC-412",
    alias: "Ruta Ate",
    type: "camion",
    driver: "Luis Quispe",
    oilIntervalKm: 5000,
    openingKm: 171400,
    events: [
      { kind: "oil", daysAgo: 48, cost: 380, oilType: "15W-40", workshop: "Taller San Luis" },
      { kind: "trip", daysAgo: 40, delta: 780, route: "Lima – Huacho" },
      { kind: "trip", daysAgo: 33, delta: 910, route: "CD Ate – Mega Plaza" },
      { kind: "trip", daysAgo: 26, delta: 640, route: "Lima – Cañete", notes: "Retorno con carga parcial" },
      { kind: "trip", daysAgo: 19, delta: 860, route: "Ate – Callao" },
      { kind: "trip", daysAgo: 12, delta: 720, route: "Ruta norte – Ancón" },
      { kind: "trip", daysAgo: 8, delta: 800, route: "Ate – Santa Anita" },
      { kind: "trip", daysAgo: 5, delta: 690, route: "Reparto diurno – SJL" },
      { kind: "trip", daysAgo: 1, delta: 540, route: "Reparto nocturno – La Victoria" },
    ],
  },
  {
    id: "v-centro",
    plate: "B7K-208",
    alias: "Reparto Centro",
    type: "van",
    driver: "Rosa Huamán",
    oilIntervalKm: 8000,
    openingKm: 47800,
    events: [
      { kind: "oil", daysAgo: 40, cost: 210, oilType: "10W-40", workshop: "Lubricentro Breña" },
      { kind: "trip", daysAgo: 26, delta: 900, route: "Miraflores – San Isidro" },
      { kind: "trip", daysAgo: 20, delta: 1100, route: "Centro – Magdalena" },
      { kind: "trip", daysAgo: 14, delta: 980, route: "Breña – Pueblo Libre" },
      { kind: "trip", daysAgo: 9, delta: 860, route: "Cercado – Rímac" },
      { kind: "trip", daysAgo: 4, delta: 1240, route: "Reparto express – Surquillo" },
      { kind: "trip", daysAgo: 2, delta: 1020, route: "Centro – Barranco" },
      { kind: "trip", daysAgo: 1, delta: 1000, route: "Última milla – Lince" },
    ],
  },
  {
    id: "v-norte",
    plate: "CXP-551",
    alias: "Corredor Norte",
    type: "bus",
    driver: "José Delgado",
    oilIntervalKm: 10000,
    openingKm: 120400,
    events: [
      { kind: "trip", daysAgo: 30, delta: 1800, route: "Patio – Ancón" },
      { kind: "trip", daysAgo: 22, delta: 1700, route: "Corredor – Los Olivos" },
      { kind: "trip", daysAgo: 16, delta: 1900, route: "Independencia – Centro" },
      { kind: "trip", daysAgo: 9, delta: 1400, route: "Turno mañana – Comas" },
      { kind: "trip", daysAgo: 6, delta: 1400, route: "Turno tarde – Comas" },
      {
        kind: "oil",
        daysAgo: 6,
        cost: 460,
        oilType: "15W-40",
        workshop: "Patio Norte",
        notes: "Filtro incluido",
      },
      { kind: "trip", daysAgo: 3, delta: 900, route: "Corredor – Puente Piedra" },
      { kind: "trip", daysAgo: 1, delta: 700, route: "Refuerzo – Carabayllo" },
    ],
  },
  {
    id: "v-frio",
    plate: "D4M-019",
    alias: "Callao Frío",
    type: "camion",
    driver: "Ana Paredes",
    oilIntervalKm: 5000,
    openingKm: 210000,
    events: [
      { kind: "trip", daysAgo: 36, delta: 1500, route: "Callao – Villa El Salvador" },
      { kind: "trip", daysAgo: 28, delta: 1400, route: "Cadena de frío – Ventanilla" },
      { kind: "trip", daysAgo: 21, delta: 1600, route: "Callao – Ate" },
      { kind: "trip", daysAgo: 14, delta: 1200, route: "Muelle – almacén" },
      { kind: "trip", daysAgo: 9, delta: 800, route: "Despacho – Santa Anita" },
      { kind: "oil", daysAgo: 9, cost: 390, oilType: "15W-40", workshop: "Frío Service Callao" },
      { kind: "trip", daysAgo: 6, delta: 900, route: "Callao – Chorrillos" },
      { kind: "trip", daysAgo: 3, delta: 1100, route: "Ruta refrigerada – Asia" },
      { kind: "trip", daysAgo: 1, delta: 700, route: "Retorno vacío – Callao" },
    ],
  },
  {
    id: "v-super",
    plate: "EQR-883",
    alias: "Supervisión",
    type: "auto",
    driver: "Carla Ríos",
    oilIntervalKm: 7000,
    openingKm: 22000,
    events: [
      { kind: "trip", daysAgo: 25, delta: 400, route: "Base – San Borja" },
      { kind: "trip", daysAgo: 18, delta: 380, route: "Visita de patio – Ate" },
      { kind: "trip", daysAgo: 10, delta: 600, route: "Auditoría – Callao" },
      { kind: "trip", daysAgo: 8, delta: 450, route: "Ruta centro" },
      { kind: "trip", daysAgo: 6, delta: 700, route: "Seguimiento – Comas" },
      { kind: "trip", daysAgo: 5, delta: 900, route: "La Molina – Surco" },
      { kind: "trip", daysAgo: 4, delta: 850, route: "Ingreso a taller" },
      { kind: "oil", daysAgo: 4, cost: 150, oilType: "5W-30", workshop: "Servicio La Molina" },
      { kind: "trip", daysAgo: 2, delta: 180, route: "Base – oficina" },
      { kind: "trip", daysAgo: 0, delta: 140, route: "Recorrido corto – Miraflores" },
    ],
  },
];

export function createSeed(now = new Date()) {
  const vehicles: Vehicle[] = [];
  const entries: MileageEntry[] = [];
  const oils: OilChange[] = [];
  for (const spec of SPECS) {
    const built = build(spec, now);
    vehicles.push(built.vehicle);
    entries.push(...built.entries);
    oils.push(...built.oils);
  }
  return { vehicles, entries, oils };
}
