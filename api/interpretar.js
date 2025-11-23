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

    // 🧠 PROMPT MEGA PRO (JSON obligatorio)
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

Considera:
- "comprar", "venta" → status: "venta"
- "alquilar", "alquiler", "rentar" → status: "alquiler"
- Detecta distritos en Perú (Chimbote, Nuevo Chimbote, etc.)
- Detecta tipo por palabras: casa, departamento, terreno, local, oficina.
- Detecta dormitorios: "3 cuartos", "2 habitaciones", "5 dormitorios".
- Detecta rangos de precio: "200 mil", "100k", "150000", "200 lucas".
- Detecta cocheras, baños, zonas, palabras clave.
- Si no hay datos suficientes → igual debe generar intencion=buscar_propiedades.

Mensaje del usuario: "${user_message}"
    `;

    // ================================
    // 1️⃣ IA: extracción estructurada
    // ================================
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
    } catch (error) {
      console.log("⚠️ IA no devolvió JSON válido, usando fallback.");
      ia = { intencion: "buscar_propiedades", filtros: {}, respuesta: "" };
    }

    // ================================
    // 2️⃣ Filtro inteligente automático
    // ================================
    if (!ia.filtros) ia.filtros = {};

    const filtros = ia.filtros;

    // --- A) DISTRITOS AUTOMÁTICOS ---
    const distritos_detectados = [];
    if (msg.includes("nuevo chimbote")) distritos_detectados.push("Nuevo Chimbote");
    if (msg.includes("chimbote")) distritos_detectados.push("Chimbote");

    if (distritos_detectados.length > 0) {
      filtros.distritos = distritos_detectados;
    }

    // --- B) STATUS AUTOMÁTICO ---
    if (msg.includes("comprar") || msg.includes("venta") || msg.includes("vender")) {
      filtros.status = "venta";
    }
    if (msg.includes("alquilar") || msg.includes("alquiler") || msg.includes("rentar")) {
      filtros.status = "alquiler";
    }

    // --- C) TIPO AUTOMÁTICO ---
    if (msg.includes("casa")) filtros.tipo = "casa";
    if (msg.includes("departamento") || msg.includes("depa")) filtros.tipo = "departamento";
    if (msg.includes("terreno")) filtros.tipo = "terreno";
    if (msg.includes("local")) filtros.tipo = "local";

    // --- D) DORMITORIOS AUTOMÁTICOS ---
    const bedsRegex = /(\d+)\s*(dorm|cuarto|habitacion|habitaciones|dormitorios)/;
    const bedsMatch = msg.match(bedsRegex);
    if (bedsMatch) filtros.bedrooms = Number(bedsMatch[1]);

    // --- E) PRECIO AUTOMÁTICO ---
    const priceRegex = /(\d+[\.,]?\d{0,3})\s*(mil|k|lucas)?/;
    const p = msg.match(priceRegex);
    if (p) {
      let n = Number(p[1].replace(",", ""));
      if (msg.includes("mil") || msg.includes("lucas") || msg.includes("k")) {
        n *= 1000;
      }
      filtros.precio_max = n;
    }

    // =======================================
    // 3️⃣ SQL Dinámico Inteligente
    // =======================================
    let query = "SELECT * FROM properties WHERE 1=1";

    // Status
    if (filtros.status) {
      query += ` AND status LIKE '%${filtros.status}%'`;
    }

    // Distritos múltiples (OR)
    if (filtros.distritos && filtros.distritos.length > 0) {
      const parts = filtros.distritos
        .map((d) => `location LIKE '%${d}%'`)
        .join(" OR ");
      query += ` AND (${parts})`;
    }

    // Tipo → por título (CASA/DEPARTAMENTO/TERRENO/LOCAL)
    if (filtros.tipo) {
      query += ` AND UPPER(title) LIKE '%${filtros.tipo.toUpperCase()}%'`;
    }

    // Dormitorios
    if (filtros.bedrooms) {
      query += ` AND bedrooms >= ${filtros.bedrooms}`;
    }

    // Precio
    if (filtros.precio_max) {
      query += ` AND price <= ${filtros.precio_max}`;
    }

    const [rows] = await pool.query(query);

    // =======================================
    // 4️⃣ Fallback si no hay resultados
    // =======================================
    let propiedades = rows;

    if (propiedades.length === 0) {
      const [sugeridas] = await pool.query(
        "SELECT * FROM properties ORDER BY created_at DESC LIMIT 6"
      );
      propiedades = sugeridas;
      ia.respuesta = "No encontré opciones exactas, pero aquí tienes alternativas que te pueden interesar:";
    }

    // =======================================
    // 5️⃣ Construcción de respuesta
    // =======================================
    let respuesta = ia.respuesta || "Perfecto, te dejo algunas opciones:";

    propiedades.slice(0, 6).forEach((p) => {
      respuesta += `\n\n🏡 ${p.title}\n💵 US$ ${p.price}\n📍 ${p.location}\n🛏 ${p.bedrooms} dorm. | 🚿 ${p.bathrooms} baños | 🚗 ${p.cocheras} coch.\n🔗 https://tuweb.com/detalle/${p.id}`;
    });

    return res.status(200).json({ respuesta });

  } catch (error) {
    console.error("❌ ERROR GENERAL:", error);
    return res.status(500).json({
      error: "Error interno interpretando mensaje",
      details: error.message
    });
  }
}