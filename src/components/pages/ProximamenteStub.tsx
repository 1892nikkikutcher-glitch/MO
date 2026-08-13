"use client";

export default function ProximamenteStub({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-edge/15 bg-surface px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{label} — próximamente</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink/50">
          Esta sección todavía está en construcción y llegará en una próxima actualización. El
          resto de la plataforma sigue funcionando con normalidad.
        </p>
      </div>
    </div>
  );
}
