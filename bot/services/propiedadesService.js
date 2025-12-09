// /bot/services/propiedadesService.js
// -------------------------------------------------------
// FASE 5.7 — Servicio de Propiedades (D Final)
// -------------------------------------------------------
// • Búsqueda exacta + semántica ligera
// • Filtro TIPO 100% basado en title
// • No usa la tabla "tipos"
// • Mejor coincidencia: casa | departamento | terreno | local
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
    // DISTRITOS
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
    // TIPO (casa, departamento, local, terreno)
    // Solo desde title
    // ------------------------------
    if (filtros.tipo) {
      const t = normalize(filtros.tipo);

      const patterns = [];

      if (t.includes("casa")) patterns.push("%casa%");
      if (t.includes("depart")) patterns.push("%depa%", "%depart%");
      if (t.includes("local")) patterns.push("%local%");
      if (t.includes("terreno") || t.includes("lote"))
        patterns.push("%terreno%", "%lote%");

      if (patterns.length > 0) {
        sql += " AND (";
        patterns.forEach((p, i) => {
          sql += "LOWER(title) LIKE ?";
          params.push(p);
          if (i < patterns.length - 1) sql += " OR ";
        });
        sql += ")";
      } else {
        sql += " AND LOWER(title) LIKE ?";
        params.push(`%${t}%`);
      }
    }

    // ------------------------------
    // RESTO DE FILTROS
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

    // Sugerencias por tipo basado en title
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