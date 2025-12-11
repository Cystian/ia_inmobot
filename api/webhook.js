// /api/webhook.js

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

    if (req.method === "POST") {
      console.log("📩 POST recibido en webhook:", JSON.stringify(req.body, null, 2));

      // --------------------------------------------------
      // 🛑 FILTRO ANTI-EVENTOS DE WHATSAPP
      // --------------------------------------------------
      const entry = req.body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      // Si el evento NO es un mensaje → ignorar
      if (!message) {
        console.log("⚠️ Evento ignorado: no es mensaje.");
        return res.sendStatus(200);
      }

      // Si el usuario NO envió texto → ignorar
      if (!message.text?.body) {
        console.log("⚠️ Evento ignorado: mensaje sin texto.");
        return res.sendStatus(200);
      }

      return handlerBot(req, res);
    }

    return res.status(405).send("Method Not Allowed");

  } catch (error) {
    console.error("❌ Error en /api/webhook:", error);
    return res.status(500).send("Internal Server Error");
  }
}
