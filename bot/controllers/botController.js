// /bot/controllers/botController.js

import interpretarMensaje from "../interpretar/index.js";
import enviarMensaje from "../services/sendMessage.js";

export default async function handlerBot(req, res) {
  try {
    const body = req.body;

    // Log para depuración
    console.log("🔍 Body recibido:", JSON.stringify(body, null, 2));

    // Validar que sea un evento real de WhatsApp
    if (body.object !== "whatsapp_business_account") {
      console.log("⚠ No es un evento de WhatsApp válido.");
      return res.sendStatus(200);
    }

    // Proteger todas las lecturas del JSON
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const message = value?.messages?.[0];

    // Si no hay mensaje, pero sí es un evento WA, no romper
    if (!message) {
      console.log("⚠ Evento recibido sin mensajes. (Status u otros)");
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = message.text?.body || "";

    console.log("📥 Mensaje recibido:", text);

// Interpretar intención
let interpretacion;
let respuesta;

try {
  interpretacion = await interpretarMensaje(text);

  // Si interpretarMensaje devuelve un objeto, extraemos el texto
  if (typeof interpretacion === "string") {
    respuesta = interpretacion;
  } else if (typeof interpretacion === "object" && interpretacion?.respuesta) {
    respuesta = interpretacion.respuesta;
  } else {
    respuesta = "Gracias por tu mensaje. ¿En qué puedo ayudarte?";
  }

} catch (err) {
  console.error("⚠ Error interpretando mensaje:", err);
  respuesta = "Hubo un inconveniente interpretando tu mensaje. ¿Podrías repetirlo?";
}

    console.log("📤 Respuesta que se enviará al usuario:", respuesta);
    // Enviar respuesta
    try {
      await enviarMensaje(from, respuesta);
    } catch (err) {
      console.error("⚠ Error enviando mensaje:", err);
    }

    return res.sendStatus(200);

  } catch (error) {
    console.error("❌ Error general en handlerBot:", error);
    return res.sendStatus(500);
  }
}
