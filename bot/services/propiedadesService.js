// /bot/services/propiedadesService.js
// -------------------------------------------------------
// FASE 5.7 — Servicio de Propiedades (OPTIMIZADO PARA TU BD)
// -------------------------------------------------------
// ✅ location exacto => IN (...) (indexable)
// ✅ status exacto ("Venta"/"Alquiler")
// ✅ ORDER BY destacado + created_at
// ✅ LIMIT por defecto para no traer media BD
// ✅ Sin LOWER() (tu collation utf8mb4_0900_ai_ci ya ayuda)
// ✅ Fallback: si no hay resultados con IN, intenta LIKE por distrito (por abreviaturas/errores)
// -------------------------------------------------------

import { pool } from "../config/db.js";
import { logError } from "../utils/log.js";

// Escapa caracteres especiales de LIKE: %, _, \
function escapeLike(str = "") {
  return String(str).replace(/[\\%_]/g, (m) => `\\${m}`);
}

function toNumberSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIntSafe(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

// Patrones de tipo (sigues usando title porque no tienes columna "tipo")
function buildTipoClauses(tipoRaw, params) {
  const t = String(tipoRaw).toLowerCase();
  const patterns = [];

  if (t.includes("casa")) patterns.push("%casa%");
  if (t.includes("depart")) patterns.push("%depart%", "%depa%", "%dpto%");
  if (t.includes("local")) patterns.push("%local%");
  if (t.includes("oficina")) patterns.push("%oficina%");
  if (t.includes("hotel")) patterns.push("%hotel%");
  if (t.includes("terreno")) patterns.push("%terreno%");
  if (t.includes("comercial")) patterns.push("%comercial%");

  if (patterns.length) {
    const clauses = patterns.map(() => `title LIKE ? ESCAPE '\\\\'`);
    params.push(...patterns); // ya vienen con %...%
    return `(${clauses.join(" OR ")})`;
  }

  params.push(`%${escapeLike(t)}%`);
  return `(title LIKE ? ESCAPE '\\\\')`;
}

function buildBaseWhere(filtros = {}) {
  const where = [];
  const params = [];

  // status: "Venta" | "Alquiler" (exacto)
  if (filtros.status) {
    where.push(`status = ?`);
    params.push(String(filtros.status));
  }

  // numéricos
  const bedrooms = toIntSafe(filtros.bedrooms);
  if (bedrooms != null && bedrooms > 0) {
    where.push(`bedrooms >= ?`);
    params.push(bedrooms);
  }

  const bathrooms = toIntSafe(filtros.bathrooms);
  if (bathrooms != null && bathrooms > 0) {
    where.push(`bathrooms >= ?`);
    params.push(bathrooms);
  }

  const cocheras = toIntSafe(filtros.cocheras);
  if (cocheras != null && cocheras > 0) {
    where.push(`cocheras >= ?`);
    params.push(cocheras);
  }

  const pmin = toNumberSafe(filtros.precio_min);
  if (pmin != null && pmin >= 0) {
    where.push(`price >= ?`);
    params.push(pmin);
  }

  const pmax = toNumberSafe(filtros.precio_max);
  if (pmax != null && pmax > 0) {
    where.push(`price <= ?`);
    params.push(pmax);
  }

  // tipo sobre title
  if (filtros.tipo) {
    where.push(buildTipoClauses(filtros.tipo, params));
  }

  return { where, params };
}

function buildLocationStrict(where, params, distritos = []) {
  const clean = (Array.isArray(distritos) ? distritos : [])
    .map((d) => String(d).trim())
    .filter(Boolean);

  if (!clean.length) return;

  const placeholders = clean.map(() => "?").join(",");
  where.push(`location IN (${placeholders})`);
  params.push(...clean);
}

function buildLocationLike(where, params, distritos = []) {
  const clean = (Array.isArray(distritos) ? distritos : [])
    .map((d) => String(d).trim())
    .filter(Boolean);

  if (!clean.length) return;

  const clauses = clean.map(() => `location LIKE ? ESCAPE '\\\\'`);
  where.push(`(${clauses.join(" OR ")})`);
  params.push(...clean.map((d) => `%${escapeLike(d)}%`));
}

async function runQuery({ includeDetails, whereSql, params, limit, offset }) {
  const selectCols = includeDetails
    ? `id, title, price, moneda, location, status, bedrooms, bathrooms, cocheras, area, area_c, image, address, description, distribution, created_at, destacado`
    : `id, title, price, moneda, location, status, bedrooms, bathrooms, cocheras, area, area_c, image, created_at, destacado`;

  const sql = `
    SELECT ${selectCols}
    FROM properties
    ${whereSql}
    ORDER BY destacado DESC, created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.execute(sql, [...params, limit, offset]);
  return rows || [];
}

// -------------------------------------------------------
// 🔍 BÚSQUEDA PRINCIPAL (con fallback)
// -------------------------------------------------------
export async function buscarPropiedades(filtros = {}, semanticPrefs = {}, options = {}) {
  try {
    const limit = Math.min(Math.max(toIntSafe(options.limit) ?? 80, 1), 200);
    const offset = Math.max(toIntSafe(options.offset) ?? 0, 0);
    const includeDetails = !!options.includeDetails;

    // 1) Query principal: location IN (...)
    {
      const { where, params } = buildBaseWhere(filtros);
      buildLocationStrict(where, params, filtros.distritos);

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const rows = await runQuery({ includeDetails, whereSql, params, limit, offset });
      if (rows.length) return rows;
    }

    // 2) Fallback (solo si venía distrito): location LIKE '%...%'
    if (Array.isArray(filtros.distritos) && filtros.distritos.length) {
      const { where, params } = buildBaseWhere(filtros);
      buildLocationLike(where, params, filtros.distritos);

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const rows = await runQuery({ includeDetails, whereSql, params, limit, offset });
      return rows;
    }

    return [];
  } catch (err) {
    logError("Error en buscarPropiedades()", err);
    return [];
  }
}

// -------------------------------------------------------
// ✨ SUGERIDAS (sin RAND())
// -------------------------------------------------------
export async function buscarSugeridas(filtros = {}, options = {}) {
  try {
    const limit = Math.min(Math.max(toIntSafe(options.limit) ?? 6, 1), 12);
    const includeDetails = !!options.includeDetails;

    const { where, params } = buildBaseWhere(filtros);
    // Para sugeridas, si hay distrito, usamos IN (rápido). Si no, sin distrito.
    buildLocationStrict(where, params, filtros.distritos);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Conteo para offset aleatorio acotado
    const countSql = `SELECT COUNT(*) AS total FROM properties ${whereSql}`;
    const [countRows] = await pool.execute(countSql, params);
    const total = Number(countRows?.[0]?.total ?? 0);
    if (total <= 0) return [];

    const maxOffset = Math.max(total - limit, 0);
    const cap = Math.min(maxOffset, 2000); // cap operativo
    const randomOffset = cap > 0 ? Math.floor(Math.random() * (cap + 1)) : 0;

    return await runQuery({
      includeDetails,
      whereSql,
      params,
      limit,
      offset: randomOffset,
    });
  } catch (err) {
    logError("Error en buscarSugeridas()", err);
    return [];
  }
}

