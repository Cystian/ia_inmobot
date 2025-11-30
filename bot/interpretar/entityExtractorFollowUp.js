
// /bot/interpretar/entityExtractorFollowUp.js
// -------------------------------------------------------
// EXTRA: Extraction de follow-up avanzado
// Detecta refinamientos sobre filtros ya existentes:
// precio, baños, cocheras, área, zona, extras, etc.
// -------------------------------------------------------

export function extractFollowUpFilters(msg = "", lastFilters = {}, lastProperties = []) {
  const lower = msg.toLowerCase();
  let newFilters = { ...lastFilters };

  // ============================================
  // 1️⃣ PRECIO DINÁMICO
  // ============================================

  const precios = lastProperties.map((p) => Number(p.price) || 0).filter((n) => n > 0);
  const maxPrev = Math.max(...precios, 0);
  const minPrev = Math.min(...precios, 0);

  if (lower.includes("más barato") || lower.includes("mas barato") || lower.includes("más economico")) {

    // Si el cliente NO tiene un precio anterior explícito:
    if (!newFilters.precio_max) {
      // Baja 15% del precio promedio
      const prom = precios.reduce((a, b) => a + b, 0) / precios.length;
      newFilters.precio_max = Math.floor(prom * 0.85);
    } else {
      // Baja 10% sobre su rango definido
      newFilters.precio_max = Math.floor(newFilters.precio_max * 0.9);
    }

    // Evitar bajar más que el mínimo real del mercado
    if (newFilters.precio_max < minPrev) {
      newFilters.precio_max = minPrev;
    }
  }

  if (lower.includes("más caro") || lower.includes("mas caro") || lower.includes("algo mejor")) {
    if (newFilters.precio_max) {
      newFilters.precio_max = Math.floor(newFilters.precio_max * 1.15);
    } else {
      const prom = precios.reduce((a, b) => a + b, 0) / precios.length;
      newFilters.precio_max = Math.floor(prom * 1.15);
    }

    // Evitar superar el máximo real
    if (newFilters.precio_max < maxPrev) {
      newFilters.precio_max = maxPrev;
    }
  }

  // "menos de 100 mil"
  const menosMatch = lower.match(/menos de\s*(\d+)/);
  if (menosMatch) {
    newFilters.precio_max = Number(menosMatch[1]);
  }

  // "máximo 120 mil"
  const maxMatch = lower.match(/maximo\s*(\d+)/);
  if (maxMatch) {
    newFilters.precio_max = Number(maxMatch[1]);
  }

  // ============================================
  // 2️⃣ COCHERAS
  // ============================================
  if (lower.includes("cochera") || lower.includes("cocheras") || lower.includes("parking")) {
    const num = lower.match(/(\d+)\s*cocher/);
    newFilters.cocheras = num ? Number(num[1]) : 1;
  }

  // ============================================
  // 3️⃣ BAÑOS
  // ============================================
  if (lower.includes("baño") || lower.includes("baños") || lower.includes("bano")) {
    const num = lower.match(/(\d+)\s*(baño|baños|bano|banos)/);
    newFilters.bathrooms = num ? Number(num[1]) : 1;
  }

  // ============================================
  // 4️⃣ DORMITORIOS
  // ============================================
  if (lower.includes("dorm") || lower.includes("habitacion") || lower.includes("cuarto")) {
    const num = lower.match(/(\d+)\s*(dorm|hab|cuarto|habitacion)/);
    newFilters.bedrooms = num ? Number(num[1]) : 1;
  }

  // ============================================
  // 5️⃣ ÁREA
  // ============================================
  if (lower.includes("m2") || lower.includes("metros cuadrados") || lower.includes("area")) {
    const num = lower.match(/(\d+)\s*(m2|metros|metros cuadrados)/);
    if (num) newFilters.area_min = Number(num[1]);
  }

  // ============================================
  // 6️⃣ Distrito refinado
  // ============================================
  if (lower.includes("solo en nuevo chimbote")) newFilters.distritos = ["Nuevo Chimbote"];
  if (lower.includes("solo en chimbote")) newFilters.distritos = ["Chimbote"];
  if (lower.includes("solo en buenos aires")) newFilters.distritos = ["Buenos Aires"];

  // Si dice solo en X
  const soloMatch = lower.match(/solo en (.+)/);
  if (soloMatch) {
    const zona = soloMatch[1].trim();
    newFilters.distritos = [zona.charAt(0).toUpperCase() + zona.slice(1)];
  }

  // ============================================
  // 7️⃣ Extras
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