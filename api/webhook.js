// /api/webhook.js
// -------------------------------------------------------
// Webhook oficial para recibir mensajes desde WhatsApp.
// Procesa texto, botones e interacciones y envía respuesta.
// -------------------------------------------------------

import interpretar from "./interpretar/index.js";
import sendMessage from "./utils/sendMessage.js";
import { META_VERIFY_TOKEN } from "./config/env.js";

export default async function webhook(req, res) {
  try {
    // 1️⃣ Verificación del webhook
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
        console.log("🟢 Webhook verificado");
        return res.status(200).send(challenge);
      }

      console.log("🔴 Verificación fallida");
      return res.sendStatus(403);
    }

    // 2️⃣ Procesamiento de mensajes entrantes
    if (req.method === "POST") {
      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages?.[0];

      if (!messages) return res.sendStatus(200);

      const from = messages.from;
      const type = messages.type;

      let userText = "";

      // Tipos de mensaje soportados
      if (type === "text") userText = messages.text.body;
      if (type === "button") userText = messages.button.text;

      if (type === "interactive") {
        if (messages.interactive.button_reply)
          userText = messages.interactive.button_reply.title;

        if (messages.interactive.list_reply)
          userText = messages.interactive.list_reply.title;
      }

      console.log("📩 Mensaje recibido:", userText);

      // Interpretar mensaje con el motor IA + reglas + SQL
      const respuesta = await interpretar(userText, from);

      console.log("🤖 Respuesta generada:", respuesta);

      await sendMessage(from, respuesta);

      return res.sendStatus(200);
    }

    return res.sendStatus(404);
  } catch (error) {
    console.error("❌ Error en webhook:", error);
    return res.sendStatus(500);
  }
}
