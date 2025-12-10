// /bot/interpretar/intentClassifier.js
// -------------------------------------------------------
// Clasificador de intención Groq — FASE 5.7 + E2 REAL
// -------------------------------------------------------
// Compatible con preTypeExtractor.js
// Admite tus tipos reales:
// casa, departamento, terreno, oficina, local comercial,
// terreno comercial, hotel
// -------------------------------------------------------

import Groq from "groq-sdk";
import { GROQ_API_KEY } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logError } from "../utils/log.js";
import { extractFollowUpFilters } from "./entityExtractorFollowUp.js";
import { extractPreType } from "./preTypeExtractor.js"; // 👈 NUEVO

const client = new Groq({ apiKey: GROQ_API_KEY });

// -------------------------------------------------------
// 🔹 TIPOS REALES DE TU NEGOCIO
// -------------------------------------------------------
const TIPOS_REALES = [
  "casa",
  "departamento",
  "terreno",
  "oficina",
  "local comercial",
  "terreno comercial",
  "hotel"
];

// -------------------------------------------------------
// 🔹 Palabras que definen intención de búsqueda
// -------------------------------------------------------
const PALABRAS_INTENCION = [
  "casa", "departamento", "depa", "dpto", "terreno", "lote",
  "local", "oficina", "hotel",
  "propiedad", "inmueble", "proyecto"
];

// -------------------------------------------------------
// 🔹 Adjetivos semánticos útiles para ranking
// -------------------------------------------------------
const ADJETIVOS_SEMANTICOS = [
  "bonita","bonito","grande","amplia","amplio",
  "lujosa","lujoso","económica","economica",
  "barata","barato","moderna","moderno",
  "nueva","nuevo","remodelada","remodelado",
  "centro","céntrica","céntrico"
];

// -------------------------------------------------------
// 🔹 Saludos
// -------------------------------------------------------
const SALUDOS_PUROS = [
  "hola","buenas","buenos dias","buenas tardes","buenas noches",
  "hey","ola","👋"
];

// -------------------------------------------------------
// 🔹 Follow-up
// -------------------------------------------------------
const FRASES_FOLLOW_UP = [
  "mas barato","más barato","mas economico","más economico",
  "mas opciones","más opciones","otra opcion","otra opción",
  "muestrame mas","muéstrame más","tienes otra","otra similar",
  "algo mas","algo más","siguiente","otra parecida"
];

// -------------------------------------------------------
// 🔹 Referencia a propiedad previa
// -------------------------------------------------------
const PROPERTY_REF_WORDS = [
  "esa","ese","esta casa","esa casa","esa propiedad",
  "ese depa","ese departamento","esa vivienda",
  "la primera","la 1","la segunda","la 2","la tercera","la 3",
  "mas detalles","más detalles","quiero saber mas","quiero saber más"
];

// -------------------------------------------------------
// 🔹 Distritos válidos (anticolapso IA)
// -------------------------------------------------------
const ZONAS_VALIDAS = [
  "nuevo chimbote","chimbote","buenos aires",
  "bellamar","villa maria","la caleta","casma"
];

// -------------------------------------------------------
// 🔹 Palabras de inversión
// -------------------------------------------------------
const KW_INVERSION = [
  "invertir","inversion","inversión","negocio","rentable",
  "retorno","ganancia","revalor","crezca","aprovechar"
];

