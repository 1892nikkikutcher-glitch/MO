"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import Sidebar, { navItems } from "./Sidebar";
import Inicio from "./pages/Inicio";
import Pacientes from "./pages/Pacientes";
import Agenda from "./pages/Agenda";
import Recetas from "./pages/Recetas";
import PerfilDoctor from "./pages/PerfilDoctor";
import Colaboradores from "./pages/Colaboradores";
import Metas from "./pages/Metas";
import Membresias from "./pages/Membresias";
import Asistencia from "./pages/Asistencia";
import Procedimientos from "./pages/Procedimientos";
import HistorialClinicoAdmin from "./pages/HistorialClinicoAdmin";
import Medicamentos from "./pages/Medicamentos";
import FormatosWhatsApp from "./pages/FormatosWhatsApp";
import Planes from "./pages/Planes";
import Documentos from "./pages/Documentos";
import Gastos from "./pages/Gastos";
import RegulacionSanitaria from "./pages/RegulacionSanitaria";
import Rpbi from "./pages/Rpbi";
import Contabilidad from "./pages/Contabilidad";
import Educacion from "./pages/Educacion";
import DepositoDental from "./pages/DepositoDental";
import CentroRadiodiagnostico from "./pages/CentroRadiodiagnostico";
import LaboratorioDental from "./pages/LaboratorioDental";
import ProximamenteStub from "./pages/ProximamenteStub";
import Contrasena from "./pages/Contrasena";
import ReportePagos from "./pages/ReportePagos";
import BitacoraCitas from "./pages/BitacoraCitas";
import ReporteProcedimientos from "./pages/ReporteProcedimientos";
import MedicosPacientes from "./pages/MedicosPacientes";
import BorrarCitas from "./pages/BorrarCitas";
import Clasificacion from "./pages/Clasificacion";
import Recordatorios from "./pages/Recordatorios";
import Consultorio from "./pages/Consultorio";
import Marketing from "./pages/Marketing";
import Catalogos from "./pages/Catalogos";
import ReporteEncuestas from "./pages/ReporteEncuestas";
import Comisiones from "./pages/Comisiones";
import AvisoPrivacidad from "./pages/AvisoPrivacidad";
import Aseguradoras from "./pages/Aseguradoras";
import SeguimientoAsistencia from "./pages/SeguimientoAsistencia";
import ReporteCorteDiario from "./pages/ReporteCorteDiario";
import ReporteCorteCaja from "./pages/ReporteCorteCaja";
import ReporteGraficas from "./pages/ReporteGraficas";
import ReporteCP from "./pages/ReporteCP";
import ReporteSaldosPendientes from "./pages/ReporteSaldosPendientes";
import ReportePresupuestos from "./pages/ReportePresupuestos";
import ReporteOts from "./pages/ReporteOts";
import ReporteDomiciliacion from "./pages/ReporteDomiciliacion";
import GlobalAgregarPago from "./GlobalAgregarPago";
import GlobalNuevoPaciente from "./GlobalNuevoPaciente";
import PanelAdministrador from "./pages/PanelAdministrador";
import AsistenteFlotante from "./AsistenteFlotante";
import { PatientDataProvider, usePatientData } from "@/context/PatientDataContext";
import { MoConectaProvider } from "@/context/MoConectaContext";
import MoConecta from "./pages/MoConecta";

