# MO — Informe de funcionamiento para el odontólogo

Fecha del informe: 1 de noviembre de 2026 (revisión de la noche).
Alcance: toda la app (`mo`), probada en el emulador local de Firebase (nunca en producción) y revisada contra el código.

---

## 1. Resumen: cómo quedó la app esta noche

**Estado general: lista para usarse mañana.** Probé la app módulo por módulo y flujo por flujo. Encontré y corregí varios errores reales (los detallo en la sección 7). Nada de lo corregido está en Vercel todavía: sigue en tu carpeta local hasta que me digas **"sube a vercel"**.

| Qué se verificó | Resultado |
|---|---|
| Los 58 módulos y subpáginas abren sin errores | **58 de 58 bien** |
| Flujos completos de uso (crear, guardar, recargar, comprobar) | **Todos pasan** (lista en la sección 6) |
| Pruebas automáticas de lógica (`vitest`) | **1,210 de 1,210 bien** |
| Revisión de tipos (`tsc`) | **Sin errores** |
| Compilación de producción (`next build`) | **Compila bien** |
| Reglas de seguridad de Firestore y Storage | **157 pasan, 2 omitidas, 0 fallan** |
| Timbrado de facturas (CFDI) | Probado solo contra un PAC falso. **No contra Facturama real** |

Lo que **no** pude probar (te lo digo claro en la sección 8): envío real de WhatsApp, cobro real con Stripe, timbrado real, MO Conecta entre dos cuentas, entrar como colaborador o cirujano dentista, impresión física y uso en celular.

Hay **8 decisiones** que son tuyas, no mías (sección 9).

---

## 2. Cómo es un día de trabajo con MO

1. **Abres Inicio.** Te dice qué requiere atención (citas de mañana sin confirmar, notas sin terminar, saldos, laboratorio vencido, equipos con falla) y a qué pacientes ya les toca su revisión de 6 meses.
2. **Revisas la Agenda.** Ves el día, la semana o el mes; mueves citas arrastrándolas; confirmas por WhatsApp.
3. **Llega el paciente.** Abres su expediente, lees alergias y antecedentes (salen en rojo arriba) y marcas la cita como "En espera" o "Atendida".
4. **Atiendes.** Usas **"Registrar atención de hoy"**: seis secciones guiadas (cómo llega, qué encontraste, diagnóstico, qué hiciste, cómo terminó, indicaciones). Se autoguarda; al final firmas.
5. **Receta.** Eliges paciente y medicamentos; MO avisa de alergias, calcula dosis pediátricas, asigna folio e imprime o manda por WhatsApp.
6. **Presupuesto.** Armas el plan con procedimientos del catálogo, lo imprimes o lo mandas por WhatsApp.
7. **Cobras.** Registras el pago ligado a los tratamientos; sale el recibo; si pidieron factura, marcas "Activo para facturar".
8. **Cierras el día.** Corte de caja, cierre del día (cita de mañana por confirmar) y, cuando toque, facturas.

---

## 3. Funciones principales (lo que usas todos los días)

### 3.1 Inicio
Tablero de arranque.
- **Requieren atención:** alertas por prioridad, cada una te lleva a donde se resuelve (saldos, presupuestos sin seguimiento, pagos por facturar, citas de mañana sin confirmar, laboratorio vencido, "No asistió", notas en borrador, equipos con falla, médicos sin firma digital, casos de MO Conecta).
- **Pendientes del consultorio:** tu lista de tareas, con paso directo a "Faltantes por surtir".
- **Pacientes por proponer cita:** a quienes ya les toca su prevención de 6 meses y no tienen cita; con chips de fechas y botón de WhatsApp.
- **Finanzas** (solo con permiso): ingresos, ticket promedio, saldo pendiente, ingreso por hora clínica, presupuestado, conversión, metas.
- **Pacientes:** atendidos, nuevos, activos, ocupación, cancelaciones, cumpleaños del mes, gráficas a 12 meses.
- Selector de periodo (Hoy, Semana, Mes, Trimestre, Año, Personalizado) y accesos rápidos (Nuevo Paciente, Nueva Cita, Registrar Pago, Depósito Dental, Nueva Membresía).

