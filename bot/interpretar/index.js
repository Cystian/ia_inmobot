// /bot/interpretar/index.js
// -------------------------------------------------------
// Orquesta todas las etapas:
// 1. Normaliza el texto
// 2. IA detecta intención base
// 3. Se enriquecen filtros con reglas
// 4. Se añaden preferencias semánticas
// 5. Router envía al controlador correctoo
// -------------------------------------------------------

import { normalizeText } from "./normalize.js";
import { getIaAnalysis } from "./intentClassifier.js";
import { enrichFiltersWithRules } from "./entityExtractor.js";
import { extractSemanticPreferences } from "./semanticPreferences.js";
import { routeIntent } from "./router.js";

export default async function interpretar(
  userMessage = "",
  userPhone = "",
  session = {}
) {
  const raw = userMessage;
  const msgNormalizado = normalizeText(raw);

  // 1️⃣ IA + detección de saludo / follow-up / property memory
  const {
    intencion,
    filtrosBase,
    iaRespuesta,
    esSaludoSimple,
    esFollowUp
  } = await getIaAnalysis(raw, msgNormalizado, session);

  // Si es un saludo simple → no tocar BD
  if (esSaludoSimple) {
    return iaRespuesta;
  }

  // 2️⃣ Enriquecer filtros con reglas adicionales (Chimbote / Nvo. Chimbote, etc.)
  let filtrosFinales = enrichFiltersWithRules(msgNormalizado, filtrosBase);

  // 3️⃣ Añadir preferencias semánticas (fase 4)
  const semanticPrefs = extractSemanticPreferences(raw);
  filtrosFinales = {
    ...filtrosFinales,
    semantic: semanticPrefs
  };

  // 4️⃣ Enrutar intención hacia su controlador
  const respuesta = await routeIntent(intencion, filtrosFinales, {
    iaRespuesta,
    rawMessage: raw,
    userPhone,
    session,
    esFollowUp
  });

  return respuesta;
}
