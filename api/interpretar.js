// /api/interpretar.js
import Groq from "groq-sdk";
import { pool } from "../db.js";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { user_message = "", user_phone = "" } = req.body;
    const msg = user_message.toLowerCase().trim();

    // 🟦 0️⃣ DETECCIÓN DE SALUDO SOLO (modo C)
    const esSaludoSimple =
      ["hola", "buenas", "buenos días", "buenas tardes", "buenas noches", "hey", "holi", "ola", "👋"]
        .some(s => msg === s || msg.startsWith(s));

    const contieneIntencion =
      msg.includes("casa") ||
      msg.includes("departamento") ||
      msg.includes("depa") ||
      msg.includes("terreno") ||
      msg.includes("alquilar") ||
      msg.includes("comprar") ||
      msg.includes("venta") ||
      msg.includes("alquiler") ||
      msg.includes("dorm") ||
      msg.includes("cuartos") ||
      msg.includes("habitaciones");

    if (esSaludoSimple && !contieneIntencion) {
      return res.status(200).json({
        respuesta:
          "¡Hola! 😊 ¿Qué tipo de propiedad estás buscando? ¿Casa, departamento o terreno?\nSi deseas también puedo ayudarte por zona: Chimbote o Nuevo Chimbote."
      });
    }

    // 🧠 PROMPT IA
    const prompt = `
Eres un asesor inmobiliario peruano MUY profesional.
Tu tarea es ENTENDER EL MENSAJE y devolver SOLO JSON válido.

Formato EXACTO:

{
  "intencion": "buscar_propiedades|saludo|despedida|otro",
  "filtros": {
    "distritos": [],
    "status": "",
    "tipo": "",
    "bedrooms": null,
    "precio_max": null,
    "extras": []
  },
  "respuesta": ""
}

Mensaje del usuario: "${user_message}"
    `;

    // =========================================
    // 1️⃣ IA
    // =========================================
    let ia;
    try {
      const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Eres un asesor inmobiliario profesional y preciso." },
          { role: "user", content: prompt }
        ]
      });
      ia = JSON.parse(completion.choices[0].message.content);
    } catch {
      ia = { intencion: "buscar_propiedades", filtros: {}, respuesta: "" };
    }

    if (!ia.filtros) ia.filtros = {};
    const filtros = ia.filtros;

    // =========================================
    // 2️⃣ Detección automática adicional
    // =========================================

    // Distritos
    const autoDist = [];
    if (msg.includes("nuevo chimbote")) autoDist.push("Nuevo Chimbote");
    if (msg.includes("chimbote")) autoDist.push("Chimbote");
    if (autoDist.length > 0) filtros.distritos = autoDist;

    // Status
    if (msg.includes("comprar") || msg.includes("venta")) filtros.status = "venta";
    if (msg.includes("alquilar") || msg.includes("alquiler") || msg.includes("rentar")) filtros.status = "alquiler";

    // Tipo
    if (msg.includes("casa")) filtros.tipo = "casa";
    if (msg.includes("departamento") || msg.includes("depa")) filtros.tipo = "departamento";
    if (msg.includes("terreno")) filtros.tipo = "terreno";
    if (msg.includes("local")) filtros.tipo = "local";

    // Dormitorios
    const bedsMatch = msg.match(/(\d+)\s*(dorm|cuarto|habitacion|habitaciones)/);
    if (bedsMatch) filtros.bedrooms = Number(bedsMatch[1]);

    // Precio
    const priceMatch = msg.match(/(\d+[\.,]?\d{0,3})\s*(mil|k|lucas)?/);
    if (priceMatch) {
      let n = Number(priceMatch[1].replace(",", ""));
      if (priceMatch[2]) n *= 1000;
      filtros.precio_max = n;
    }

    // =========================================
    // 3️⃣ SQL dinámico
    // =========================================
    let query = "SELECT * FROM properties WHERE 1=1";

    if (filtros.status) query += ` AND status LIKE '%${filtros.status}%'`;

    if (filtros.distritos?.length > 0) {
      const parts = filtros.distritos.map(d => `location LIKE '%${d}%'`).join(" OR ");
      query += ` AND (${parts})`;
    }

    if (filtros.tipo)
      query += ` AND UPPER(title) LIKE '%${filtros.tipo.toUpperCase()}%'`;

    if (filtros.bedrooms)
      query += ` AND bedrooms >= ${filtros.bedrooms}`;

    if (filtros.precio_max)
      query += ` AND price <= ${filtros.precio_max}`;

    const [rows] = await pool.query(query);
    let propiedades = rows;

    // =========================================
    // 4️⃣ Lógica profesional para ALQUILER
    // =========================================
    if (filtros.status === "alquiler" && propiedades.length === 0) {
      return res.status(200).json({
        respuesta:
          "Por ahora no tengo opciones de alquiler en esa zona, pero sí tengo casas y departamentos en venta que están a muy buen precio. ¿Deseas que te muestre algunas oportunidades?"
      });
    }

    // =========================================
    // 5️⃣ Fallback para ventas
    // =========================================
    if (propiedades.length === 0) {
      const [sugeridas] = await pool.query(
        "SELECT * FROM properties ORDER BY created_at DESC LIMIT 6"
      );
      propiedades = sugeridas;
      ia.respuesta = "No encontré opciones exactas, pero mira estas alternativas:";
    }

    // =========================================
    // 6️⃣ Armar respuesta final
    // =========================================
    let respuesta = ia.respuesta || "Perfecto, aquí tienes algunas opciones:";

    propiedades.slice(0, 6).forEach((p) => {
      respuesta += `\n\n🏡 ${p.title}\n💵 US$ ${p.price}\n📍 ${p.location}\n🛏 ${p.bedrooms} dorm. | 🚿 ${p.bathrooms} baños | 🚗 ${p.cocheras} coch.\n🔗 https://tuweb.com/detalle/${p.id}`;
    });

    return res.status(200).json({ respuesta });

  } catch (error) {
    return res.status(500).json({
      error: "Error interno interpretando mensaje",
      details: error.message
    });
  }
}