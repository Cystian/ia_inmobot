// /bot/services/propiedadesService.js
// -------------------------------------------------------
// Motor de búsqueda estricto FASE 5.5
// No mezcla tipos, respeta precios exactos,
// valida zonas reales y evita respuestas absurdas.
// -------------------------------------------------------

import { pool } from "../../db.js";
import { logError } from "../utils/log.js";

// LIMPIAR STRINGS PARA SQL SEGURO
function clean(str = "") {
  return str
    .replace(/['"]/g, "")        // evitar comillas peligrosas
    .replace(/\s+/g, " ")        // normalizar espacios
    .trim();
}

export async function buscarPropiedades(filtros = {}) {
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
    // DISTRITOS — Solo coincidencias REALES
    // ============================================
    if (filtros.distritos?.length > 0) {
      const parts = filtros.distritos
        .map((d) => `location LIKE '%${clean(d)}%'`)
        .join(" OR ");

      query += ` AND (${parts})`;
    }

    // ============================================
    // TIPO — ESTRICTO
    // ============================================
    if (filtros.tipo) {
      const tipo = clean(filtros.tipo).toLowerCase();

      // Coincidencia estricta solo si aparece como palabra
      query += ` AND LOWER(title) REGEXP '(\\\\b${tipo}\\\\b)'`;
    }

    // ============================================
    // DORMITORIOS
    // ============================================
    if (!isNaN(filtros.bedrooms) && filtros.bedrooms > 0) {
      query += ` AND bedrooms >= ${Number(filtros.bedrooms)}`;
    }

    // ============================================
    // BAÑOS
    // ============================================
    if (!isNaN(filtros.bathrooms) && filtros.bathrooms > 0) {
      query += ` AND bathrooms >= ${Number(filtros.bathrooms)}`;
    }

    // ============================================
    // COCHERAS
    // ============================================
    if (!isNaN(filtros.cocheras) && filtros.cocheras > 0) {
      query += ` AND cocheras >= ${Number(filtros.cocheras)}`;
    }

    // ============================================
    // ÁREA mínima
    // ============================================
    if (!isNaN(filtros.area_min) && filtros.area_min > 0) {
      query += ` AND area >= ${Number(filtros.area_min)}`;
    }

    // ============================================
    // PRECIO mínimo
    // ============================================
    if (!isNaN(filtros.precio_min) && filtros.precio_min > 0) {
      query += ` AND price >= ${Number(filtros.precio_min)}`;
    }

    // ============================================
    // PRECIO máximo
    // ============================================
    if (!isNaN(filtros.precio_max) && filtros.precio_max > 0) {
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
          case "papeles_ok":
            query += ` AND (description LIKE '%papeles%' OR description LIKE '%documentos%')`;
            break;
          case "estreno":
            query += ` AND (description LIKE '%estreno%' OR title LIKE '%estreno%')`;
            break;
        }
      });
    }

    // ============================================
    // ORDENAMIENTO: 1) Coincidencia exacta 2) Recientes
    // ============================================
    query += `
      ORDER BY
        created_at DESC,
        price ASC
    `;

    const [rows] = await pool.query(query);
    return rows;
  } catch (error) {
    logError("buscarPropiedades", error);
    return [];
  }
}

// ========================================================
// PROPIEDADES SUGERIDAS — SOLO SI NO HAY RESULTADOS
// ========================================================
export async function buscarSugeridas(filtros = {}) {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM properties
      ORDER BY RAND()
      LIMIT 6
    `);
    return rows;
  } catch (error) {
    logError("buscarSugeridas", error);
    return [];
  }
}