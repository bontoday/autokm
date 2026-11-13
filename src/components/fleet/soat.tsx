import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Trash2, AlertTriangle } from "lucide-react";
import { formatDay, todayISO } from "@/lib/fleet/format";
import { useFleet } from "@/lib/fleet/store";
import { ErrorNote, Field, Panel, PrimaryButton, SectionTitle, controlClass } from "@/components/fleet/bits";
import { addYears, parseISO, differenceInDays } from "date-fns";

export function SoatPanel() {
  const vehicles = useFleet((s) => s.vehicles);
  const soats = useFleet((s) => s.soats);
  const focusVehicleId = useFleet((s) => s.focusVehicleId);
  const clearFocus = useFleet((s) => s.clearFocus);
  const addSoat = useFleet((s) => s.addSoat);
  const removeSoat = useFleet((s) => s.removeSoat);

  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState("");
  const [company, setCompany] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (focusVehicleId) {
      setVehicleId(focusVehicleId);
      clearFocus();
    }
  }, [focusVehicleId, clearFocus]);

  // Auto-calcular 1 año después al elegir fecha de inicio
  useEffect(() => {
    if (startDate) {
      const nextYear = addYears(parseISO(startDate), 1);
      setEndDate(nextYear.toISOString().split("T")[0]);
    }
  }, [startDate]);

  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  
  const currentSoat = useMemo(() => {
    if (!vehicle) return null;
    const vehicleSoats = soats
      .filter((s) => s.vehicleId === vehicle.id)
      .sort((a, b) => b.endDate.localeCompare(a.endDate)); // El más reciente primero
    return vehicleSoats[0] ?? null;
  }, [soats, vehicle]);

  // Lógica de Alertas
  const alertInfo = useMemo(() => {
    if (!currentSoat) return { status: "missing", days: 0, text: "Sin SOAT registrado", color: "text-muted bg-surface" };
    const daysLeft = differenceInDays(parseISO(currentSoat.endDate), new Date());
    
    if (daysLeft < 0) {
      return { status: "overdue", days: daysLeft, text: `Vencido hace ${Math.abs(daysLeft)} días`, color: "text-accent bg-accent/10" };
    } else if (daysLeft <= 15) {
      return { status: "critical", days: daysLeft, text: `¡Vence en ${daysLeft} días!`, color: "text-accent bg-accent/10 border border-accent" };
    } else if (daysLeft <= 30) {
      return { status: "warning", days: daysLeft, text: `Vence en ${daysLeft} días`, color: "text-warn bg-warn/10 border border-warn" };
    } else {
      return { status: "ok", days: daysLeft, text: `Vigente (${daysLeft} días restantes)`, color: "text-primary bg-ok-bg" };
    }
  }, [currentSoat]);

  async function submit() {
    const message = await addSoat({
      vehicleId,
      startDate,
      endDate,
      company,
      cost: cost === "" ? 0 : Number(cost),
      notes,
    });
    if (message) {
      setError(message);
      setSaved("");
      return;
    }
    setError("");
    setSaved("SOAT registrado correctamente.");
    setCost("");
    setCompany("");
    setNotes("");
  }

  if (vehicles.length === 0) {
    return <Panel><SectionTitle title="SOAT" detail="Primero da de alta una unidad." /></Panel>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionTitle
          eyebrow="Seguro Obligatorio"
          title="Control de SOAT"
          detail="Registra la póliza anual. El sistema te avisará 30 y 15 días antes del vencimiento."
        />
        
        {vehicle && (
          <div className={`mb-6 rounded-md p-4 flex items-start gap-3 ${alertInfo.color}`}>
            {alertInfo.status === "overdue" || alertInfo.status === "critical" ? (
              <AlertTriangle className="size-6 shrink-0" />
            ) : (
              <ShieldCheck className="size-6 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-sm">Estado del SOAT para {vehicle.plate}</p>
              <p className="text-sm mt-1">{alertInfo.text}</p>
              {currentSoat && (
                <p className="text-xs mt-1 opacity-80">
                  {currentSoat.company} · Válido hasta {formatDay(currentSoat.endDate)}
                </p>
              )}
            </div>
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Field label="Unidad">
            <select className={controlClass} value={vehicleId} onChange={(e) => { setVehicleId(e.target.value); setError(""); setSaved(""); }}>
              {vehicles.map((item) => (
                <option key={item.id} value={item.id}>{item.plate} · {item.alias}</option>
              ))}
            </select>
          </Field>
          
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de inicio">
              <input className={controlClass} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </Field>
            <Field label="Fecha de vencimiento" hint="Se calcula 1 año después">
              <input className={controlClass} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Aseguradora">
              <input className={controlClass} value={company} placeholder="Ej. Rímac, Pacífico" onChange={(e) => setCompany(e.target.value)} required />
            </Field>
            <Field label="Costo (S/)">
              <input className={`${controlClass} font-mono`} inputMode="numeric" value={cost} placeholder="0" onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ""))} />
            </Field>
          </div>

          <Field label="Notas">
            <input className={controlClass} value={notes} placeholder="Número de póliza, observaciones..." onChange={(e) => setNotes(e.target.value)} />
          </Field>

          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {saved ? <p className="text-sm font-medium text-primary">{saved}</p> : null}
          <PrimaryButton type="submit">Registrar SOAT</PrimaryButton>
        </form>
      </Panel>

      <Panel>
        <h2 className="mb-2 text-sm font-semibold">Historial SOAT {vehicle ? `· ${vehicle.plate}` : ""}</h2>
        {soats.filter(s => s.vehicleId === vehicleId).length === 0 ? (
          <p className="py-6 text-sm text-muted">No hay registros de SOAT para esta unidad.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {soats
              .filter((s) => s.vehicleId === vehicleId)
              .sort((a, b) => b.endDate.localeCompare(a.endDate))
              .map((soat) => (
              <li key={soat.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{soat.company}</p>
                  <p className="text-xs text-muted">{formatDay(soat.startDate)} al {formatDay(soat.endDate)}</p>
                  {soat.notes && <p className="text-xs text-muted mt-1">{soat.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{soat.cost > 0 ? `S/ ${soat.cost}` : "Sin costo"}</p>
                  {pendingDelete === soat.id ? (
                    <button type="button" className="mt-1 text-xs font-semibold text-accent" onClick={async () => { await removeSoat(soat.id); setPendingDelete(null); }}>
                      Confirmar
                    </button>
                  ) : (
                    <button type="button" className="mt-1 inline-flex size-8 items-center justify-center text-muted" onClick={() => setPendingDelete(soat.id)}>
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