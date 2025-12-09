// /bot/interpretar/qualifierExtractor.js
// -------------------------------------------------------
// Traducción de calificativos humanos → filtros reales
// FASE 5.7 — Compatible con propiedadesService
// -------------------------------------------------------

export function extractQualifiers(text = "", filtrosIniciales = {}) {
  const t = text.toLowerCase();
  const filtros = { ...filtrosIniciales };

  // ---------------------------
  // CASA BONITA / PROPIEDAD BONITA
  // ---------------------------
  if (t.includes("bonita") || t.includes("linda") || t.includes("moderna") || t.includes("nueva")) {
    filtros.precio_min = filtros.precio_min || 80000; // ajusta a tu mercado
  }

  // ---------------------------
  // LOCAL GRANDE / CASA GRANDE / AMPLIA
  // ---------------------------
  if (t.includes("grande") || t.includes("amplia") || t.includes("amplio")) {
    filtros.area_min = filtros.area_min || 120;
  }

  // ---------------------------
  // BARATO / ECONÓMICO
  // ---------------------------
  if (t.includes("barato") || t.includes("económico") || t.includes("economico")) {
    filtros.precio_max = filtros.precio_max || 70000;
  }

  // ---------------------------
  // LUJOSA / PREMIUM
  // ---------------------------
  if (t.includes("lujosa") || t.includes("de lujo") || t.includes("premium")) {
    filtros.precio_min = filtros.precio_min || 150000;
  }

  return filtros;
}