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

  try {
    // 1️⃣ Prompt base
    const prompt = `
Eres un asistente inmobiliario del Perú.
Devuelve SOLO JSON válido.

Formato EXACTO:
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

Mensaje del usuario: "${user_message}"
    `;

    // 2️⃣ Llamado IA con modelo actualizado
    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Eres un asesor inmobiliario experto del Perú." },
        { role: "user", content: prompt }
      ]
    });

    // 3️⃣ Extraer JSON
    let result;
    try {
      result = JSON.parse(completion.choices[0].message.content);
    } catch (err) {
      console.log("Error parseando JSON:", err);
      return res.status(400).json({
        error: "Respuesta IA inválida",
        raw: completion.choices[0].message.content
      });
    }

    // 4️⃣ Ejecutar búsqueda SQL si corresponde
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

    // 5️⃣ Construir respuesta final
    let respuesta = result.respuesta || "Perfecto, cuéntame qué tipo de propiedad buscas.";

    if (propiedades.length > 0) {
      respuesta += `\n\nEncontré ${propiedades.length} opciones:\n\n`;

      propiedades.slice(0, 3).forEach((p) => {
        respuesta += `🏡 ${p.title}\n💵 S/${p.price}\n📍 ${p.location}\n🔗 https://tuweb.com/detalle/${p.id}\n\n`;
      });
    }

    return res.status(200).json({ respuesta });

  } catch (error) {
    console.error("Error general:", error);
    return res.status(500).json({
      error: "Error general procesando solicitud",
      details: error.message
    });
  }
}