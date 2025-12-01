// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador principal FASE 5 (estable)
// Compatible con index.js + router.js v5.1
// -------------------------------------------------------

// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador principal FASE 5 (estable)
// -------------------------------------------------------
// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador principal FASE 5 (estable)
// -------------------------------------------------------

import {
  buscarPropiedades,
  buscarSugeridas
} from "../services/propiedadesService.js";

import enviarMensaje, { enviarImagen } from "../services/sendMessage.js";
import { updateSession } from "../interpretar/contextManager.js";
import { FRONTEND_BASE_URL } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logInfo } from "../utils/log.js";

// Cierre Premium solo para fin de segmento
import { cierrePremium } from "../services/sendMessageManager.js";

const ITEMS_PER_PAGE = 6;

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const { iaRespuesta, userPhone, session, rawMessage, esFollowUp } = contexto;

    logInfo("BUSCAR PROPIEDADES — FASE 5", {
      filtros,
      rawMessage,
      esFollowUp
    });

    let page = esFollowUp ? (session.lastPage || 1) : 1;

    let propiedades = await buscarPropiedades(filtros);

    // ==========================================================
    // Sin resultados → sugeridas
    // ==========================================================
    if (propiedades.length === 0) {
      await enviarMensaje(userPhone, MENSAJES.intro_propiedades_sugeridas);

      propiedades = await buscarSugeridas();

      updateSession(userPhone, {
        lastIntent: "buscar_propiedades",
        lastFilters: filtros,
        lastProperties: propiedades,
        lastPage: 1
      });
    }

    // ==========================================================
    // Follow-up: "más opciones"
    // ==========================================================
    const msgLower = rawMessage.toLowerCase();
    const followTriggers = [
      "más opciones",
      "mas opciones",
      "muestrame mas",
      "muéstrame más",
      "otra opcion",
      "otra opción",
      "siguiente"
    ];

    if (followTriggers.some(t => msgLower.includes(t))) {
      page = (session.lastPage || 1) + 1;
    }

    // ==========================================================
    // Paginación
    // ==========================================================
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const propsPagina = propiedades.slice(start, end);

    // ==========================================================
    // ❌ NO HAY MÁS PROPIEDADES → CIERRE PREMIUM
    // ==========================================================
    if (propsPagina.length === 0) {
      await enviarMensaje(
        userPhone,
        "Ya no tengo más opciones dentro de este segmento 😊. " +
        "Puedo ajustar zona o presupuesto si deseas."
      );

      // 🔥 Cierre Premium natural
      await enviarMensaje(userPhone, cierrePremium());

      updateSession(userPhone, { lastPage: page });
      return null;
    }

    // ==========================================================
    // Introducción para búsqueda nueva o follow-up
    // ==========================================================
    if (!esFollowUp) {
      await enviarMensaje(
        userPhone,
        iaRespuesta || MENSAJES.intro_propiedades_default
      );
    } else if (followTriggers.some(t => msgLower.includes(t))) {
      await enviarMensaje(userPhone, "Perfecto 👌 Aquí tienes más opciones:");
    }

    // ==========================================================
    // Enviar propiedades (imagen + caption)
    // ==========================================================
    for (const p of propsPagina) {
      const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;

      const caption = `
🏡 *${p.title}*
💵 US$ ${p.price}
📍 ${p.location || "Ubicación por confirmar"}

🛏 ${p.bedrooms || 0} dorm  
🚿 ${p.bathrooms || 0} baños  
🚗 ${p.cocheras || 0} coch

🔗 ${url}
      `.trim();

      await enviarImagen(userPhone, p.image, caption);
    }

    // ==========================================================
    // ¿Hay más páginas?
    // ==========================================================
    const hasMore = propiedades.length > end;

    if (hasMore) {
      await enviarMensaje(
        userPhone,
        "¿Quieres ver *más opciones* o prefieres afinar tu búsqueda? (zona, precio, cuartos)"
      );
    } else {
      await enviarMensaje(
        userPhone,
        "Estas son todas las opciones dentro de este segmento 😊. " +
        "Si deseas, puedo ampliar zonas o ajustar presupuesto."
      );

      // 🔥 Cierre Premium cuando realmente termina el segmento
      await enviarMensaje(userPhone, cierrePremium());
    }

    // ==========================================================
    // Guardar estado final
    // ==========================================================
    updateSession(userPhone, {
      lastIntent: "buscar_propiedades",
      lastFilters: filtros,
      lastProperties: propiedades,
      lastPage: page
    });

    return null;
  }
};

export default propiedadesController;