### 3.2 Pacientes y expediente
- **Lista:** búsqueda por nombre, teléfono, fecha o edad; orden alfabético, por edad o reciente; importar (Excel/CSV/JSON) y exportar; **fusionar dos expedientes duplicados**.
- **Expediente (12 pestañas):** Datos del Paciente · Consentimientos Informados · Historia Clínica · Plan de Tratamiento y Presupuesto · Pagos · Membresía · Cashback · Fotografías · Laboratorios · Listado de Citas · Notas de Evolución · MO Conecta.
- **Encabezado:** estrellas del paciente, médico responsable, alertas rojas de alergias y diagnóstico sistémico, resumen de citas (verde/amarillo/rojo según cuánto hace de su última visita), "Descargar expediente (PDF)" y "Enviar resumen al paciente".
- Flechas ← → para pasar al paciente anterior o siguiente de la agenda sin salir de la pestaña en la que estás.

### 3.3 Historia Clínica y odontograma
- Antecedentes patológicos y no patológicos, signos vitales, exploración, examen estomatológico y de oclusión, higiene bucal, diagnóstico sistémico y bucal.
- **Odontograma de superficies:** cada diente con sus 5 caras; rojo = por tratar, azul = realizado; dentición permanente y temporal.
- **Valoración por diente** (32 dientes: relación corona-raíz, reabsorción, furcas, caries, patología periapical, pronóstico).
- **Diagnósticos con estado** (Sospecha, Provisional, Confirmado, Descartado) y **plan por prioridad** (Urgente, Alta, Media, Electiva), con paso directo a presupuesto.
- La plantilla de preguntas la configuras tú en Administración → Historial Clínico. Se **guarda sola** cada segundo.
- *Verificado esta noche:* llenar alergias, motivo y respuestas, guardar, recargar la página y comprobar que persisten.

### 3.4 Agenda
- Vistas Día, 3 días, Semana y Mes; "Ver por" Todos, Médicos o Unidades; filtros por recurso y por sede.
- Crear cita con un clic en un espacio vacío; **arrastrar para reagendar** (avisa choques con médico o unidad y si queda fuera del bloque de atención).
- Estatus: Agendada, Confirmada, En espera, Atendida, Reagendada, Cancelada, No Asistió; con motivo cuando es cancelación o inasistencia.
- La cita puede **generar su propio presupuesto** si tiene costo; confirmación por WhatsApp; seguimiento recurrente o automático; aviso si el paciente tiene inasistencias previas; horario preferente del paciente con tres fechas sugeridas.
- Resumen del día (programadas, atendidas, horas clínicas, ocupación) y exportación a Google Calendar (.ics).
- *Verificado esta noche:* crear una cita desde un hueco vacío, verla en semana y mes, abrirla y cambiarle el estatus.

### 3.5 Notas de evolución (la atención de hoy)
- Seis secciones en acordeón con barra de progreso: ¿Cómo llega hoy? · ¿Qué encontraste? · Diagnóstico · ¿Qué hiciste hoy? · ¿Cómo terminó el paciente? · Indicaciones y siguiente paso.
- Plantillas por tipo de procedimiento (Valoración, Limpieza, Resina, Endodoncia, Extracción, Ortodoncia, Prótesis, Cirugía, Odontopediatría, Urgencia).
- **Autoguardado** local y remoto; si hubo cambios desde otro dispositivo, te deja elegir qué versión conservar.
- **No deja firmar incompleta.** Al firmar, muestra que la nota **ya no podrá modificarse** y pide "Confirmar y firmar".
- Si el paciente no llegó (cancela, reagenda, no llega) hay una **nota administrativa rápida** que además actualiza la cita.
- *Verificado esta noche:* bloqueo al firmar vacía, llenado de las seis secciones, firma con confirmación y aparición en el historial.

### 3.6 Plan de tratamiento y presupuesto
- Presupuesto con médico, vigencia (30 días por omisión), dientes del odontograma y procedimientos del catálogo; precio por diente; descuento; cortesía.
- **Procedimiento no catalogado:** se agrega al vuelo y queda en el catálogo.
- Estado por folio (Pendiente, Aceptado, Rechazado, Expirado); renovar vigencia; imprimir; WhatsApp; vista previa.
- **Presupuesto completo** (junta varios folios) y **Comparativa de Rehabilitación** (2 a 4 opciones calificadas en función, estética, conservación biológica y economía).
- *Verificado esta noche:* crear presupuesto con procedimiento no catalogado.

