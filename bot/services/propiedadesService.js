// /bot/services/propiedadesService.js
// -------------------------------------------------------
// Filtros → SQL dinámico
// -------------------------------------------------------

import { pool } from "../../db.js";
import { logError } from "../utils/log.js";

export async function buscarPropiedades(filtros = {}) {
  try {
    let query = "SELECT * FROM properties WHERE 1=1";

    if (filtros.status)
      query += ` AND status LIKE '%${filtros.status}%'`;

    if (filtros.distritos?.length > 0) {
      const parts = filtros.distritos
        .map((d) => `location LIKE '%${d}%'`)
        .join(" OR ");
      query += ` AND (${parts})`;
    }

    if (filtros.tipo)
      query += ` AND UPPER(title) LIKE '%${filtros.tipo.toUpperCase()}%'`;

    if (filtros.bedrooms)
      query += ` AND bedrooms >= ${Number(filtros.bedrooms)}`;

    if (filtros.precio_max)
      query += ` AND price <= ${Number(filtros.precio_max)}`;

    const [rows] = await pool.query(query);
    return rows;
  } catch (error) {
    logError("buscarPropiedades", error);
    return [];
  }
}

export async function buscarSugeridas() {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM properties ORDER BY created_at DESC LIMIT 6"
    );
    return rows;
  } catch (error) {
    logError("buscarSugeridas", error);
    return [];
  }
}

