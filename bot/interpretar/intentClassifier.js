// /bot/interpretar/intentClassifier.js
// -------------------------------------------------------
// Clasificador de intención Groq — FASE 5.7 FINAL
// -------------------------------------------------------
// – Corrige respuestas fuera de contexto
// – Evita textos interpretativos ("estoy buscando...")
// – Follow-up más inteligente
// – Detección reforzada de referencia a propiedad
// – No inventa zonas
// – JSON blindado
// -------------------------------------------------------

import Groq from "groq-sdk";
import { GROQ_API_KEY } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logError } from "../utils/log.js";
import { extractFollowUpFilters } from "./entityExtractorFollowUp.js";

const client = new Groq({ apiKey: GROQ_API_KEY });

// -------------------------------------------------------
// 🔹 Listas de control
// -------------------------------------------------------

const SALUDOS_PUROS = [
  "hola","buenas","buenos dias","buenas tardes","buenas noches",
  "hey","holi","ola","👋"
];

const PALABRAS_INTENCION = [
  "casa","departamento","depa","dpto","terreno","lote",
  "local","oficina","comprar","venta","alquiler","alquilar",
  "busco","quiero","propiedad","inmueble"
];

const FRASES_FOLLOW_UP = [
  "mas barato","más barato","mas economico","más economico",
  "mas opciones","más opciones","otra opcion","otra opción",
  "muestrame mas","muéstrame más","tienes otra","otra similar",
  "algo mas","algo más","siguiente","otra parecida"
];

// 🔹 Detección fuerte de referencia a propiedad
const PROPERTY_REF_WORDS = [
  "esa","ese","esta casa","esa casa","esa propiedad",
  "ese depa","ese departamento","esa vivienda",
  "la primera","la 1","la segunda","la 2","la tercera","la 3",
  "me puedes dar mas detalles","más detalles","mas detalles",
  "quiero saber mas","quiero más detalles"
];

// 🔹 Zonas válidas
const ZONAS_VALIDAS = [
  "nuevo chimbote","chimbote","buenos aires",
  "bellamar","villa maria","la caleta","casma"
];

// 🔹 Palabras clave de inversión
const KW_INVERSION = [
  "invertir","inversion","inversión","negocio","rentable",
  "retorno","ganancia","revalor","crezca","aprovechar"
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
  // 2️⃣ Intención de inversión
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
  // 3️⃣ Referencia fuerte a propiedad previa
  // ======================================================
  const refiereAPropiedad = PROPERTY_REF_WORDS.some(w => text.includes(w));

  if (tieneSesionPrevia && refiereAPropiedad) {
    return {
      intencion: "pregunta_propiedad",
      filtrosBase: {},
      iaRespuesta: MENSAJES.propiedad_referida,
      esSaludoSimple: false,
      esFollowUp: false
    };
  }

  // ======================================================
  // 4️⃣ Follow-up (más opciones, más barato)
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
  // 5️⃣ Groq — Clasificación principal
  // ======================================================
  const prompt = `
Eres un asistente inmobiliario profesional.
NO inventes zonas.
NO inventes distritos.
NO generes frases interpretativas ("estoy buscando...").
Responde en JSON válido únicamente.

Mensaje: "${raw}"

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
      temperature: 0.2,
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
    } catch {
      ia = {};
    }

    if (!ia || !ia.filtros) {
      ia = {
        intencion: contieneIntencion ? "buscar_propiedades" : "otro",
        filtros: {}
      };
    }

    let filtrosBase = ia.filtros;
    let intencion = ia.intencion || (contieneIntencion ? "buscar_propiedades" : "otro");
    let iaRespuesta = ia.respuesta || "";

    // ======================================================
    // 6️⃣ Filtrar zonas inválidas
    // ======================================================
    if (Array.isArray(filtrosBase.distritos)) {
      filtrosBase.distritos = filtrosBase.distritos.filter(d =>
        ZONAS_VALIDAS.includes(d.toLowerCase())
      );
    }

    // ======================================================
    // 7️⃣ Ajustes finales
    // ======================================================
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
    logError("Error Groq", error);

    return {
      intencion: contieneIntencion ? "buscar_propiedades" : "otro",
      filtrosBase: {},
      iaRespuesta: MENSAJES.ayuda_generica,
      esSaludoSimple: false,
      esFollowUp: false
    };
  }
}