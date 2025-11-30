// /bot/interpretar/index.js
// -------------------------------------------------------
// Orquesta todas las etapas:
// 1. Normaliza el texto
// 2. IA detecta intención base
// 3. Se enriquecen filtros con reglas + sesión
// 4. Router envía al controlador correcto
// -------------------------------------------------------

import { normalizeText } from "./normalize.js";
import { getIaAnalysis } from "./intentClassifier.js";
import { enrichFiltersWithRules } from "./entityExtractor.js";
import { routeIntent } from "./router.js";
import { getSession, updateSession } from "./contextManager.js";

export default async function interpretar(userMessage = "", userPhone = "") {
  const raw = userMessage;
  const msgNormalizado = normalizeText(raw);

  // Sesión previa del usuario (para follow-ups)
  const session = getSession(userPhone);

  // 1️⃣ IA + detección de saludo / follow-up
  const { intencion, filtrosBase, iaRespuesta, esSaludoSimple } =
    await getIaAnalysis(raw, msgNormalizado, session);

  // Si es un saludo simple → no tocar BD
  if (esSaludoSimple) {
    return iaRespuesta;
  }

  // 2️⃣ Enriquecer filtros con reglas adicionales + sesión previa
  const filtrosFinales = enrichFiltersWithRules(
    msgNormalizado,
    filtrosBase,
    session
  );

  // Guardar contexto para siguientes mensajes
  updateSession(userPhone, {
    lastIntent: intencion,
    lastFilters: filtrosFinales
  });

  // 3️⃣ Enrutar intención hacia su controlador
  const respuesta = await routeIntent(intencion, filtrosFinales, {
    iaRespuesta,
    rawMessage: raw,
    userPhone,
    session
  });

  return respuesta;
}