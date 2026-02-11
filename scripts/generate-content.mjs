import fs from "fs";
import path from "path";

const packs = {
  oficina: {
    topics: [
      "ventas",
      "presupuesto",
      "bonos",
      "metas trimestrales",
      "recorte",
      "nuevo producto",
      "cliente clave",
      "reorganización",
      "sprint crítico",
      "incidente de seguridad",
      "campaña",
      "reclutamiento",
      "cambio de políticas",
      "problema técnico",
      "objetivos de KPIs"
    ],
    templates: [
      (t) => [`Reunión de ${t}`, `Interrogatorio sobre ${t}`],
      (t) => [`Presentación de ${t}`, `Defensa legal de ${t}`],
      (t) => [`Brainstorming de ${t}`, `Confesionario sobre ${t}`],
      (t) => [`Standup del proyecto ${t}`, `Juicio rápido de ${t}`],
      (t) => [`Capacitación de ${t}`, `Auditoría sorpresa de ${t}`],
      (t) => [`Llamada con cliente por ${t}`, `Llamada con abogado por ${t}`],
      (t) => [`Feedback sobre ${t}`, `Sesión de terapia por ${t}`],
      (t) => [`Informe de ${t}`, `Parte policial de ${t}`]
    ]
  },
  parejas: {
    topics: [
      "aniversario",
      "celos",
      "mudanza",
      "cita fallida",
      "mensajes vistos",
      "suegros",
      "vacaciones",
      "dinero compartido",
      "mascota",
      "plan de boda",
      "ex",
      "fotografías",
      "equilibrio de tiempo",
      "regalo olvidado",
      "discusiones tontas"
    ],
    templates: [
      (t) => [`Conversación romántica sobre ${t}`, `Reclamo incómodo sobre ${t}`],
      (t) => [`Charla de pareja sobre ${t}`, `Interrogatorio afectivo sobre ${t}`],
      (t) => [`Planificación de ${t}`, `Negociación tensa de ${t}`],
      (t) => [`Confesión sobre ${t}`, `Juicio casero sobre ${t}`],
      (t) => [`Mensaje de amor por ${t}`, `Mensaje pasivo-agresivo por ${t}`],
      (t) => [`Brindis por ${t}`, `Ultimátum por ${t}`],
      (t) => [`Reconciliación por ${t}`, `Discusión por ${t}`],
      (t) => [`Promesa sobre ${t}`, `Contrato emocional sobre ${t}`]
    ]
  },
  crimen: {
    topics: [
      "huellas",
      "coartada",
      "botín",
      "testigo",
      "cámaras",
      "arma",
      "motivo",
      "llamada sospechosa",
      "escape",
      "plan maestro",
      "código secreto",
      "sospechoso",
      "interrogatorio",
      "evidencia",
      "confesión"
    ],
    templates: [
      (t) => [`Operativo policial sobre ${t}`, `Reunión de ladrones sobre ${t}`],
      (t) => [`Informe forense de ${t}`, `Inventario del botín de ${t}`],
      (t) => [`Rueda de prensa sobre ${t}`, `Reunión clandestina sobre ${t}`],
      (t) => [`Audiencia judicial por ${t}`, `Conspiración por ${t}`],
      (t) => [`Sala de interrogatorio de ${t}`, `Sala de negociación de ${t}`],
      (t) => [`Búsqueda de ${t}`, `Planificación de ${t}`],
      (t) => [`Briefing de detectives sobre ${t}`, `Briefing de mafiosos sobre ${t}`],
      (t) => [`Coordinación de patrulla por ${t}`, `Coordinación de fuga por ${t}`]
    ]
  },
  colegio: {
    topics: [
      "examen sorpresa",
      "tarea perdida",
      "cambio de profesor",
      "recreo",
      "disfraz",
      "nota final",
      "proyecto grupal",
      "excursión",
      "expulsión",
      "acto cívico",
      "uniforme",
      "feria de ciencias",
      "tutoría",
      "bullying",
      "hoja de vida"
    ],
    templates: [
      (t) => [`Clase sobre ${t}`, `Regaño del director por ${t}`],
      (t) => [`Consejo estudiantil sobre ${t}`, `Comité disciplinario sobre ${t}`],
      (t) => [`Reunión de padres por ${t}`, `Juicio escolar por ${t}`],
      (t) => [`Ensayo para ${t}`, `Castigo por ${t}`],
      (t) => [`Charla motivacional sobre ${t}`, `Interrogatorio escolar sobre ${t}`],
      (t) => [`Tutoría por ${t}`, `Detención por ${t}`],
      (t) => [`Revisión de ${t}`, `Confesión de ${t}`],
      (t) => [`Juego en recreo sobre ${t}`, `Competencia seria sobre ${t}`]
    ]
  },
  familia: {
    topics: [
      "cumpleaños",
      "herencia",
      "visita inesperada",
      "película familiar",
      "mudanza",
      "viaje",
      "comida favorita",
      "mascota",
      "reglas de la casa",
      "historia vergonzosa",
      "foto antigua",
      "niñera",
      "pariente lejano",
      "reparaciones",
      "pacto secreto"
    ],
    templates: [
      (t) => [`Cena familiar sobre ${t}`, `Consejo familiar sobre ${t}`],
      (t) => [`Charla en la sala sobre ${t}`, `Reclamo familiar sobre ${t}`],
      (t) => [`Reunión de domingo por ${t}`, `Auditoría familiar por ${t}`],
      (t) => [`Brindis por ${t}`, `Regaño colectivo por ${t}`],
      (t) => [`Confesión familiar sobre ${t}`, `Interrogatorio familiar sobre ${t}`],
      (t) => [`Plan de ${t}`, `Negociación de ${t}`],
      (t) => [`Álbum familiar de ${t}`, `Archivo secreto de ${t}`],
      (t) => [`Juego en familia por ${t}`, `Competencia seria por ${t}`]
    ]
  },
  videojuegos: {
    topics: [
      "boss final",
      "loot legendario",
      "bug extraño",
      "clan rival",
      "torneo",
      "skin exclusiva",
      "nerf inesperado",
      "server caído",
      "speedrun",
      "misión secreta",
      "ranking",
      "co-op",
      "troleo",
      "parche nuevo",
      "campaña"
    ],
    templates: [
      (t) => [`Chat de gamers sobre ${t}`, `Informe militar sobre ${t}`],
      (t) => [`Briefing de raid sobre ${t}`, `Briefing de rescate sobre ${t}`],
      (t) => [`Celebración por ${t}`, `Queja formal por ${t}`],
      (t) => [`Plan de equipo por ${t}`, `Plan de infiltración por ${t}`],
      (t) => [`Stream sobre ${t}`, `Juicio del consejo sobre ${t}`],
      (t) => [`Tutorial de ${t}`, `Interrogatorio sobre ${t}`],
      (t) => [`Sala de voz por ${t}`, `Sala de crisis por ${t}`],
      (t) => [`Anuncio de ${t}`, `Alerta roja por ${t}`]
    ]
  },
  finanzas: {
    topics: [
      "crédito",
      "préstamo",
      "tarjeta bloqueada",
      "fraude",
      "inversión",
      "tasas",
      "presupuesto personal",
      "hipoteca",
      "criptos",
      "cierre de mes",
      "auditoría",
      "ahorros",
      "cobro inesperado",
      "deuda",
      "aprobación"
    ],
    templates: [
      (t) => [`Reunión bancaria sobre ${t}`, `Interrogatorio financiero sobre ${t}`],
      (t) => [`Asesoría de ${t}`, `Confesión de ${t}`],
      (t) => [`Revisión de ${t}`, `Investigación de ${t}`],
      (t) => [`Llamada del banco por ${t}`, `Llamada de cobranzas por ${t}`],
      (t) => [`Plan de ${t}`, `Plan de emergencia por ${t}`],
      (t) => [`Reporte de ${t}`, `Parte judicial de ${t}`],
      (t) => [`Notificación de ${t}`, `Advertencia de ${t}`],
      (t) => [`Aprobación de ${t}`, `Sospecha de ${t}`]
    ]
  },
  hospital: {
    topics: [
      "diagnóstico",
      "turno de noche",
      "cirugía",
      "paciente difícil",
      "emergencias",
      "receta",
      "vacuna",
      "resultado",
      "triage",
      "ambulancia",
      "examen",
      "alergia",
      "visita",
      "alta médica",
      "equipo médico"
    ],
    templates: [
      (t) => [`Junta médica sobre ${t}`, `Interrogatorio policial sobre ${t}`],
      (t) => [`Informe clínico de ${t}`, `Informe secreto de ${t}`],
      (t) => [`Sala de espera por ${t}`, `Sala de crisis por ${t}`],
      (t) => [`Briefing de guardia por ${t}`, `Briefing militar por ${t}`],
      (t) => [`Consulta sobre ${t}`, `Audiencia sobre ${t}`],
      (t) => [`Revisión de ${t}`, `Confesión de ${t}`],
      (t) => [`Plan de ${t}`, `Plan de contingencia por ${t}`],
      (t) => [`Entrega de ${t}`, `Operativo de ${t}`]
    ]
  }
};

