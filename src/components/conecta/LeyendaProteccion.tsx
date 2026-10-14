import { INFRAESTRUCTURA_DATOS_CONECTA, RESPONSABLE_PROTECCION_DATOS_CONECTA } from "@/lib/moConecta";

/** "Protegido por…": quién responde por los datos que viajan en MO Conecta, y sobre qué
 * infraestructura viven. Un solo lugar para el texto (ver moConecta.ts) para que se vea igual en el
 * módulo, en el expediente compartido y en las invitaciones. */
export default function LeyendaProteccion({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-xs text-ink/50 ${className}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="mt-px shrink-0 text-success">
        <path
          d="M12 3 5 6v5.5c0 4.2 2.9 8 7 9.5 4.1-1.5 7-5.3 7-9.5V6l-7-3Zm-1.5 11.5L8 12l1.1-1.1 1.4 1.4 3.9-3.9L15.5 9.5l-5 5Z"
          fill="currentColor"
        />
      </svg>
      <span>
        Protegido por <span className="font-semibold text-ink/70">{RESPONSABLE_PROTECCION_DATOS_CONECTA}</span>
        <span className="text-ink/40"> · {INFRAESTRUCTURA_DATOS_CONECTA}</span>
      </span>
    </p>
  );
}