### 3.7 Recetas
- Médico, paciente, peso/estatura/temperatura, alergias (se llenan solas desde la Historia Clínica) y diagnóstico.
- Catálogo de medicamentos con **cálculo de dosis pediátrica por peso** y aviso "¡Cuidado!" si el medicamento coincide con una alergia.
- **Folio consecutivo**, firma digital del médico, cédula y especialidad del médico elegido, vigencia y dirección de la clínica.
- Guardar, imprimir o enviar el PDF por WhatsApp; bitácora de "Recetas expedidas" con búsqueda.
- *Verificado esta noche:* elegir paciente y medicamento, guardar y recibir folio, imprimir **con el folio ya en la hoja** y encontrarla en la bitácora.

### 3.8 Pagos y cobranza
- Pestaña **Pagos** del expediente: total presupuestado, total pagado, saldo pendiente.
- Registrar pago: médico (obligatorio), forma de pago (Efectivo, Tarjeta de crédito o débito, Transferencia, Cheque, Cashback), tratamientos que cubre y monto; "Activo para facturar"; casilla de promoción/cortesía.
- **Recibo** para imprimir, descargar en PDF, mandar por WhatsApp o correo; **firma del paciente** en pantalla.
- **Devoluciones** (total o parcial, con motivo y método). Un pago con devolución ya no se edita ni se elimina.
- Eliminar un pago exige un **motivo** y queda en "Pagos eliminados" y en la Papelera.
- *Verificado esta noche:* registrar un pago, verlo en Reportes → Pagos y en Facturación → Por facturar.

---

## 4. Funciones secundarias (apoyan al consultorio)

### 4.1 Dinero y reportes (solo administrador)
- **Corte de caja** (por día, por forma de pago, por médico, con comisión) y **Corte diario** (versión corta).
- **Reportes** (21): Pagos, Devoluciones, Corte de caja, Corte diario, Porcentajes por médico, Cierre del día, Evaluación semanal, Presupuestos, Saldos pendientes, Aviso de privacidad, Aseguradoras, Órdenes de trabajo, Gráficas, Bitácora de citas, Encuestas de satisfacción, Clasificación de pacientes, Seguimiento de asistencia, Recordatorios, Procedimientos, Código postal y Domiciliación.
- **Gastos:** captura por categoría y naturaleza (costo, gasto, inversión, financiero); utilidad del mes y "sobres" con tope por categoría (barra verde, amarilla desde 80 %, roja desde 100 %).
- **Contabilidad y finanzas:** datos de tu contador, resumen mensual para compartir, **Indicadores del negocio** (costo por hora, utilidad por tratamiento, equilibrio, cobranza), balance y fondos.
- **Metas:** meta mensual y derivadas por semana, quincena y día; el avance se ve en Inicio.
- **Comisiones:** cálculo por tratamiento atendido con el "costo al odontólogo" del catálogo.

### 4.2 Facturación (CFDI 4.0)
- Los pagos marcados "Activo para facturar" aparecen en **Por facturar**.
- Dos caminos: **registro manual** (serie, folio, UUID de una factura hecha fuera) o **timbrar desde MO** con Facturama.
- Facturas emitidas con descarga (PDF/XML) y **cancelación con motivos del SAT**.
- Formas de pago SAT: Efectivo, Cheque, Transferencia, Tarjeta de crédito y débito. **Cashback no se puede timbrar.**
- **Pendiente de tu lado:** abrir cuenta en Facturama, subir tu CSD, poner las credenciales en Vercel y llenar "Ajustes de timbrado".

### 4.3 Membresías y Cashback
- **Membresías:** planes con vigencia, precio y beneficios (de uso con límite o de descuento); activar a un paciente cobra el plan y lo registra como pago.
- **Cashback:** cada pago de tratamiento acumula un porcentaje que el paciente canjea en pagos futuros, con topes configurables; aprobación, transferencia entre pacientes y aviso de saldos por vencer.
- *Verificado esta noche:* crear plan, activarlo y cobrarlo (**ahora sí sale en Reportes → Pagos y en Facturación**), cambiar el porcentaje de Cashback y comprobar que persiste.