const tones = ["serio", "absurdo", "sarcástico", "rápido", "dramático", "calmado", "misterioso", "tenso"];

const promptTemplates = [
  (tema) => `Di una frase que dirías en ${tema}`,
  (tema) => `Menciona un objeto típico de ${tema}`,
  (tema) => `Describe el ambiente de ${tema} en 4 palabras`,
  (tema) => `Una excusa rápida relacionada con ${tema}`,
  (tema) => `Una palabra prohibida en ${tema}`,
  (tema) => `Un consejo útil en ${tema}`,
  (tema) => `Un sonido que se escucha en ${tema}`,
  (tema) => `Una acción que harías en ${tema}`,
  (tema) => `Una frase cliché de ${tema}`,
  (tema) => `Un problema típico de ${tema}`,
  (tema) => `Una reacción exagerada de ${tema}`,
  (tema) => `Algo que NO deberías hacer en ${tema}`,
  (tema) => `Un gesto común en ${tema}`,
  (tema) => `Una palabra técnica de ${tema}`,
  (tema) => `Un rumor sobre ${tema}`,
  (tema) => `Una queja corta sobre ${tema}`,
  (tema) => `Un secreto de ${tema}`,
  (tema) => `Un objetivo urgente en ${tema}`,
  (tema) => `Una frase en voz baja en ${tema}`,
  (tema) => `Una pregunta incómoda de ${tema}`,
  (tema) => `Un chiste interno de ${tema}`,
  (tema) => `Una advertencia breve en ${tema}`,
  (tema) => `Una promesa en ${tema}`,
  (tema) => `Una frase motivacional de ${tema}`,
  (tema) => `Una frase de despedida de ${tema}`,
  (tema) => `Un error frecuente en ${tema}`,
  (tema) => `Algo que siempre falta en ${tema}`,
  (tema) => `Un detalle sospechoso en ${tema}`,
  (tema) => `Un paso clave de ${tema}`,
  (tema) => `Una palabra que repetirías en ${tema}`
];

