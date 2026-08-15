"use client";

import { useEffect, useState } from "react";
import Expediente from "./Expediente";
import { usePatientData } from "@/context/PatientDataContext";
import { coincidePaciente, formatEdad, type Patient } from "@/lib/patientData";
import { exportarCsv } from "@/lib/exportCsv";
import { parseArchivoPacientes, type RegistroImportado } from "@/lib/importPacientes";
import { capitalizarNombre, manejarCambioNombre } from "@/lib/textoNombre";

const avatarColors = ["#f59e0b", "#ec4899", "#3b82f6", "#22c55e", "#dc2626", "#a855f7"];

function calculateAge(birthDate: string) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(birthDate: string) {
  if (!birthDate) return "Sin registrar";
  return new Date(`${birthDate}T00:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return avatarColors[hash % avatarColors.length];
}

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function NuevoPacienteDialog({
  onClose,
  onGuardar,
}: {
  onClose: () => void;
  onGuardar: (data: { name: string; phone: string; birthDate: string }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [telefono, setTelefono] = useState("");

  const puedeGuardar = nombre.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Nuevo Paciente</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/40">
          Solo lo esencial para agendar — el resto del expediente se completa en consulta.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => manejarCambioNombre(e, setNombre)}
              placeholder="Ej. María Fernanda López"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Fecha de nacimiento</label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Teléfono</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="55 1234 5678"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              puedeGuardar &&
              onGuardar({ name: nombre.trim(), phone: telefono.trim(), birthDate: fechaNacimiento })
            }
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportarPacientesDialog({
  onClose,
  onImportar,
}: {
  onClose: () => void;
  onImportar: (registros: RegistroImportado[], onProgreso: (hechos: number) => void) => Promise<void>;
}) {
  const [registros, setRegistros] = useState<RegistroImportado[] | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [error, setError] = useState("");
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [terminado, setTerminado] = useState(false);

  const handleArchivo = async (file: File) => {
    setError("");
    setRegistros(null);
    setAvisos([]);
    setNombreArchivo(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const { registros: nuevos, avisos: nuevosAvisos } = parseArchivoPacientes(buffer, file.name);
      setRegistros(nuevos);
      setAvisos(nuevosAvisos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
    }
  };

  const confirmar = async () => {
    if (!registros) return;
    setImportando(true);
    await onImportar(registros, setProgreso);
    setTerminado(true);
    setImportando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Importar Pacientes</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        {terminado ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-success">
              ¡Listo! Se importaron {registros?.length ?? 0} pacientes correctamente.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-ink/40">
              Sube tu archivo de Excel tal como lo tienes — no necesitas convertirlo ni prepararlo
              de ninguna forma. Detectamos automáticamente las columnas de nombre, teléfono, fecha
              de nacimiento y correo; todo lo demás se guarda como nota en el expediente. Revisa la
              vista previa antes de confirmar.
            </p>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-edge/20 p-6 text-center text-sm text-ink/50 hover:border-accent/40 hover:text-ink">
              {nombreArchivo || "Selecciona tu archivo de Excel"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt,.tsv,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleArchivo(e.target.files[0])}
              />
            </label>

            {error && <p className="mt-3 text-xs text-danger">{error}</p>}
            {avisos.length > 0 && (
              <div className="mt-3 space-y-1 rounded-lg bg-amber-500/10 px-3 py-2">
                {avisos.map((a, i) => (
                  <p key={i} className="text-xs text-amber-400">
                    ⚠ {a}
                  </p>
                ))}
              </div>
            )}

            {registros && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-ink/70">
                  <span className="font-semibold text-accent">{registros.length}</span> pacientes
                  listos para importar. Vista previa:
                </p>
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-edge/10 p-2">
                  {registros.slice(0, 8).map((r, i) => (
                    <div key={i} className="rounded-md bg-surface px-2.5 py-1.5 text-xs">
                      <span className="font-medium text-ink">{r.name}</span>{" "}
                      <span className="text-ink/40">
                        {r.phone && `· ${r.phone}`} {r.birthDate && `· ${r.birthDate}`}
                      </span>
                    </div>
                  ))}
                  {registros.length > 8 && (
                    <p className="px-2.5 py-1 text-xs text-ink/30">
                      … y {registros.length - 8} más
                    </p>
                  )}
                </div>

                {importando && (
                  <p className="text-center text-xs text-ink/50">
                    Importando… {progreso}/{registros.length}
                  </p>
                )}

                <button
                  onClick={confirmar}
                  disabled={importando}
                  className="w-full rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {importando ? "Importando…" : `Importar ${registros.length} pacientes`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM21 21l-4.35-4.35"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function coincideTelefono(busqueda: string, phone: string): boolean {
  const digitos = busqueda.replace(/\D/g, "");
  if (!digitos) return false;
  return phone.replace(/\D/g, "").includes(digitos);
}

function ExpedienteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM14 4v6h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Pacientes() {
  const { patients, addPatient, importarPacientes, navegacionExpediente, consumirNavegacionExpediente } =
    usePatientData();
  const [selected, setSelected] = useState<Patient | null>(null);
  const [showNuevoPaciente, setShowNuevoPaciente] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<"reciente" | "alfabetico" | "edad">("reciente");

  const busquedaTrim = busqueda.trim();
  const pacientesFiltrados = !busquedaTrim
    ? patients
    : patients.filter((p) => {
        if (coincidePaciente(busquedaTrim, p.name)) return true;
        if (coincideTelefono(busquedaTrim, p.phone)) return true;
        if (p.birthDate && (p.birthDate.includes(busquedaTrim) || formatDate(p.birthDate).includes(busquedaTrim))) {
          return true;
        }
        const edad = p.birthDate ? calculateAge(p.birthDate) : null;
        if (edad !== null && String(edad).includes(busquedaTrim)) return true;
        return false;
      });

  const pacientesOrdenados = [...pacientesFiltrados].sort((a, b) => {
    if (orden === "alfabetico") {
      return capitalizarNombre(a.name).localeCompare(capitalizarNombre(b.name), "es");
    }
    if (orden === "edad") {
      const edadA = a.birthDate ? calculateAge(a.birthDate) ?? 9999 : 9999;
      const edadB = b.birthDate ? calculateAge(b.birthDate) ?? 9999 : 9999;
      return edadA - edadB;
    }
    // "reciente": los pacientes sin createdAt (dados de alta antes de que
    // existiera este campo, o importados en bloque) se quedan al final, en
    // vez de mezclarse en un orden arbitrario con los que sí lo tienen.
    if (!a.createdAt && !b.createdAt) return 0;
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const exportarPacientes = () => {
    exportarCsv(
      `pacientes_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Nombre completo", "Teléfono", "Correo", "Fecha de nacimiento", "Edad", "Notas"],
      patients.map((p) => [
        p.name,
        p.phone,
        p.email ?? "",
        p.birthDate,
        p.birthDate ? formatEdad(p.birthDate) : "",
        p.notas ?? "",
      ])
    );
  };

  useEffect(() => {
    if (!navegacionExpediente) return;
    const patient = patients.find((p) => p.id === navegacionExpediente.patientId);
    if (patient) setSelected(patient);
  }, [navegacionExpediente, patients]);

  // `selected` es una foto tomada al abrir el expediente; sin esto, guardar
  // cambios (nombre, sexo, etc.) actualiza `patients` en el contexto pero el
  // encabezado del expediente sigue mostrando los datos viejos.
  useEffect(() => {
    if (!selected) return;
    const actualizado = patients.find((p) => p.id === selected.id);
    if (actualizado && actualizado !== selected) setSelected(actualizado);
  }, [patients, selected]);

  if (selected) {
    return (
      <Expediente
        patient={selected}
        avatarColor={avatarColor(selected.id)}
        initials={initials(selected.name)}
        formatDate={formatDate}
        calculateAge={calculateAge}
        initialTab={navegacionExpediente?.patientId === selected.id ? navegacionExpediente.tab : undefined}
        onTabApplied={consumirNavegacionExpediente}
        onBack={() => {
          setSelected(null);
          consumirNavegacionExpediente();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, celular, fecha de nacimiento o edad..."
            className="w-full rounded-lg border border-edge/10 bg-field py-2.5 pl-9 pr-3 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as typeof orden)}
            className="rounded-lg border border-edge/10 bg-field px-3 py-2.5 text-sm text-ink outline-none focus:border-accent/60"
          >
            <option value="reciente">Más reciente primero</option>
            <option value="alfabetico">Alfabético (A-Z)</option>
            <option value="edad">Edad (menor a mayor)</option>
          </select>
          <button
            onClick={exportarPacientes}
            title="Descarga tus pacientes en un .csv que abre en Excel — tus datos siempre disponibles fuera de MO"
            className="rounded-lg border border-edge/15 px-4 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Exportar a Excel
          </button>
          <button
            onClick={() => setShowImportar(true)}
            className="rounded-lg border border-edge/15 px-4 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Importar Pacientes
          </button>
          <button
            onClick={() => setShowNuevoPaciente(true)}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Nuevo Paciente
          </button>
        </div>
      </div>

      {busquedaTrim && (
        <p className="text-xs text-ink/40">
          {pacientesFiltrados.length === 0
            ? "Sin resultados."
            : `${pacientesFiltrados.length} de ${patients.length} pacientes`}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
            <th className="px-6 py-4 font-medium">Foto</th>
            <th className="px-6 py-4 font-medium">Nombre completo</th>
            <th className="px-6 py-4 font-medium">Celular</th>
            <th className="px-6 py-4 font-medium">Fecha de nacimiento</th>
            <th className="px-6 py-4 font-medium">Edad</th>
            <th className="px-6 py-4 text-right font-medium">Expediente</th>
          </tr>
        </thead>
        <tbody>
          {pacientesOrdenados.map((p) => (
            <tr key={p.id} className="border-b border-edge/5 last:border-0 hover:bg-surface">
              <td className="px-6 py-4">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-black"
                  style={{ backgroundColor: avatarColor(p.id) }}
                >
                  {initials(p.name)}
                </div>
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => setSelected(p)}
                  className="font-medium text-ink transition-colors hover:text-accent"
                >
                  {capitalizarNombre(p.name)}
                </button>
              </td>
              <td className="px-6 py-4 text-ink/70">{p.phone}</td>
              <td className="px-6 py-4 text-ink/70">{formatDate(p.birthDate)}</td>
              <td className="px-6 py-4 text-ink/70">
                {p.birthDate ? formatEdad(p.birthDate) : "—"}
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => setSelected(p)}
                  title="Ver expediente"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-accent/70 transition-colors hover:bg-surface hover:text-accent"
                >
                  <ExpedienteIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {showNuevoPaciente && (
        <NuevoPacienteDialog
          onClose={() => setShowNuevoPaciente(false)}
          onGuardar={(data) => {
            addPatient(data);
            setShowNuevoPaciente(false);
          }}
        />
      )}

      {showImportar && (
        <ImportarPacientesDialog
          onClose={() => setShowImportar(false)}
          onImportar={(registros, onProgreso) => importarPacientes(registros, onProgreso)}
        />
      )}
    </div>
  );
}
