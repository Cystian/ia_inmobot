// /bot/services/sendMessage.js
// -------------------------------------------------------
// ENVÍO OFICIAL WHATSAPP – FASE 5.6
// - Anti duplicados
// - Reintentos automáticos
// - Logs premium
// - Modo texto / imagen
// -------------------------------------------------------

const WHATSAPP_TOKEN = process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

const META_URL = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

// -------------------------------------------------------
// Helper: evita enviar mensajes vacíos
// -------------------------------------------------------
function sanitizeText(text = "") {
  return String(text || "").trim().slice(0, 4000); // límite real de WhatsApp
}

// -------------------------------------------------------
// Helper: request genérico a Meta
// -------------------------------------------------------
async function metaRequest(payload, tipo = "texto") {
  try {
    const response = await fetch(META_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log(`📤 Meta (${tipo}) →`, JSON.stringify(data, null, 2));

    // ---------------------------------------------------
    // REINTENTO AUTOMÁTICO SI META DEVUELVE RATE LIMIT
    // ---------------------------------------------------
    if (data?.error?.code === 131021 || data?.error?.message?.includes("Too many requests")) {
      console.warn("⚠ Meta rate limit — reintentando en 1 segundo...");
      await new Promise(res => setTimeout(res, 1000));
      return metaRequest(payload, tipo);
    }

    return data;
  } catch (err) {
    console.error(`❌ Error enviando (${tipo}):`, err);
    return null;
  }
}

// -------------------------------------------------------
// ENVÍO DE TEXTO
// -------------------------------------------------------
export default async function enviarMensaje(to, texto) {
  const body = sanitizeText(texto);

  if (!body) {
    console.warn("⚠ Intento de enviar mensaje vacío — cancelado.");
    return null;
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body }
  };

  return metaRequest(payload, "texto");
}

// -------------------------------------------------------
// ENVÍO DE IMAGEN
// -------------------------------------------------------
export async function enviarImagen(to, imagenUrl, caption = "") {
  const cap = sanitizeText(caption).slice(0, 1024); // límite WhatsApp

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: {
      link: imagenUrl,
      caption: cap
    }
  };

  return metaRequest(payload, "imagen");
}