const paginasConstruidas = new Set([
  "inicio",
  "pacientes",
  "agenda",
  "recetas",
  "administracion-perfil",
  "administracion-colaboradores",
  "administracion-metas",
  "administracion-formatos-whatsapp",
  "membresias",
  "asistencia",
  "administracion-procedimientos",
  "administracion-historial-clinico",
  "administracion-medicamentos",
  "administracion-catalogos",
  "reportes-encuestas",
  "planes",
  "documentos",
  "gastos",
  "regulacion-sanitaria",
  "rpbi",
  "contabilidad",
  "educacion",
  "deposito-dental",
  "centro-radiodiagnostico",
  "laboratorio-dental",
  "contrasena",
  "reportes-bitacora-citas",
  "reportes-procedimientos",
  "administracion-medicos-pacientes",
  "administracion-borrar-citas",
  "reportes-clasificacion",
  "reportes-recordatorios",
  "administracion-consultorio",
  "administracion-marketing",
  "administracion-comisiones",
  "reportes-aviso-privacidad",
  "reportes-aseguradoras",
  "reportes-seguimiento-asistencia",
  "reportes-pagos",
  "reportes-corte-diario",
  "reportes-corte-caja",
  "reportes-graficas",
  "reportes-cp",
  "reportes-saldos-pendientes",
  "reportes-presupuestos",
  "reportes-ots",
  "reportes-domiciliacion",
  "panel-admin",
  "mo-conecta",
]);

const quickActions = [
  { key: "pacientes", pageId: "pacientes", label: "Nuevo Paciente", color: "amber" },
  { key: "agenda", pageId: "agenda", label: "Agenda", color: "amber" },
  { key: "nueva-cita", pageId: "agenda", label: "Nueva Cita", color: "amber", badge: "+" },
  { key: "material", pageId: "deposito-dental", label: "Depósito Dental", color: "amber" },
  { key: "membresias", pageId: "membresias", label: "Nueva Membresía", color: "amber" },
  { key: "gastos", pageId: "gastos", label: "Registrar Pago", color: "green" },
] as const;

