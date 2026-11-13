export type VehicleType = "camion" | "minivan" | "bus" | "auto" | "moto";

export type Vehicle = {
  id: string;
  plate: string;
  alias: string;
  type: VehicleType;
  driver: string;
  oilIntervalKm: number;
  openingKm: number;
  active: boolean;
  userId?: string | null;
};

export type MileageEntry = {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  deltaKm: number;
  route: string;
  driver: string;
  notes: string;
};

export type OilChange = {
  id: string;
  vehicleId: string;
  date: string;
  km: number;
  cost: number;
  oilType: string;
  workshop: string;
  notes: string;
};

// src/lib/fleet/types.ts
// ... (tu código anterior)

export type SoatChange = {
  id: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  company: string;
  cost: number;
  notes: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};
export type TabId = "tablero" | "km" | "aceite" | "unidades";

export type Period = "month" | "30d" | "all";

export type OilState = "ok" | "soon" | "overdue" | "missing";
