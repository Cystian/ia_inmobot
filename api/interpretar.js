import Groq from "groq-sdk";
import { pool } from "../db.js";

// 🟩 Mapeo profesional de modalidad → status real de tu BD
function mapModalidadToStatus(text) {
  if (!text) return "";

  text = text.toLowerCase();

  // Detecta ALQUILER
  if (
    text.includes("alquiler") ||
    text.includes("alquilar") ||
    text.includes("rentar") ||
    text.includes("arrendar") ||
    text.includes("arriendo")
  ) {
    return "alquiler";
  }

  // Detecta VENTA
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

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { user_message, user_phone } = req.body || {};

  // 🟦 Prompt mejorado (IA SIEMPRE detecta intención si hay filtros)
  const prompt = `
Eres un asistente inmobiliario profesional del Perú.
Siempre debes identificar la intención del usuario.

Si el usuario menciona distrito, precio, modalidad (alquiler/venta), dormitorios
o cualquier criterio de búsqueda, entonces escribe:

"intencion": "buscar_propiedades"

Y completa los filtros detectados.

Devuelve SOLO JSON válido con este formato EXACTO:

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

Reglas:
- NO devuelvas texto fuera del JSON
- NO expliques nada
- NO comentes
- SOLO JSON puro

Mensaje del usuario: "${user_message}"
  `;

  try {
    // 🟦 Llama 3.1 (modelo nuevo y estable)
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
        error: "Respuesta IA inválida",
        raw
      });
    }

    // ================================
    // 🟩 2. SQL DINÁMICO REAL
    // ================================
    let propiedades = [];

    if (result.intencion === "buscar_propiedades") {
      let query = "SELECT * FROM properties WHERE 1=1";

      // FILTRAR POR STATUS (mapModalidadToStatus)
      const statusMapped = mapModalidadToStatus(result.filtros.modalidad);
      if (statusMapped) {
        query += ` AND status = '${statusMapped}'`;
      }

      // FILTRAR POR DISTRITO
      if (result.filtros.distrito) {
        query += ` AND distrito LIKE '%${result.filtros.distrito}%'`;
      }

      // FILTRAR POR DORMITORIOS
      if (result.filtros.bedrooms) {
        query += ` AND bedrooms >= ${result.filtros.bedrooms}`;
      }

      // FILTRAR POR PRECIO MÁXIMO
      if (result.filtros.precio_max) {
        query += ` AND price <= ${result.filtros.precio_max}`;
      }

      const [rows] = await pool.query(query);
      propiedades = rows;
    }

    // ================================
    // 🟦 3. Construcción de respuesta
    // ================================
    let respuesta = result.respuesta || "Perfecto, cuéntame qué tipo de propiedad buscas.";

    if (propiedades.length > 0) {
      respuesta += `\n\nEncontré ${propiedades.length} propiedades:\n\n`;

      propiedades.slice(0, 3).forEach((p) => {
        respuesta +=
          `🏡 ${p.title}\n` +
          `💵 S/${p.price}\n` +
          `📍 ${p.location}\n` +
          `🔗 https://tuweb.com/detalle/${p.id}\n\n`;
      });
    } else if (result.intencion === "buscar_propiedades") {
      respuesta += "\n\nNo encontré propiedades con esas características. ¿Quieres probar otra zona o precio?";
    }

    return res.status(200).json({ respuesta });

  } catch (error) {
    return res.status(500).json({
      error: "Error general procesando solicitud",
      details: error.message
    });
  }
}