### 4.4 Documentos, consentimientos y educación
- **17 documentos imprimibles** con datos del paciente y del médico: consentimiento general, de ortodoncia, cirugía, endodoncia, odontopediatría, prótesis, conclusión de ortodoncia, uso de imagen, constancia de permanencia, aviso de privacidad, acuerdo de pago, contrato de servicios, carnet, hojas de indicaciones y contrato de ortodoncia configurable.
- **Importante:** estos documentos **solo se imprimen; MO no guarda la versión firmada.** Para conservarla, escanéala y súbela en Fotografías → Documentos con tipo "Consentimiento firmado".
- **Educación:** láminas de indicaciones para reforzar con el paciente (se mandan por WhatsApp como texto).

### 4.5 Fotografías y documentos del paciente
Perfil, INE (frente y reverso), extraorales, intraorales (por vista, con versiones anteriores), radiografías (por tipo, con nota), documentos (estudios, recetas, referencias, consentimientos firmados). Quitar una foto la manda a la Papelera.

### 4.6 Laboratorios y proveedores
- **Laboratorio dental:** directorio, órdenes de trabajo con odontograma, etapas y costo, envío por WhatsApp; seguimiento Enviado / En proceso / Recibido en el expediente.
- **Depósito dental:** directorio, **faltantes por surtir** con urgencia (pedido por WhatsApp) y **control de caducidades**.
- **Centro de radiodiagnóstico:** directorio para referir estudios.

### 4.7 Operación del consultorio
- **Mantenimiento de equipos:** inventario, programa de mantenimiento (mensual a anual), reporte de fallas, bitácora de servicios, aviso al ingeniero biomédico por WhatsApp; alertas en Inicio.
- **Asistencia:** checador del personal (entrada y salida contra horario) y llegada de pacientes a su cita.
- **Regulación Sanitaria:** lista de 16 verificaciones (NOM-004, NOM-087, NOM-013, LFPDPPP, COFEPRIS) con fecha y notas.
- **RPBI:** directorio de empresas recolectoras.
- **Marketing:** promociones con vigencia y cumpleaños del mes con botón de felicitar por WhatsApp.

### 4.8 Administración (configuración)
Procedimientos y costos · Historial Clínico (plantilla) · Consultorio (datos y horario) · Médicos y Recetas (cédula, firma, logos por médico) · Medicamentos · Formatos de WhatsApp · Metas · Presupuesto de Gastos · Comisiones · Médicos vs pacientes · Contrato de Ortodoncia · Colaboradores y roles · Borrar citas · **Papelera**.

### 4.9 Papelera (tu red de seguridad)
Todo lo que se elimina pasa antes por la Papelera con quién lo eliminó y cuándo; se restaura con un clic y nunca se purga (por la NOM-004). *Verificado esta noche:* eliminar un gasto, verlo en la Papelera y restaurarlo.

### 4.10 MO Conecta (red entre colegas)
- **Directorio** de odontólogos con filtros y perfil verificable.
- **Interconsultas:** envías un paciente a un colega con consentimiento obligatorio; el colega acepta, avanza el caso y devuelve una **contrarreferencia**.
- **Expediente compartido** por secciones que tú eliges, con interruptor para dejar de compartir (nunca incluye precios, pagos, contacto ni INE).
- **Calendarios compartidos:** el colega solo ve ocupado o libre, sin nombres de pacientes.
- **Invitaciones** por enlace (un solo uso, vencen en 7 días) y **afiliación** a tu clínica.

### 4.11 Cuenta y suscripción
Contraseña (por correo), **Planes** (Prueba 14 días, Consultorio $280 y Clínicas $840 cada 4 semanas) con pago en Stripe.

---

## 5. Roles: qué ve cada quien

| | Administrador | Colaborador | Cirujano dentista |
|---|---|---|---|
| Inicio, Pacientes, Agenda, Recetas, Documentos, Educación, Membresías | Sí | Sí | Sí |
| Pagos, devoluciones, gastos, facturas, cashback | Sí | No (lo bloquean las reglas) | No |
| Reportes, Contabilidad, Asistencia | Sí | Menú visible; el acceso a datos de dinero lo limitan las reglas | No |
| Administración | Todo | Con límites ("Solo el dueño…") | No |
| Eliminar registros | Sí | No | No |
| Papelera y restaurar | Sí | No | No |

