// /bot/services/sendMessageManager.js
// -------------------------------------------------------
// Capa Premium de Mensajería (VERSIÓN FASE 5 COMPLETA)
// - Variación natural y controlada
// - Antispam inteligente (texto + imagen)
// - Prefijos suaves en contexto correcto
// - Fallback seguro si Meta falla
// - Preparado para Fase 6 (CRM + Reply Buttons)
// -------------------------------------------------------

import enviarMensaje, { enviarImagen } from "./sendMessage.js";
import { updateSession } from "../interpretar/contextManager.js";

// -------------------------------------------------------
// Variaciones Premium
// -------------------------------------------------------
const SOFT_PREFIXES = [
  "Perfecto 👍",
  "Claro que sí 😊",
  "Genial, te muestro:",
  "Aquí tienes 👇",
  "Listo Christian 👌",
  "Encantado, revisa esta info:",
  "Déjame mostrarte:",
  "Excelente elección 👇"
];

const CIERRES = [
  "Si deseas, puedo ajustarlo a tu presupuesto.",
  "Puedo buscar algo más específico si quieres.",
  "¿Quieres ver alternativas similares?",
  "Puedo ayudarte coordinando visitas.",
  "Dime si deseas refinar zonas o presupuesto.",
  "Cuando quieras seguimos buscando 😊.",
  "¿Quieres que te muestre más opciones?"
];

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function normalize(str = "") {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

// Evita spam considerando similitud aproximada
function isSimilar(a = "", b = "") {
  return normalize(a) === normalize(b);
}

// -------------------------------------------------------
// ENVÍO PREMIUM DE TEXTO
// -------------------------------------------------------
export async function sendTextPremium(userPhone, text, session) {
  if (!userPhone) return;

  let finalText = text.trim();

  const low = finalText.toLowerCase();

  const triggersIntro = [
    "propiedad",
    "opciones",
    "te muestro",
    "aquí tienes",
    "encaja muy bien",
    "mira esta opción"
  ];

  const debePrefix =
    triggersIntro.some((t) => low.includes(t)) &&
    !low.startsWith("perfecto") &&
    !low.startsWith("genial");

  if (debePrefix) {
    finalText = `${randomPick(SOFT_PREFIXES)}\n\n${finalText}`;
  }

  // Antispam inteligente
  if (isSimilar(session?.lastBotMessage, finalText)) {
    console.log("⛔ Evitado spam de texto similar.");
    return;
  }

  await enviarMensaje(userPhone, finalText);

  updateSession(userPhone, { lastBotMessage: finalText });
}

// -------------------------------------------------------
// ENVÍO PREMIUM DE IMÁGENES
// -------------------------------------------------------
export async function sendImagePremium(userPhone, imageUrl, caption, session) {
  if (!userPhone || !imageUrl) return;

  // Antispam imagen
  if (isSimilar(session?.lastBotImageCaption, caption)) {
    console.log("⛔ Imagen ignorada por repetición.");
    return;
  }

  try {
    await enviarImagen(userPhone, imageUrl, caption);

    updateSession(userPhone, {
      lastBotImageCaption: caption,
      lastBotImageURL: imageUrl
    });
  } catch (e) {
    console.error("⚠ Error enviando imagen. Fallback a texto:", e);
    await enviarMensaje(userPhone, caption);
  }
}

// -------------------------------------------------------
// Cierre Premium (aleatorio)
// -------------------------------------------------------
export function cierrePremium() {
  return randomPick(CIERRES);
}

// -------------------------------------------------------
// Para Fase 6–7 CRM: envío de listas / botones
// -------------------------------------------------------
export async function sendListPremium(userPhone, title, buttons) {
  // Se implementará en Fase 6
}

// -------------------------------------------------------
export function cierrePremium() {
  return randomPick(CIERRES);
}
