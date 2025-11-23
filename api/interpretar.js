// /api/interpretar.js
import Groq from "groq-sdk";
import { pool } from "../db.js";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { user_message } = req.body;

  const prompt = `
Eres un asistente inmobiliario.
Devuelve SOLO JSON, sin texto adicional, así:

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
    const chat = await client.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: "Eres un asistente experto en bienes raíces." },
        { role: "user", content: prompt }
      ]
    });

    const result = JSON.parse(chat.choices[0].message.content);
