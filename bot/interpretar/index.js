// /bot/interpretar/index.js
// -------------------------------------------------------
// Motor principal FASE 5.6
// - Maneja sesión
// - IA (Groq) + reglas estrictas
// - Follow-up real
// - Intento inversión
// - Leads de Facebook Ads
// -------------------------------------------------------

import { normalizeText } from "./normalize.js";
import { getIaAnalysis } from "./intentClassifier.js";
import { enrichFiltersWithRules } from "./entityExtractor.js";
import { routeIntent } from "./router.js";
import { getSession, updateSession } from "./contextManager.js";
import { extractSemanticPreferences } from "./semanticPreferences.js";

// 🔹 Detecta Leads de Facebook Ads
function esLeadMeta(msg) {
  const low = msg.toLowerCase();
  return (
    low.includes("nombre:") ||
    low.includes("telefono:") ||
    low.includes("teléfono:") ||
    low.includes("correo:") ||
    low.includes("email:") ||
    low.includes("presupuesto") ||
    low.includes("lead")
  );
}

// 🔹 Palabras clave de inversión (sin IA)
const KW_INVERSION = [
  "invertir",
  "inversion",
  "inversión",
  "negocio",
  "rentable",
  "retorno",
  "revaloriz",
  "crezca",
  "ganancia",
  "oportunidad de inversión"
];

export default async function interpretar(userMessage = "", userPhone = "") {
  const raw = userMessage || "";
  const msgNormalizado = normalizeText(raw);
  const lower = raw.toLowerCase().trim();

  // ======================================================
  // 1️⃣ OBTENER SESIÓN ANTES DE CUALQUIER PROCESO
  // ======================================================
  const session = getSession(userPhone);

  // ======================================================
  // 2️⃣ Detectar lead de Meta Ads ANTES que cualquier IA
  // ======================================================
  if (esLeadMeta(lower)) {
    updateSession(userPhone, {
      lastIntent: "lead_meta",
      isLead: true,
      hasGreeted: true
    });

    return "Perfecto, ya recibí tus datos 😊. En un momento te mostraré opciones ideales según tu presupuesto.";
  }

  // ======================================================
  // 3️⃣ Obtener IA (intención + filtros base)
  // ======================================================
  const {
    intencion,
    filtrosBase,
    iaRespuesta,
    esSaludoSimple,
    esFollowUp
  } = await getIaAnalysis(raw, msgNormalizado, session);

  let intencionFinal = intencion;

  // ======================================================
  // 4️⃣ Intento de inversión (tiene prioridad sobre IA)
  // ======================================================
  if (KW_INVERSION.some(k => lower.includes(k))) {
    intencionFinal = "inversion";
  }

  // ======================================================
  // 5️⃣ Manejo de saludo único por sesión
  // ======================================================
  if (esSaludoSimple && !session.hasGreeted) {
    updateSession(userPhone, { hasGreeted: true });
    return iaRespuesta;
  }

  // ======================================================
  // 6️⃣ Aplicar reglas adicionales (strict zones, baños, m2…)
  // ======================================================
  const filtrosFinales = enrichFiltersWithRules(msgNormalizado, filtrosBase, session);

  // ======================================================
  // 7️⃣ Preferencias semánticas (premium, moderno…)
  // ======================================================
  const semanticPrefs = extractSemanticPreferences(msgNormalizado, session);

  // ======================================================
  // 8️⃣ Actualizar sesión
  // ======================================================
  updateSession(userPhone, {
    lastMessage: raw,
    lastIntent: intencionFinal,
    lastFilters: filtrosFinales,
    semanticPrefs,
    esFollowUp,
    hasGreeted: true // evita saludos repetidos
  });

  // ======================================================
  // 9️⃣ Enrutar controlador final
  // ======================================================
  const respuesta = await routeIntent(intencionFinal, filtrosFinales, {
    iaRespuesta,
    rawMessage: raw,
    userPhone,
    session,
    semanticPrefs,
    esFollowUp
  });

  // ======================================================
  // 🔟 Si el controlador envió los mensajes directamente → no devolvemos texto
  // ======================================================
  if (respuesta === null) return null;

  return respuesta || "¿En qué puedo ayudarte ahora?";
}