// /bot/services/propiedadesService.js
// -------------------------------------------------------
// FASE 5.7 — Servicio de Propiedades (C2-C FINAL)
// -------------------------------------------------------
// • Búsqueda exacta + ranking semántico ligero
// • Coincidencias por zona, título y tipo
// • Compatible con IntentClassifier 5.7
// • Limpieza estricta de filtros
// • Sugeridas realistas (misma zona/tipo)
// • Optimizado para MySQL
// -------------------------------------------------------

import db from "../config/db.js";
import { logError } from "../utils/log.js";

// -------------------------------------------------------
// Normalizador para coincidencias suaves
// -------------------------------------------------------
function normalize(str = "") {
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// -------------------------------------------------------
// 📌 Ranking Semántico Suave (C2-C)
// -------------------------------------------------------
// A mayor score, más relevante para el usuario
function rankProperty(p, filtros, semanticPrefs = {}) {
  let score = 0;
  const title = normalize(p.title);
  const loc = normalize(p.location);

  // 1) Coincidencia por distritos
  if (Array.isArray(filtros.distritos)) {
    for (const d of filtros.distritos) {
      const nd = normalize(d);
      if (loc.includes(nd)) score += 3;  // FUERTE (zona)
      if (title.includes(nd)) score += 2;
    }
  }

  // 2) Coincidencia por tipo (casa / depa / terreno)
  if (filtros.tipo) {
    const t = normalize(filtros.tipo);
    if (title.includes(t)) score += 2;
  }

  // 3) Preferencias semánticas opcionales
  if (semanticPrefs?.preferBedrooms && p.bedrooms >= semanticPrefs.preferBedrooms) {
    score += 1;
  }
  if (semanticPrefs?.preferArea && p.area >= semanticPrefs.preferArea) {
    score += 1;
  }

  // 4) Precio relativo
  if (semanticPrefs?.budget) {
    const diff = Math.abs((Number(p.price) || 0) - semanticPrefs.budget);
    if (diff < 10000) score += 1;
    if (diff < 5000) score += 1;
  }

  return score;
}

// -------------------------------------------------------
// 🔍 BÚSQUEDA PRINCIPAL C2-C
// -------------------------------------------------------
export async function buscarPropiedades(filtros = {}, semanticPrefs = {}) {
  try {
    let sql = `
      SELECT 
        id, title, price, location, bedrooms, bathrooms, cocheras, area,
        image, description, distribution, created_at
      FROM properties
      WHERE 1 = 1
    `;
    const params = [];

    // ---------------------------------------------------
    // Filtro: distritos
    // ---------------------------------------------------
    if (Array.isArray(filtros.distritos) && filtros.distritos.length > 0) {
      sql += ` AND (`;
      filtros.distritos.forEach((d, i) => {
        sql += `LOWER(location) LIKE ?`;
        params.push(`%${normalize(d)}%`);
        if (i < filtros.distritos.length - 1) sql += " OR ";
      });
      sql += `)`;
    }

    // ---------------------------------------------------
    // Filtro: tipo
    // ---------------------------------------------------
    if (filtros.tipo) {
      sql += ` AND LOWER(title) LIKE ?`;
      params.push(`%${normalize(filtros.tipo)}%`);
    }

    // ---------------------------------------------------
    // Filtro: dormitorios
    // ---------------------------------------------------
    if (filtros.bedrooms) {
      sql += ` AND bedrooms >= ?`;
      params.push(filtros.bedrooms);
    }

    // ---------------------------------------------------
    // Filtro: baños
    // ---------------------------------------------------
    if (filtros.bathrooms) {
      sql += ` AND bathrooms >= ?`;
      params.push(filtros.bathrooms);
    }

    // ---------------------------------------------------
    // Filtro: cocheras
    // ---------------------------------------------------
    if (filtros.cocheras) {
      sql += ` AND cocheras >= ?`;
      params.push(filtros.cocheras);
    }

    // ---------------------------------------------------
    // Filtro: precio
    // ---------------------------------------------------
    if (filtros.precio_min) {
      sql += ` AND price >= ?`;
      params.push(filtros.precio_min);
    }

    if (filtros.precio_max) {
      sql += ` AND price <= ?`;
      params.push(filtros.precio_max);
    }

    // Ordenamiento inicial (antes de ranking)
    sql += ` ORDER BY created_at DESC`;

    // Ejecutar SQL
    const [rows] = await db.execute(sql, params);
    if (!rows || rows.length === 0) return [];

    // ---------------------------------------------------
    // 🔥 RANKING SEMÁNTICO (C2-C)
    // ---------------------------------------------------
    const ranked = rows
      .map(r => ({
        ...r,
        _score: rankProperty(r, filtros, semanticPrefs)
      }))
      .sort((a, b) => b._score - a._score);

    return ranked;

  } catch (err) {
    logError("Error en buscarPropiedades()", err);
    return [];
  }
}

// -------------------------------------------------------
// ✨ PROPIEDADES SUGERIDAS (fallback)
// -------------------------------------------------------
export async function buscarSugeridas(filtros = {}) {
  try {
    let sql = `
      SELECT 
        id, title, price, location, bedrooms, bathrooms, cocheras, area,
        image, description, distribution
      FROM properties
      WHERE 1 = 1
    `;
    const params = [];

    // Basado en zona si existe
    if (Array.isArray(filtros.distritos) && filtros.distritos.length > 0) {
      sql += ` AND (`;
      filtros.distritos.forEach((d, i) => {
        sql += `LOWER(location) LIKE ?`;
        params.push(`%${normalize(d)}%`);
        if (i < filtros.distritos.length - 1) sql += " OR ";
      });
      sql += `)`;
    }

    // Basado en tipo si existe
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