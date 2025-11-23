import Groq from "groq-sdk";
import { pool } from "../db.js";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 🌐 Ajusta esto al dominio real de tu portal
const BASE_URL = "https://tuweb.com/detalle";

// ======================================================
//  Helpers de mapeo e interpretación
// ======================================================

// Modalidad → status en tu BD (venta / alquiler)
function mapModalidadToStatus(text) {
  if (!text) return "";

  const t = text.toLowerCase();

  // ALQUILER
  if (
    t.includes("alquiler") ||
    t.includes("alquilar") ||
    t.includes("rentar") ||
    t.includes("arrendar") ||
    t.includes("arriendo")
  ) {
    return "alquiler";
  }

  // VENTA
  if (
    t.includes("venta") ||
    t.includes("comprar") ||
    t.includes("compra") ||
    t.includes("vendo") ||
    t.includes("en venta")
  ) {
    return "venta";
  }

  return "";
}

// Tipo de propiedad → keyword para filtrar por title
function mapTipoToKeyword(text) {
  if (!text) return "";

  const t = text.toLowerCase();

  if (t.includes("casa")) return "CASA";
  if (t.includes("departamento") || t.includes("depa")) return "DEPARTAMENTO";
  if (t.includes("terreno") || t.includes("lote")) return "TERRENO";
  if (t.includes("local")) return "LOCAL";
  if (t.includes("oficina")) return "OFICINA";

  return "";
}

// Convierte a número seguro (o null)
function toNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isNaN(n) ? null : n;
}

