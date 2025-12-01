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
  const raw = userMessage;
  const msgNormalizado = normalizeText(raw);

  // 1️⃣ IA: intención + filtros base + follow-up detectado internamente
  const {
    intencion,
    filtrosBase,
    iaRespuesta,
    esSaludoSimple,
    esFollowUp
  } = await getIaAnalysis(raw, msgNormalizado, getSession(userPhone));

  // 🌱 Si es saludo simple → no se continúa pipeline
  if (esSaludoSimple) {
    return iaRespuesta;
  }

  // 2️⃣ Enriquecer filtros con reglas (distritos, status, tipo, cuartos, cocheras…)
  const filtrosFinales = enrichFiltersWithRules(msgNormalizado, filtrosBase);

  // 3️⃣ Cargar sesión previa del usuario
  const session = getSession(userPhone);

  // 4️⃣ Preferencias semánticas (moderno, premium, céntrico, familiar…)
  const semanticPrefs = extractSemanticPreferences(msgNormalizado, session);

  // 5️⃣ Actualizar memoria conversacional
  updateSession(userPhone, {
    lastMessage: raw,
    lastIntent: intencion,
    lastFilters: filtrosFinales,
    semanticPrefs,
    esFollowUp
  });

  // 6️⃣ Enviar al controlador correcto
  const respuesta = await routeIntent(intencion, filtrosFinales, {
    iaRespuesta,
    rawMessage: raw,
    userPhone,
    session,
    semanticPrefs,
    esFollowUp
  });

  return respuesta || "¿En qué puedo ayudarte?";
}

