// /bot/interpretar/fuzzyZones.js
// -------------------------------------------------------
// Normalización y corrección de zonas (Fuzzy Matching)
// - Corrige errores comunes del usuario
// - Mapea direcciones a zonas reales
// - Permite ampliar automáticamente zonas válidas
// -------------------------------------------------------

import { pool } from "../../db.js";

// Normaliza texto para comparación
function norm(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// Correcciones comunes para zonas de Chimbote/Nuevo Chimbote
const CORRECCIONES_COMUNES = {
  "nuevo chibmote": "nuevo chimbote",
  "nuevo chimote": "nuevo chimbote",
  "nuevo chimbot": "nuevo chimbote",
  "nvo chimbote": "nuevo chimbote",
  "chimbot": "chimbote",
  "bellamarres": "bellamar",
  "beyamar": "bellamar",
  "villa mria": "villa maria",
  "villa maría": "villa maria",
  "la caleta ": "la caleta",
  "la calera": "la caleta",
  "buenos airez": "buenos aires",
};

// Detecta si una cadena es parecida (Levenshtein liviano)
function esParecido(a, b) {
  a = norm(a);
  b = norm(b);

  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (b.includes(a) || a.includes(b)) return true;

  // Distancia simple basada en sustitución / eliminación
  let diff = Math.abs(a.length - b.length);
  let mismatches = 0;

  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) mismatches++;
  }

  return mismatches + diff <= 2; // tolerancia 2 errores
}

// Obtiene las zonas válidas en tu BD
export async function getZonasBD() {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT location 
      FROM properties
      WHERE location IS NOT NULL AND location <> ''
    `);

    return rows.map(r => norm(r.location));
  } catch (e) {
    console.error("⚠ Error obteniendo zonas de BD:", e);
    return [];
  }
}

// Función principal: corrige y valida zonas
export async function corregirZona(input) {
  if (!input) return null;
  const zNorm = norm(input);

  // 1️⃣ Correcciones directas
  if (CORRECCIONES_COMUNES[zNorm]) {
    return CORRECCIONES_COMUNES[zNorm];
  }

  // 2️⃣ Buscar coincidencias en BD real
  const zonasBD = await getZonasBD();

  for (const zona of zonasBD) {
    if (esParecido(zNorm, zona)) {
      return zona;
    }
  }

  // 3️⃣ Detectar si es dirección → asignar zona por palabra clave
  const direcciones = {
    "pacifico": "nuevo chimbote",
    "ancash": "chimbote",
    "trapecio": "buenos aires",
    "bellamar": "bellamar",
    "villa": "villa maria"
  };

  for (const key in direcciones) {
    if (zNorm.includes(key)) {
      return direcciones[key];
    }
  }

  // 4️⃣ Nada coincide → devolver tal cual (pero normalizado)
  return zNorm;
}