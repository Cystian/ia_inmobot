// /bot/interpretar/entityExtractor.js
// -------------------------------------------------------
// FASE 5.5 — EXTRACTOR DE ENTIDADES MEJORADO
// - Modo estricto (NO inventa zonas)
// - Compatible con leads de Meta Ads
// - Limpieza de mensajes reenviados
// - Rango de precios inteligente
// - Tipos de inmueble bien separados
// - Preparado para Fase 6
// -------------------------------------------------------

// 🔹 Zonas reales que manejas (solo estas son válidas)
const ZONAS_MAP = [
  { match: "nuevo chimbote", label: "Nuevo Chimbote" },
  { match: "chimbote", label: "Chimbote" },
  { match: "buenos aires", label: "Buenos Aires" },
  { match: "bellamar", label: "Bellamar" },
  { match: "villa maria", label: "Villa María" },
  { match: "la caleta", label: "La Caleta" }
];

const EXTRAS_RULES = [
  { match: "frente a parque", key: "frente_parque" },
  { match: "frente al parque", key: "frente_parque" },
  { match: "esquina", key: "esquina" },
  { match: "negociable", key: "negociable" },
  { match: "papeles", key: "papeles_ok" },
  { match: "documentos al dia", key: "papeles_ok" },
  { match: "estreno", key: "estreno" },
  { match: "remodelado", key: "remodelado" },
  { match: "amoblado", key: "amoblado" },
  { match: "amoblada", key: "amoblado" },
  { match: "piscina", key: "piscina" },
  { match: "jardin", key: "jardin" },
  { match: "jardín", key: "jardin" },
  { match: "patio", key: "patio" }
];

// 🔹 Detecta mensajes de Meta Leads (Facebook Ads)
function esLeadMeta(msg) {
  return (
    msg.includes("nombre:") ||
    msg.includes("correo:") ||
    msg.includes("email:") ||
    msg.includes("teléfono:") ||
    msg.includes("telefono:") ||
    msg.includes("presupuesto")
  );
}

// 🔹 Limpia texto reenviado
function limpiarReenviado(msg) {
  return msg
    .replace(/reenviado/gi, "")
    .replace(/forwarded/gi, "")
    .replace(/^>/gm, "") // elimina ">" de textos reenviados
    .trim();
}

export function enrichFiltersWithRules(msgRaw, filtrosBase = {}, session = {}) {
  const msg = limpiarReenviado(msgRaw.toLowerCase());

  const filtros = {
    ...(session.lastFilters || {}),
    ...(filtrosBase || {})
  };

  // ======================================================
  // 🔹 1. Lead de Facebook
  // ======================================================
  if (esLeadMeta(msg)) {
    filtros.status = filtros.status || "venta"; // Asume intención comercial inmediata
    return filtros; // No necesita procesar nada más
  }

  // ======================================================
  // 🔹 2. Detección estricta de zonas reales
  // ======================================================
  const dist = new Set(filtros.distritos || []);

  for (const z of ZONAS_MAP) {
    if (msg.includes(z.match)) dist.add(z.label);
  }

  filtros.distritos = Array.from(dist);

  // ======================================================
  // 🔹 3. Status
  // ======================================================
  if (msg.includes("comprar") || msg.includes("venta") || msg.includes("vendo"))
    filtros.status = "venta";

  if (
    msg.includes("alquilar") ||
    msg.includes("rentar") ||
    msg.includes("alquiler") ||
    msg.includes("renta")
  )
    filtros.status = "alquiler";

  // ======================================================
  // 🔹 4. Tipo de inmueble (MODO ESTRICTO)
  // ======================================================
  if (msg.includes("casa")) filtros.tipo = "casa";
  else if (msg.includes("departamento") || msg.includes("depa") || msg.includes("dpto"))
    filtros.tipo = "departamento";
  else if (msg.includes("terreno") || msg.includes("lote"))
    filtros.tipo = "terreno";
  else if (msg.includes("local"))
    filtros.tipo = "local";
  else if (msg.includes("oficina"))
    filtros.tipo = "oficina";

  // ======================================================
  // 🔹 5. Dormitorios
  // ======================================================
  const beds = msg.match(/(\d+)\s*(dorm|hab|cuarto|habitaciones?)/);
  if (beds) filtros.bedrooms = Number(beds[1]);

  // ======================================================
  // 🔹 6. Baños
  // ======================================================
  const baths = msg.match(/(\d+)\s*(baño|banos|baños)/);
  if (baths) filtros.bathrooms = Number(baths[1]);

  // ======================================================
  // 🔹 7. Cocheras
  // ======================================================
  const coch = msg.match(/(\d+)\s*(cocheras?|parking|estacionamiento)/);
  if (coch) filtros.cocheras = Number(coch[1]);

  // ======================================================
  // 🔹 8. Área mínima (m2)
  // ======================================================
  const areaMatch = msg.match(/(\d+)\s*(m2|metros|metros cuadrados)/);
  if (areaMatch) filtros.area_min = Number(areaMatch[1]);

  // ======================================================
  // 🔹 9. Rango de precios inteligente
  // ======================================================

  // entre 100 y 200 mil
  const rango = msg.match(/entre\s+(\d+)\s*(mil|k)?\s+y\s+(\d+)\s*(mil|k)?/);
  if (rango) {
    let min = Number(rango[1]);
    let max = Number(rango[3]);
    if (rango[2]) min *= 1000;
    if (rango[4]) max *= 1000;
    filtros.precio_min = min;
    filtros.precio_max = max;
  }

  // hasta 120 mil / menos de 90k
  const maxSimple = msg.match(/(hasta|menos de)\s+(\d+)\s*(mil|k)?/);
  if (maxSimple) {
    let n = Number(maxSimple[2]);
    if (maxSimple[3]) n *= 1000;
    filtros.precio_max = n;
  }

  // ======================================================
  // 🔹 10. Extras
  // ======================================================
  const extras = new Set(filtros.extras || []);
  for (const rule of EXTRAS_RULES) {
    if (msg.includes(rule.match)) extras.add(rule.key);
  }
  filtros.extras = Array.from(extras);

  return filtros;
}