// /bot/services/propiedadesService.js
// -------------------------------------------------------
// SERVICIO DE PROPIEDADES — ETAPA B (Tipo detectado desde title)
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

// Normaliza el tipo detectado por Groq
function normalizarTipo(tipoRaw = "") {
  const t = normalize(tipoRaw);

  if (t.includes("casa")) return "casa";
  if (t.includes("depa") || t.includes("depart")) return "departamento";
  if (t.includes("terreno") || t.includes("lote")) return "terreno";
  if (t.includes("local") || t.includes("comerc")) return "local";

  return "";
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
    // Filtro: tipo (USANDO NORMALIZACION)
    // ------------------------------
    const tipoNormalizado = normalizarTipo(filtros.tipo);
    if (tipoNormalizado) {
      sql += ` AND LOWER(title) LIKE ?`;
      params.push(`%${tipoNormalizado}%`);
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

    if (Array.isArray(filtros.distritos) && filtros.distritos.length > 0) {
      sql += ` AND (`;
      filtros.distritos.forEach((d, i) => {
        sql += `LOWER(location) LIKE ?`;
        params.push(`%${normalize(d)}%`);
        if (i < filtros.distritos.length - 1) sql += " OR ";
      });
      sql += `)`;
    }

    const tipoNormalizado = normalizarTipo(filtros.tipo);
    if (tipoNormalizado) {
      sql += ` AND LOWER(title) LIKE ?`;
      params.push(`%${tipoNormalizado}%`);
    }

    sql += ` ORDER BY RAND() LIMIT 6`;

    const [rows] = await db.execute(sql, params);
    return rows || [];

  } catch (err) {
    logError("Error en buscarSugeridas()", err);
    return [];
  }
}