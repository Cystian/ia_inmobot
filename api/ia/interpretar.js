import OpenAI from "openai";
import db from "../db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_KEY });

export default async function interpretar(req, res) {
  const { user_message, user_phone } = req.body;

  const prompt = `
Eres un asistente inmobiliario experto. Analiza el mensaje del usuario y devuelve SOLO JSON válido:

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

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Eres un asistente experto del sector inmobiliario." },
      { role: "user", content: prompt }
    ]
  });

  const result = JSON.parse(completion.choices[0].message.content);

  // 2️⃣ Si intención es buscar propiedades → consultar BD
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

    propiedades = await db.query(query);
  }

  // 3️⃣ Crear respuesta final al usuario
  let respuesta = result.respuesta;

  if (propiedades.length > 0) {
    respuesta += `\n\nEncontré ${propiedades.length} opciones:\n\n`;

    propiedades.slice(0, 3).forEach(p => {
      respuesta += `🏠 ${p.title} – S/${p.price}\n${p.address}\n${p.url}\n\n`;
    });
  }

  return res.json({ respuesta });
}

