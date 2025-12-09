// /bot/services/propiedadesService.js
// -------------------------------------------------------
// FASE 5.7+ OPTIMIZADO — BÚSQUEDA INTELIGENTE
// -------------------------------------------------------
// • Coincidencia exacta + relevancia ligera
// • Penaliza resultados irrelevantes (locales cuando piden casa)
// • Mejora búsquedas vagas (“casa bonita”, “depa amplio”)
// • Limpieza estricta de filtros
// • Preparado para Fase 6 (embeddings + ranking vectorial)
// -------------------------------------------------------

import db from "../config/db.js";
import { logError } from "../utils/log.js";

// Normalizador
function normalize(str = "") {
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Palabras clave por tipo de inmueble
const TYPE_KEYWORDS = {
  casa: ["casa", "chalets", "vivienda"],
  departamento: ["departamento", "depa", "dpto", "flat"],
  terreno: ["terreno", "lote", "parcelas"],
  local: ["local", "comercial", "tienda"]
};

// -------------------------------------------------------
// 🔍 1) FUNCIÓN PRINCIPAL: Búsqueda con relevancia
// -------------------------------------------------------
export async function buscarPropiedades(filtros = {}, semanticPrefs = {}) {
  try {
    let sql = `
      SELECT 
        id, title, price, location,
        bedrooms, bathrooms, cocheras, area,
        image, description, distribution
      FROM properties
      WHERE 1 = 1
    `;
    const params = [];

    // ------------------------------
    // Filtro: distritos
    // ------------------------------
    if (Array.isArray(filtros.distritos) && filtros.distritos.length > 0) {
      sql += ` AND (`;
      filtros.distritos.forEach((d, i) => {
        sql += `LOWER(location) LIKE ?`;
        params.push(`%${normalize(d)}%`);
        if (i < filtros.distritos.length - 1) sql += " OR ";
      });
      sql += `)`;
    }

    // ------------------------------
    // Filtro: tipo (casa, depa, terreno...)
    // ------------------------------
    if (filtros.tipo) {
      sql += ` AND LOWER(title) LIKE ?`;
      params.push(`%${normalize(filtros.tipo)}%`);
    }

    // ------------------------------
    // Filtros numéricos
    // ------------------------------
    if (filtros.bedrooms) {
      sql += ` AND bedrooms >= ?`;
      params.push(filtros.bedrooms);
    }

    if (filtros.bathrooms) {
      sql += ` AND bathrooms >= ?`;
      params.push(filtros.bathrooms);
    }

    if (filtros.cocheras) {
      sql += ` AND cocheras >= ?`;
      params.push(filtros.cocheras);
    }

    if (filtros.precio_min) {
      sql += ` AND price >= ?`;
      params.push(filtros.precio_min);
    }

    if (filtros.precio_max) {
      sql += ` AND price <= ?`;
      params.push(filtros.precio_max);
    }

    // ------------------------------
    // Orden inicial
    // ------------------------------
    sql += ` ORDER BY created_at DESC`;

    const [rows] = await db.execute(sql, params);
    if (!rows) return [];

    // -------------------------------------------------------
    // 2) RELEVANCIA SEMÁNTICA (mejora resultados)
    // -------------------------------------------------------

    const reqTipo = filtros.tipo ? normalize(filtros.tipo) : null;

    const ranked = rows
      .map((p) => {
        let score = 0;
        const titleNorm = normalize(p.title);
        const locNorm = normalize(p.location);

        // Coincidencia de tipo (si el usuario pidió uno)
        if (reqTipo && TYPE_KEYWORDS[reqTipo]) {
          if (TYPE_KEYWORDS[reqTipo].some((kw) => titleNorm.includes(kw))) {
            score += 5;
          } else {
            score -= 5; // penaliza irrelevantes
          }
        }

        // Coincidencia de zona
        if (
          filtros.distritos?.some((d) =>
            locNorm.includes(normalize(d))
          )
        ) {
          score += 3;
        }

        // Bonus por descripción pertinente
        if (
          p.description &&
          (p.description.toLowerCase().includes("amplia") ||
            p.description.toLowerCase().includes("bonita") ||
            p.description.toLowerCase().includes("moderna"))
        ) {
          score += 2;
        }

        return { ...p, score };
      })
      .sort((a, b) => b.score - a.score);

    return ranked;
  } catch (err) {
    logError("Error en buscarPropiedades()", err);
    return [];
  }
}

// -------------------------------------------------------
// ✨ 3) SUGERIDAS DE ALTA CALIDAD
// -------------------------------------------------------
export async function buscarSugeridas(filtros = {}) {
  try {
    let sql = `
      SELECT 
        id, title, price, location, bedrooms, bathrooms,
        cocheras, area, image, description, distribution
      FROM properties
      WHERE 1 = 1
    `;
    const params = [];

    // Coincidencia por zona
    if (Array.isArray(filtros.distritos) && filtros.distritos.length > 0) {
      sql += ` AND (`;
      filtros.distritos.forEach((d, i) => {
        sql += `LOWER(location) LIKE ?`;
        params.push(`%${normalize(d)}%`);
        if (i < filtros.distritos.length - 1) sql += " OR ";
      });
      sql += `)`;
    }

    // Coincidencia por tipo
    if (filtros.tipo) {
      sql += ` AND LOWER(title) LIKE ?`;
      params.push(`%${normalize(filtros.tipo)}%`);
    }

    sql += ` ORDER BY RAND() LIMIT 6`;

    const [rows] = await db.execute(sql, params);
    return rows || [];
  } catch (err) {
    logError("Error en buscarSugeridas()", err);
    return [];
  }
}