// -------------------------------------------------------
// 🚀 FUNCIÓN PRINCIPAL
// -------------------------------------------------------
export async function getIaAnalysis(raw, msgNormalizado, session = {}) {
  
  const text = msgNormalizado.toLowerCase().trim();

  // ======================================================
  // 0️⃣ DETECTAR TIPO CON preTypeExtractor.js
  // ======================================================
  const tipoDetectado = extractPreType(text, TIPOS_REALES);

  // ======================================================
  // 1️⃣ INTENCIÓN BÁSICA
  // ======================================================
  const contieneIntencion =
    PALABRAS_INTENCION.some(p => text.includes(p)) ||
    !!tipoDetectado; // 👈 fuerza intención si detecta tipo

  const esSaludoSimple = SALUDOS_PUROS.includes(text);

  const tieneSesionPrevia =
    !!session.lastIntent &&
    Array.isArray(session.lastProperties) &&
    session.lastProperties.length > 0;

  // ======================================================
  // 2️⃣ Captura de adjetivos semánticos
  // ======================================================
  const detectedAdjectives = ADJETIVOS_SEMANTICOS.filter(a =>
    text.includes(a)
  );

  const semanticPrefs = {};
  if (detectedAdjectives.length > 0) {
    semanticPrefs.adjectives = detectedAdjectives;
  }

  // ======================================================
  // 3️⃣ SALUDO
  // ======================================================
  if (esSaludoSimple && !contieneIntencion && !session.hasGreeted) {
    return {
      intencion: "saludo_simple",
      filtrosBase: {},
      semanticPrefs,
      iaRespuesta: MENSAJES.saludo_inicial,
      esSaludoSimple: true,
      esFollowUp: false
    };
  }

  // ======================================================
  // 4️⃣ INVERSIÓN
  // ======================================================
  if (KW_INVERSION.some(k => text.includes(k))) {
    return {
      intencion: "inversion",
      filtrosBase: {},
      semanticPrefs,
      iaRespuesta: "",
      esFollowUp: false
    };
  }

  // ======================================================
  // 5️⃣ REFERENCIA A PROPIEDAD
  // ======================================================
  if (tieneSesionPrevia && PROPERTY_REF_WORDS.some(w => text.includes(w))) {
    return {
      intencion: "pregunta_propiedad",
      filtrosBase: {},
      semanticPrefs,
      iaRespuesta: MENSAJES.propiedad_referida,
      esFollowUp: false
    };
  }

  // ======================================================
  // 6️⃣ FOLLOW-UP
  // ======================================================
  if (tieneSesionPrevia && FRASES_FOLLOW_UP.some(f => text.includes(f))) {
    return {
      intencion: session.lastIntent || "buscar_propiedades",
      filtrosBase: extractFollowUpFilters(
        text,
        session.lastFilters || {},
        session.lastProperties || []
      ),
      semanticPrefs,
      iaRespuesta: "",
      esFollowUp: true
    };
  }

  // ======================================================
  // 7️⃣ GROQ — CLASIFICACIÓN PRINCIPAL
  // ======================================================
  const introTipo = tipoDetectado
    ? `El usuario menciona un tipo de propiedad: "${tipoDetectado}".`
    : "";

  const prompt = `
${introTipo}
Eres un asistente inmobiliario profesional.
NO inventes zonas.
NO inventes distritos.
NO generes textos interpretativos.
Responde SOLO JSON.

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
        { role: "system", content: "Responde solo JSON válido." },
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

    // Fallback si Groq falla
    if (!ia || !ia.filtros) {
      ia = {
        intencion: contieneIntencion ? "buscar_propiedades" : "otro",
        filtros: {}
      };
    }

    let filtrosBase = ia.filtros;

    // Si detectamos tipo por preTypeExtractor → reforzarlo
    if (tipoDetectado) {
      filtrosBase.tipo = tipoDetectado;
    }

    // Filtrar zonas
    if (Array.isArray(filtrosBase.distritos)) {
      filtrosBase.distritos = filtrosBase.distritos.filter(z =>
        ZONAS_VALIDAS.includes(z.toLowerCase())
      );
    }

    return {
      intencion: ia.intencion || "buscar_propiedades",
      filtrosBase,
      semanticPrefs,
      iaRespuesta: ia.respuesta || "",
      esFollowUp: false
    };

  } catch (err) {
    logError("Error Groq", err);

    return {
      intencion: contieneIntencion ? "buscar_propiedades" : "otro",
      filtrosBase: {},
      semanticPrefs,
      iaRespuesta: MENSAJES.ayuda_generica,
      esFollowUp: false
    };
  }
}
