// /bot/services/propiedadesService.js
// -------------------------------------------------------
// Motor de búsqueda FASE 5.6 (Profesional + Semántico)
// -------------------------------------------------------
// - Filtros estrictos
// - Ordenamiento inteligente por relevancia
// - Compatibilidad con preferencias semánticas
// - Sugerencias basadas en zona + precio aproximado
// -------------------------------------------------------

import { pool } from "../../db.js";
import { logError } from "../utils/log.js";

// -------------------------------------------------------
// Limpieza segura
// -------------------------------------------------------
function clean(str = "") {
  return String(str)
    .replace(/['"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// -------------------------------------------------------
// RANKING SEMÁNTICO (fase 5.6)
// -------------------------------------------------------
function applySemanticRanking(rows, semanticPrefs = {}) {
  return rows
    .map((p) => {
      let score = 0;

      // -----------------------------------------
      // Preferencias semánticas globales
      // -----------------------------------------
      if (semanticPrefs.moderno) {
        if (/moderno|nuevo|minimalista/i.test(p.title + " " + p.description))
          score += 15;
      }

      if (semanticPrefs.amplio) {
        if (p.area >= 120) score += 10;
      }

      if (semanticPrefs.tranquilo) {
        if (/parque|residencial|caleta|villa/i.test(p.location)) score += 12;
      }

      if (semanticPrefs.premium) {
        if (p.price >= 150000) score += 20;
      }

      if (semanticPrefs.inversion) {
        // terrenos + locales tienen peso alto
        if (/terreno|lote|local/i.test(p.title)) score += 18;
        if (p.price <= 70000) score += 12; // buena entrada para ROI alto
      }

      // -----------------------------------------
      // BONUS: fotos + área + baños (calidad real)
      // -----------------------------------------
      if (p.image) score += 5;
      if (p.bathrooms >= 2) score += 4;
      if (p.bedrooms >= 3) score += 3;

      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score); // Mayor score primero
}

// -------------------------------------------------------
// BUSCAR PROPIEDADES PRINCIPALES
// -------------------------------------------------------
export async function buscarPropiedades(filtros = {}, semanticPrefs = {}) {
  try {
    let query = `
      SELECT *
      FROM properties
      WHERE 1 = 1
    `;

    // ============================================
    // STATUS
    // ============================================
    if (filtros.status) {
      const st = clean(filtros.status);
      query += ` AND status LIKE '%${st}%'`;
    }

    // ============================================
    // DISTRITOS — coincidencia estricta
    // ============================================
    if (filtros.distritos?.length > 0) {
      const parts = filtros.distritos
        .map((d) => `location LIKE '%${clean(d)}%'`)
        .join(" OR ");

      query += ` AND (${parts})`;
    }

    // ============================================
    // TIPO — REGEXP estricta
    // ============================================
    if (filtros.tipo) {
      const tipo = clean(filtros.tipo).toLowerCase();
      query += ` AND LOWER(title) REGEXP '(\\\\b${tipo}\\\\b)'`;
    }

    // ============================================
    // DORMITORIOS / BAÑOS / COCHERAS
    // ============================================
    if (filtros.bedrooms > 0) query += ` AND bedrooms >= ${Number(filtros.bedrooms)}`;
    if (filtros.bathrooms > 0) query += ` AND bathrooms >= ${Number(filtros.bathrooms)}`;
    if (filtros.cocheras > 0) query += ` AND cocheras >= ${Number(filtros.cocheras)}`;

    // ============================================
    // ÁREA mínima
    // ============================================
    if (filtros.area_min > 0) {
      query += ` AND area >= ${Number(filtros.area_min)}`;
    }

    // ============================================
    // PRECIO mínimo / máximo
    // ============================================
    if (filtros.precio_min > 0) {
      query += ` AND price >= ${Number(filtros.precio_min)}`;
    }

    if (filtros.precio_max > 0) {
      query += ` AND price <= ${Number(filtros.precio_max)}`;
    }

    // ============================================
    // FILTROS EXTRA
    // ============================================
    if (filtros.extras?.length > 0) {
      filtros.extras.forEach((extra) => {
        switch (extra) {
          case "frente_parque":
            query += ` AND (title LIKE '%parque%' OR description LIKE '%parque%')`;
            break;
          case "esquina":
            query += ` AND (title LIKE '%esquina%' OR description LIKE '%esquina%')`;
            break;
          case "negociable":
            query += ` AND (description LIKE '%negociable%')`;
            break;
        }
      });
    }

    // ============================================
    // ORDEN SQL BASE
    // ============================================
    query += `
      ORDER BY created_at DESC, price ASC
    `;

    const [rows] = await pool.query(query);

    // ============================================
    // RANKING SEMÁNTICO (FASE 5.6)
    // ============================================
    return applySemanticRanking(rows, semanticPrefs);
  } catch (error) {
    logError("buscarPropiedades", error);
    return [];
  }
}

// -------------------------------------------------------
// SUGERIDAS FASE 5.6
// BASADAS EN ZONA + PRECIO APROX + TIPO
// -------------------------------------------------------
export async function buscarSugeridas(filtros = {}) {
  try {
    let query = `
      SELECT *
      FROM properties
      WHERE 1 = 1
    `;

    // Preferimos sugeridas dentro de la misma zona
    if (filtros.distritos?.length > 0) {
      const parts = filtros.distritos
        .map((d) => `location LIKE '%${clean(d)}%'`)
        .join(" OR ");
      query += ` AND (${parts})`;
    }

    // Tipo preferente
    if (filtros.tipo) {
      const tipo = clean(filtros.tipo).toLowerCase();
      query += ` AND LOWER(title) REGEXP '(\\\\b${tipo}\\\\b)'`;
    }

    // Rango sugerido por precio
    if (filtros.precio_max > 0) {
      const low = Number(filtros.precio_max) * 0.6;
      const high = Number(filtros.precio_max) * 1.3;
      query += ` AND price BETWEEN ${low} AND ${high}`;
    }

    query += ` ORDER BY RAND() LIMIT 10`;

    const [rows] = await pool.query(query);

    return rows;
  } catch (error) {
    logError("buscarSugeridas", error);
    return [];
  }
}