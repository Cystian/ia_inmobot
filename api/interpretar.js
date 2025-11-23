// /api/interpretar.js
import { pool } from "../db.js";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

export default async function handler(req, res) {
  // 1. Validar método
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { user_message, user_phone } = req.body;

  // 2. Prompt IA
  const prompt = `
Eres un asistente inmobiliario experto.
Devuelve SOLO JSON estricto:

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

Mensaje: "${user_message}"
  `;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un asesor inmobiliario del mercado peruano." },
        { role: "user", content: prompt }
      ]
    });

    const result = JSON.parse(completion.choices[0].message.content);

    // 3. Buscar propiedades si corresponde
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

    // 4. Respuesta final
    let respuesta = result.respuesta || "Listo, cuéntame más sobre lo que buscas.";

    if (propiedades.length > 0) {
      respuesta += `\n\nEncontré ${propiedades.length} opciones:\n\n`;

      propiedades.slice(0, 3).forEach((p) => {
        respuesta += `🏡 ${p.title}\n💵 S/${p.price}\n📍 ${p.address}\n🔗 https://tuweb.com/detalle/${p.id}\n\n`;
      });
    }

    return res.status(200).json({ respuesta });

  } catch (error) {
    console.error("Error interpretando mensaje:", error);
    return res.status(500).json({ error: "Error en IA", details: error.message });
  }
}
