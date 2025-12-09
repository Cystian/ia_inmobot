// /bot/services/propiedadesService.js
// -------------------------------------------------------
// FASE 5.7 — Servicio de Propiedades (C3 FINAL)
// -------------------------------------------------------
// • Búsqueda exacta + coincidencia inteligente por TITLE
// • Tabla 'tipos' NO se usa (todo viene desde title)
// • Mejor detección de tipo: casa, depa, departamento,
//   terreno, lote, local, oficina, comercial.
// • Limpieza estricta de filtros
// -------------------------------------------------------

import db from "../config/db.js";
import { logError } from "../utils/log.js";

// Normaliza texto
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
    // FILTRO DISTRITOS
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
    // FILTRO TIPO (desde TITLE)
    // ------------------------------
    if (filtros.tipo) {
      const t = normalize(filtros.tipo);

      if (["casa"].includes(t)) {
        sql += ` AND (LOWER(title) LIKE '%casa%')`;
      }

      if (["departamento", "depa", "dpto"].includes(t)) {
        sql += ` AND (LOWER(title) LIKE '%depa%' OR LOWER(title) LIKE '%departamento%')`;
      }

      if (["terreno", "lote"].includes(t)) {
        sql += ` AND (LOWER(title) LIKE '%terreno%' OR LOWER(title) LIKE '%lote%')`;
      }

      if (["local", "local comercial", "comercial"].includes(t)) {
        sql += ` AND (LOWER(title) LIKE '%local%' OR LOWER(title) LIKE '%comerc%')`;
      }

      if (["oficina"].includes(t)) {
        sql += ` AND LOWER(title) LIKE '%oficina%'`;
      }
    }

    // ------------------------------
    // FILTROS NUMÉRICOS
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
    // ORDEN
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
// ✨ PROPIEDADES SUGERIDAS (C3 FINAL)
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

    // Sugerencias por zona
    if (Array.isArray(filtros.distritos) && filtros.distritos.length > 0) {
      sql += ` AND (`;
      filtros.distritos.forEach((d, i) => {
        sql += `LOWER(location) LIKE ?`;
        params.push(`%${normalize(d)}%`);
        if (i < filtros.distritos.length - 1) sql += " OR ";
      });
      sql += `)`;
    }

    // Sugerencias por tipo (desde TITLE)
    if (filtros.tipo) {
      const t = normalize(filtros.tipo);

      if (t.includes("casa")) sql += ` AND LOWER(title) LIKE '%casa%'`;
      if (t.includes("depa")) sql += ` AND (LOWER(title) LIKE '%depa%' OR LOWER(title) LIKE '%departamento%')`;
      if (t.includes("terreno")) sql += ` AND (LOWER(title) LIKE '%terreno%' OR LOWER(title) LIKE '%lote%')`;
      if (t.includes("local")) sql += ` AND (LOWER(title) LIKE '%local%' OR LOWER(title) LIKE '%comerc%')`;
    }

    sql += ` ORDER BY RAND() LIMIT 6`;

    const [rows] = await db.execute(sql, params);
    return rows || [];

  } catch (err) {
    logError("Error en buscarSugeridas()", err);
    return [];
  }
}