Las **reglas de Firestore** son las que mandan de verdad: aunque una pantalla deje intentar algo, el servidor lo rechaza si el rol no corresponde (y esto está cubierto por 157 pruebas).

---

## 6. Qué probé exactamente (en el emulador)

| Flujo | Pasos verificados |
|---|---|
| **Humo general** | Abrir los 58 módulos y subpáginas: 58/58 sin errores de consola ni de red |
| **Clínico** | Crear paciente · abrir expediente · campos opcionales sin llenarse solos · presupuesto con procedimiento no catalogado · pago activo para facturar · aparece en Reportes → Pagos · aparece en Facturación → Por facturar |
| **Membresía** | Crear plan · activar y cobrar · sale en Reportes → Pagos · sale en Facturación |
| **Receta** | Elegir paciente y medicamento · guardar con folio · imprimir con folio en la hoja · buscarla en la bitácora |
| **Agenda** | Crear cita desde un hueco · verla en semana y mes · abrirla y cambiar estatus |
| **Gastos** | Registrar · verlo en la lista · pasa por Contabilidad sin error · eliminar |
| **Notas de evolución** | Bloqueo al firmar incompleta · llenar 6 secciones · firmar con confirmación · aparece en el historial · recuperación de borrador |
| **Historia clínica** | Llenar · guardar · recargar y comprobar persistencia |
| **Equipos** | Alta con programa de mantenimiento · reportar falla (estado "Con falla") · bitácora general · eliminar |
| **Cashback** | Cambiar porcentaje · guardar · persiste al recargar |
| **Papelera** | Crear y eliminar un gasto · verlo en Papelera · restaurarlo |
| **Timbrado** | Armar CFDI, timbrar, cancelar y descargar contra un PAC **falso** (15 pruebas automáticas más) |

Después de limpiar el emulador y resembrarlo, repetí la suite de flujos desde cero y pasó completa. Una excepción: en Agenda, el paso de la vista Mes lo comprobé a ojo en pantalla (esa vista muestra "N citas" por día, sin nombres) y no volví a correr ese paso automático, porque la hora de prueba ya estaba ocupada por la corrida anterior.

---

## 7. Errores que encontré y corregí esta noche

Todo está en tu carpeta local y **no** en Vercel. No requiere publicar reglas.

1. **Cobro de membresía invisible en reportes.** Al activar una membresía el pago se guardaba en el expediente pero **no aparecía** en Reportes → Pagos ni en Facturación. Ahora aparece en ambos.
2. **Receta impresa sin folio.** Si presionabas "Imprimir" sin guardar antes, la hoja podía salir con "Folio:" vacío. Ahora el folio y la hora ya están en la hoja cuando se abre la impresión.
3. **Fechas "de hoy" calculadas en UTC.** En 14 archivos (pagos, citas, consentimientos, contratos, PDFs, membresías…) la fecha podía saltar al día siguiente después de las 6 pm hora de México. Ahora usan la fecha local.
4. **Datos del paciente que se llenaban solos.** Sexo, estado civil, escolaridad, nivel socioeconómico, ingreso y vivienda arrancaban con la primera opción y se guardaban como dato real aunque nadie los eligiera. Ahora arrancan en "Sin especificar".
5. **Pagos:** el cuadro azul decía "Total del presupuesto" pero mostraba el saldo pendiente; el abono podía exceder lo pendiente; y la bitácora se actualizaba desde dentro de otra función (riesgo de duplicado en desarrollo). Corregidos.
6. **Nombre de paciente vacío.** "Guardar cambios" aceptaba un nombre en blanco. Ahora avisa y no guarda.
7. **Receta sin médico.** Si los médicos cargaban después de abrir Recetas, el selector mostraba un médico pero el estado quedaba vacío (receta sin cédula). Ahora se sincronizan.
8. **Botón engañoso en notas.** "Descartar borrador" no descartaba nada (solo abría una nota nueva y el borrador viejo se quedaba). Ahora dice **"Empezar una nota nueva"**. Ver decisión 1.
9. **Filtro por unidad** en Bitácora de citas y en Borrar citas omitía las citas que tenían médico y unidad a la vez. Corregido.
10. **Botón "MO Conecta" del encabezado** cambiaba de pestaña sin avisar de cambios sin guardar en Datos del Paciente. Ahora pregunta.
11. **Reporte de devoluciones** mostraba el id interno de quien registró; ahora muestra el nombre.
12. **Textos desactualizados** en la ayuda y en pantalla (facturación y timbrado, RPBI, colaboradores, cashback, contabilidad).
13. **Logo de MO** (letras más grandes, sin serif, sombra al 20 %) — ya estaba publicado.

