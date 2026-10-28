"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePatientData } from "@/context/PatientDataContext";
import AbrirWhatsAppPrompt from "@/components/AbrirWhatsAppPrompt";
import { enviarPdfPorWhatsapp } from "@/lib/enviarPdfWhatsapp";
import { lineaCashbackRecibo } from "@/lib/cashbackTextos";
import { buildProximaCitaTexto, formatosWhatsAppInicial, plantillaConSaldoCashback, renderPlantilla } from "@/lib/formatosWhatsapp";
import { crearEnlaceReciboApi } from "@/lib/recibosCompartidosApi";
import { mensajeConEnlaceRecibo } from "@/lib/recibosCompartidos";
import { generarReciboPagoPdf } from "@/lib/generarReciboPagoPdf";
import { buildReciboTexto, formatCurrency, type Pago } from "@/lib/patientData";
import { slugify } from "@/lib/textoNombre";

type EstadoPdf =
  | { tipo: "generando" }
  | { tipo: "listo"; blob: Blob; url: string; nombre: string }
  | { tipo: "error" };

/** La liga pública del recibo se crea de antemano (apenas el PDF está listo) para que "Compartir por WhatsApp" abra el
 * chat en el mismo toque, ya con la liga dentro del mensaje. `no_aplica` = quien registra no es el administrador. */
type EstadoEnlace = { tipo: "no_aplica" } | { tipo: "creando" } | { tipo: "listo"; enlace: string } | { tipo: "error" };

/** El recibo de un pago, en dos tiempos: PRIMERO se genera el PDF (apenas se abre esto) y solo
 * DESPUÉS se puede verlo, imprimirlo o compartirlo — los botones actúan sobre el PDF ya listo.
 * Generarlo antes es lo que permite compartir en celular: el menú de compartir del teléfono exige
 * que se invoque justo al tocar el botón, no después de esperar a que se arme el archivo. */
