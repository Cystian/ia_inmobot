// /bot/interpretar/entityExtractor.js
// -------------------------------------------------------
// FASE 5.6 — EXTRACTOR DE ENTIDADES ULTRA-ROBUSTO
// - Modo estricto anti-invenciones
// - Zonas dinámicas desde BD (incluso si hoy no tienen propiedades)
// - Compatible con leads de Meta Ads
// - Limpieza de reenviados
// - Precios inteligentes y tipos estrictos
// -------------------------------------------------------

import { pool } from "../../db.js";
import { cleanForwarded } from "./cleanForwarded.js";

// 🔹 Zonas válidas fijas (cliente quiere conservarlas aunque hoy no haya propiedades)
const ZONAS_FIJAS = [
  "nuevo chimbote",
  "chimbote",
  "buenos aires",
  "bellamar",
  "villa maria",
  "la caleta",
  "casma"
];

// 🔹 Extras detectables
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

// -------------------------------------------------------
// 🔹 Consulta BD en tiempo real para obtener zonas reales
// -------------------------------------------------------
async function obtenerZonasDesdeBD() {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT location FROM properties
      WHERE location IS NOT NULL AND location <> ''
    `);

    return rows.map(r => r.location.toLowerCase().trim());
  } catch {
    return [];
  }
}

// -------------------------------------------------------
// 🔹 Meta Lead Detector
// -------------------------------------------------------
function esLeadMeta(msg) {
  const m = msg.toLowerCase();
  return (
    m.includes("nombre:") ||
    m.includes("correo:") ||
    m.includes("email:") ||
    m.includes("telefono:") ||
    m.includes("teléfono:") ||
    m.includes("presupuesto")
  );
}

// -------------------------------------------------------
// 🔹 ENRICH FILTERS MAIN FUNCTION
// -------------------------------------------------------
export async function enrichFiltersWithRules(msgRaw, filtrosBase = {}, session = {}) {
  // Limpiar texto
  const msg = cleanForwarded(msgRaw.toLowerCase());

  // Filtros acumulados
  const filtros = {
    ...(session.lastFilters || {}),
    ...(filtrosBase || {})
  };

  // ======================================================
  // 1. Leads de Meta Ads → Salida inmediata
  // ======================================================
  if (esLeadMeta(msg)) {
    filtros.status = filtros.status || "venta";
    return filtros;
  }

  // ======================================================
  // 2. Zonas válidas fusionadas (fijas + BD)
  // ======================================================
  const zonasBD = await obtenerZonasDesdeBD();
  const zonasValidas = new Set([...ZONAS_FIJAS, ...zonasBD]);

  const dist = new Set(filtros.distritos || []);

  zonasValidas.forEach(z => {
    if (msg.includes(z)) dist.add( capitalizar(z) );
  });

  filtros.distritos = Array.from(dist);

  // ======================================================
  // 3. Status
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
  // 4. Tipos estrictos
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
  // 5. Dormitorios
  // ======================================================
  const beds = msg.match(/(\d+)\s*(dorm|hab|cuarto|habitaciones?)/);
  if (beds) filtros.bedrooms = Number(beds[1]);

  // ======================================================
  // 6. Baños
  // ======================================================
  const baths = msg.match(/(\d+)\s*(baño|banos|baños)/);
  if (baths) filtros.bathrooms = Number(baths[1]);

  // ======================================================
  // 7. Cocheras
  // ======================================================
  const coch = msg.match(/(\d+)\s*(cocheras?|parking|estacionamiento)/);
  if (coch) filtros.cocheras = Number(coch[1]);

  // ======================================================
  // 8. Área mínima
  // ======================================================
  const area = msg.match(/(\d+)\s*(m2|metros|metros cuadrados)/);
  if (area) filtros.area_min = Number(area[1]);

  // ======================================================
  // 9. Rango de precios
  // ======================================================
  const rango = msg.match(/entre\s+(\d+)\s*(mil|k)?\s+y\s+(\d+)\s*(mil|k)?/);
  if (rango) {
    let min = Number(rango[1]);
    let max = Number(rango[3]);
    if (rango[2]) min *= 1000;
    if (rango[4]) max *= 1000;
    filtros.precio_min = min;
    filtros.precio_max = max;
  }

  const simple = msg.match(/(hasta|menos de)\s+(\d+)\s*(mil|k)?/);
  if (simple) {
    let n = Number(simple[2]);
    if (simple[3]) n *= 1000;
    filtros.precio_max = n;
  }

  // ======================================================
  // 10. Extras
  // ======================================================
  const extras = new Set(filtros.extras || []);
  for (const rule of EXTRAS_RULES) {
    if (msg.includes(rule.match)) extras.add(rule.key);
  }
  filtros.extras = Array.from(extras);

  return filtros;
}


// -------------------------------------------------------
// Helper: capitalizar zonas
// -------------------------------------------------------
function capitalizar(str = "") {
  return str.charAt(0).toUpperCase() + str.slice(1);
}