// /bot/services/sendMessageManager.js
// -------------------------------------------------------
// Capa Premium de Mensajería – FASE 5.6 OFICIAL
// - Prefijos naturales (no intrusivos)
// - AntiSpam robusto (texto + imagen)
// - Compatibilidad con sendMessage.js (reintentos Meta)
// - Prevención de duplicados META Webhook
// - Preparado para Fase 6 (botones, CRM)
// -------------------------------------------------------

import enviarMensaje, { enviarImagen } from "./sendMessage.js";
import { updateSession } from "../interpretar/contextManager.js";

// -------------------------------------------------------
// VARIACIONES PREMIUM
// -------------------------------------------------------
const SOFT_PREFIXES = [
  "Perfecto 👍",
  "Claro que sí 😊",
  "Genial, mira esto 👇",
  "Aquí tienes 👇",
  "Listo Christian 👌",
  "Encantado, revisa esta opción:",
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
// HELPERS
// -------------------------------------------------------
function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function normalize(str = "") {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

function isSimilar(a = "", b = "") {
  return normalize(a) === normalize(b);
}

// -------------------------------------------------------
// EVITA DUPLICADOS META (Webhook retries)
// -------------------------------------------------------
function alreadySent(session, payloadHash) {
  return session?.lastPayloadHash === payloadHash;
}

function generateHash(str) {
  return normalize(str);
}

// -------------------------------------------------------
// ENVÍO PREMIUM DE TEXTO
// -------------------------------------------------------
export async function sendTextPremium(userPhone, text, session = {}) {
  if (!userPhone) return;

  let finalText = text.trim();
  const low = normalize(finalText);

  // Prefijo suave si corresponde
  const triggersIntro = [
    "propiedad",
    "opciones",
    "te muestro",
    "aquí tienes",
    "encaja muy bien",
    "mira esta opción",
    "sugeridas",
    "alternativas"
  ];

  const debePrefix =
    triggersIntro.some((t) => low.includes(t)) &&
    !low.startsWith("perfecto") &&
    !low.startsWith("genial") &&
    !low.startsWith("aquí tienes");

  if (debePrefix) {
    finalText = `${randomPick(SOFT_PREFIXES)}\n\n${finalText}`;
  }

  // Anti-spam: evita repetir el MISMO mensaje
  if (isSimilar(session?.lastBotMessage, finalText)) {
    console.log("⛔ Evitado spam de texto similar.");
    return;
  }

  const payloadHash = generateHash(finalText);
  if (alreadySent(session, payloadHash)) {
    console.log("⛔ Evitado reenvío Meta (payload repetido).");
    return;
  }

  await enviarMensaje(userPhone, finalText);

  updateSession(userPhone, {
    lastBotMessage: finalText,
    lastPayloadHash: payloadHash
  });
}

// -------------------------------------------------------
// ENVÍO PREMIUM DE IMÁGENES
// -------------------------------------------------------
export async function sendImagePremium(userPhone, imageUrl, caption = "", session = {}) {
  if (!userPhone || !imageUrl) return;

  const capNorm = normalize(caption);

  if (isSimilar(session?.lastBotImageCaption, capNorm)) {
    console.log("⛔ Imagen ignorada por repetición.");
    return;
  }

  const payloadHash = generateHash(imageUrl + "::" + capNorm);
  if (alreadySent(session, payloadHash)) {
    console.log("⛔ Evitado duplicado de imagen META.");
    return;
  }

  try {
    await enviarImagen(userPhone, imageUrl, caption);

    updateSession(userPhone, {
      lastBotImageCaption: capNorm,
      lastBotImageURL: imageUrl,
      lastPayloadHash: payloadHash
    });
  } catch (e) {
    console.error("⚠ Error enviando imagen. Fallback a texto:", e);
    await enviarMensaje(userPhone, caption);
  }
}

// -------------------------------------------------------
// CIERRE PREMIUM ALEATORIO
// -------------------------------------------------------
export function cierrePremium() {
  return randomPick(CIERRES);
}

// -------------------------------------------------------
// Fase 6 – Envío de listas con botones
// -------------------------------------------------------
export async function sendListPremium(userPhone, title, buttons = []) {
  // Se implementará en la Fase 6
}