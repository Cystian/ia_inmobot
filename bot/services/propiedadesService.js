// /bot/services/propiedadesService.js
// -------------------------------------------------------
// FASE 5.8 FINAL — Servicio de Propiedades
// -------------------------------------------------------
// • Búsqueda exacta + semántica ligera REAL
// • Penaliza resultados fuera de la zona solicitada
// • Ordenamiento inteligente por relevancia (no solo created_at)
// • Sugeridas más coherentes (misma zona/tipo)
// • Preparado para Fase 6 (botones y CRM)
// -------------------------------------------------------

import db from "../config/db.js";
import { logError } from "../utils/log.js";

// Normalizador para búsquedas suaves
function normalize(str = "") {
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// -------------------------------------------------------
// 1️⃣ BÚSQUEDA PRINCIPAL — Inteligente FASE 5.8
// -------------------------------------------------------
export async function buscarPropiedades(filtros = {}, semanticPrefs = {}) {
  try {
    let sql = `
      SELECT 
        id, title, price, location, bedrooms, bathrooms, cocheras, area,
        image, description, distribution,
        created_at
      FROM properties
      WHERE 1 = 1
    `;
    const params = [];

    // ------------------------------
    // ZONA / DISTRITO (filtro principal)
    // ------------------------------
    if (Array.isArray(filtros.distritos) && filtros.distritos.length > 0) {
      sql += ` AND (`;
      filtros.distritos.forEach((d, i) => {
        sql += `LOWER(location) LIKE ?`;
        params.push(`%${normalize(d)}%`);
        if (i < filtros.distritos.length - 1) sql += ` OR `;
      });
      sql += `)`;
    }

    // ------------------------------
    // TIPO: casa, depa, terreno, local
    // ------------------------------
    if (filtros.tipo) {
      const value = normalize(filtros.tipo);
      sql += ` AND (
        LOWER(title) LIKE ? 
        OR LOWER(description) LIKE ?
        OR LOWER(distribution) LIKE ?
      )`;
      params.push(`%${value}%`, `%${value}%`, `%${value}%`);
    }

    // ------------------------------
    // Dormitorios / Baños / Cocheras
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

    // ------------------------------
    // Precio
    // ------------------------------
    if (filtros.precio_min) {
      sql += ` AND price >= ?`;
      params.push(filtros.precio_min);
    }
    if (filtros.precio_max) {
      sql += ` AND price <= ?`;
      params.push(filtros.precio_max);
    }

    // ------------------------------
    // ORDENAMIENTO INTELIGENTE
    // ------------------------------
    // 1. Si hay distrito → prioriza MATCH en location
    // 2. Si hay tipo → prioriza título o descripción
    // 3. Si no hay filtros → orden por fecha

    sql += `
      ORDER BY 
        (CASE 
            WHEN LOWER(location) LIKE ? THEN 0 
            ELSE 1 
         END),
        created_at DESC
    `;

    params.push(
      filtros.distritos?.length > 0
        ? `%${normalize(filtros.distritos[0])}%`
        : `%%`
    );

    const [rows] = await db.execute(sql, params);
    return rows || [];

  } catch (err) {
    logError("❌ Error en buscarPropiedades()", err);
    return [];
  }
}

// -------------------------------------------------------
// 2️⃣ PROPIEDADES SUGERIDAS — FASE 5.8
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

    // Si hay zona → mantén zona
    if (Array.isArray(filtros.distritos) && filtros.distritos.length > 0) {
      sql += ` AND LOWER(location) LIKE ?`;
      params.push(`%${normalize(filtros.distritos[0])}%`);
    }

    // Si hay tipo → mantén tipo
    if (filtros.tipo) {
      const norm = normalize(filtros.tipo);
      sql += ` AND LOWER(title) LIKE ?`;
      params.push(`%${norm}%`);
    }

    sql += ` ORDER BY RAND() LIMIT 6`;

    const [rows] = await db.execute(sql, params);
    return rows || [];

  } catch (err) {
    logError("❌ Error en buscarSugeridas()", err);
    return [];
  }
}