const baseConstraints = [
  "No puedes usar la palabra 'yo'",
  "Responde solo con preguntas",
  "Incluye exactamente 1 emoji",
  "Máximo 6 palabras",
  "Habla como si fueras muy formal",
  "No uses la letra 'a'",
  "Termina con '...'",
  "Incluye la palabra 'exactamente'",
  "Habla en pasado",
  "Usa una onomatopeya",
  "Responde con una metáfora",
  "No uses la palabra 'no'",
  "Empieza con 'Bueno,'",
  "Incluye un número",
  "Usa una palabra en inglés",
  "No uses signos de exclamación",
  "Incluye un color",
  "Habla como si estuvieras apurado",
  "Responde con dos frases",
  "Usa tono dramático",
  "Habla como si fueras un robot",
  "No uses la letra 'e'",
  "Incluye una palabra de comida",
  "Termina con un signo de interrogación",
  "Usa exactamente 5 palabras",
  "Responde con una frase muy corta",
  "Incluye la palabra 'plan'",
  "No uses la letra 'o'",
  "Incluye una dirección (arriba, abajo, izquierda, derecha)",
  "Habla como si estuvieras muy cansado",
  "Incluye una palabra de tiempo (hoy, ayer, mañana)",
  "Usa un hashtag",
  "No uses la letra 'i'",
  "Incluye una emoción en texto (" + "feliz" + ", triste, etc.)",
  "Usa un diminutivo",
  "Empieza con 'Mira,'",
  "Responde con una frase sarcástica",
  "Incluye la palabra 'claro'",
  "No uses la letra 'u'",
  "Habla como si fueras una noticia",
  "Incluye un verbo en imperativo",
  "Responde con tres palabras",
  "Incluye la palabra 'pero'",
  "Habla como narrador deportivo",
  "Incluye una palabra de sonido (bum, crack, etc.)",
  "No uses la letra 'r'",
  "Incluye un saludo",
  "Habla como si estuvieras ocultando algo",
  "Responde con una frase con rima",
  "Incluye la palabra 'sospechoso'",
  "No uses la letra 's'",
  "Incluye una palabra de color",
  "Habla como si dieras instrucciones",
  "Incluye un adverbio",
  "Responde solo con una palabra"
];

