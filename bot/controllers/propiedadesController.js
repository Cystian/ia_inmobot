// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador principal para búsquedas de propiedades.
// Versión premium: Imagen + caption por cada propiedad.
// -------------------------------------------------------

import {
  buscarPropiedades,
  buscarSugeridas
} from "../services/propiedadesService.js";

import { MENSAJES } from "../utils/messages.js";
import { FRONTEND_BASE_URL } from "../config/env.js";
import { logInfo } from "../utils/log.js";

import enviarMensaje, { enviarImagen } from "../services/sendMessage.js";

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const { iaRespuesta, userPhone } = contexto;

    logInfo("Buscar propiedades", { filtros });

    let propiedades = await buscarPropiedades(filtros);

    // Caso alquiler sin resultados
    if (filtros.status === "alquiler" && propiedades.length === 0) {
      return MENSAJES.sin_alquiler;
    }

    let intro = iaRespuesta || MENSAJES.intro_propiedades_default;

    // Caso sin resultados → sugeridas
    if (propiedades.length === 0) {
      propiedades = await buscarSugeridas();
      intro = MENSAJES.intro_propiedades_sugeridas;
    }

    // 🔹 Enviar introducción primero (mensaje de texto)
    await enviarMensaje(userPhone, intro);

    // =========================================
    // 🥇 VERSIÓN PREMIUM:
    // Imagen + caption por cada propiedad
    // =========================================
    const maxMostrar = 10;

    for (let p of propiedades.slice(0, maxMostrar)) {
      const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;

      const caption = `
🏡 *${p.title}*
💵 *US$ ${p.price}*
📍 ${p.location || "Zona por confirmar"}
🛏 ${p.bedrooms || 0} dorm | 🚿 ${p.bathrooms || 0} baños | 🚗 ${p.cocheras || 0} coch
🔗 ${url}
      `.trim();

      try {
        await enviarImagen(userPhone, p.image, caption);
      } catch (err) {
        console.error("⚠ Error enviando imagen/caption:", err);
      }
    }

    // Texto final (opcional)
    await enviarMensaje(userPhone, MENSAJES.cierre_generico);

    // Nada que devolver porque ya mandamos todo vía WhatsApp
    return null;
  }
};

export default propiedadesController;
