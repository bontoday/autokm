import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  currentKm,
  deltaMap,
  formatDay,
  formatKm,
  formatNumber,
  oilSnapshot,
  todayISO,
} from "@/lib/fleet/format";
import { useFleet } from "@/lib/fleet/store";
import { ErrorNote, Field, Panel, PrimaryButton, SectionTitle, controlClass } from "@/components/fleet/bits";

export function MileageLog() {
  const vehicles = useFleet((s) => s.vehicles);
  const entries = useFleet((s) => s.entries);
  const oils = useFleet((s) => s.oils);
  const addEntry = useFleet((s) => s.addEntry);
  const removeEntry = useFleet((s) => s.removeEntry);

  const active = vehicles.filter((v) => v.active);
  const [vehicleId, setVehicleId] = useState(active[0]?.id ?? vehicles[0]?.id ?? "");
  const [date, setDate] = useState(todayISO);
  const [odometer, setOdometer] = useState("");
  const [route, setRoute] = useState("");
  const [driver, setDriver] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [filter, setFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  const reading = vehicle ? currentKm(vehicle, entries, oils) : 0;
  const typed = Number(odometer);
  const delta = vehicle && Number.isFinite(typed) && typed > reading ? typed - reading : null;
  const oil = vehicle ? oilSnapshot(vehicle, delta != null ? typed : reading, oils) : null;

  const rows = useMemo(() => {
    return entries
      .filter((entry) => filter === "all" || entry.vehicleId === filter)
      .slice()
      .sort((a, b) => (a.date === b.date ? b.odometer - a.odometer : b.date.localeCompare(a.date)));
  }, [entries, filter]);
  const deltas = useMemo(() => deltaMap(vehicles, entries), [vehicles, entries]);

  function onVehicle(id: string) {
    setVehicleId(id);
    const next = vehicles.find((v) => v.id === id);
    setDriver(next?.driver ?? "");
    setSaved("");
    setError("");
  }

  function submit() {
    const message = addEntry({
      vehicleId,
      date,
      odometer: typed,
      route,
      driver: driver || vehicle?.driver || "",
      notes,
    });
    if (message) {
      setError(message);
      setSaved("");
      return;
    }
    setError("");
    setSaved(`Lectura guardada · recorrido ${formatKm(typed - reading)}.`);
    setOdometer("");
    setRoute("");
    setNotes("");
  }

  if (vehicles.length === 0) {
    return (
      <Panel>
        <SectionTitle title="Plantilla de kilometraje" detail="Primero da de alta una unidad en la pestaña Unidades." />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionTitle
          eyebrow="Plantilla"
          title="Registro de kilometraje"
          detail="Una fila por lectura de odómetro. El recorrido se calcula contra la última marca de esa unidad."
        />
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field label="Unidad">
            <select className={controlClass} value={vehicleId} onChange={(e) => onVehicle(e.target.value)}>
              {vehicles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.plate} · {item.alias}
                  {item.active ? "" : " (fuera de servicio)"}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input className={controlClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Odómetro (km)" hint={vehicle ? `Última lectura: ${formatKm(reading)}` : undefined}>
              <input
                className={`${controlClass} font-mono tabular-nums`}
                inputMode="numeric"
                value={odometer}
                placeholder={reading ? String(reading) : "0"}
                onChange={(e) => {
                  setOdometer(e.target.value.replace(/[^\d]/g, ""));
                  setSaved("");
                }}
                required
              />
            </Field>
          </div>
          <div className="rounded-md bg-surface px-3 py-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Recorrido de esta lectura</p>
            <p className="mt-1 font-mono text-2xl font-medium tabular-nums text-ink">
              {delta == null ? "—" : `+${formatNumber(delta)}`}
            </p>
            {oil && oil.status === "overdue" && delta != null ? (
              <p className="mt-1 text-sm text-accent">Esta lectura deja el aceite vencido. Programa el cambio.</p>
            ) : null}
            {oil && oil.status === "soon" && delta != null ? (
              <p className="mt-1 text-sm text-warn">Aceite por vencer: faltan {formatKm(oil.remaining)}.</p>
            ) : null}
          </div>
          <Field label="Ruta o destino">
            <input
              className={controlClass}
              value={route}
              placeholder="Ej. Ate – Callao"
              onChange={(e) => setRoute(e.target.value)}
              required
            />
          </Field>
          <Field label="Conductor">
            <input
              className={controlClass}
              value={driver || vehicle?.driver || ""}
              onChange={(e) => setDriver(e.target.value)}
            />
          </Field>
          <Field label="Observaciones">
            <textarea
              className="min-h-24 w-full rounded-md border border-line bg-surface-2 px-3 py-3 text-base text-ink outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
              value={notes}
              placeholder="Peaje, carga, incidencia…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {saved ? <p className="text-sm font-medium text-primary">{saved}</p> : null}
          <PrimaryButton type="submit">Registrar lectura</PrimaryButton>
        </form>
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Bitácora</h2>
          <select
            className="h-10 max-w-[12rem] rounded-md border border-line bg-surface-2 px-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filtrar por unidad"
          >
            <option value="all">Todas</option>
            {vehicles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.plate}
              </option>
            ))}
          </select>
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted">Aún no hay lecturas con este filtro.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {rows.map((entry) => {
              const owner = vehicles.find((v) => v.id === entry.vehicleId);
              return (
                <li key={entry.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{formatDay(entry.date)}</span>
                      <span className="text-muted"> · </span>
                      <span className="font-mono font-semibold">{owner?.plate ?? "—"}</span>
                    </p>
                    <p className="truncate text-sm text-ink">{entry.route}</p>
                    <p className="text-xs text-muted">
                      {entry.driver}
                      {entry.notes ? ` · ${entry.notes}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-primary tabular-nums">
                      +{formatNumber(deltas.get(entry.id) ?? entry.deltaKm)}
                    </p>
                    <p className="font-mono text-xs text-muted tabular-nums">{formatNumber(entry.odometer)}</p>
                    {pendingDelete === entry.id ? (
                      <button
                        type="button"
                        className="mt-1 text-xs font-semibold text-accent"
                        onClick={() => {
                          removeEntry(entry.id);
                          setPendingDelete(null);
                        }}
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="mt-1 inline-flex size-9 items-center justify-center text-muted"
                        aria-label={`Borrar lectura de ${owner?.plate ?? "unidad"}`}
                        onClick={() => setPendingDelete(entry.id)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
