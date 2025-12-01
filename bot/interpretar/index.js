// /bot/interpretar/index.js
// -------------------------------------------------------
// Orquesta todas las etapas v5:
// 1. Normaliza el texto
// 2. IA detecta intención basee
// 3. Se enriquecen filtros con reglas
// 4. Se extraen preferencias semánticas + follow-ups
// 5. Router envía al controlador correctoox
// -------------------------------------------------------

import { normalizeText } from "./normalize.js";
import { getIaAnalysis } from "./intentClassifier.js";
import { enrichFiltersWithRules } from "./entityExtractor.js";
import { routeIntent } from "./router.js";
import { getSession, updateSession } from "./contextManager.js";
import { extractSemanticPreferences } from "./semanticPreferences.js";

export default async function interpretar(userMessage = "", userPhone = "") {
  const raw = userMessage || "";
  const msgNormalizado = normalizeText(raw);

  // 1️⃣ Obtener sesión previa ANTES de IA
  const session = getSession(userPhone);

  // 2️⃣ IA: intención + filtros + follow-up
  const {
    intencion,
    filtrosBase,
    iaRespuesta,
    esSaludoSimple,
    esFollowUp
  } = await getIaAnalysis(raw, msgNormalizado, session);

  /////
  const KW_INVERSION = [
  "invertir",
  "revalorice",
  "revalorización",
  "para negocio",
  "para proyecto",
  "local comercial",
  "terreno para negocio",
  "retorno",
  "rentable"
];

if (KW_INVERSION.some(k => low.includes(k))) {
  return "inversion";
}
//////
  
  // 3️⃣ Si es saludo simple → se devuelve directamente
  if (esSaludoSimple) {
    return iaRespuesta;
  }

  // 4️⃣ Reglas adicionales (cocheras, baños, distritos, etc.)
  const filtrosFinales = enrichFiltersWithRules(msgNormalizado, filtrosBase);

  // 5️⃣ Preferencias semánticas (premium, moderno, tranquilo, etc.)
  const semanticPrefs = extractSemanticPreferences(msgNormalizado, session);

  // 6️⃣ Actualizar memoria conversacional
  updateSession(userPhone, {
    lastMessage: raw,
    lastIntent: intencion,
    lastFilters: filtrosFinales,
    semanticPrefs,
    esFollowUp
  });

  // 7️⃣ Enrutar hacia controlador final
  const respuesta = await routeIntent(intencion, filtrosFinales, {
    iaRespuesta,
    rawMessage: raw,
    userPhone,
    session,
    semanticPrefs,
    esFollowUp
  });

  // 8️⃣ Si el controlador devolvió null (solo envió imágenes/texto), no respondemos texto adicional
  if (respuesta === null) return null;

  return respuesta || "¿En qué puedo ayudarte?";
}

