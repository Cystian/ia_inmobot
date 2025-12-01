// /bot/interpretar/entityExtractorFollowUp.js
// -------------------------------------------------------
// Follow-up: refinamiento de filtros ya existentes.
// Compatible con Vercel Edge (UTF-8 limpio).
// -------------------------------------------------------

export function extractFollowUpFilters(msg = "", lastFilters = {}, lastProperties = []) {
  const lower = msg.toLowerCase();
  const newFilters = { ...lastFilters };

  // ============================================
  // PRECIO
  // ============================================
  const precios = lastProperties
    .map((p) => Number(p.price) || 0)
    .filter((n) => n > 0);

  const maxPrev = Math.max(...precios, 0);
  const minPrev = Math.min(...precios, 0);

  // Frases: mas barato, mas economico
  if (
    lower.includes("mas barato") ||
    lower.includes("más barato") ||
    lower.includes("mas economico") ||
    lower.includes("más economico")
  ) {
    if (!newFilters.precio_max) {
      const prom = precios.reduce((a, b) => a + b, 0) / (precios.length || 1);
      newFilters.precio_max = Math.floor(prom * 0.85);
    } else {
      newFilters.precio_max = Math.floor(newFilters.precio_max * 0.9);
    }
    if (newFilters.precio_max < minPrev) newFilters.precio_max = minPrev;
  }

  // mas caro, algo mejor
  if (
    lower.includes("mas caro") ||
    lower.includes("más caro") ||
    lower.includes("algo mejor")
  ) {
    if (newFilters.precio_max) {
      newFilters.precio_max = Math.floor(newFilters.precio_max * 1.15);
    } else {
      const prom = precios.reduce((a, b) => a + b, 0) / (precios.length || 1);
      newFilters.precio_max = Math.floor(prom * 1.15);
    }
    if (newFilters.precio_max < maxPrev) newFilters.precio_max = maxPrev;
  }

  // menos de X
  const menosMatch = lower.match(/menos de\s*(\d+)/);
  if (menosMatch) newFilters.precio_max = Number(menosMatch[1]);

  // maximo X
  const maxMatch = lower.match(/maximo\s*(\d+)/);
  if (maxMatch) newFilters.precio_max = Number(maxMatch[1]);

  // ============================================
  // COCHERAS
  // ============================================
  if (lower.includes("cochera") || lower.includes("cocheras") || lower.includes("parking")) {
    const num = lower.match(/(\d+)\s*cocher/);
    newFilters.cocheras = num ? Number(num[1]) : 1;
  }

  // ============================================
  // BAÑOS
  // ============================================
  if (
    lower.includes("baño") ||
    lower.includes("baños") ||
    lower.includes("bano") ||
    lower.includes("banos")
  ) {
    const num = lower.match(/(\d+)\s*(baño|baños|bano|banos)/);
    newFilters.bathrooms = num ? Number(num[1]) : 1;
  }

  // ============================================
  // DORMITORIOS
  // ============================================
  if (
    lower.includes("dorm") ||
    lower.includes("habitacion") ||
    lower.includes("habitaciones") ||
    lower.includes("cuarto")
  ) {
    const num = lower.match(/(\d+)\s*(dorm|hab|cuarto|habitacion)/);
    newFilters.bedrooms = num ? Number(num[1]) : 1;
  }

  // ============================================
  // AREA
  // ============================================
  if (lower.includes("m2") || lower.includes("metros") || lower.includes("area")) {
    const num = lower.match(/(\d+)\s*(m2|metros|metros cuadrados)/);
    if (num) newFilters.area_min = Number(num[1]);
  }

  // ============================================
  // DISTRITO
  // ============================================
  if (lower.includes("solo en nuevo chimbote")) newFilters.distritos = ["Nuevo Chimbote"];
  if (lower.includes("solo en chimbote")) newFilters.distritos = ["Chimbote"];
  if (lower.includes("solo en buenos aires")) newFilters.distritos = ["Buenos Aires"];

  const soloMatch = lower.match(/solo en (.+)/);
  if (soloMatch) {
    const zona = soloMatch[1].trim();
    newFilters.distritos = [
      zona.charAt(0).toUpperCase() + zona.slice(1)
    ];
  }

  // ============================================
  // EXTRAS
  // ============================================
  newFilters.extras = newFilters.extras || [];

  if (lower.includes("esquin")) newFilters.extras.push("esquinera");
  if (lower.includes("parque")) newFilters.extras.push("frente_parque");
  if (lower.includes("remodel")) newFilters.extras.push("remodelado");
  if (lower.includes("estreno")) newFilters.extras.push("estreno");
  if (lower.includes("amoblado")) newFilters.extras.push("amoblado");
  if (lower.includes("negociable")) newFilters.extras.push("negociable");

  return newFilters;
}