// /bot/services/propiedadesService.js
// -------------------------------------------------------
// SERVICIO DE PROPIEDADES — Ajustado 100% a tu BD real
// -------------------------------------------------------
// • El tipo se detecta ÚNICAMENTE por la columna TITLE
// • No usa tabla "tipos"
// • Filtros limpios y compatibles con IntentClassifier 5.7
// -------------------------------------------------------

import db from "../config/db.js";
import { logError } from "../utils/log.js";

// Normalización para búsquedas suaves
function normalize(str = "") {
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// -------------------------------------------------------
// 🔍 BÚSQUEDA PRINCIPAL
// -------------------------------------------------------
export async function buscarPropiedades(filtros = {}, semanticPrefs = {}) {
  try {
    let sql = `
      SELECT 
        id, title, price, location, bedrooms, bathrooms, cocheras, area,
        image, description, distribution
      FROM properties
      WHERE 1 = 1
    `;
    const params = [];

    // -------------------------------------------
    // FILTRO: DISTRITOS
    // -------------------------------------------
    if (Array.isArray(filtros.distritos) && filtros.distritos.length > 0) {
      sql += ` AND (`;
      filtros.distritos.forEach((d, i) => {
        sql += `LOWER(location) LIKE ?`;
        params.push(`%${normalize(d)}%`);
        if (i < filtros.distritos.length - 1) sql += " OR ";
      });
      sql += `)`;
    }

    // -------------------------------------------
    // FILTRO: TIPO (detectado desde TITLE)
    // -------------------------------------------
    if (filtros.tipo) {
      sql += ` AND LOWER(title) LIKE ?`;
      params.push(`%${normalize(filtros.tipo)}%`);
    }

    // -------------------------------------------
    // FILTRO: DORMITORIOS
    // -------------------------------------------
    if (filtros.bedrooms) {
      sql += ` AND bedrooms >= ?`;
      params.push(filtros.bedrooms);
    }

    // -------------------------------------------
    // FILTRO: BAÑOS
    // -------------------------------------------
    if (filtros.bathrooms) {
      sql += ` AND bathrooms >= ?`;
      params.push(filtros.bathrooms);
    }

    // -------------------------------------------
    // FILTRO: COCHERAS
    // -------------------------------------------
    if (filtros.cocheras) {
      sql += ` AND cocheras >= ?`;
      params.push(filtros.cocheras);
    }

    // -------------------------------------------
    // FILTRO: PRECIO MÍNIMO
    // -------------------------------------------
    if (filtros.precio_min) {
      sql += ` AND price >= ?`;
      params.push(filtros.precio_min);
    }

    // -------------------------------------------
    // FILTRO: PRECIO MÁXIMO
    // -------------------------------------------
    if (filtros.precio_max) {
      sql += ` AND price <= ?`;
      params.push(filtros.precio_max);
    }

    // -------------------------------------------
    // ORDENAMIENTO
    // -------------------------------------------
    sql += ` ORDER BY created_at DESC`;

    const [rows] = await db.execute(sql, params);
    return rows || [];

  } catch (err) {
    logError("Error en buscarPropiedades()", err);
    return [];
  }
}

// -------------------------------------------------------
// ✨ BUSCAR SUGERIDAS (basado solo en title y location)
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

    // Sugerir por distrito
    if (Array.isArray(filtros.distritos) && filtros.distritos.length > 0) {
      sql += ` AND (`;
      filtros.distritos.forEach((d, i) => {
        sql += `LOWER(location) LIKE ?`;
        params.push(`%${normalize(d)}%`);
        if (i < filtros.distritos.length - 1) sql += " OR ";
      });
      sql += `)`;
    }

    // Si hay tipo, sugerir por más coincidencias de título
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