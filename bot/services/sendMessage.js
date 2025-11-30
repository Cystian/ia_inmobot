// /bot/services/sendMessage.js

const WHATSAPP_TOKEN = process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

export default async function enviarMensaje(to, texto) {
  try {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: texto }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("📤 Respuesta de Meta (texto):", data);

    return data;
  } catch (error) {
    console.error("❌ Error enviando mensaje:", error);
    return null;
  }
}

export async function enviarImagen(to, imagenUrl, caption = "") {
  try {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: {
        link: imagenUrl,
        caption: caption
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("📤 Respuesta de Meta (imagen):", data);

    return data;
  } catch (error) {
    console.error("❌ Error enviando imagen:", error);
    return null;
  }
}
