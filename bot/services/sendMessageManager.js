// /bot/services/sendMessageManager.js
// -------------------------------------------------------
// Capa Premium de Mensajería.
// - Variación natural en respuestas
// - Microcierres
// - Control de spam (evita repetición)
// - Prefijos naturales
// - Tono profesional inmobiliario
// -------------------------------------------------------

import enviarMensaje, { enviarImagen } from "./sendMessage.js";
import { updateSession } from "../interpretar/contextManager.js";

// Variaciones para mensajes introductorios
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

// Variaciones para cierres suaves
const CIERRES = [
  "Si deseas, puedo ajustarlo a tu presupuesto.",
  "Puedo buscar algo más específico si quieres.",
  "¿Quieres ver alternativas similares?",
  "Puedo ayudarte con visitas o asesor humano.",
  "Dime si deseas refinar zonas o presupuesto.",
  "Cuando quieras seguimos viendo opciones 😊.",
  "¿Quieres que te muestre más alternativas?"
];

// -------------------------------------------------------
// Obtiene un item aleatorio de un array
// -------------------------------------------------------
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// -------------------------------------------------------
// Evita enviar mensajes duplicados seguidos
// -------------------------------------------------------
function shouldSend(prevMsg, newMsg) {
  if (!prevMsg) return true;
  return prevMsg.trim() !== newMsg.trim();
}

// -------------------------------------------------------
// ENVÍO DE TEXTO PREMIUM
// -------------------------------------------------------
export async function sendTextPremium(userPhone, text, session) {
  if (!userPhone) return;

  // Añadir prefijo natural aleatorio en ciertos casos
  let formatted = text;

  const msgLower = text.toLowerCase();
  const isListIntro =
    msgLower.includes("te muestro") ||
    msgLower.includes("aquí tienes") ||
    msgLower.includes("opciones") ||
    msgLower.includes("propiedad") ||
    msgLower.includes("encaja muy bien");

  if (isListIntro) {
    formatted = `${randomPick(SOFT_PREFIXES)}\n\n${text}`;
  }

  // Control de spam por repetición
  if (!shouldSend(session.lastBotMessage, formatted)) {
    console.log("⛔ Bloqueo de spam: mensaje repetido.");
    return;
  }

  await enviarMensaje(userPhone, formatted);

  updateSession(userPhone, {
    lastBotMessage: formatted
  });
}

// -------------------------------------------------------
// ENVÍO DE IMÁGENES PREMIUM
// Añade caption humanizado y control de spam
// -------------------------------------------------------
export async function sendImagePremium(userPhone, imageUrl, caption, session) {
  if (!userPhone) return;

  // Control básico de repetición de imagen similar
  const prevCaption = session.lastBotImageCaption || "";
  if (!shouldSend(prevCaption, caption)) {
    console.log("⛔ Bloqueo de spam imagen.");
    return;
  }

  try {
    await enviarImagen(userPhone, imageUrl, caption);

    updateSession(userPhone, {
      lastBotImageCaption: caption
    });
  } catch (err) {
    console.error("⚠ Error enviando imagen premium:", err);

    // Fallback a mensaje de texto
    await enviarMensaje(userPhone, caption);
  }
}

// -------------------------------------------------------
// Generar cierre profesional aleatorio
// -------------------------------------------------------
export function cierrePremium() {
  return randomPick(CIERRES);
}