---

## 8. Límites honestos de esta revisión

- **Timbrado:** solo contra un PAC simulado. Con Facturama real puede haber diferencias de formato; pruébalo primero en el ambiente de pruebas (sandbox) con un pago de prueba.
- **No probé:** WhatsApp real (MO solo abre `wa.me` con el mensaje armado), Stripe real, correo, impresión física ni cómo se ven los PDF en papel.
- **No probé como colaborador ni cirujano dentista** con sesión real; esos permisos están cubiertos por las pruebas de reglas, no por navegación.
- **MO Conecta entre dos cuentas** no se probó de punta a punta (las rutas y reglas sí tienen pruebas automáticas).
- **Celular:** no hice una pasada completa en pantalla pequeña.
- **Compilación de producción:** pasó a la tercera corrida. Las dos primeras de esta tanda fallaron por un error de descarga de la tipografía de Google (`next/font`), no por el código. Si Vercel llegara a mostrar ese mismo error al publicar, basta con volver a lanzar el despliegue.
- **Lo que dice este informe sobre módulos que no ejecuté** viene de leer el código; donde hay duda lo marco.
- Los fallos que vi en mis propias pruebas fueron de mis datos de prueba (por ejemplo, médicos que no existían en una base recién limpiada), no de la app; los descarté tras confirmarlo.

---

## 9. Decisiones que son tuyas

1. **Borrar borradores de notas.** Hoy no hay forma de eliminar un borrador sin firmar; se acumulan en la lista de "Borradores". ¿Quieres un botón "Eliminar borrador" (que pase por la Papelera)? Tocaría datos clínicos, por eso no lo hice solo.
2. **Correcciones a notas firmadas.** La pantalla dice que se corrigen con "aclaraciones", pero ninguna pantalla permite agregarlas. ¿La construimos o quitamos el texto? Importa por la NOM-004.
3. **Colaborador y finanzas.** Los textos dicen que el colaborador "no ve pagos ni cortes", pero el menú solo le oculta Cashback y Facturación. Las reglas sí le bloquean los datos de dinero. ¿Quieres ocultarle también Reportes, Gastos y Contabilidad del menú?
4. **Regulación Sanitaria para el colaborador.** Puede abrirla y marcar puntos, pero lo que marque **no se guarda y no se lo avisa**. ¿Se la ocultamos o le permitimos guardar?
5. **Renovación automática de membresía.** La casilla existe pero no hace nada. ¿La quitamos o la implementamos?
6. **Beneficios de descuento de las membresías.** Son informativos; no se aplican solos al cobrar. ¿Quieres que se apliquen?
7. **"Tipos de precios"** (Consultorio, Convenio, Particular, Seguro) en el presupuesto es solo una etiqueta; no cambia ningún precio.
8. **MO Conecta y roles.** Cualquier colaborador o cirujano dentista puede mandar datos de pacientes a colegas. ¿Es lo que quieres o solo el administrador?

**Además, de seguridad menor:** la ruta de pago `/api/stripe/checkout` no pide sesión (cualquiera con el identificador de una clínica puede crear una sesión de pago para ella). No pone en riesgo datos, pero conviene cerrarla; puedo hacerlo cuando digas.

---

## 10. Lo que sigue (de tu lado)

- Decir **"sube a vercel"** para publicar las correcciones de esta noche.
- **Facturama:** cuenta, CSD, variables `FACTURAMA_USUARIO` y `FACTURAMA_CONTRASENA` en Vercel (y `FACTURAMA_AMBIENTE=produccion` cuando pases a producción), y llenar "Ajustes de timbrado".
- **Stripe:** configurar `STRIPE_WEBHOOK_SECRET` en Vercel.
- Revisar en producción Agenda → Recursos por si hay recursos duplicados.
- Responder la pantalla "MO es gratis por ahora" (hoy el cobro está activo: `MO_ES_GRATIS = false`).
