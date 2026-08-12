/** Contenido de las hojas de indicaciones post-tratamiento por especialidad,
 * usadas en el módulo de Documentos. Son recomendaciones generales de
 * cuidado — no sustituyen las instrucciones específicas que el clínico dé
 * en consulta para cada caso. */

export type TipoHojaIndicaciones = "protesis" | "ortodoncia" | "cirugiaBucal" | "odontopediatria";

export type HojaIndicaciones = {
  titulo: string;
  instrucciones: string[];
};

export const hojasIndicaciones: Record<TipoHojaIndicaciones, HojaIndicaciones> = {
  protesis: {
    titulo: "Indicaciones para Tratamiento de Prótesis",
    instrucciones: [
      "Durante los primeros días es normal sentir la prótesis incómoda o notar exceso de saliva — es temporal mientras la boca se adapta.",
      "Retira y cepilla tu prótesis después de cada alimento, con cepillo suave y jabón neutro o pasta especial para prótesis; evita pasta dental abrasiva.",
      "Al dormir, retira la prótesis y colócala en un vaso con agua o solución para prótesis, para que tus encías descansen por la noche.",
      "Evita alimentos muy duros, pegajosos o correosos durante las primeras semanas de adaptación.",
      "Si notas una zona de presión, dolor o lastimadura, no ajustes la prótesis tú mismo(a) — acude a revisión para un ajuste profesional.",
      "Acude a tus citas de control programadas; los ajustes son parte normal del proceso de adaptación.",
      "Si la prótesis se afloja, se rompe o se desajusta, no intentes repararla en casa — contáctanos.",
    ],
  },
  ortodoncia: {
    titulo: "Indicaciones para Tratamiento de Ortodoncia",
    instrucciones: [
      "Es normal sentir presión o leve molestia en los dientes de 2 a 4 días después de cada ajuste — puedes tomar el analgésico que te recomendamos si es necesario.",
      "Cepíllate después de cada alimento y usa el cepillo interdental o hilo especial para ortodoncia; la higiene es más importante que nunca con brackets.",
      "Evita alimentos duros, pegajosos o que se muerdan directamente (manzana entera, palomitas, chicles, dulces pegajosos, hielo) — pueden despegar los brackets o doblar los alambres.",
      "Si un bracket se despega o un alambre te lastima, cubre la zona con la cera que te entregamos y contáctanos para agendar una revisión — no lo dejes para la siguiente cita programada.",
      "Usa tus ligas o aparatos removibles el tiempo indicado — el resultado depende de tu constancia en casa.",
      "Acude puntual a tus citas de ajuste; espaciarlas alarga el tratamiento.",
      "Si practicas deportes de contacto, usa un protector bucal.",
    ],
  },
  cirugiaBucal: {
    titulo: "Indicaciones Posteriores a Cirugía Bucal",
    instrucciones: [
      "Muerde la gasa con presión firme durante 30 a 45 minutos; si sigue sangrando, coloca una gasa nueva.",
      "No enjuagues, escupas con fuerza ni uses popote durante las primeras 24 horas — puede desprender el coágulo y retrasar la cicatrización.",
      "Aplica hielo local (20 minutos sí, 20 minutos no) durante las primeras 24 horas para reducir la inflamación.",
      "Toma los medicamentos recetados en el horario indicado, aunque el dolor haya disminuido.",
      "Come alimentos blandos, fríos o tibios el primer día (yogur, puré, licuados); evita alimentos calientes, picantes, duros o con semillas pequeñas.",
      "No fumes ni consumas alcohol durante al menos 72 horas — retrasan la cicatrización y aumentan el riesgo de infección.",
      "A partir del segundo día, realiza enjuagues suaves con agua tibia y sal después de cada alimento.",
      "Es normal cierta inflamación los primeros 2 a 3 días; si el sangrado es abundante, hay fiebre o el dolor aumenta en vez de disminuir, contáctanos de inmediato.",
    ],
  },
  odontopediatria: {
    titulo: "Indicaciones para Tratamiento de Odontopediatría",
    instrucciones: [
      "Supervisa el cepillado de tu hijo(a) dos veces al día con la cantidad de pasta dental adecuada para su edad.",
      "Si se usó anestesia local, vigila que el niño(a) no se muerda el labio, mejilla o lengua mientras sigue dormida esa zona — el efecto dura entre 1 y 3 horas.",
      "Ofrece alimentos blandos y evita bebidas o alimentos muy calientes mientras dure el efecto de la anestesia.",
      "Es normal cierta molestia o sensibilidad leve después del tratamiento; puedes dar el analgésico pediátrico que recomendamos, respetando la dosis por peso.",
      "Limita el consumo de azúcares y bebidas azucaradas entre comidas — son la principal causa de caries en la infancia.",
      "Acude a las revisiones cada 6 meses aunque no haya molestias — la prevención es la mejor herramienta en esta etapa.",
      "Si tu hijo(a) presenta dolor intenso, inflamación o fiebre después del tratamiento, contáctanos de inmediato.",
    ],
  },
};
