import Groq from "groq-sdk";
import { pool } from "../db.js";

// ======================================================
//  MAPEO PROFESIONAL DE MODALIDAD → status (TU BD REAL)
// ======================================================
function mapModalidadToStatus(text) {
  if (!text) return "";

  text = text.toLowerCase();

  // ALQUILER
  if (
    text.includes("alquiler") ||
    text.includes("alquilar") ||
    text.includes("rentar") ||
    text.includes("arrendar") ||
    text.includes("arriendo")
  ) {
    return "alquiler";
  }

  // VENTA
  if (
    text.includes("venta") ||
    text.includes("comprar") ||
    text.includes("vendo") ||
    text.includes("en venta")
  ) {
    return "venta";
  }

  return "";
}

// ======================================================
//  IA (Groq)
// ======================================================
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { user_message, user_phone } = req.body || {};

  // ======================================================
  //  PROMPT MEJORADO (YA ADAPTADO A TU BD)
  // ======================================================
  const prompt = `
Eres un asistente inmobiliario del Perú.
Siempre debes identificar la intención del usuario.

Si el usuario menciona distrito, precio, modalidad (venta/alquiler),
dormitorios, baños o cualquier criterio inmobiliario, entonces:

"intencion": "buscar_propiedades"

Y llenar los filtros SIEMPRE que se puedan inferir del mensaje.

Debes devolver SOLO JSON válido:

{
  "intencion": "",
  "filtros": {
    "modalidad": "",
    "distrito": "",
    "bedrooms": null,
    "precio_max": null
  },
  "respuesta": ""
}

Reglas estrictas:
- SOLO JSON puro
- NO agregues texto fuera
- NO comentarios
- NO explicaciones

Mensaje del usuario: "${user_message}"
`;

  try {
    // ======================================================
    //  IA GROQ (MODELO ACTUAL)
    // ======================================================
    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Eres un asesor inmobiliario experto del Perú." },
        { role: "user", content: prompt }
      ]
    });

    const raw = completion.choices[0].message.content;

    let result;
    try {
      result = JSON.parse(raw);
    } catch (err) {
      return res.status(400).json({
        error: "JSON inválido devuelto por la IA",
        raw
      });
    }

    // ======================================================
    //  SQL DINÁMICO SEGÚN TU BD REAL
    // ======================================================
    let propiedades = [];

    if (result.intencion === "buscar_propiedades") {
      let query = "SELECT * FROM properties WHERE 1=1";

      // STATUS (venta / alquiler)
      const statusMapped = mapModalidadToStatus(result.filtros.modalidad);
      if (statusMapped) {
        query += ` AND status = '${statusMapped}'`;
      }

      // DISTRITO (location)
      if (result.filtros.distrito) {
        query += ` AND location LIKE '%${result.filtros.distrito}%'`;
      }

      // BEDROOMS
      if (result.filtros.bedrooms) {
        query += ` AND bedrooms >= ${result.filtros.bedrooms}`;
      }

      // PRECIO MAX
      if (result.filtros.precio_max) {
        query += ` AND price <= ${result.filtros.precio_max}`;
      }

      const [rows] = await pool.query(query);
      propiedades = rows;
    }

    // ======================================================
    //  RESPUESTA FINAL
    // ======================================================
    let respuesta = result.respuesta || "Perfecto, ¿en qué distrito y qué modalidad buscas?";

    if (propiedades.length > 0) {
      respuesta += `\n\nEncontré ${propiedades.length} opciones:\n\n`;

      propiedades.slice(0, 3).forEach((p) => {
        respuesta +=
          `🏡 ${p.title}\n` +
          `💵 ${p.moneda}${p.price}\n` +
          `📍 ${p.location}\n` +
          `🛏 ${p.bedrooms} | 🚿 ${p.bathrooms} | 🚗 ${p.cocheras}\n` +
          `🔗 https://tuweb.com/detalle/${p.id}\n\n`;
      });
    } else if (result.intencion === "buscar_propiedades") {
      respuesta += "\n\nNo encontré propiedades con esos filtros. ¿Quieres probar otro distrito o precio?";
    }

    return res.status(200).json({ respuesta });

  } catch (error) {
    return res.status(500).json({
      error: "Error general procesando solicitud",
      details: error.message
    });
  }
}