// Extrae JSON aunque venga con texto alrededor
function extractJson(text) {
  if (!text) return null;
  text = String(text).trim();

  // Intento directo
  try {
    return JSON.parse(text);
  } catch (_) {
    // Intento: buscar el primer { y el último }
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;

    const candidate = text.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
}

// ======================================================
//  Handler principal
// ======================================================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { user_message, user_phone } = req.body || {};

  if (!user_message) {
    return res.status(400).json({ error: "Falta user_message" });
  }

  // 🔹 Prompt avanzado para IA (nivel PRO)
  const prompt = `
Eres un asistente inmobiliario profesional del Perú para una inmobiliaria que maneja propiedades en VENTA y ALQUILER.

Tu tarea:
1. Entender el mensaje del usuario.
2. Clasificar la intención.
3. Extraer filtros estructurados para una búsqueda en BD.

Si el usuario menciona algo relacionado al mercado inmobiliario (compra, venta, alquiler, departamento, casa, terreno, local, precios, dormitorios, baños, cocheras, zonas, etc.), entonces:

- "intencion": "buscar_propiedades"

Si solo hace una pregunta general (sin querer buscar propiedades aún), puedes usar otra intención como "saludo", "consulta_general", etc.

FORMATO EXACTO DE RESPUESTA (SOLO JSON, SIN TEXTO EXTRA):

{
  "intencion": "",
  "filtros": {
    "modalidad": "",
    "distrito": "",
    "tipo": "",
    "bedrooms": null,
    "bathrooms": null,
    "cocheras": null,
    "area_min": null,
    "area_max": null,
    "precio_min": null,
    "precio_max": null,
    "descripcion": ""
  },
  "respuesta": ""
}

Definiciones:

- "modalidad": palabras que el usuario use para compra/venta o alquiler. Ejemplos: "venta", "alquiler", "comprar", "rentar", etc.
- "distrito": distrito o zona principal (ej: "Nuevo Chimbote", "Chimbote", "Lima").
- "tipo": tipo de propiedad mencionada (casa, departamento, terreno, local, oficina).
- "bedrooms": número mínimo de dormitorios si el usuario lo menciona (3 cuartos, 2 dormitorios, etc.).
- "bathrooms": número mínimo de baños.
- "cocheras": número mínimo de cocheras/estacionamientos.
- "area_min" / "area_max": área total mínima/máxima si se menciona (m²).
- "precio_min" / "precio_max": rango de precio si se menciona (moneda indistinta, devuelve solo número).
- "descripcion": palabras clave adicionales deseadas (por ejemplo "lujosa", "esquina", "céntrica", "vista al mar").

Reglas:
- Devuelve SIEMPRE un JSON válido.
- NO agregues comentarios ni explicaciones fuera del JSON.
- NO uses comillas simples para las claves JSON.
- Si no conoces algún campo, déjalo en null o "" según corresponda.

Mensaje del usuario: "${user_message}"
`;

  try {
    // 1️⃣ Llamada a IA
    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "Eres un asesor inmobiliario experto del Perú. Respondes siempre en español neutro, claro y profesional.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content;
    const parsed = extractJson(raw);

    if (!parsed) {
      return res.status(400).json({
        error: "La IA devolvió un JSON inválido o no parseable",
        raw,
      });
    }

    const result = parsed;

    // Normalizar filtros numéricos por seguridad
    const filtros = result.filtros || {};
    filtros.bedrooms = toNumberOrNull(filtros.bedrooms);
    filtros.bathrooms = toNumberOrNull(filtros.bathrooms);
    filtros.cocheras = toNumberOrNull(filtros.cocheras);
    filtros.area_min = toNumberOrNull(filtros.area_min);
    filtros.area_max = toNumberOrNull(filtros.area_max);
    filtros.precio_min = toNumberOrNull(filtros.precio_min);
    filtros.precio_max = toNumberOrNull(filtros.precio_max);
    filtros.modalidad = filtros.modalidad || "";
    filtros.distrito = filtros.distrito || "";
    filtros.tipo = filtros.tipo || "";
    filtros.descripcion = filtros.descripcion || "";

    // ======================================================
    //  SQL dinámico (seguro, con parámetros)
    // ======================================================
    let propiedades = [];

    if (result.intencion === "buscar_propiedades") {
      let query = "SELECT * FROM properties WHERE 1=1";
      const params = [];

      // Modalidad → status
      const statusMapped = mapModalidadToStatus(filtros.modalidad);
      if (statusMapped) {
        query += " AND status = ?";
        params.push(statusMapped);
      }

      // Distrito → location
      if (filtros.distrito) {
        query += " AND location LIKE ?";
        params.push(`%${filtros.distrito}%`);
      }

      // Tipo → title LIKE
      const tipoKeyword = mapTipoToKeyword(filtros.tipo);
      if (tipoKeyword) {
        query += " AND UPPER(title) LIKE ?";
        params.push(`%${tipoKeyword}%`);
      }

      // Dormitorios
      if (filtros.bedrooms !== null) {
        query += " AND bedrooms >= ?";
        params.push(filtros.bedrooms);
      }

      // Baños
      if (filtros.bathrooms !== null) {
        query += " AND bathrooms >= ?";
        params.push(filtros.bathrooms);
      }

      // Cocheras
      if (filtros.cocheras !== null) {
        query += " AND cocheras >= ?";
        params.push(filtros.cocheras);
      }

      // Área (usamos area como referencia principal)
      if (filtros.area_min !== null) {
        query += " AND area >= ?";
        params.push(filtros.area_min);
      }
      if (filtros.area_max !== null) {
        query += " AND area <= ?";
        params.push(filtros.area_max);
      }

      // Precio
      if (filtros.precio_min !== null) {
        query += " AND price >= ?";
        params.push(filtros.precio_min);
      }
      if (filtros.precio_max !== null) {
        query += " AND price <= ?";
        params.push(filtros.precio_max);
      }

      // Descripción (palabras clave)
      if (filtros.descripcion) {
        query += " AND description LIKE ?";
        params.push(`%${filtros.descripcion}%`);
      }

      const [rows] = await pool.query(query, params);
      propiedades = rows;
    }

    // ======================================================
    //  Respuesta final de “asesor inmobiliario”
    // ======================================================
    let respuesta =
      result.respuesta ||
      "Perfecto, cuéntame en qué distrito, modalidad (venta o alquiler) y rango de precio estás pensando.";

    if (result.intencion === "buscar_propiedades") {
      if (propiedades.length > 0) {
        respuesta += `\n\nEncontré ${propiedades.length} opciones que se ajustan a lo que me comentas:\n\n`;

        propiedades.slice(0, 5).forEach((p) => {
          // Características dinámicas
          const caracts = [];
          if (p.bedrooms > 0) caracts.push(`🛏 ${p.bedrooms} dorm.`);
          if (p.bathrooms > 0) caracts.push(`🚿 ${p.bathrooms} baños`);
          if (p.cocheras > 0) caracts.push(`🚗 ${p.cocheras} coch.`);

          const caractsTxt =
            caracts.length > 0 ? caracts.join(" | ") + "\n" : "";

          respuesta +=
            `🏡 ${p.title}\n` +
            `💵 ${p.moneda}${p.price}\n` +
            `📍 ${p.location}\n` +
            caractsTxt +
            `🔗 ${BASE_URL}/${p.id}\n\n`;
        });

        respuesta +=
          "Si quieres, puedo afinar aún más la búsqueda: por ejemplo, por número de dormitorios, rango de precio o si tenga cochera. Solo dime 😉.";
      } else {
        respuesta +=
          "\n\nPor ahora no encontré propiedades con esos filtros exactos. Podemos ajustar el distrito, el precio o el tipo de propiedad y ver más opciones.";
      }
    }

    return res.status(200).json({ respuesta });
  } catch (error) {
    console.error("Error general en /interpretar:", error);
    return res.status(500).json({
      error: "Error general procesando solicitud",
      details: error.message || String(error),
    });
  }
}