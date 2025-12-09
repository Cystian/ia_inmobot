// /bot/interpretar/entityExtractorFollowUp.js
// -------------------------------------------------------
// FASE 5.7 — Follow-Up Inteligente
// -------------------------------------------------------
// - Ajustes suaves: más barato, más grande, más dormitorios, etc.
// - Mantiene coherencia con filtros anteriores
// - No rompe la búsqueda original
// - Siempre retorna filtros válidos
// -------------------------------------------------------

export function extractFollowUpFilters(msg, prev, lista = []) {
  const text = (msg || "").toLowerCase().trim();

  let filtros = { ...prev };

  // ======================================================
  // 1️⃣ MÁS BARATO / MÁS ECONÓMICO
  // ======================================================
  if (
    text.includes("mas barato") ||
    text.includes("más barato") ||
    text.includes("economico") ||
    text.includes("económico")
  ) {
    // Tomar el precio mínimo de la lista previa
    const precios = lista.map(p => Number(p.price)).filter(n => !isNaN(n));

    if (precios.length > 0) {
      const nuevoMax = Math.min(...precios) * 0.95; // 5% más bajo
      filtros.precio_max = Math.round(nuevoMax);
    }
  }

  // ======================================================
  // 2️⃣ MÁS CARO (menos común)
  // ======================================================
  if (text.includes("mas caro") || text.includes("más caro") || text.includes("sube precio")) {
    const precios = lista.map(p => Number(p.price)).filter(n => !isNaN(n));

    if (precios.length > 0) {
      const nuevoMin = Math.max(...precios) * 1.05;
      filtros.precio_min = Math.round(nuevoMin);
    }
  }

  // ======================================================
  // 3️⃣ MÁS GRANDE / MÁS ÁREA
  // ======================================================
  if (text.includes("mas grande") || text.includes("más grande") || text.includes("mas area")) {
    const areas = lista.map(p => Number(p.area)).filter(n => !isNaN(n));

    if (areas.length > 0) {
      const nuevoMin = Math.max(...areas) * 1.05;
      filtros.area_min = Math.round(nuevoMin);
    }
  }

  // ======================================================
  // 4️⃣ MÁS DORMITORIOS
  // ======================================================
  if (text.includes("mas cuartos") || text.includes("más cuartos") || text.includes("más dorm")) {
    const beds = lista.map(p => Number(p.bedrooms)).filter(n => !isNaN(n));

    if (beds.length > 0) {
      const nuevoMin = Math.max(...beds) + 1;
      filtros.bedrooms = nuevoMin;
    }
  }

  // ======================================================
  // 5️⃣ SIMILARES / OTRA OPCIÓN / PARECIDA
  // ======================================================
  if (
    text.includes("similar") ||
    text.includes("parecida") ||
    text.includes("parecido") ||
    text.includes("otra opcion") ||
    text.includes("otra opción")
  ) {
    // Usar ubicación y tipo de la propiedad más clickeada
    const ref = lista[0];
    if (ref) {
      filtros.tipo = ref.tipo || filtros.tipo;
      filtros.distritos = [ref.location?.toLowerCase()] || filtros.distritos;
    }
  }

  // ======================================================
  // 6️⃣ LIMPIEZA FINAL (NO romper filtros)
  // ======================================================
  const clean = {};

  for (const k in filtros) {
    if (
      filtros[k] !== null &&
      filtros[k] !== undefined &&
      filtros[k] !== "" &&
      !(Array.isArray(filtros[k]) && filtros[k].length === 0)
    ) {
      clean[k] = filtros[k];
    }
  }

  return clean;
}