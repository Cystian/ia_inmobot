// /bot/interpretar/normalize.js
// -------------------------------------------------------
// Convierte el texto a minúsculas y elimina tildes,
// permitiendo coincidencias más amplias.
// -------------------------------------------------------

export function normalizeText(text = "") {
  const lower = text.toLowerCase().trim();

  return lower
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u");
}