const extraLetters = ["b", "c", "d", "f", "g", "h", "l", "m", "n", "p", "t", "v", "z"];
const wordCounts = [4, 5, 6, 7, 8, 9];
const emojiCounts = [1, 2];
const tonesConstraints = [
  "Habla como si fuera un secreto",
  "Habla como si estuvieras enojado",
  "Habla como si estuvieras muy feliz",
  "Habla como si fueras un vendedor",
  "Habla como si estuvieras en una audiencia",
  "Habla como si fueras un DJ",
  "Habla como si fueras un detective",
  "Habla como si fueras un influencer",
  "Habla como si fueras un chef",
  "Habla como si fueras un profesor"
];

function unique(list) {
  return Array.from(new Set(list));
}

function buildConstraints() {
  const generated = [...baseConstraints];
  for (const l of extraLetters) {
    generated.push(`No uses la letra '${l}'`);
  }
  for (const c of wordCounts) {
    generated.push(`Usa exactamente ${c} palabras`);
  }
  for (const c of emojiCounts) {
    generated.push(`Incluye exactamente ${c} emojis`);
  }
  generated.push(...tonesConstraints);
  generated.push("Incluye un nombre propio");
  generated.push("Incluye una palabra de lugar");
  generated.push("Usa dos adjetivos");
  generated.push("No uses la letra 'k'");
  generated.push("No uses la letra 'y'");
  generated.push("Incluye la palabra 'ahora'" );
  generated.push("Empieza con 'Ok,'");
  generated.push("Empieza con 'Entonces,'");
  generated.push("Incluye la palabra 'urgente'");
  generated.push("Habla como si estuvieras en radio");
  generated.push("Incluye una palabra de clima");
  generated.push("Termina con un emoji");
  generated.push("No uses signos de interrogación");
  generated.push("Incluye una comparación (como, igual que)");
  generated.push("Usa una frase con 'si'" );
  generated.push("Incluye la palabra 'peligro'" );
  generated.push("No uses la palabra 'porque'");
  generated.push("Habla como si fueras de otro país");
  generated.push("Incluye una palabra de dinero");
  generated.push("Incluye un animal");
  generated.push("Usa una frase muy formal");
  generated.push("Habla como si estuvieras susurrando");
  generated.push("Responde con una mini-historia");
  generated.push("Responde con una queja");
  generated.push("Incluye la palabra 'planeta'");
  generated.push("No uses la letra 'q'");
  generated.push("No uses la letra 'x'");
  generated.push("Incluye un verbo en futuro" );
  generated.push("Habla como si fueras un juez" );
  generated.push("Incluye una palabra de música" );
  generated.push("Usa dos frases cortas");
  generated.push("Incluye un número par" );
  generated.push("Incluye un número impar" );
  generated.push("Habla como si estuvieras en un comercial" );
  generated.push("Responde con una frase de 10 palabras" );
  generated.push("Incluye la palabra 'listo'" );
  generated.push("Habla como si fueras un entrenador" );
  generated.push("No uses la letra 'j'" );
  generated.push("Incluye una palabra de tecnología" );
  generated.push("Responde como si fueras un villano" );
  generated.push("Incluye la palabra 'silencio'" );
  generated.push("Usa una frase con 'aunque'" );
  generated.push("Incluye una palabra de transporte" );
  generated.push("Empieza con 'Atención,'" );
  generated.push("No uses la letra 'w'" );
  generated.push("Incluye la palabra 'código'" );
  generated.push("Habla como si estuvieras celebrando" );
  generated.push("Incluye la palabra 'misterio'" );
  generated.push("Responde con tres palabras exactas" );
  generated.push("Incluye una palabra de comida" );
  generated.push("Incluye la palabra 'señal'" );
  generated.push("Habla como si fueras un narrador de fútbol" );
  generated.push("Incluye la palabra 'riesgo'" );
  generated.push("No uses la letra 'ñ'" );
  generated.push("Incluye una palabra de color" );
  generated.push("Habla como si fueras una alarma" );
  generated.push("Incluye un verbo en gerundio" );
  generated.push("Usa exactamente 2 frases" );
  generated.push("Incluye la palabra 'clave'" );
  generated.push("Habla como si fueras un presentador" );
  generated.push("Incluye un nombre de ciudad" );
  generated.push("No uses la palabra 'si'" );
  generated.push("Incluye la palabra 'suerte'" );
  generated.push("Responde con una frase muy directa" );
  generated.push("Incluye la palabra 'control'" );
  generated.push("Habla como si fueras un músico" );
  generated.push("Incluye la palabra 'secreto'" );
  generated.push("No uses la letra 'z'" );
  generated.push("Incluye una palabra de deporte" );
  generated.push("Habla como si fueras un piloto" );
  generated.push("Incluye una palabra de fruta" );
  generated.push("Responde con una frase en negativo" );
  generated.push("Incluye la palabra 'alarma'" );
  generated.push("Habla como si fueras un jefe" );
  generated.push("Incluye un verbo en condicional" );
  generated.push("No uses la letra 'v'" );
  generated.push("Incluye la palabra 'prueba'" );
  generated.push("Responde con una pregunta y una afirmación" );
  generated.push("Incluye la palabra 'equipo'" );
  generated.push("Habla como si fueras un guardia" );
  generated.push("Incluye un símbolo (%, #, @)" );
  generated.push("Responde con una frase que empiece con 'No'" );
  generated.push("Incluye la palabra 'pista'" );
  generated.push("Habla como si fueras un médico" );
  generated.push("Incluye un verbo en infinitivo" );
  generated.push("Responde con una frase que termine en vocal" );
  generated.push("Incluye la palabra 'silencio'" );
  generated.push("Habla como si fueras un árbitro" );
  generated.push("Incluye la palabra 'alerta'" );

  return unique(generated).slice(0, 160);
}

