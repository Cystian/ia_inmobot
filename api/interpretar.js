import Groq from "groq-sdk";
import { pool } from "../db.js";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// 🎯 Función Serverless
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { user_message, user_phone } = req.body;

  // Prompt inteligente
  const prompt = `
Eres un asistente inmobiliario del Perú.
Tu tarea es entender el mensaje del usuario
y devolver SOLO JSON válido, sin ningún texto extra.

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

Responde SOLO con JSON puro.
No agregues explicaciones fuera del JSON.

Mensaje del usuario: "${user_message}"
  `;

  try {
    // 1️⃣ IA (Llama 3.1)
    const completion = await client.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: "Eres un asesor inmobiliario profesional del mercado peruano." },
        { role: "user", content: prompt }
      ]
    });

    // 2️⃣ Extraer respuesta cruda de la IA
    const raw = completion.choices[0].message.content;

    // 🔍 DEBUG: mostrar la respuesta original de la IA
    console.log("=== RAW IA RESPONSE ===");
    console.log(raw);
    console.log("=======================");

    // Intentar parsear JSON de forma segura
    let result;

    try {
      result = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({
        error: "JSON inválido recibido de la IA",
        raw_ia: raw,
        details: e.message
      });
    }

    // 3️⃣ SQL si la intención es buscar propiedades
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

    // 4️⃣ Construir respuesta final
    let respuesta = result.respuesta || "Perfecto, cuéntame qué tipo de propiedad buscas.";

    if (propiedades.length > 0) {
      respuesta += `\n\nEncontré ${propiedades.length} opciones:\n\n`;

      propiedades.slice(0, 3).forEach((p) => {
        respuesta += `🏡 ${p.title}\n💵 S/${p.price}\n📍 ${p.location}\n🔗 https://tuweb.com/detalle/${p.id}\n\n`;
      });
    }

    return res.status(200).json({ respuesta });

  } catch (error) {
    console.error("Error IA general:", error);
    return res.status(500).json({
      error: "Error interpretando mensaje",
      details: error.message
    });
  }
}