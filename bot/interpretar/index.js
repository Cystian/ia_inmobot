// /bot/interpretar/index.js
// -------------------------------------------------------
// Orquesta todas las etapas:
// 1. Normaliza el texto
// 2. IA detecta intención base
// 3. Se enriquecen filtros con reglas
// 4. Router envía al controlador correcto
// -------------------------------------------------------

import { normalizeText } from "./normalize.js";
import { getIaAnalysis } from "./intentClassifier.js";
import { enrichFiltersWithRules } from "./entityExtractor.js";
import { routeIntent } from "./router.js";

export default async function interpretar(userMessage = "", userPhone = "") {
  const raw = userMessage;
  const msgNormalizado = normalizeText(raw);

  // 1️⃣ IA + detección de saludo simple
  const { intencion, filtrosBase, iaRespuesta, esSaludoSimple } =
    await getIaAnalysis(raw, msgNormalizado);

  // Si es un saludo simple → no tocar BD
  if (esSaludoSimple) {
    return iaRespuesta;
  }

  // 2️⃣ Enriquecer filtros con reglas adicionales
  const filtrosFinales = enrichFiltersWithRules(msgNormalizado, filtrosBase);

  // 3️⃣ Enrutar intención hacia su controlador
  const respuesta = await routeIntent(intencion, filtrosFinales, {
    iaRespuesta,
    rawMessage: raw,
    userPhone
  });

  return respuesta;
}

