// /bot/interpretar/cleanForwarded.js
// -------------------------------------------------------
// Limpieza avanzada de mensajes reenviados o pegados
// - Quita "Reenviado", "Forwarded", ">", disclaimers
// - Elimina saltos y líneas basura
// - Normaliza espacios
// - Ideal antes de todo procesamiento de IA
// -------------------------------------------------------

export function cleanForwarded(raw = "") {
  if (!raw) return "";

  let msg = raw;

  // 1️⃣ Eliminar etiquetas típicas de reenvío
  msg = msg
    .replace(/reenviado/gi, "")
    .replace(/re-enviado/gi, "")
    .replace(/forwarded/gi, "")
    .replace(/mensaje reenviado/gi, "")
    .replace(/fw:/gi, "")
    .replace(/fwd:/gi, "");

  // 2️⃣ Eliminar el caracter ">" de citas (muy común en WA)
  msg = msg.replace(/^>+/gm, "");

  // 3️⃣ Eliminar disclaimers de Meta Leads (si vinieran pegados)
  msg = msg
    .replace(/nombre:/gi, "nombre:")
    .replace(/correo:/gi, "correo:")
    .replace(/email:/gi, "email:")
    .replace(/tel[eé]fono:/gi, "telefono:");

  // 4️⃣ Quitar caracteres raros y repetidos
  msg = msg
    .replace(/\u200B/g, "")      // zero width space
    .replace(/\s+/g, " ")        // espacios múltiples
    .trim();

  // 5️⃣ Limpieza leve de saltos
  msg = msg.replace(/\n{2,}/g, "\n").trim();

  return msg;
}