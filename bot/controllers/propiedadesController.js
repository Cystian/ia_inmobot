// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador optimizado FASE 5.5 (Estricto + Follow-Up Inteligente)
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

import { cierrePremium } from "../services/sendMessageManager.js";

const ITEMS_PER_PAGE = 6;

// Palabras que activan follow-up
const FOLLOW_TRIGGERS = [
  "más opciones", "mas opciones",
  "muestrame mas", "muéstrame más",
  "otra opcion", "otra opción",
  "siguiente", "más", "mas"
];

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const { iaRespuesta, userPhone, session, rawMessage, esFollowUp } = contexto;

    logInfo("BUSCAR PROPIEDADES — FASE 5.5", {
      filtros,
      rawMessage,
      esFollowUp
    });

    const mensaje = rawMessage?.toLowerCase() || "";
    let page = esFollowUp ? (session.lastPage || 1) : 1;

    // ==========================================================
    // 🔎 Buscar propiedades con filtros estrictos
    // ==========================================================
    let propiedades = await buscarPropiedades(filtros);

    // ==========================================================
    // ❗ SI NO EXISTE NADA — aplicar Plan C (sugerencias)
    // ==========================================================
    if (propiedades.length === 0) {
      await enviarMensaje(userPhone, MENSAJES.intro_propiedades_sugeridas);

      propiedades = await buscarSugeridas(filtros);

      updateSession(userPhone, {
        lastIntent: "buscar_propiedades",
        lastFilters: filtros,
        lastProperties: propiedades,
        lastPage: 1
      });
    }

    // ==========================================================
    // 🎯 Follow-Up Inteligente
    // ==========================================================
    const isFollowTrigger = FOLLOW_TRIGGERS.some(t => mensaje.includes(t));

    if (isFollowTrigger) {
      // Primera respuesta del bot antes de mostrar más
      await enviarMensaje(
        userPhone,
        "¿Buscas *más opciones similares* o deseas *ajustar zona, precio o cuartos*? 😉"
      );

      // El usuario pidió más → avanzar página
      page = (session.lastPage || 1) + 1;
    }

    // ==========================================================
    // 📄 Paginación real
    // ==========================================================
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const propsPagina = propiedades.slice(start, end);

    // ==========================================================
    // 🚫 No existe más contenido
    // ==========================================================
    if (propsPagina.length === 0) {
      await enviarMensaje(
        userPhone,
        "Ya no tengo más propiedades dentro de estos filtros 😊. " +
        "Puedo ampliar la zona o ajustar tu presupuesto."
      );

      await enviarMensaje(userPhone, cierrePremium());

      updateSession(userPhone, { lastPage: page });
      return null;
    }

    // ==========================================================
    // 📝 Introducción inicial (SOLO si NO es follow-up)
    // ==========================================================
    if (!esFollowUp && !isFollowTrigger) {
      await enviarMensaje(
        userPhone,
        iaRespuesta || MENSAJES.intro_propiedades_default
      );
    }

    if (isFollowTrigger) {
      await enviarMensaje(userPhone, "Perfecto 👌 Aquí tienes opciones adicionales:");
    }

    // ==========================================================
    // 🖼 Enviar propiedades (imagen + caption)
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
    // 📌 Avisar si hay más páginas
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
        "Estas son *todas* las opciones disponibles dentro de tu búsqueda actual 😊."
      );
      await enviarMensaje(userPhone, cierrePremium());
    }

    // ==========================================================
    // 💾 Guardar estado final
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