const constraints = buildConstraints();

function writePack(packId, contexts, prompts, constraints) {
  const dir = path.join("content", "packs", packId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "contexts.json"), JSON.stringify({
    packId,
    language: "es",
    pairs: contexts
  }, null, 2));
  fs.writeFileSync(path.join(dir, "prompts.json"), JSON.stringify({
    packId,
    language: "es",
    prompts
  }, null, 2));
  fs.writeFileSync(path.join(dir, "constraints.json"), JSON.stringify({
    packId,
    language: "es",
    constraints
  }, null, 2));
}

const packEntries = Object.entries(packs);
const allConstraints = constraints;

let constraintIndex = 0;

for (const [packId, pack] of packEntries) {
  const contexts = [];
  let counter = 1;
  for (const template of pack.templates) {
    for (const topic of pack.topics) {
      const [a, b] = template(topic);
      contexts.push({
        id: `${packId}-${String(counter).padStart(3, "0")}`,
        a,
        b,
        tags: [packId]
      });
      counter += 1;
    }
  }
  const slicedContexts = contexts.slice(0, 40);

  const prompts = [];
  for (let i = 0; i < 25; i += 1) {
    const template = promptTemplates[i % promptTemplates.length];
    const tone = tones[i % tones.length];
    prompts.push({
      id: `${packId}-p-${String(i + 1).padStart(3, "0")}`,
      text: template(packId.replace(/-/g, " ")),
      tone
    });
  }

  const limit = packId === "hospital" ? 10 : 20;
  const packConstraints = allConstraints.slice(constraintIndex, constraintIndex + limit);
  constraintIndex += limit;

  const constraintObjects = packConstraints.map((text, idx) => ({
    id: `${packId}-c-${String(idx + 1).padStart(3, "0")}`,
    text,
    severity: "medium"
  }));

  writePack(packId, slicedContexts, prompts, constraintObjects);
}

console.log("Generated content packs");
