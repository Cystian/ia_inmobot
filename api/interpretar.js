import Groq from "groq-sdk";
import { pool } from "../db.js";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { user_message, user_phone } = req.body;

  // Prompt MEJORADO para que SIEMPRE detecte intención
  const prompt = `
Eres un asistente inmobiliario especializado en Perú.
Siempre debes identificar la intención del usuario.

Si el usuario menciona distrito, precio, modalidad (alquiler/venta), dormitorios,
o cualquier criterio de búsqueda, entonces:

- "intencion": "buscar_propiedades"
- completar los campos dentro de "filtros" según lo que se entienda del mensaje

Debes devolver SOLO JSON válido, exactamente este formato:

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
- NO agregues texto fuera del JSON
- NO agregues explicaciones
- NO devuelvas comentarios
- NO devuelvas nada fuera del objeto JSON

Mensaje del usuario: "${user_message}"
  `;

  try {
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

    let propiedades = [];

    if (result.intencion === "buscar_propiedades") {
      let query = "SELECT * FROM properties WHERE 1=1";

      if (result.filtros.modalidad) {
        query += ` AND modalidad = '${result.filtros.modalidad}'`;
      }
      if (result.filtros.distrito) {
        query += ` AND distrito LIKE '%${result.filtros.distrito}%'`;
      }
      if (result.filtros.bedrooms) {
        query += ` AND bedrooms >= ${result.filtros.bedrooms}`;
      }
      if (result.filtros.precio_max) {
        query += ` AND price <= ${result.filtros.precio_max}`;
      }

      const [rows] = await pool.query(query);
      propiedades = rows;
    }

    let respuesta = result.respuesta || "Perfecto, dime qué características buscas.";

    if (propiedades.length > 0) {
      respuesta += `\n\nEncontré ${propiedades.length} opciones:\n\n`;
      propiedades.slice(0, 3).forEach((p) => {
        respuesta += `🏡 ${p.title}\n💵 S/${p.price}\n📍 ${p.location}\n🔗 https://tuweb.com/detalle/${p.id}\n\n`;
      });
    }

    return res.status(200).json({ respuesta });

  } catch (error) {
    return res.status(500).json({
      error: "Error general procesando solicitud",
      details: error.message
    });
  }
}