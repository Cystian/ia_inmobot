// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador principal para búsquedas inmobiliarias.
// IA Premium v3 + Mensajería Premium:
// - Follow-up avanzado
// - Precio dinámico
// - Paginación profesional
// - Microtextos humanizados
// - Control de spam
// -------------------------------------------------------

import {
  buscarPropiedades,
  buscarSugeridas
} from "../services/propiedadesService.js";

import { FRONTEND_BASE_URL } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logInfo } from "../utils/log.js";

import { updateSession } from "../interpretar/contextManager.js";

// 🔥 IMPORTAR CAPA PREMIUM
import {
  sendTextPremium,
  sendImagePremium,
  cierrePremium
} from "../services/sendMessageManager.js";

const ITEMS_PER_PAGE = 6;

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const { iaRespuesta, userPhone, session, rawMessage, esFollowUp } = contexto;

    logInfo("BUSCAR PROPIEDADES v3 + Premium", {
      filtros,
      rawMessage,
      esFollowUp
    });

    // ==============================================================
    // 1️⃣ Si es búsqueda nueva → reiniciar paginación  
    // ==============================================================
    let page = esFollowUp ? session.lastPage || 1 : 1;

    // ==============================================================
    // 2️⃣ Ejecutar búsqueda  
    // ==============================================================
    let propiedades = await buscarPropiedades(filtros);

    // ==============================================================
    // 3️⃣ Sin resultados → sugeridas  
    // ==============================================================
    if (propiedades.length === 0) {
      await sendTextPremium(userPhone, MENSAJES.intro_propiedades_sugeridas, session);

      propiedades = await buscarSugeridas();
      updateSession(userPhone, {
        lastIntent: "buscar_propiedades",
        lastFilters: filtros,
        lastProperties: propiedades,
        lastPage: 1
      });
    }

    // ==============================================================
    // 4️⃣ Follow-Up: "más opciones"  
    // ==============================================================
    const msgLower = rawMessage.toLowerCase();

    if (
      msgLower.includes("más opciones") ||
      msgLower.includes("mas opciones") ||
      msgLower.includes("muestrame mas") ||
      msgLower.includes("muéstrame más") ||
      msgLower.includes("otra opcion") ||
      msgLower.includes("otra opción")
    ) {
      page = (session.lastPage || 1) + 1;
    }

    // ==============================================================
    // 5️⃣ Paginación  
    // ==============================================================
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    const propiedadesPagina = propiedades.slice(start, end);

    if (propiedadesPagina.length === 0) {
      await sendTextPremium(
        userPhone,
        "Ya no tengo más opciones dentro de este segmento 😊. " +
          "Si deseas, puedo buscar alternativas en zonas cercanas o ajustar el presupuesto.",
        session
      );

      updateSession(userPhone, { lastPage: page });
      return null;
    }

    // ==============================================================
    // 6️⃣ Introducción humanizada  
    // ==============================================================
    if (!esFollowUp || msgLower.includes("buscar") || msgLower.includes("quiero")) {
      await sendTextPremium(
        userPhone,
        iaRespuesta || MENSAJES.intro_propiedades_default,
        session
      );
    } else if (
      msgLower.includes("más") ||
      msgLower.includes("mas") ||
      msgLower.includes("otra")
    ) {
      await sendTextPremium(
        userPhone,
        "Perfecto 👌 Te muestro más opciones alineadas con lo que estás buscando:",
        session
      );
    }

    // ==============================================================
    // 7️⃣ Enviar imagen + caption (Premium)  
    // ==============================================================
    for (let p of propiedadesPagina) {
      const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;

      const caption = `
🏡 *${p.title}*
💵 *US$ ${p.price}*
📍 ${p.location || "Ubicación por confirmar"}

🛏 ${p.bedrooms || 0} dorm | 🚿 ${p.bathrooms || 0} baños | 🚗 ${p.cocheras || 0} coch

🔗 ${url}
      `.trim();

      await sendImagePremium(userPhone, p.image, caption, session);
    }

    // ==============================================================
    // 8️⃣ Cierre Premium  
    // ==============================================================
    if (propiedadesPagina.length < ITEMS_PER_PAGE) {
      await sendTextPremium(
        userPhone,
        cierrePremium(),
        session
      );
    } else {
      await sendTextPremium(
        userPhone,
        "¿Quieres ver *más opciones* o prefieres refinar la búsqueda (zona, precio, cuartos, extras)?",
        session
      );
    }

    // ==============================================================
    // 9️⃣ Actualizar sesión  
    // ==============================================================
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