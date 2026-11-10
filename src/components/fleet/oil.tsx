import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  currentKm,
  formatDay,
  formatKm,
  formatMoney,
  formatNumber,
  OIL_LABEL,
  oilSnapshot,
  todayISO,
} from "@/lib/fleet/format";
import { useFleet } from "@/lib/fleet/store";
import {
  ErrorNote,
  Field,
  Panel,
  PrimaryButton,
  SectionTitle,
  StatusPill,
  cn,
  controlClass,
} from "@/components/fleet/bits";

const OIL_TYPES = ["15W-40", "10W-40", "5W-30", "20W-50"];

export function OilPanel() {
  const vehicles = useFleet((s) => s.vehicles);
  const entries = useFleet((s) => s.entries);
  const oils = useFleet((s) => s.oils);
  const focusVehicleId = useFleet((s) => s.focusVehicleId);
  const clearFocus = useFleet((s) => s.clearFocus);
  const addOil = useFleet((s) => s.addOil);
  const removeOil = useFleet((s) => s.removeOil);

  const [vehicleId, setVehicleId] = useState(vehicles.find((v) => v.active)?.id ?? vehicles[0]?.id ?? "");
  const [date, setDate] = useState(todayISO);
  const [km, setKm] = useState("");
  const [cost, setCost] = useState("");
  const [oilType, setOilType] = useState(OIL_TYPES[0]);
  const [workshop, setWorkshop] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!focusVehicleId) return;
    setVehicleId(focusVehicleId);
    setSaved("");
    setError("");
    clearFocus();
  }, [focusVehicleId, clearFocus]);

  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  const reading = vehicle ? currentKm(vehicle, entries, oils) : 0;
  const snap = vehicle ? oilSnapshot(vehicle, reading, oils) : null;

  useEffect(() => {
    if (!vehicle) return;
    setKm(String(reading));
  }, [vehicle, reading]);

  const history = useMemo(() => {
    return oils
      .filter((oil) => !vehicle || oil.vehicleId === vehicle.id)
      .slice()
      .sort((a, b) => (a.date === b.date ? b.km - a.km : b.date.localeCompare(a.date)));
  }, [oils, vehicle]);

  function submit() {
    const message = addOil({
      vehicleId,
      date,
      km: Number(km),
      cost: cost === "" ? 0 : Number(cost),
      oilType,
      workshop,
      notes,
    });
    if (message) {
      setError(message);
      setSaved("");
      return;
    }
    setError("");
    setSaved("Cambio de aceite registrado. El próximo intervalo ya quedó recalculado.");
    setCost("");
    setWorkshop("");
    setNotes("");
  }

  if (vehicles.length === 0) {
    return (
      <Panel>
        <SectionTitle title="Cambios de aceite" detail="Da de alta una unidad para definir su intervalo." />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionTitle
          eyebrow="Plantilla"
          title="Cambio de aceite"
          detail="Cada unidad vence al sumar su intervalo sobre el último cambio. El aviso salta en el último 15% o en los 500 km finales."
        />
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field label="Unidad">
            <select
              className={controlClass}
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(e.target.value);
                setSaved("");
                setError("");
              }}
            >
              {vehicles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.plate} · {item.alias}
                </option>
              ))}
            </select>
          </Field>

          {vehicle && snap ? (
            <div className="rounded-md bg-surface px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold">{vehicle.plate}</p>
                  <p className="text-sm text-muted">Cada {formatNumber(vehicle.oilIntervalKm)} km</p>
                </div>
                <StatusPill status={snap.status} label={OIL_LABEL[snap.status]} />
              </div>
              <p className="mt-3 font-mono text-2xl font-medium tabular-nums">
                {snap.status === "missing"
                  ? "Sin base"
                  : snap.remaining <= 0
                    ? `+${formatNumber(Math.abs(snap.remaining))}`
                    : formatNumber(snap.remaining)}
              </p>
              <p className="text-sm text-muted">
                {snap.status === "missing"
                  ? "Registra el cambio de referencia."
                  : snap.remaining <= 0
                    ? `km vencido · lectura ${formatKm(reading)}`
                    : `km restantes · próximo cambio en ${formatKm(snap.dueAt)}`}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                <div
                  className={cn(
                    "h-full rounded-full",
                    snap.status === "overdue" || snap.status === "missing"
                      ? "bg-accent"
                      : snap.status === "soon"
                        ? "bg-warn"
                        : "bg-primary",
                  )}
                  style={{ width: `${Math.min(100, Math.max(snap.status === "missing" ? 0 : 4, snap.ratio * 100))}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha del cambio">
              <input className={controlClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Km del cambio" hint="Puedes corregir la lectura del taller">
              <input
                className={`${controlClass} font-mono tabular-nums`}
                inputMode="numeric"
                value={km}
                onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ""))}
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de aceite">
              <select className={controlClass} value={oilType} onChange={(e) => setOilType(e.target.value)}>
                {OIL_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
                <option>Otro</option>
              </select>
            </Field>
            <Field label="Costo (S/)">
              <input
                className={`${controlClass} font-mono tabular-nums`}
                inputMode="numeric"
                value={cost}
                placeholder="0"
                onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ""))}
              />
            </Field>
          </div>
          <Field label="Taller">
            <input
              className={controlClass}
              value={workshop}
              placeholder="Nombre del taller"
              onChange={(e) => setWorkshop(e.target.value)}
            />
          </Field>
          <Field label="Notas">
            <input
              className={controlClass}
              value={notes}
              placeholder="Filtro, fugas, próximo control…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {saved ? <p className="text-sm font-medium text-primary">{saved}</p> : null}
          <PrimaryButton type="submit">Registrar cambio</PrimaryButton>
        </form>
      </Panel>

      <Panel>
        <h2 className="mb-2 text-sm font-semibold">Historial {vehicle ? `· ${vehicle.plate}` : ""}</h2>
        {history.length === 0 ? (
          <p className="py-6 text-sm text-muted">Esta unidad todavía no tiene cambios cargados.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {history.map((oil) => (
              <li key={oil.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {formatDay(oil.date)} · {oil.oilType}
                  </p>
                  <p className="text-sm text-muted">
                    {oil.workshop || "Sin taller"}
                    {oil.notes ? ` · ${oil.notes}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold tabular-nums">{formatNumber(oil.km)}</p>
                  <p className="text-xs text-muted">{oil.cost > 0 ? formatMoney(oil.cost) : "Sin costo"}</p>
                  {pendingDelete === oil.id ? (
                    <button
                      type="button"
                      className="mt-1 text-xs font-semibold text-accent"
                      onClick={() => {
                        removeOil(oil.id);
                        setPendingDelete(null);
                      }}
                    >
                      Confirmar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mt-1 inline-flex size-9 items-center justify-center text-muted"
                      aria-label="Borrar cambio de aceite"
                      onClick={() => setPendingDelete(oil.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
