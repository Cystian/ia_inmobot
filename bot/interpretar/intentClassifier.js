// /bot/interpretar/intentClassifier.js
// -------------------------------------------------------
// Clasificador de intención con IA + reglas avanzadas.
// Maneja:
// - saludos puros
// - búsqueda de propiedades
// - follow-up avanzado (más barato, más opciones, etc.)
// - preguntas sobre una propiedad ya mostrada (Property Memory)
// -------------------------------------------------------

import Groq from "groq-sdk";
import { GROQ_API_KEY } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logError } from "../utils/log.js";
import { extractFollowUpFilters } from "./entityExtractorFollowUp.js";

const client = new Groq({ apiKey: GROQ_API_KEY });

// Saludos sin intención comercial (solo palabra EXACTA)
const SALUDOS_PUROS = [
  "hola",
  "buenas",
  "buenos dias",
  "buenas tardes",
  "buenas noches",
  "hey",
  "holi",
  "ola",
  "👋"
];

// Palabras clave base del dominio inmobiliario
const PALABRAS_INTENCION = [
  "casa",
  "departamento",
  "depa",
  "dpto",
  "terreno",
  "lote",
  "local",
  "oficina",
  "comprar",
  "alquilar",
  "alquiler",
  "venta",
  "vender",
  "rentar",
  "renta",
  "alquilo",
  "vendo",
  "busco",
  "quiero",
  "propiedad",
  "inmueble"
];

// Frases típicas de seguimiento / refinamiento
const FRASES_FOLLOW_UP = [
  "mas barato",
  "más barato",
  "mas economico",
  "más economico",
  "mas opciones",
  "más opciones",
  "otra opcion",
  "otra opción",
  "muestrame mas",
  "muéstrame mas",
  "muéstrame más",
  "tienes otra",
  "algo mas",
  "algo más",
  "solo en",
  "con cochera",
  "con cocheras",
  "con patio",
  "con jardin",
  "con jardín",
  "con balcon",
  "con balcón",
  "con piscina",
  "mas grande",
  "más grande",
  "mas caro",
  "más caro",
  "algo mejor",
  "otra similar",
  "otra parecida"
];

// Palabras/frases que indican referencia a una propiedad ya mostrada
const PROPERTY_REF_WORDS = [
  "esa",
  "esa propiedad",
  "esa casa",
  "ese depa",
  "ese departamento",
  "ese terreno",
  "ese lote",
  "la primera",
  "la 1",
  "la segunda",
  "la 2",
  "la tercera",
  "la 3"
];

// -------------------------------------------------------

export async function getIaAnalysis(raw, msg, session = {}) {
  const lower = msg.trim().toLowerCase();

  const contieneIntencion = PALABRAS_INTENCION.some((p) => lower.includes(p));
  const esSaludoSimple = SALUDOS_PUROS.includes(lower);

  const tieneSesionPrevia =
    !!session.lastIntent &&
    (Array.isArray(session.lastProperties)
      ? session.lastProperties.length > 0
      : true);

  // 🧠 1) Saludo puro sin intención inmobiliaria
  if (esSaludoSimple && !contieneIntencion) {
    return {
      intencion: "saludo_simple",
      filtrosBase: {},
      iaRespuesta: MENSAJES.saludo_inicial,
      esSaludoSimple: true,
      esFollowUp: false
    };
  }

  // 🧠 2) Pregunta sobre una propiedad mostrada antes ("esa propiedad")
  const refiereAPropiedad = PROPERTY_REF_WORDS.some((w) =>
    lower.includes(w)
  );

  if (tieneSesionPrevia && refiereAPropiedad) {
    return {
      intencion: "pregunta_propiedad",
      filtrosBase: {},
      iaRespuesta: "",
      esSaludoSimple: false,
      esFollowUp: false
    };
  }

  // 🧠 3) Follow-up avanzado / refinamiento
  const esFollowUp = FRASES_FOLLOW_UP.some((f) => lower.includes(f));

  if (tieneSesionPrevia && esFollowUp) {
    const lastFilters = session.lastFilters || {};
    const lastProperties = session.lastProperties || [];

    const filtrosRefinados = extractFollowUpFilters(
      lower,
      lastFilters,
      lastProperties
    );

    return {
      intencion: session.lastIntent || "buscar_propiedades",
      filtrosBase: filtrosRefinados,
      iaRespuesta: "",
      esSaludoSimple: false,
      esFollowUp: true
    };
  }

  // 🧠 4) IA Groq para búsquedas nuevas
  const prompt = `
Eres un asesor inmobiliario peruano MUY profesional.
Devuelve SOLO JSON válido (sin backticks, sin markdown, sin texto extra).

Formato EXACTO:

{
  "intencion": "buscar_propiedades|saludo|despedida|otro",
  "filtros": {
    "distritos": [],
    "status": "",
    "tipo": "",
    "bedrooms": null,
    "bathrooms": null,
    "cocheras": null,
    "area_min": null,
    "precio_min": null,
    "precio_max": null,
    "extras": []
  },
  "respuesta": ""
}

Mensaje del usuario: "${raw}"
`;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Eres un asesor inmobiliario. Devuelve SOLO JSON válido, sin ``` ni markdown."
        },
        { role: "user", content: prompt }
      ]
    });

    let content = completion?.choices?.[0]?.message?.content || "";

    content = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let ia = {};

    try {
      ia = JSON.parse(content);
    } catch (err) {
      console.error("⚠ Error parseando JSON Groq:", content);
      ia = {};
    }

    const filtrosBase = ia.filtros || {};
    let intencion =
      ia.intencion || (contieneIntencion ? "buscar_propiedades" : "otro");
    let iaRespuesta = ia.respuesta || "";

    // Ajustar saludos y despedidas
    if (intencion === "saludo") iaRespuesta = MENSAJES.saludo_inicial;
    if (intencion === "despedida") iaRespuesta = MENSAJES.despedida;

    return {
      intencion,
      filtrosBase,
      iaRespuesta,
      esSaludoSimple: false,
      esFollowUp: false
    };
  } catch (error) {
    logError("Error en getIaAnalysis (Groq)", error);

    // Fallback defensivo
    return {
      intencion: contieneIntencion ? "buscar_propiedades" : "otro",
      filtrosBase: {},
      iaRespuesta: contieneIntencion
        ? MENSAJES.intro_propiedades_default
        : MENSAJES.error_general,
      esSaludoSimple: false,
      esFollowUp: false
    };
  }
}
