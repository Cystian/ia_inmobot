// /bot/interpretar/index.js
// -------------------------------------------------------
// Orquesta todas las etapas v5:
// 1. Normaliza el texto
// 2. IA detecta intención base
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
import { detectFollowUp } from "./entityExtractorFollowUps.js";

export default async function interpretar(userMessage = "", userPhone = "") {
  const raw = userMessage;
  const msgNormalizado = normalizeText(raw);

  // 1️⃣ IA: intención + filtros base
  const { intencion, filtrosBase, iaRespuesta, esSaludoSimple } =
    await getIaAnalysis(raw, msgNormalizado);

  // Saludo puro → no tocamos BD ni nada más
  if (esSaludoSimple) {
    return iaRespuesta;
  }

  // 2️⃣ Enriquecer filtros con reglas (distritos, status, tipo, precio, cuartos, cocheras…)
  const filtrosFinales = enrichFiltersWithRules(msgNormalizado, filtrosBase);

  // 3️⃣ Cargar sesión previa del usuario (si existe)
  const session = getSession(userPhone);

  // 4️⃣ Preferencias semánticas (moderno, clásico, premium, económico, céntrico, tranquilo…)
  const semanticPrefs = extractSemanticPreferences(msgNormalizado, session);

  // 5️⃣ Follow-up (más opciones, otra zona, ajustar precio, etc.)
  const followUp = detectFollowUp(msgNormalizado, session);

  // 6️⃣ Actualizar sesión con lo último que sabemos
  updateSession(userPhone, {
    lastMessage: raw,
    lastIntent: intencion,
    lastFilters: filtrosFinales,
    semanticPrefs,
    followUpFlags: followUp
  });

  // 7️⃣ Enrutar intención hacia su controlador
  const respuesta = await routeIntent(intencion, filtrosFinales, {
    iaRespuesta,
    rawMessage: raw,
    userPhone,
    session,
    semanticPrefs,
    followUp
  });

  return respuesta || "¿En qué puedo ayudarte?";
}