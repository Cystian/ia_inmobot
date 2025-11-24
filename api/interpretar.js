// /api/interpretar.js
// -------------------------------------------------------
// Endpoint HTTP para probar el motor del bot sin WhatsApp.
// Recibe "user_message" y devuelve la misma respuesta que WhatsApp.
// -------------------------------------------------------

import interpretar from "../bot/interpretar/index.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método no permitido. Usa POST."
      });
    }

    const { user_message = "", user_phone = "" } = req.body;

    const respuesta = await interpretar(user_message, user_phone);

    return res.status(200).json({ respuesta });
  } catch (error) {
    console.error("❌ Error en /api/interpretar:", error);
    return res.status(500).json({
      error: "Error interno interpretando mensaje",
      details: error.message
    });
  }
}
