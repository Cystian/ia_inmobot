// /bot/interpretar/intentClassifier.js
// -------------------------------------------------------
// Clasificador de intención Groq — FASE 5.6 Optimizada
// - Bloqueo total de zonas inventadas
// - Detección nativa de intención de inversión
// - Saludo único por sesión
// - JSON Groq blindado
// - Follow-up refinado real
// - Preparado para Fase 6
// -------------------------------------------------------

import Groq from "groq-sdk";
import { GROQ_API_KEY } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logError } from "../utils/log.js";
import { extractFollowUpFilters } from "./entityExtractorFollowUp.js";

const client = new Groq({ apiKey: GROQ_API_KEY });

// -------------------------------------------------------
// 🔹 LISTAS DE CONTROL
// -------------------------------------------------------

const SALUDOS_PUROS = [
  "hola", "buenas", "buenos dias", "buenas tardes", "buenas noches",
  "hey", "holi", "ola", "👋"
];

const PALABRAS_INTENCION = [
  "casa", "departamento", "depa", "dpto", "terreno", "lote",
  "local", "oficina", "comprar", "venta", "alquiler", "alquilar",
  "busco", "quiero", "propiedad", "inmueble", "ver propiedad"
];

const FRASES_FOLLOW_UP = [
  "mas barato", "más barato", "mas economico", "más economico",
  "mas opciones", "más opciones", "otra opcion", "otra opción",
  "muestrame mas", "muéstrame más", "tienes otra", "otra similar",
  "algo mas", "algo más", "siguiente", "otra parecida"
];

const PROPERTY_REF_WORDS = [
  "esa", "esa propiedad", "esa casa", "ese depa", "ese departamento",
  "ese terreno", "ese lote", "la primera", "la 1", "la segunda",
  "la 2", "la tercera", "la 3", "ver esa"
];

// 🔹 Zonas permitidas (evita inventos de Groq)
const ZONAS_VALIDAS = [
  "nuevo chimbote",
  "chimbote",
  "buenos aires",
  "bellamar",
  "villa maria",
  "la caleta",
  "casma" // opcional
];

// 🔹 Palabras clave de inversión
const KW_INVERSION = [
  "invertir", "inversion", "inversión",
  "revalorice", "revalorizar", "revalorizacion",
  "negocio", "rentable", "retorno", "ganancia",
  "rinde", "revaloriza", "crezca", "aprovechar"
];

// -------------------------------------------------------
// 🚀 FUNCIÓN PRINCIPAL
// -------------------------------------------------------

export async function getIaAnalysis(raw, msgNormalizado, session = {}) {
  const text = msgNormalizado.toLowerCase().trim();

  const contieneIntencion = PALABRAS_INTENCION.some(p => text.includes(p));
  const esSaludoSimple = SALUDOS_PUROS.includes(text);

  const tieneSesionPrevia =
    !!session.lastIntent &&
    Array.isArray(session.lastProperties) &&
    session.lastProperties.length > 0;

  // ======================================================
  // 1️⃣ Saludo único por sesión
  // ======================================================
  if (esSaludoSimple && !contieneIntencion && !session.hasGreeted) {
    return {
      intencion: "saludo_simple",
      filtrosBase: {},
      iaRespuesta: MENSAJES.saludo_inicial,
      esSaludoSimple: true,
      esFollowUp: false
    };
  }

  // ======================================================
  // 2️⃣ Detecta intención de inversión (sin IA)
  // ======================================================
  if (KW_INVERSION.some(k => text.includes(k))) {
    return {
      intencion: "inversion",
      filtrosBase: {},
      iaRespuesta: "",
      esSaludoSimple: false,
      esFollowUp: false
    };
  }

  // ======================================================
  // 3️⃣ referencia a propiedad previa
  // ======================================================
  const refiereAPropiedad = PROPERTY_REF_WORDS.some(w => text.includes(w));

  if (tieneSesionPrevia && refiereAPropiedad) {
    return {
      intencion: "pregunta_propiedad",
      filtrosBase: {},
      iaRespuesta: "",
      esSaludoSimple: false,
      esFollowUp: false
    };
  }

  // ======================================================
  // 4️⃣ Follow-up refinado
  // ======================================================
  const esFollowUp = FRASES_FOLLOW_UP.some(f => text.includes(f));

  if (tieneSesionPrevia && esFollowUp) {
    const filtrosPrevios = session.lastFilters || {};
    const propiedadesPrevias = session.lastProperties || [];

    const refinados = extractFollowUpFilters(
      text,
      filtrosPrevios,
      propiedadesPrevias
    );

    return {
      intencion: session.lastIntent || "buscar_propiedades",
      filtrosBase: refinados,
      iaRespuesta: "",
      esSaludoSimple: false,
      esFollowUp: true
    };
  }

  // ======================================================
  // 5️⃣ Groq — Clasificador principal
  // ======================================================
  const prompt = `
Eres un asistente inmobiliario.
NO inventes distritos.
NUNCA menciones Lima, Miraflores, San Isidro, Barranco ni zonas fuera del mensaje.
Devuelve SOLO JSON válido.

Mensaje del usuario: "${raw}"

Formato:
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
`;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.25,
      messages: [
        { role: "system", content: "Responde SOLO JSON válido y limpio." },
        { role: "user", content: prompt }
      ]
    });

    let content = completion?.choices?.[0]?.message?.content || "";
    content = content.replace(/```json/gi, "").replace(/```/g, "").trim();

    let ia = {};

    try {
      ia = JSON.parse(content);
    } catch (err) {
      console.error("⚠ JSON inválido recibido de Groq:", content);
      ia = {};
    }

    // Guardia JSON
    if (!ia || typeof ia !== "object" || !ia.filtros) {
      ia = {
        intencion: contieneIntencion ? "buscar_propiedades" : "otro",
        filtros: {}
      };
    }

    const filtrosBase = ia.filtros || {};
    let intencion =
      ia.intencion || (contieneIntencion ? "buscar_propiedades" : "otro");
    let iaRespuesta = ia.respuesta || "";

    // Corrección de saludos y despedidas
    if (intencion === "saludo") iaRespuesta = MENSAJES.saludo_inicial;
    if (intencion === "despedida") iaRespuesta = MENSAJES.despedida;

    // 🚫 FILTRADO FINAL — SOLO zonas válidas
    if (Array.isArray(filtrosBase.distritos)) {
      filtrosBase.distritos = filtrosBase.distritos.filter((d) =>
        ZONAS_VALIDAS.includes(d.toLowerCase())
      );
    }

    return {
      intencion,
      filtrosBase,
      iaRespuesta,
      esSaludoSimple: false,
      esFollowUp: false
    };

  } catch (error) {
    logError("Error en getIaAnalysis (Groq)", error);

    return {
      intencion: contieneIntencion ? "buscar_propiedades" : "otro",
      filtrosBase: {},
      iaRespuesta: MENSAJES.error_general,
      esSaludoSimple: false,
      esFollowUp: false
    };
  }
}