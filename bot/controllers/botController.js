// /bot/controllers/botController.js

import interpretarMensaje from "../interpretar/index.js"; 
import enviarMensaje from "../services/sendMessage.js";

export default async function handlerBot(req, res) {
  try {
    const body = req.body;

    // Validar que sea evento de WhatsApp
    if (
      body.object === "whatsapp_business_account" &&
      body.entry?.[0]?.changes?.[0]?.value?.messages
    ) {
      const messages = body.entry[0].changes[0].value.messages;
      const message = messages[0];
      const from = message.from; // número del usuario
      const text = message.text?.body || "";

      console.log("📥 Mensaje recibido:", text);

      // Interpretar intención
      const respuesta = await interpretarMensaje(text);

      // Enviar respuesta
      await enviarMensaje(from, respuesta);

      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error manejando mensaje:", error);
    return res.sendStatus(500);
  }
}