export default function ReciboPagoPanel({
  patientId,
  patientName,
  pago,
  onDone,
  onSolicitarFirma,
  titulo,
}: {
  patientId: string;
  patientName: string;
  pago: Pago;
  onDone: () => void;
  /** Si viene y el pago aún no tiene firma, se ofrece pedirla (el PDF se vuelve a generar con ella). */
  onSolicitarFirma?: () => void;
  /** Encabezado opcional (ej. "Recibo de pago"); sin él se asume que viene del registro de un pago. */
  titulo?: string;
}) {
  const { citas, patients, clinicInfo, formatosWhatsapp, perfilDoctor, saldoCashbackDe, cashbackConfig, clinicUid, miRol } = usePatientData();
  const [mensajeWa, setMensajeWa] = useState<string | undefined>(undefined);
  const [estadoEnlace, setEstadoEnlace] = useState<EstadoEnlace>({ tipo: "creando" });
  const [estado, setEstado] = useState<EstadoPdf>({ tipo: "generando" });
  const [intento, setIntento] = useState(0);
  const [waUrlPendiente, setWaUrlPendiente] = useState<string | null>(null);
  const nombreArchivo = `Recibo_${slugify(patientName)}_${slugify(pago.fecha)}.pdf`;

  /** Una línea con el saldo de cashback del paciente (lo ganado hoy se libera mañana); nada si no tiene ni está activo el programa. */
  const textoSaldoCashback = () => {
    const s = saldoCashbackDe(patientId);
    const total = s.disponible + s.porLiberar;
    if (!cashbackConfig.activo && total <= 0) return "";
    const vence = s.proximoAVencer ? ` · vence el ${s.proximoAVencer.fecha.split("-").reverse().join("/")}` : "";
    return `Cashback: $${total.toLocaleString("es-MX", { maximumFractionDigits: 2 })}${vence}`;
  };

  // Pie del recibo (próxima cita y saldo). El saldo de cashback llega por el listener un instante después de
  // registrar el pago: por eso entra a las dependencias de abajo y el recibo se vuelve a armar con el saldo ya al día.
  const notaPie = [buildProximaCitaTexto(citas, patientId, pago.fecha), textoSaldoCashback()].filter(Boolean).join("\n");

  // Genera el PDF al abrir y cada vez que el pago cambia (por ejemplo, al agregarle la firma).
  useEffect(() => {
    let cancelado = false;
    let url: string | null = null;
    setEstado({ tipo: "generando" });
    generarReciboPagoPdf({
      pago,
      pacienteNombre: patientName,
      clinicaNombre: clinicInfo?.nombre || "",
      perfilDoctor,
      notaPie,
    })
      .then((blob) => {
        if (cancelado) return;
        url = URL.createObjectURL(blob);
        setEstado({ tipo: "listo", blob, url, nombre: nombreArchivo });
      })
      .catch((err) => {
        console.error("No se pudo generar el recibo en PDF", err);
        if (!cancelado) setEstado({ tipo: "error" });
      });
    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
    };
    // El recibo depende del pago y de su pie; el resto (clínica) es contexto fijo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pago, intento, notaPie]);

  const listo = estado.tipo === "listo" ? estado : null;
  const urlPdf = listo?.url;

  // Con el recibo ya armado, el administrador deja lista la liga pública para descargarlo (el paciente no necesita
  // cuenta). Así el botón de WhatsApp no espera nada: abre el chat al instante con la liga ya en el mensaje.
  useEffect(() => {
    if (!urlPdf) return;
    if (!clinicUid || miRol !== "admin") {
      setEstadoEnlace({ tipo: "no_aplica" });
      return;
    }
    let cancelado = false;
    setEstadoEnlace({ tipo: "creando" });
    crearEnlaceReciboApi({
      clinicaId: clinicUid,
      pacienteNombre: patientName,
      clinicaNombre: clinicInfo?.nombre || "",
      logoClinicaUrl: perfilDoctor.logoClinicaUrl || "",
      direccionClinica: perfilDoctor.direccionClinica || "",
      notaPie,
      pago: {
        id: pago.id,
        fecha: pago.fecha,
        medico: pago.medico,
        formaPago: pago.formaPago,
        total: pago.total,
        facturar: pago.facturar,
        // Una firma muy grande no viaja en la liga (el recibo sale igual, sin ella).
        firma: pago.firma && pago.firma.length <= 400_000 ? pago.firma : null,
        lineas: pago.lineas.map((l) => ({ id: l.id, label: l.label, monto: l.monto, tratamientoId: l.tratamientoId, folio: l.folio })),
      },
    })
      .then(({ enlace }) => {
        if (!cancelado) setEstadoEnlace({ tipo: "listo", enlace });
      })
      .catch((err) => {
        console.error("No se pudo crear el enlace del recibo; se mandará el archivo", err);
        if (!cancelado) setEstadoEnlace({ tipo: "error" });
      });
    return () => {
      cancelado = true;
    };
    // Una liga por recibo armado: se rehace solo cuando el PDF se vuelve a generar (firma nueva, saldo al día).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPdf]);

  const descargar = () => {
    if (!listo) return;
    const enlace = document.createElement("a");
    enlace.href = listo.url;
    enlace.download = listo.nombre;
    enlace.click();
  };

  const verOImprimir = () => {
    if (!listo) return;
    // Pestaña nueva con el visor de PDF del navegador (trae sus botones de imprimir y guardar).
    // Si el navegador la bloquea, se descarga.
    if (!window.open(listo.url, "_blank")) descargar();
  };

  const compartirPorWhatsApp = async () => {
    // El administrador espera a que la liga esté lista (es cosa de un instante); si falló, se manda el archivo.
    if (!listo) return;
    const plantilla = plantillaConSaldoCashback(formatosWhatsapp.reciboPago ?? formatosWhatsAppInicial.reciboPago);
    const caption = renderPlantilla(plantilla, {
      clinica: clinicInfo?.nombre || "tu clínica",
      paciente: patientName,
      fecha: pago.fecha,
      medico: pago.medico,
      formaPago: pago.formaPago,
      conceptos: pago.lineas.map((l) => `- ${l.label}: ${formatCurrency(l.monto)}`).join("\n"),
      total: formatCurrency(pago.total),
      proximaCita: buildProximaCitaTexto(citas, patientId, pago.fecha),
      saldoCashback: lineaCashbackRecibo(saldoCashbackDe(patientId)),
    });
    const telefono = patients.find((p) => p.id === patientId)?.phone;

    // Lo normal: el mensaje lleva la liga para descargar el recibo (el paciente no necesita cuenta). La liga ya está
    // creada, así que el chat se abre en el mismo toque, sin esperas ni pasos de más.
    if (estadoEnlace.tipo === "listo") {
      const numero = (telefono ?? "").replace(/\D/g, "");
      const waUrl = `https://wa.me/${numero}?text=${encodeURIComponent(mensajeConEnlaceRecibo(caption, estadoEnlace.enlace))}`;
      if (!window.open(waUrl, "_blank")) {
        // El navegador bloqueó la ventana: se ofrece el botón (un clic directo nunca lo bloquean).
        setMensajeWa("El enlace de tu recibo está listo — ábrelo en WhatsApp para enviarlo.");
        setWaUrlPendiente(waUrl);
      }
      return;
    }

    try {
      // Sin ningún await antes: en celular el menú de compartir debe abrirse en el mismo toque.
      const resultado = await enviarPdfPorWhatsapp({
        blob: listo.blob,
        nombreArchivo: listo.nombre,
        telefono,
        caption,
        ventanaPrevia: null,
      });
      if (resultado.requiereAbrirManualmente) {
        setMensajeWa(undefined);
        setWaUrlPendiente(resultado.waUrl);
      }
    } catch (err) {
      console.error("No se pudo compartir el recibo", err);
      alert("No se pudo compartir el recibo. Puedes descargarlo y enviarlo desde WhatsApp.");
    }
  };

  /** Un enlace de correo no puede llevar adjuntos: se descarga el PDF y se abre el correo redactado. */
  const enviarPorCorreo = () => {
    if (!listo) return;
    descargar();
    const asunto = encodeURIComponent(`Recibo de pago — ${patientName}`);
    const cuerpo = encodeURIComponent(`${buildReciboTexto(patientName, pago)}\n\n(Adjunta el PDF del recibo que se acaba de descargar.)`);
    window.open(`mailto:${patients.find((p) => p.id === patientId)?.email ?? ""}?subject=${asunto}&body=${cuerpo}`, "_blank");
  };

  const boton = "rounded-lg border py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-4">
      {titulo ? (
        <h2 className="text-lg font-semibold text-ink">{titulo}</h2>
      ) : (
        <div className="flex items-center gap-2 text-success">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-lg">✓</span>
          <span className="text-sm font-semibold">Pago registrado correctamente</span>
        </div>
      )}

      <div className="rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm text-ink/70">
        <div className="flex justify-between">
          <span>Total pagado</span>
          <span className="font-semibold text-success">{formatCurrency(pago.total)}</span>
        </div>
        {pago.firma && (
          <div className="mt-2 border-t border-edge/10 pt-2">
            <p className="mb-1 text-xs text-ink/40">Firma registrada</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pago.firma} alt="Firma del paciente" className="h-16 rounded bg-white p-1" />
          </div>
        )}
      </div>

      {/* Paso 1: el PDF */}
      <div className="rounded-lg border border-edge/10 px-3 py-2.5 text-sm" aria-live="polite">
        {estado.tipo === "generando" && <p className="text-ink/60">Generando el recibo en PDF…</p>}
        {listo && (
          <p className="flex items-center gap-2 text-success">
            <span aria-hidden>✓</span>
            <span>
              Recibo en PDF listo <span className="text-ink/50">· {listo.nombre}</span>
            </span>
          </p>
        )}
        {estado.tipo === "error" && (
          <p className="text-danger">
            No se pudo generar el recibo.{" "}
            <button type="button" onClick={() => setIntento((n) => n + 1)} className="font-semibold underline">
              Reintentar
            </button>
          </p>
        )}
      </div>

      {/* Paso 2: verlo, imprimirlo o compartirlo */}
      <div>
        <p className="mb-2 text-xs font-medium text-ink/60">Ahora puedes</p>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={verOImprimir}
            disabled={!listo}
            title="Abre el recibo en PDF para verlo o imprimirlo"
            className={`${boton} border-accent/60 bg-accent/15 text-accent hover:bg-accent/25`}
          >
            Ver / imprimir
          </button>
          <button
            type="button"
            onClick={descargar}
            disabled={!listo}
            title="Guarda el recibo en PDF en este equipo"
            className={`${boton} border-accent/60 bg-accent/15 text-accent hover:bg-accent/25`}
          >
            Descargar PDF
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={compartirPorWhatsApp}
            disabled={!listo || estadoEnlace.tipo === "creando"}
            title="Abre WhatsApp con el mensaje y la liga para que el paciente descargue su recibo en PDF"
            className={`${boton} border-success/40 text-success hover:bg-success/10`}
          >
            {listo && estadoEnlace.tipo === "creando" ? "Preparando enlace…" : "Compartir por WhatsApp"}
          </button>
          <button
            type="button"
            onClick={enviarPorCorreo}
            disabled={!listo}
            className={`${boton} border-info/40 text-info hover:bg-info/10`}
          >
            Enviar por mail
          </button>
        </div>
        {onSolicitarFirma && !pago.firma && (
          <button
            type="button"
            onClick={onSolicitarFirma}
            className="mt-2 w-full rounded-lg border border-edge/15 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Solicitar firma del paciente <span className="font-normal text-ink/50">(saldrá en el recibo)</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="w-full rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
      >
        {titulo ? "Cerrar" : "Listo"}
      </button>

      {/* Se dibuja en el <body>, fuera del cuadro del recibo: dentro de ese cuadro (con efectos de vidrio)
          un elemento "fixed" queda recortado o escondido y no se podía abrir WhatsApp. */}
      {waUrlPendiente &&
        typeof document !== "undefined" &&
        createPortal(<AbrirWhatsAppPrompt waUrl={waUrlPendiente} mensaje={mensajeWa} onCerrar={() => setWaUrlPendiente(null)} />, document.body)}
    </div>
  );
}
