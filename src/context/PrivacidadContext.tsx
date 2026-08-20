"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePatientData } from "./PatientDataContext";

type PrivacidadContextValue = {
  /** true = las cifras sensibles deben mostrarse enmascaradas. */
  oculto: boolean;
  /** Click en el ojo cerrado: pide el PIN (o crear uno, si no existe) y
   * revela las cifras si es correcto. */
  solicitarRevelar: () => void;
  /** Click en el ojo abierto: vuelve a ocultar, sin pedir nada. */
  ocultar: () => void;
};

const PrivacidadContext = createContext<PrivacidadContextValue>({
  oculto: false,
  solicitarRevelar: () => {},
  ocultar: () => {},
});

export function usePrivacidad() {
  return useContext(PrivacidadContext);
}

const pinClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-center text-lg tracking-[0.5em] text-ink outline-none focus:border-accent/60";

function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 4);
}

function ModalPin({
  pinExistente,
  onClose,
  onDesbloqueado,
  onGuardarPin,
}: {
  pinExistente: string | undefined;
  onClose: () => void;
  onDesbloqueado: () => void;
  onGuardarPin: (pin: string) => void;
}) {
  const [creandoNuevo, setCreandoNuevo] = useState(!pinExistente);
  const [pin, setPin] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");

  const validarExistente = () => {
    if (pin === pinExistente) {
      onDesbloqueado();
      return;
    }
    setError("PIN incorrecto.");
    setPin("");
  };

  const crearPin = () => {
    if (pin.length !== 4) {
      setError("El PIN debe tener 4 dígitos.");
      return;
    }
    if (pin !== confirmacion) {
      setError("Los dos PIN no coinciden.");
      setConfirmacion("");
      return;
    }
    onGuardarPin(pin);
    onDesbloqueado();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xs rounded-2xl border border-edge/10 bg-modal p-6 text-center">
        <h3 className="text-base font-semibold text-ink">
          {creandoNuevo ? "Crea tu PIN de privacidad" : "Ingresa tu PIN"}
        </h3>
        <p className="mt-1 text-xs text-ink/50">
          {creandoNuevo
            ? "Solo tú lo necesitarás para ver las cifras financieras del dashboard."
            : "Para revelar las cifras financieras del dashboard."}
        </p>

        <div className="mt-4 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(soloDigitos(e.target.value));
              setError("");
            }}
            placeholder="••••"
            className={pinClass}
          />
          {creandoNuevo && (
            <input
              type="password"
              inputMode="numeric"
              value={confirmacion}
              onChange={(e) => {
                setConfirmacion(soloDigitos(e.target.value));
                setError("");
              }}
              placeholder="Confirma el PIN"
              className={pinClass}
            />
          )}
        </div>

        {error && <p className="mt-2 text-xs text-danger">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={creandoNuevo ? crearPin : validarExistente}
            disabled={pin.length !== 4}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent hover:bg-accent/25 disabled:opacity-40"
          >
            {creandoNuevo ? "Guardar" : "Desbloquear"}
          </button>
        </div>

        {!creandoNuevo && (
          <button
            onClick={() => {
              setCreandoNuevo(true);
              setPin("");
              setConfirmacion("");
              setError("");
            }}
            className="mt-4 text-xs text-ink/40 underline decoration-ink/20 underline-offset-2 hover:text-ink/60"
          >
            Olvidé mi PIN — crear uno nuevo
          </button>
        )}
      </div>
    </div>
  );
}

export function PrivacidadProvider({ children }: { children: ReactNode }) {
  const { clinicInfo, setClinicInfo } = usePatientData();
  const [revelado, setRevelado] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);

  const pinActual = clinicInfo?.pinPrivacidad;

  return (
    <PrivacidadContext.Provider
      value={{
        oculto: !revelado,
        solicitarRevelar: () => {
          if (revelado) return;
          setMostrarModal(true);
        },
        ocultar: () => setRevelado(false),
      }}
    >
      {children}
      {mostrarModal && (
        <ModalPin
          pinExistente={pinActual}
          onClose={() => setMostrarModal(false)}
          onDesbloqueado={() => {
            setRevelado(true);
            setMostrarModal(false);
          }}
          onGuardarPin={(pin) => setClinicInfo((prev) => ({ ...prev, pinPrivacidad: pin }))}
        />
      )}
    </PrivacidadContext.Provider>
  );
}
