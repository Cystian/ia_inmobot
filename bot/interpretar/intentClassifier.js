// /bot/interpretar/intentClassifier.js
// -------------------------------------------------------
// Llama a Groq para obtener intención + filtros base
// También detecta saludos simples sin intención inmobiliaria.
// -------------------------------------------------------

import Groq from "groq-sdk";
import { GROQ_API_KEY } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logError } from "../utils/log.js";

const client = new Groq({
  apiKey: GROQ_API_KEY
});

// Saludos sin intención comercial
const SALUDOS_PUROS = [
  "hola",
  "buenas",
  "buenos dias",
  "buenas tardes",
  "buenas noches",
  "hey",
  "holi",
  "ola",
  "👋"
];

// Palabras clave para detectar intención inmobiliaria
const PALABRAS_INTENCION = [
  "casa",
  "departamento",
  "depa",
  "terreno",
  "comprar",
  "alquilar",
  "alquiler",
  "venta",
  "rentar",
  "hab",
  "cuarto",
  "habitacion",
  "dorm"
];

// -------------------------------------------------------

export async function getIaAnalysis(raw, msg) {
  const esSaludoSimple = SALUDOS_PUROS.some(
    (s) => msg === s || msg.startsWith(s)
  );

  const contieneIntencion = PALABRAS_INTENCION.some((p) =>
    msg.includes(p)
  );

  // Caso saludo puro
  if (esSaludoSimple && !contieneIntencion) {
    return {
      intencion: "saludo_simple",
      filtrosBase: {},
      iaRespuesta: MENSAJES.saludo_inicial,
      esSaludoSimple: true
    };
  }

  // IA Groq
  const prompt = `
Eres un asesor inmobiliario peruano MUY profesional.
Devuelve SOLO JSON sin backticks, sin markdown, sin código:

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

Mensaje: "${raw}"
`;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Eres un asesor inmobiliario muy humano y profesional. Devuelve SOLO JSON válido, sin ``` ni markdown." },
        { role: "user", content: prompt }
      ]
    });

    let content = completion.choices[0].message.content || "";

    // ---------------------------------------------------
    // 🧹 Limpieza automática: elimina ``` y ```json
    // ---------------------------------------------------
    content = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let ia = {};

    try {
      ia = JSON.parse(content);
    } catch (err) {
      console.error("⚠ No se pudo parsear el JSON de Groq:", content);
      return {
        intencion: "buscar_propiedades",
        filtrosBase: {},
        iaRespuesta: "",
        esSaludoSimple: false
      };
    }

    return {
      intencion: ia.intencion || "buscar_propiedades",
      filtrosBase: ia.filtros || {},
      iaRespuesta: ia.respuesta || "",
      esSaludoSimple: false
    };

  } catch (error) {
    logError("IA Groq", error);

    return {
      intencion: "buscar_propiedades",
      filtrosBase: {},
      iaRespuesta: "",
      esSaludoSimple: false
    };
  }
}
