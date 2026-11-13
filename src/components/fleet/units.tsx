import { useState } from "react";
import { useEffect } from "react";
import { Bike, Bus, Car, Pencil, Plus, Truck } from "lucide-react";
import {
  currentKm,
  formatKm,
  OIL_LABEL,
  oilSnapshot,
  todayISO,
  TYPE_LABEL,
} from "@/lib/fleet/format";
import type { VehicleInput } from "@/lib/fleet/store";
import { useFleet } from "@/lib/fleet/store";
import type { Vehicle, VehicleType } from "@/lib/fleet/types";
import {
  ErrorNote,
  Field,
  GhostButton,
  Panel,
  PrimaryButton,
  SectionTitle,
  StatusPill,
  cn,
  controlClass,
} from "@/components/fleet/bits";

const TYPES: VehicleType[] = ["camion", "van", "bus", "auto", "moto"];

const ICONS = {
  camion: Truck,
  van: Truck,
  bus: Bus,
  auto: Car,
  moto: Bike,
} as const;

const emptyForm = (): VehicleInput => ({
  plate: "",
  alias: "",
  type: "camion",
  driver: "",
  oilIntervalKm: 5000,
  openingKm: 0,
  active: true,
  lastOilKm: 0,
  lastOilDate: todayISO(),
});

