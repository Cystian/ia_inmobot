// /bot/services/propiedadesService.js
// -------------------------------------------------------
// Filtros → SQL dinámico inteligente
// Versión premium compatible con filtros avanzados.
// -------------------------------------------------------

import { pool } from "../../db.js";
import { logError } from "../utils/log.js";

export async function buscarPropiedades(filtros = {}) {
  try {
    let query = `
      SELECT *
      FROM properties
      WHERE 1=1
    `;

    // ================================
    // STATUS (venta / alquiler)
    // ================================
    if (filtros.status) {
      query += ` AND status LIKE '%${filtros.status}%'`;
    }

    // ================================
    // DISTRITOS / ZONAS
    // ================================
    if (filtros.distritos?.length > 0) {
      const parts = filtros.distritos
        .map((d) => `location LIKE '%${d}%'`)
        .join(" OR ");
      query += ` AND (${parts})`;
    }

    // ================================
    // TIPO DE PROPIEDAD
    // ================================
    if (filtros.tipo) {
      const tipo = filtros.tipo.toUpperCase();
      query += ` AND UPPER(title) LIKE '%${tipo}%'`;
    }

    // ================================
    // BEDROOMS
    // ================================
    if (!isNaN(filtros.bedrooms) && filtros.bedrooms > 0) {
      query += ` AND bedrooms >= ${Number(filtros.bedrooms)}`;
    }

    // ================================
    // BATHROOMS
    // ================================
    if (!isNaN(filtros.bathrooms) && filtros.bathrooms > 0) {
      query += ` AND bathrooms >= ${Number(filtros.bathrooms)}`;
    }

    // ================================
    // COCHERAS
    // ================================
    if (!isNaN(filtros.cocheras) && filtros.cocheras > 0) {
      query += ` AND cocheras >= ${Number(filtros.cocheras)}`;
    }

    // ================================
    // ÁREA mínima (m2)
    // ================================
    if (!isNaN(filtros.area_min) && filtros.area_min > 0) {
      query += ` AND area >= ${Number(filtros.area_min)}`;
    }

    // ================================
    // PRECIO mínimo
    // ================================
    if (!isNaN(filtros.precio_min) && filtros.precio_min > 0) {
      query += ` AND price >= ${Number(filtros.precio_min)}`;
    }

    // ================================
    // PRECIO máximo
    // ================================
    if (!isNaN(filtros.precio_max) && filtros.precio_max > 0) {
      query += ` AND price <= ${Number(filtros.precio_max)}`;
    }

    // ================================
    // EXTRAS (opcional)
    // Aplica si tu BD tiene columnas booleanas o etiquetas
    // ================================
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
          case "remodelado":
            query += ` AND (description LIKE '%remodel%' OR title LIKE '%remodel%')`;
            break;
          case "amoblado":
            query += ` AND (description LIKE '%amoblad%' OR title LIKE '%amoblad%')`;
            break;
          case "piscina":
            query += ` AND (description LIKE '%piscina%' OR title LIKE '%piscina%')`;
            break;
          case "jardin":
            query += ` AND (description LIKE '%jardin%' OR description LIKE '%jardín%')`;
            break;
          case "patio":
            query += ` AND (description LIKE '%patio%')`;
            break;
        }
      });
    }

    // ================================
    // ORDENAMIENTO inteligente
    // ================================
    query += `
      ORDER BY 
        (price >= 1) DESC,
        created_at DESC
    `;

    const [rows] = await pool.query(query);
    return rows;
  } catch (error) {
    logError("buscarPropiedades", error);
    return [];
  }
}

// ========================================================
// PROPIEDADES SUGERIDAS (fallback premium)
// ========================================================
export async function buscarSugeridas() {
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