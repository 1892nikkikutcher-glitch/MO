"use client";

import { usePatientData } from "@/context/PatientDataContext";

export default function AvisoPrivacidad() {
  const { perfilDoctor, clinicInfo } = usePatientData();
  const nombreResponsable = perfilDoctor.nombre || clinicInfo?.nombre || "el consultorio";
  const domicilio = perfilDoctor.direccionClinica || clinicInfo?.direccion || "";
  const actualizado = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const enviarPorWhatsApp = () => {
    const lineas = [
      "AVISO DE PRIVACIDAD",
      nombreResponsable,
      "",
      `${nombreResponsable}${domicilio ? `, con domicilio en ${domicilio},` : ""} es responsable del tratamiento de sus datos personales, incluyendo datos sensibles de salud, en cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).`,
      "",
      "¿Para qué usamos sus datos?",
      "Sus datos personales y clínicos se utilizan para: brindarle atención odontológica, integrar su expediente clínico, dar seguimiento a su tratamiento, contactarlo para recordatorios de citas, facturación, y cumplir con obligaciones legales y sanitarias aplicables.",
      "",
      "Datos que recabamos",
      "Nombre, edad, sexo, domicilio, teléfono, correo electrónico, así como datos de salud (historia clínica, alergias, diagnósticos, tratamientos, fotografías clínicas y recetas) necesarios para su atención.",
      "",
      "Confidencialidad y resguardo",
      "Su información se almacena de forma cifrada y solo el personal autorizado de este consultorio tiene acceso a ella. No compartimos sus datos con terceros salvo obligación legal o autorización expresa de su parte.",
      "",
      "Derechos ARCO",
      "Usted puede solicitar el Acceso, Rectificación, Cancelación u Oposición (derechos ARCO) al tratamiento de sus datos personales, así como revocar su consentimiento, acudiendo directamente con nosotros.",
      "",
      `Última actualización: ${actualizado}`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lineas.join("\n"))}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-edge/15 px-4 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
        >
          Imprimir
        </button>
        <button
          onClick={enviarPorWhatsApp}
          className="rounded-lg border border-success/40 px-4 py-2 text-sm font-semibold text-success transition-colors hover:bg-success/10"
        >
          Enviar por WhatsApp
        </button>
      </div>

      <div className="rounded-2xl bg-white p-8 text-black shadow-lg print:rounded-none print:p-0 print:shadow-none">
        <h2 className="text-center text-base font-bold uppercase tracking-wide">
          Aviso de Privacidad
        </h2>
        <p className="mt-1 text-center text-sm">{nombreResponsable}</p>

        <div className="mt-6 space-y-4 text-justify text-sm leading-relaxed">
          <p>
            <span className="font-semibold">{nombreResponsable}</span>
            {domicilio && <>, con domicilio en {domicilio},</>} es responsable del tratamiento de
            sus datos personales, incluyendo datos sensibles de salud, en cumplimiento con la Ley
            Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
          </p>

          <div>
            <p className="font-semibold">¿Para qué usamos sus datos?</p>
            <p className="mt-1">
              Sus datos personales y clínicos se utilizan para: brindarle atención odontológica,
              integrar su expediente clínico, dar seguimiento a su tratamiento, contactarlo para
              recordatorios de citas, facturación, y cumplir con obligaciones legales y sanitarias
              aplicables (incluyendo la conservación del expediente por el plazo mínimo que exige
              la normativa de salud).
            </p>
          </div>

          <div>
            <p className="font-semibold">Datos que recabamos</p>
            <p className="mt-1">
              Nombre, edad, sexo, domicilio, teléfono, correo electrónico, así como datos de salud
              (historia clínica, alergias, diagnósticos, tratamientos, fotografías clínicas y
              recetas) necesarios para su atención.
            </p>
          </div>

          <div>
            <p className="font-semibold">Confidencialidad y resguardo</p>
            <p className="mt-1">
              Su información se almacena de forma cifrada y solo el personal autorizado de este
              consultorio tiene acceso a ella. No compartimos sus datos con terceros salvo
              obligación legal o autorización expresa de su parte.
            </p>
          </div>

          <div>
            <p className="font-semibold">Derechos ARCO</p>
            <p className="mt-1">
              Usted puede solicitar el Acceso, Rectificación, Cancelación u Oposición (derechos
              ARCO) al tratamiento de sus datos personales, así como revocar su consentimiento,
              acudiendo directamente con nosotros.
            </p>
          </div>

          <p className="text-xs text-black/60">Última actualización: {actualizado}</p>
        </div>
      </div>
    </div>
  );
}
