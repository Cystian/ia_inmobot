// /bot/interpretar/preTypeExtractor.js
// -------------------------------------------------------
// FASE 5.7 — EXTRACTOR DE TIPO DE PROPIEDAD
// -------------------------------------------------------
// Detecta tipos reales basados en tu BD:
// casa, departamento, terreno, oficina,
// local comercial, terreno comercial, hotel
//
// Soporta variaciones como:
// "casa bonita", "local grande", "terreno amplio",
// "hotel en Chimbote", "oficina pequeña"
// -------------------------------------------------------

export function extractTipo(raw = "") {
  if (!raw) return null;

  const txt = raw.toLowerCase();

  // Definición de tipos reales
  const tipos = [
    { key: "casa", match: ["casa", "casita"] },
    { key: "departamento", match: ["departamento", "depa", "dpto"] },
    { key: "terreno", match: ["terreno", "lote", "solar"] },
    { key: "oficina", match: ["oficina"] },
    { key: "local comercial", match: ["local", "local comercial"] },
    { key: "terreno comercial", match: ["terreno comercial"] },
    { key: "hotel", match: ["hotel", "hospedaje"] }
  ];

  // Recorre cada tipo verificando patrones
  for (const tipo of tipos) {
    for (const palabra of tipo.match) {
      if (txt.includes(palabra)) {
        return tipo.key; // retorna tipo limpio
      }
    }
  }

  return null; // No se detectó tipo
}

// -------------------------------------------------------
// Inserta el tipo detectado dentro de filtros
// -------------------------------------------------------
export function applyTipoToFilters(rawMessage, filtros) {
  const tipo = extractTipo(rawMessage);
  if (tipo) {
    return { ...filtros, tipo };
  }
  return filtros;
}
