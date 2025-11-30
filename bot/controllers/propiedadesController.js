// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador principal para búsquedas de propiedades.
// IA Premium v2: Follow-up, paginación y refinamiento.
// -------------------------------------------------------

import {
  buscarPropiedades,
  buscarSugeridas
} from "../services/propiedadesService.js";

import { MENSAJES } from "../utils/messages.js";
import { FRONTEND_BASE_URL } from "../config/env.js";
import { logInfo } from "../utils/log.js";

import enviarMensaje, { enviarImagen } from "../services/sendMessage.js";
import { updateSession } from "../interpretar/contextManager.js";

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const { iaRespuesta, userPhone, session, rawMessage } = contexto;

    logInfo("Buscar propiedades", { filtros, rawMessage });

    let propiedades = await buscarPropiedades(filtros);

    // =====================================================
    // 🔥 1) FOLLOW-UP INTELIGENTE
    // =====================================================
    const msg = rawMessage.toLowerCase();

    // A) "más barato"
    if (msg.includes("más barato") || msg.includes("mas barato") || msg.includes("más económico")) {
      if (!filtros.precio_max && session.lastFilters?.precio_max) {
        filtros.precio_max = Math.floor(session.lastFilters.precio_max * 0.8);
      } else if (filtros.precio_max) {
        filtros.precio_max = Math.floor(filtros.precio_max * 0.8);
      }
      propiedades = await buscarPropiedades(filtros);
    }

    // B) "más opciones"
    let page = session.lastPage || 1;
    if (msg.includes("más opciones") || msg.includes("mas opciones") || msg.includes("muestrame mas")) {
      page += 1;
      updateSession(userPhone, { lastPage: page });
    } else {
      page = 1; // Reset si es una búsqueda nueva
      updateSession(userPhone, { lastPage: 1 });
    }

    // Cálculo de límite
    const ITEMS_PER_PAGE = 6;
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    // =====================================================
    // 2) SIN RESULTADOS → sugerencias
    // =====================================================
    if (propiedades.length === 0) {
      await enviarMensaje(userPhone, MENSAJES.intro_propiedades_sugeridas);
      propiedades = await buscarSugeridas();
      // Guardar sesión
      updateSession(userPhone, {
        lastIntent: "buscar_propiedades",
        lastFilters: filtros,
        lastProperties: propiedades
      });
    }

    // =====================================================
    // 3) INTRODUCCIÓN
    // =====================================================
    const intro = iaRespuesta || MENSAJES.intro_propiedades_default;
    await enviarMensaje(userPhone, intro);

    // =====================================================
    // 4) PAGINACIÓN: enviar solo bloque actual
    // =====================================================
    const propiedadesPagina = propiedades.slice(start, end);

    // Si no hay más resultados
    if (propiedadesPagina.length === 0) {
      await enviarMensaje(
        userPhone,
        "Ya no tengo más opciones exactas, pero puedo mostrar sugerencias si deseas. 😊"
      );
      return null;
    }

    // =====================================================
    // 5) Enviar cada propiedad como imagen + caption
    // =====================================================
    for (let p of propiedadesPagina) {
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

    // =====================================================
    // 6) Cierre + ayuda
    // =====================================================
    const cierre =
      propiedadesPagina.length < ITEMS_PER_PAGE
        ? "Si deseas puedo afinar la búsqueda: presupuesto, zona, dormitorios o extras. 😊"
        : "¿Quieres ver *más opciones*? Puedo mostrarte otro grupo.";

    await enviarMensaje(userPhone, cierre);

    // =====================================================
    // 7) Guardar sesión para follow-up
    // =====================================================
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