// /bot/services/propiedadesService.js
// -------------------------------------------------------
// FASE 5.7 FINAL — Servicio de Propiedades
// -------------------------------------------------------
// • Búsqueda exacta + semántica ligera
// • Compatible con IntentClassifier 5.7
// • Limpieza estricta de filtros
// • Sugeridas realistas (misma zona/tipo)
// • Optimizado para MySQL
// -------------------------------------------------------

import db from "../config/db.js";
import { logError } from "../utils/log.js";

// Normaliza texto para coincidencias suaves
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
    // Filtro: tipo
    // ------------------------------
    if (filtros.tipo) {
      sql += ` AND LOWER(title) LIKE ?`;
      params.push(`%${normalize(filtros.tipo)}%`);
    }

    // ------------------------------
    // Filtro: dormitorios
    // ------------------------------
    if (filtros.bedrooms) {
      sql += ` AND bedrooms >= ?`;
      params.push(filtros.bedrooms);
    }

    // ------------------------------
    // Filtro: baños
    // ------------------------------
    if (filtros.bathrooms) {
      sql += ` AND bathrooms >= ?`;
      params.push(filtros.bathrooms);
    }

    // ------------------------------
    // Filtro: cocheras
    // ------------------------------
    if (filtros.cocheras) {
      sql += ` AND cocheras >= ?`;
      params.push(filtros.cocheras);
    }

    // ------------------------------
    // Filtro: precio mínimo
    // ------------------------------
    if (filtros.precio_min) {
      sql += ` AND price >= ?`;
      params.push(filtros.precio_min);
    }

    // ------------------------------
    // Filtro: precio máximo
    // ------------------------------
    if (filtros.precio_max) {
      sql += ` AND price <= ?`;
      params.push(filtros.precio_max);
    }

    // ------------------------------
    // Ordenamiento básico
    // ------------------------------
    sql += ` ORDER BY created_at DESC`;

    const [rows] = await db.execute(sql, params);
    return rows || [];

  } catch (err) {
    logError("Error en buscarPropiedades()", err);
    return [];
  }
}

// -------------------------------------------------------
// ✨ PROPIEDADES SUGERIDAS
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

    // Sugerencias basadas en zona (si existe)
    if (Array.isArray(filtros.distritos) && filtros.distritos.length > 0) {
      sql += ` AND (`;
      filtros.distritos.forEach((d, i) => {
        sql += `LOWER(location) LIKE ?`;
        params.push(`%${normalize(d)}%`);
        if (i < filtros.distritos.length - 1) sql += " OR ";
      });
      sql += `)`;
    }

    // Si no hay zona, sugerimos por tipo (casa, depa, terreno)
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