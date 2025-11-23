import Groq from "groq-sdk";
import { pool } from "../db.js";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
  console.log("📌 Endpoint /interpretar recibió una solicitud");

  if (req.method !== "POST") {
    console.log("❌ Método no permitido:", req.method);
    return res.status(405).json({ error: "Método no permitido" });
  }

  console.log("📌 Body recibido:", req.body);

  const { user_message, user_phone } = req.body;

  // Prompt
  const prompt = `
Eres un asistente inmobiliario del Perú.
Devuelve SOLO JSON puro con este formato EXACTO:

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

  try {
    console.log("📌 Llamando a Groq...");

    const completion = await client.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: "Eres un asesor inmobiliario profesional del mercado peruano." },
        { role: "user", content: prompt }
      ]
    });

    console.log("📌 Respuesta cruda de Groq:", completion);

    const raw = completion.choices?.[0]?.message?.content;
    console.log("📌 Texto recibido de Groq:", raw);

    let result;

    try {
      result = JSON.parse(raw);
    } catch (e) {
      console.log("❌ Error parseando JSON:", e);
      return res.status(500).json({
        error: "Groq devolvió un JSON inválido",
        raw_response: raw,
        parse_error: e.message
      });
    }

    console.log("📌 JSON parseado correctamente:", result);

    // SQL
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

      console.log("📌 Ejecutando SQL:", query);

      try {
        const [rows] = await pool.query(query);
        propiedades = rows;
        console.log("📌 Resultados SQL:", propiedades);
      } catch (sqlError) {
        console.log("❌ Error SQL:", sqlError);
        return res.status(500).json({
          error: "Error ejecutando SQL",
          details: sqlError.message
        });
      }
    }

    // Respuesta final
    let respuesta = result.respuesta || "Perfecto, cuéntame qué tipo de propiedad buscas.";

    if (propiedades.length > 0) {
      respuesta += `\n\nEncontré ${propiedades.length} opciones:\n\n`;
      propiedades.slice(0, 3).forEach(p => {
        respuesta += `🏡 ${p.title}\n💵 S/${p.price}\n📍 ${p.location}\n🔗 https://tuweb.com/detalle/${p.id}\n\n`;
      });
    }

    console.log("📌 Respuesta final:", respuesta);

    return res.status(200).json({ respuesta });

  } catch (error) {
    console.log("❌ ERROR GENERAL:", error);
    return res.status(500).json({
      error: "Error general procesando solicitud",
      details: error.message || error
    });
  }
}