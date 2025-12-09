// /bot/interpretar/normalize.js
// -------------------------------------------------------
// Normalización avanzada para FASE 5.6 / FASE 6
// - Minúsculas
// - Sin tildes
// - Quita texto reenviado
// - Limpia líneas con ">" y "forwarded"
// -------------------------------------------------------

export function normalizeText(text = "") {
  if (!text) return "";

  let t = text
    .toLowerCase()
    .trim();

  // Quitar caracteres de mensaje reenviado
  t = t
    .replace(/reenviado/gi, "")
    .replace(/forwarded/gi, "")
    .replace(/^>/gm, "")
    .trim();

  // Eliminar tildes
  t = t
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u");

  // Limpieza adicional
  t = t.replace(/\s+/g, " ");

  return t;
}