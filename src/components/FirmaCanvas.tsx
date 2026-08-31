"use client";

import { useRef, useState } from "react";

/** Recuadro para dibujar una firma con el dedo (celular/tablet) o el mouse
 * (computadora) — compartido entre "Solicitar Firma" del paciente en Pagos
 * y la firma digital del doctor en Perfil del Doctor. */
export default function FirmaCanvas({
  etiqueta = "Firma",
  onCancel,
  onSave,
}: {
  etiqueta?: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasSignature(true);
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const handleLimpiar = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleGuardar = () => {
    if (!hasSignature) return;
    onSave(canvasRef.current!.toDataURL("image/png"));
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm text-ink/70">{etiqueta}</p>
        <canvas
          ref={canvasRef}
          width={440}
          height={160}
          className="w-full touch-none rounded-lg border border-edge/15 bg-white"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        <p className="mt-1 text-xs text-ink/30">Dibuja la firma dentro del recuadro.</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
        >
          Cancelar
        </button>
        <button
          onClick={handleLimpiar}
          className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
        >
          Limpiar
        </button>
        <button
          onClick={handleGuardar}
          disabled={!hasSignature}
          className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