function InvitePrompt() {
  const { pendingInvite, aceptarInvite, rechazarInvite } = usePatientData();
  const [enviando, setEnviando] = useState(false);
  if (!pendingInvite) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6 text-center">
        <h3 className="text-base font-semibold text-ink">Invitación de clínica</h3>
        <p className="mt-2 text-sm text-ink/70">
          Te invitaron a colaborar en{" "}
          <span className="font-semibold text-accent">
            {pendingInvite.nombreClinica || "una clínica"}
          </span>{" "}
          como <span className="capitalize">{pendingInvite.role}</span>.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={rechazarInvite}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Ahora no
          </button>
          <button
            onClick={async () => {
              setEnviando(true);
              await aceptarInvite();
              setEnviando(false);
            }}
            disabled={enviando}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:opacity-40"
          >
            {enviando ? "Uniendo…" : "Unirme"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Recordatorio de confidencialidad — una vez por sesión de inicio de
 * sesión (sessionStorage, no localStorage: reaparece si cierran sesión y
 * vuelven a entrar, pero no en cada recarga/navegación mientras siguen
 * adentro). Se muestra antes de que el dentista capture cualquier dato. */
function AvisoConfidencialidad() {
  const [visible, setVisible] = useState(false);
  const [noMostrarDeNuevo, setNoMostrarDeNuevo] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (localStorage.getItem(`avisoConfidencialidadOculto:${uid}`)) return;
    if (!sessionStorage.getItem(`avisoConfidencialidadVisto:${uid}`)) setVisible(true);
  }, []);

  function cerrar() {
    const uid = auth.currentUser?.uid;
    if (uid) {
      sessionStorage.setItem(`avisoConfidencialidadVisto:${uid}`, "1");
      if (noMostrarDeNuevo) localStorage.setItem(`avisoConfidencialidadOculto:${uid}`, "1");
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
        <h3 className="text-base font-semibold text-ink">Antes de continuar</h3>
        <p className="mt-3 text-sm text-ink/70">
          Tanto tu información como consultorio como los datos de tus pacientes se manejan de forma privada en MO:
          solo tu cuenta y tu equipo autorizado tienen acceso a tu expediente clínico, protegido por las reglas de
          seguridad de la plataforma.
        </p>
        <p className="mt-2 text-sm text-ink/70">
          Si compartes un caso mediante MO Conecta, solo el colega que tú elijas — verificado por su correo — puede
          verlo.
        </p>
        <p className="mt-2 text-xs text-ink/50">
          Este aviso es un recordatorio de cómo protege tus datos la plataforma; no sustituye el aviso de privacidad
          que debes tener con tus pacientes conforme a la ley aplicable (LFPDPPP y demás normativa vigente).
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={noMostrarDeNuevo} onChange={(e) => setNoMostrarDeNuevo(e.target.checked)} />
          No volver a mostrar este mensaje
        </label>
        <button
          onClick={cerrar}
          className="mt-5 w-full rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

function QuickActionsBar({
  isLight,
  onNavigate,
  onOpenPago,
  onOpenNuevoPaciente,
}: {
  isLight: boolean;
  onNavigate: (pageId: string) => void;
  onOpenPago: () => void;
  onOpenNuevoPaciente: () => void;
}) {
  const { puedeVerFinanzas, abrirNuevaCitaDesdeInicio } = usePatientData();
  const visibles = quickActions.filter((action) => action.key !== "gastos" || puedeVerFinanzas);

  const manejarClick = (key: (typeof quickActions)[number]["key"], pageId: string) => {
    if (key === "gastos") return onOpenPago();
    if (key === "pacientes") return onOpenNuevoPaciente();
    if (key === "nueva-cita") return abrirNuevaCitaDesdeInicio();
    return onNavigate(pageId);
  };

  return (
    <div className="flex items-center gap-1 sm:flex-1 sm:justify-between sm:gap-0">
      {visibles.map((action) => {
        // Si pageId es un hijo de un submenú (ej. "deposito-dental" bajo
        // "Proveedores"), los hijos no tienen ícono propio — se usa el del
        // padre en su lugar.
        const icon =
          navItems.find((item) => item.id === action.pageId)?.icon ??
          navItems.find((item) => "children" in item && item.children?.some((c) => c.id === action.pageId))?.icon;
        const badge = "badge" in action ? action.badge : undefined;
        return (
          <button
            key={action.key}
            onClick={() => manejarClick(action.key, action.pageId)}
            title={action.label}
            className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors hover:bg-surface ${
              action.color === "green"
                ? "text-success/80 hover:text-success"
                : "text-accent/70 hover:text-accent"
            }`}
            style={
              isLight
                ? undefined
                : {
                    textShadow:
                      action.color === "green"
                        ? "0 0 8px rgba(52,211,153,0.4)"
                        : "0 0 8px rgba(251,146,60,0.4)",
                  }
            }
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="shrink-0">
              {icon}
            </svg>
            {badge && (
              <span
                className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold leading-none text-black"
                style={{ boxShadow: "0 0 6px rgba(251,146,60,0.7)" }}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Pantalla que reemplaza todo el dashboard cuando la clínica está
 * suspendida/cancelada desde el Panel de administrador — es el mecanismo
 * principal para revocar acceso (ver ClinicInfo.estadoCuenta), en vez de
 * borrar el registro de la clínica. Cada clínica ya puede leer su propio
 * doc clinics/{clinicId} con las reglas actuales, no requiere reglas
 * nuevas. */
function CuentaSuspendida({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-8 text-center">
        <h2 className="text-lg font-semibold text-ink">Tu cuenta está suspendida</h2>
        <p className="mt-2 text-sm text-ink/60">
          El acceso a esta clínica está pausado por el momento. Contacta a soporte si crees que es un error.
        </p>
        <button
          onClick={onLogout}
          className="mt-6 w-full rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function DashboardBody({
  activePage,
  setActivePage,
  theme,
  setTheme,
  mobileMenuOpen,
  setMobileMenuOpen,
  showRegistrarPago,
  setShowRegistrarPago,
  showNuevoPaciente,
  setShowNuevoPaciente,
  userEmail,
  onLogout,
  esAdmin,
}: {
  activePage: string;
  setActivePage: (id: string) => void;
  theme: "dark" | "light";
  setTheme: (updater: (t: "dark" | "light") => "dark" | "light") => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  showRegistrarPago: boolean;
  setShowRegistrarPago: (open: boolean) => void;
  showNuevoPaciente: boolean;
  setShowNuevoPaciente: (open: boolean) => void;
  userEmail: string;
  onLogout: () => void;
  esAdmin: boolean;
}) {
  const { clinicInfo } = usePatientData();
  const isLight = theme === "light";
  const activeLabel =
    activePage === "panel-admin"
      ? "Panel de administrador"
      : navItems.find((item) => item.id === activePage)?.label ??
        navItems.flatMap((item) => ("children" in item ? item.children ?? [] : [])).find(
          (child) => child.id === activePage
        )?.label ??
        "";

  // El dueño de la plataforma nunca queda bloqueado por su propio
  // estadoCuenta — si no, una suspensión accidental de su propia clínica lo
  // dejaría sin forma de entrar al Panel de administrador para revertirla.
  if (!esAdmin && clinicInfo && (clinicInfo.estadoCuenta === "suspendida" || clinicInfo.estadoCuenta === "cancelada")) {
    return <CuentaSuspendida onLogout={onLogout} />;
  }

  return (
    <div data-theme={theme} className="flex min-h-screen bg-app text-ink">
      <Sidebar
        active={activePage}
        onNavigate={setActivePage}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        esAdmin={esAdmin}
      />

      <main className="min-w-0 flex-1">
        <header className="flex h-16 items-center gap-2 border-b border-edge/10 px-3 print:hidden sm:gap-4 sm:px-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink/70 hover:bg-surface hover:text-ink md:hidden"
            title="Abrir menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <div className="min-w-0 flex-1 overflow-x-auto">
            <QuickActionsBar
              isLight={isLight}
              onNavigate={setActivePage}
              onOpenPago={() => setShowRegistrarPago(true)}
              onOpenNuevoPaciente={() => setShowNuevoPaciente(true)}
            />
          </div>

          <span className="hidden h-6 w-px bg-edge/10 sm:block" />

          <span className="hidden truncate text-sm text-ink/50 sm:inline">{userEmail}</span>
          <button
            onClick={onLogout}
            className="shrink-0 rounded-lg border border-edge/10 bg-surface px-2.5 py-1.5 text-xs text-ink/70 transition-colors hover:text-ink sm:px-3"
          >
            Cerrar sesión
          </button>
        </header>

        <div className="px-3 py-6 sm:px-6 sm:py-8">
          <h1 className="mb-6 text-2xl font-semibold print:hidden">
            {activePage === "inicio" ? "Dashboard Principal" : activeLabel}
          </h1>
          {activePage === "inicio" && <Inicio />}
          {activePage === "panel-admin" && <PanelAdministrador />}
          {activePage === "mo-conecta" && <MoConecta />}
          {activePage === "pacientes" && <Pacientes />}
          {activePage === "agenda" && <Agenda />}
          {activePage === "recetas" && <Recetas />}
          {activePage === "administracion-perfil" && <PerfilDoctor />}
          {activePage === "administracion-colaboradores" && <Colaboradores />}
          {activePage === "administracion-metas" && <Metas />}
          {activePage === "administracion-formatos-whatsapp" && <FormatosWhatsApp />}
          {activePage === "membresias" && <Membresias />}
          {activePage === "asistencia" && <Asistencia />}
          {activePage === "administracion-procedimientos" && <Procedimientos />}
          {activePage === "administracion-historial-clinico" && <HistorialClinicoAdmin />}
          {activePage === "administracion-medicamentos" && <Medicamentos />}
          {activePage === "planes" && <Planes />}
          {activePage === "documentos" && <Documentos />}
          {activePage === "gastos" && <Gastos />}
          {activePage === "regulacion-sanitaria" && <RegulacionSanitaria />}
          {activePage === "rpbi" && <Rpbi />}
          {activePage === "contabilidad" && <Contabilidad />}
          {activePage === "educacion" && <Educacion />}
          {activePage === "deposito-dental" && <DepositoDental />}
          {activePage === "centro-radiodiagnostico" && <CentroRadiodiagnostico />}
          {activePage === "laboratorio-dental" && <LaboratorioDental />}
          {activePage === "contrasena" && <Contrasena />}
          {activePage === "reportes-bitacora-citas" && <BitacoraCitas />}
          {activePage === "reportes-procedimientos" && <ReporteProcedimientos />}
          {activePage === "administracion-medicos-pacientes" && <MedicosPacientes />}
          {activePage === "administracion-borrar-citas" && <BorrarCitas />}
          {activePage === "reportes-clasificacion" && <Clasificacion />}
          {activePage === "reportes-recordatorios" && <Recordatorios />}
          {activePage === "administracion-consultorio" && <Consultorio />}
          {activePage === "administracion-marketing" && <Marketing />}
          {activePage === "administracion-comisiones" && <Comisiones />}
          {activePage === "reportes-aviso-privacidad" && <AvisoPrivacidad />}
          {activePage === "reportes-aseguradoras" && <Aseguradoras />}
          {activePage === "reportes-seguimiento-asistencia" && <SeguimientoAsistencia />}
          {activePage === "reportes-pagos" && <ReportePagos />}
          {activePage === "reportes-corte-diario" && <ReporteCorteDiario />}
          {activePage === "reportes-corte-caja" && <ReporteCorteCaja />}
          {activePage === "reportes-graficas" && <ReporteGraficas />}
          {activePage === "reportes-cp" && <ReporteCP />}
          {activePage === "reportes-saldos-pendientes" && <ReporteSaldosPendientes />}
          {activePage === "reportes-presupuestos" && <ReportePresupuestos />}
          {activePage === "reportes-ots" && <ReporteOts />}
          {activePage === "reportes-domiciliacion" && <ReporteDomiciliacion />}
          {activePage === "administracion-catalogos" && <Catalogos />}
          {activePage === "reportes-encuestas" && <ReporteEncuestas />}
          {!paginasConstruidas.has(activePage) && <ProximamenteStub label={activeLabel} />}
        </div>
      </main>

      {showRegistrarPago && (
        <GlobalAgregarPago onClose={() => setShowRegistrarPago(false)} />
      )}
      {showNuevoPaciente && (
        <GlobalNuevoPaciente onClose={() => setShowNuevoPaciente(false)} />
      )}

      <AsistenteFlotante activePage={activePage} activeLabel={activeLabel} />
    </div>
  );
}

export default function Dashboard({
  uid,
  userEmail,
  onLogout,
}: {
  uid: string;
  userEmail: string;
  onLogout: () => void;
}) {
  const [activePage, setActivePage] = useState("inicio");
  const [showRegistrarPago, setShowRegistrarPago] = useState(false);
  const [showNuevoPaciente, setShowNuevoPaciente] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const esAdmin = uid === process.env.NEXT_PUBLIC_ADMIN_UID;

  return (
    <PatientDataProvider uid={uid} userEmail={userEmail} onIrAPagina={setActivePage}>
      <MoConectaProvider uid={uid}>
        <AvisoConfidencialidad />
        <InvitePrompt />
        <DashboardBody
          activePage={activePage}
          setActivePage={setActivePage}
          theme={theme}
          setTheme={setTheme}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          showRegistrarPago={showRegistrarPago}
          setShowRegistrarPago={setShowRegistrarPago}
          showNuevoPaciente={showNuevoPaciente}
          setShowNuevoPaciente={setShowNuevoPaciente}
          userEmail={userEmail}
          onLogout={onLogout}
          esAdmin={esAdmin}
        />
      </MoConectaProvider>
    </PatientDataProvider>
  );
}