export function Units() {
  const vehicles = useFleet((s) => s.vehicles);
  const entries = useFleet((s) => s.entries);
  const oils = useFleet((s) => s.oils);
  const addVehicle = useFleet((s) => s.addVehicle);
  const updateVehicle = useFleet((s) => s.updateVehicle);
  const removeVehicle = useFleet((s) => s.removeVehicle);
  const loadDemo = useFleet((s) => s.loadDemo);
  const clearAll = useFleet((s) => s.clearAll);
  const drivers = useFleet((s) => s.drivers);
  const loadDrivers = useFleet((s) => s.loadDrivers);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<VehicleInput>(emptyForm);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  function openNew() {
    setEditing("new");
    setForm(emptyForm());
    setError("");
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle.id);
    setForm({
      plate: vehicle.plate,
      alias: vehicle.alias,
      type: vehicle.type,
      driver: vehicle.driver,
      oilIntervalKm: vehicle.oilIntervalKm,
      openingKm: vehicle.openingKm,
      active: vehicle.active,
      lastOilKm: 0,
      lastOilDate: todayISO(),
    });
    setError("");
  }

  function save() {
    const message = editing === "new" ? addVehicle(form) : editing ? updateVehicle(editing, form) : "Nada que guardar.";
    if (message) {
      setError(message);
      return;
    }
    setEditing(null);
    setError("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SectionTitle
            eyebrow="Flota"
            title="Unidades"
            detail="La placa, el conductor y cada cuántos kilómetros toca el aceite."
          />
        </div>
        {editing == null ? (
          <button
            type="button"
            onClick={openNew}
            className="mb-4 inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-ink"
          >
            <Plus className="size-4" />
            Nueva
          </button>
        ) : null}
      </div>

      {editing != null ? (
        <Panel>
          <h2 className="mb-4 text-base font-semibold">{editing === "new" ? "Alta de unidad" : "Editar unidad"}</h2>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Placa">
                <input
                  className={`${controlClass} font-mono uppercase`}
                  value={form.plate}
                  onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
                  placeholder="ABC-123"
                  required
                />
              </Field>
              <Field label="Alias">
                <input
                  className={controlClass}
                  value={form.alias}
                  onChange={(e) => setForm({ ...form, alias: e.target.value })}
                  placeholder="Ruta Ate"
                  required
                />
              </Field>
            </div>
            <Field label="Tipo">
              <select
                className={controlClass}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })}
              >
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Conductor habitual">
              <input
                className={controlClass}
                value={form.driver}
                onChange={(e) => setForm({ ...form, driver: e.target.value })}
                required
              />
            </Field>
            <Field label="Asignar cuenta de la app (Chofer)">
              <select
                className={controlClass}
                value={form.userId || ""}
                onChange={(e) => setForm({ ...form, userId: e.target.value || null })}
              >
                <option value="">-- Sin asignar (Solo Admin) --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name || "Chofer"} ({d.email})
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Km inicial" hint="Odómetro al dar de alta">
                <input
                  className={`${controlClass} font-mono tabular-nums`}
                  inputMode="numeric"
                  value={form.openingKm ? String(form.openingKm) : ""}
                  placeholder="0"
                  onChange={(e) => {
                    const openingKm = Number(e.target.value.replace(/[^\d]/g, "") || 0);
                    setForm((current) => ({
                      ...current,
                      openingKm,
                      lastOilKm:
                        editing === "new" && (current.lastOilKm === 0 || current.lastOilKm === current.openingKm)
                          ? openingKm
                          : current.lastOilKm,
                    }));
                  }}
                />
              </Field>
              <Field label="Aceite cada (km)">
                <input
                  className={`${controlClass} font-mono tabular-nums`}
                  inputMode="numeric"
                  value={String(form.oilIntervalKm)}
                  onChange={(e) =>
                    setForm({ ...form, oilIntervalKm: Number(e.target.value.replace(/[^\d]/g, "") || 0) })
                  }
                />
              </Field>
            </div>
            {editing === "new" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Último aceite (km)">
                  <input
                    className={`${controlClass} font-mono tabular-nums`}
                    inputMode="numeric"
                    value={form.lastOilKm ? String(form.lastOilKm) : ""}
                    placeholder="0"
                    onChange={(e) => setForm({ ...form, lastOilKm: Number(e.target.value.replace(/[^\d]/g, "") || 0) })}
                  />
                </Field>
                <Field label="Fecha de ese cambio">
                  <input
                    className={controlClass}
                    type="date"
                    value={form.lastOilDate}
                    onChange={(e) => setForm({ ...form, lastOilDate: e.target.value })}
                    required
                  />
                </Field>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Los cambios de aceite nuevos se cargan en la pestaña Aceite. Aquí solo ajustas el intervalo.
              </p>
            )}
            <label className="flex min-h-12 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Unidad activa (entra a los KPIs)
            </label>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
            <PrimaryButton type="submit">{editing === "new" ? "Guardar unidad" : "Actualizar"}</PrimaryButton>
            <GhostButton onClick={() => setEditing(null)}>Cancelar</GhostButton>
          </form>
        </Panel>
      ) : null}

      {vehicles.length === 0 && editing == null ? (
        <Panel>
          <p className="text-sm text-muted">No hay unidades. Crea la primera o carga el ejemplo de Lima.</p>
          <div className="mt-4">
            <GhostButton onClick={loadDemo}>Cargar ejemplo</GhostButton>
          </div>
        </Panel>
      ) : null}

      <ul className="flex flex-col gap-3">
        {vehicles.map((vehicle) => {
          const km = currentKm(vehicle, entries, oils);
          const oil = oilSnapshot(vehicle, km, oils);
          const Icon = ICONS[vehicle.type];
          return (
            <li key={vehicle.id}>
              <article className={cn("rounded-lg border border-line bg-surface-2 p-4", !vehicle.active && "opacity-70")}>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-md bg-ok-bg text-primary">
                    <Icon className="size-5" />
                  </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-lg font-semibold tracking-wide">{vehicle.plate}</p>
                  <p className="text-sm text-ink">
                    {vehicle.alias} · {TYPE_LABEL[vehicle.type]}
                  </p>
                  <p className="text-sm text-muted">{vehicle.driver}</p>
                  
                  {/* NUEVO: Mostrar correo del chofer asignado */}
                  {(() => {
                    const assigned = drivers.find((d) => d.id === vehicle.userId);
                    return assigned ? (
                      <p className="mt-0.5 text-xs font-medium text-primary">
                        App: {assigned.email}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted italic">
                        App: Sin asignar
                      </p>
                    );
                  })()}
                </div>
                  <StatusPill status={vehicle.active ? oil.status : "missing"} label={vehicle.active ? OIL_LABEL[oil.status] : "Inactiva"} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-muted">Odómetro</dt>
                    <dd className="font-mono font-medium tabular-nums">{formatKm(km)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Intervalo</dt>
                    <dd className="font-mono font-medium tabular-nums">{formatKm(vehicle.oilIntervalKm)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <GhostButton onClick={() => openEdit(vehicle)}>
                    <Pencil className="mr-1.5 size-3.5" />
                    Editar
                  </GhostButton>
                  {confirmId === vehicle.id ? (
                    <GhostButton
                      danger
                      onClick={() => {
                        removeVehicle(vehicle.id);
                        setConfirmId(null);
                      }}
                    >
                      Confirmar borrado
                    </GhostButton>
                  ) : (
                    <GhostButton danger onClick={() => setConfirmId(vehicle.id)}>
                      Eliminar
                    </GhostButton>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      
    </div>
  );
}
