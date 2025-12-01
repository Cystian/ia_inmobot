// /bot/interpretar/index.js
// -------------------------------------------------------
// Pipeline principal de interpretación IA v3
// 1. Normaliza el texto
// 2. Extrae intención base
// 3. Extrae entidades (cuartos, baños, zonas, precio, cocheras…)
// 4. Extrae preferencias semánticas
// 5. Router envía al controlador correcto
// -------------------------------------------------------

import normalizeText from "./normalizeText.js";
import getIaAnalysis from "./intentClassifier.js";
import extractEntitiesWithRules from "./entityExtractor.js";
import extractFollowup from "./entityExtractorFollowups.js";
import extractSemanticPreferences from "./semanticPreferences.js";
import routerIA from "./router.js";

export default async function interpretar(raw) {
  try {
    // 1️⃣ Normalización del lenguaje
    const clean = normalizeText(raw);

    // 2️⃣ IA: clasificación de intención general
    const ia = await getIaAnalysis(clean);

    // 3️⃣ Extraer entidades numéricas y de filtros (precio, zona, cuartos…)
    const entidades = extractEntitiesWithRules(clean);

    // 4️⃣ Extraer follow-ups (más opciones, otra zona, etc.)
    const follow = extractFollowup(clean);

    // 5️⃣ Extraer preferencias semánticas (moderno, clásico, premium, céntrico…)
    const prefs = extractSemanticPreferences(clean);

    // 6️⃣ Armar paquete final para router
    const paquete = {
      raw,
      clean,
      ia,
      entidades,
      follow,
      prefs,
    };

    // 7️⃣ Router decide qué controlador debe manejar la solicitud
    return await routerIA(paquete);

  } catch (err) {
    console.error("❌ Error interpretando:", err);
    return "Hubo un problema interpretando tu mensaje. ¿Podrías repetirlo?";
  }
}