// /bot/controllers/botController.js

import interpretarMensaje from "../interpretar/index.js";
import enviarMensaje from "../services/sendMessage.js";

export default async function handlerBot(req, res) {
  try {
    // ==============================================
    // 1️⃣ Convertir body string → JSON seguro
    // ==============================================
    let body = req.body;

    try {
      if (typeof body === "string") {
        body = JSON.parse(body);
      }
    } catch (parseErr) {
      console.log("⚠ Body no es JSON válido:", req.body);
      return res.status(200).send("OK");
    }

    console.log("🔍 Body recibido:", JSON.stringify(body, null, 2));

    // ==============================================
    // 2️⃣ Validar que sea WhatsApp
    // ==============================================
    if (body.object !== "whatsapp_business_account") {
      console.log("⚠ No es un evento de WhatsApp válido.");
      return res.status(200).send("OK");
    }

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      console.log("⚠ Evento sin mensajes (status u otros)");
      return res.status(200).send("OK");
    }

    const from = message.from;
    const text = message.text?.body || "";

    console.log("📥 Mensaje recibido:", text);

    // ==============================================
    // 3️⃣ Interpretación segura
    // ==============================================
    let interpretacion;
    let respuesta;

    try {
      // ⛔ ERROR ANTES: no enviabas "from"
      // interpretacion = await interpretarMensaje(text);

      // ✅ AHORA SÍ le pasamos el número del usuario
      interpretacion = await interpretarMensaje(text, from);

      if (typeof interpretacion === "string") {
        respuesta = interpretacion;
      } else if (typeof interpretacion === "object" && interpretacion?.respuesta) {
        respuesta = interpretacion.respuesta;
      } else {
        respuesta = "¿En qué puedo ayudarte?";
      }

    } catch (err) {
      console.error("⚠ Error interpretando mensaje:", err);
      respuesta = "Hubo un problema interpretando tu mensaje. ¿Podrías repetirlo?";
    }

    console.log("📤 Respuesta que se enviará al usuario:", respuesta);

    // ==============================================
    // 4️⃣ Enviar mensaje a WhatsApp
    // ==============================================
    try {
      await enviarMensaje(from, respuesta);
    } catch (err) {
      console.error("⚠ Error enviando mensaje:", err);
    }

    return res.status(200).send("OK");

  } catch (error) {
    console.error("❌ Error general en handlerBot:", error);
    return res.status(200).send("OK");
  }
}