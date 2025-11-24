// /api/webhook.js

// =========================================
// 1️⃣ Habilitar bodyParser en Vercel
// =========================================
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

import handlerBot from "../bot/controllers/botController.js";


export default async function handler(req, res) {
  try {
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

    // =========================================
    // 2️⃣ GET → Validación del webhook (Meta challenge)
    // =========================================
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("🔐 Webhook verificado correctamente.");
        return res.status(200).send(challenge);
      }

      console.log("❌ Falló la verificación del webhook.");
      return res.sendStatus(403);
    }

    // =========================================
    // 3️⃣ POST → Evento real de WhatsApp
    // =========================================
    if (req.method === "POST") {
      console.log("📩 POST recibido en webhook:", JSON.stringify(req.body, null, 2));
      return handlerBot(req, res);
    }

    // =========================================
    // 4️⃣ Otros métodos → No permitido
    // =========================================
    return res.status(405).send("Method Not Allowed");

  } catch (error) {
    console.error("❌ Error en /api/webhook:", error);
    return res.status(500).send("Internal Server Error");
  }
}
