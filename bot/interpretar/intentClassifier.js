// /bot/interpretar/intentClassifier.js
// -------------------------------------------------------
// Llama a Groq para obtener intención + filtros base
// Maneja saludos, follow-ups y ahora preguntas sobre
// una propiedad previamente mostrada.
// -------------------------------------------------------

import Groq from "groq-sdk";
import { GROQ_API_KEY } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logError } from "../utils/log.js";

const client = new Groq({
  apiKey: GROQ_API_KEY
});

// Saludos sin intención comercial (solo palabra exacta)
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

// Palabras clave para detectar intención inmobiliaria
const PALABRAS_INTENCION = [
  "casa",
  "departamento",
  "depa",
  "dpto",
  "terreno",
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
  "mas economico",
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
  "solo en ",
  "con cochera",
  "con cocheras",
  "con patio",
  "con jardin",
  "con jardín",
  "con balcon",
  "con balcón",
  "con piscina"
];

// Palabras/frases que indican que se refiere a "esa" propiedad
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
  const msgTrim = msg.trim();

  const contieneIntencion = PALABRAS_INTENCION.some((p) =>
    msgTrim.includes(p)
  );

  // Saludo puro solo si el mensaje es EXACTAMENTE el saludo
  const esSaludoSimple = SALUDOS_PUROS.includes(msgTrim);

  // Caso saludo puro sin intención inmobiliaria
  if (esSaludoSimple && !contieneIntencion) {
    return {
      intencion: "saludo_simple",
      filtrosBase: {},
      iaRespuesta: MENSAJES.saludo_inicial,
      esSaludoSimple: true,
      esFollowUp: false
    };
  }

  const tieneSesionPrevia =
    !!session.lastIntent && Array.isArray(session.lastProperties) && session.lastProperties.length > 0;

  // 🧠 1) Pregunta sobre UNA propiedad ya mostrada (PROPERTY MEMORY)
  const refiereAPropiedad = PROPERTY_REF_WORDS.some((w) =>
    msgTrim.includes(w)
  );

  if (tieneSesionPrevia && refiereAPropiedad) {
    // No llamamos a Groq, lo manejamos por reglas
    return {
      intencion: "pregunta_propiedad",
      filtrosBase: {},
      iaRespuesta: "",
      esSaludoSimple: false,
      esFollowUp: false
    };
  }

  // 🧠 2) Follow-up general (más barato, más opciones, etc.)
  const esFollowUp = FRASES_FOLLOW_UP.some((f) => msgTrim.includes(f));
  if (tieneSesionPrevia && esFollowUp) {
    return {
      intencion: session.lastIntent || "buscar_propiedades",
      filtrosBase: session.lastFilters || {},
      iaRespuesta: "",
      esSaludoSimple: false,
      esFollowUp: true
    };
  }

  // 🧠 3) IA Groq: intención principal + filtros base
  const prompt = `
Eres un asesor inmobiliario peruano MUY profesional.
Devuelve SOLO JSON válido, sin backticks, sin markdown, sin explicaciones.

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

- "tipo": casa|departamento|terreno|local|oficina
- "status": venta|alquiler
- "distritos": ej. ["Chimbote", "Nuevo Chimbote", "Buenos Aires"]
- "extras": ej. ["frente_parque", "esquina", "negociable", "estreno", "papeles_ok", "remodelado", "amoblado"]

Mensaje del usuario: "${raw}"
`;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Eres un asesor inmobiliario muy humano y profesional. Devuelve SOLO JSON válido, sin ``` ni markdown."
        },
        { role: "user", content: prompt }
      ]
    });

    let content = completion.choices[0].message.content || "";

    // Limpieza de posibles ```json y ``` que rompen el parseo
    content = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let ia = {};

    try {
      ia = JSON.parse(content);
    } catch (err) {
      console.error("⚠ No se pudo parsear el JSON de Groq:", content);
      return {
        intencion: "buscar_propiedades",
        filtrosBase: {},
        iaRespuesta: "",
        esSaludoSimple: false,
        esFollowUp: false
      };
    }

    return {
      intencion: ia.intencion || "buscar_propiedades",
      filtrosBase: ia.filtros || {},
      iaRespuesta: ia.respuesta || "",
      esSaludoSimple: false,
      esFollowUp: false
    };
  } catch (error) {
    logError("IA Groq", error);

    return {
      intencion: "buscar_propiedades",
      filtrosBase: {},
      iaRespuesta: "",
      esSaludoSimple: false,
      esFollowUp: false
    };
  }
}