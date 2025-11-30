// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador principal de búsqueda inmobiliaria.
// Fase 3: IA Premium + Ranking Inteligente + Follow-up avanzado
// -------------------------------------------------------

import {
  buscarPropiedades,
  buscarSugeridas
} from "../services/propiedadesService.js";

import {
  sendTextPremium,
  sendImagePremium,
  cierrePremium
} from "../services/sendMessageManager.js";

import { rankProperties } from "../interpretar/propertyRanker.js";
import { updateSession } from "../interpretar/contextManager.js";

import { FRONTEND_BASE_URL } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logInfo } from "../utils/log.js";

const ITEMS_PER_PAGE = 6;

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const { iaRespuesta, userPhone, session, rawMessage, esFollowUp } = contexto;

    logInfo("BUSCAR PROPIEDADES v4", {
      filtros,
      rawMessage,
      esFollowUp
    });

    // ==============================================================
    // 1️⃣ Reset de página en búsquedas frescas  
    // ==============================================================
    let page = esFollowUp ? session.lastPage || 1 : 1;

    // ==============================================================
    // 2️⃣ Obtener propiedades + aplicar ranking inteligente  
    // ==============================================================
    let propertiesDB = await buscarPropiedades(filtros);

    // Si no se encuentra nada → sugeridas
    if (propertiesDB.length === 0) {
      await sendTextPremium(userPhone, MENSAJES.intro_propiedades_sugeridas, session);
      propertiesDB = await buscarSugeridas();
      updateSession(userPhone, {
        lastIntent: "buscar_propiedades",
        lastFilters: filtros,
        lastProperties: propertiesDB,
        lastPage: 1
      });
    }

    // Aplicar ranking inteligente (antes de paginar)
    const propiedadesRankeadas = rankProperties(propertiesDB, filtros);

    // ==============================================================
    // 3️⃣ Follow-up de “más opciones”  
    // ==============================================================
    const msgLower = rawMessage.toLowerCase();

    const followUpTriggers = [
      "más opciones", "mas opciones",
      "muestrame mas", "muéstrame más",
      "otra opcion", "otra opción"
    ];

    if (followUpTriggers.some(t => msgLower.includes(t))) {
      page = (session.lastPage || 1) + 1;
    }

    // ==============================================================
    // 4️⃣ Paginación después del ranking  
    // ==============================================================
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    const propiedadesPagina = propiedadesRankeadas.slice(start, end);

    if (propiedadesPagina.length === 0) {
      await sendTextPremium(
        userPhone,
        "No tengo más opciones dentro de este segmento 😊. " +
          "Si deseas, puedo ampliar zonas o ajustar el presupuesto.",
        session
      );

      updateSession(userPhone, { lastPage: page });
      return null;
    }

    // ==============================================================
    // 5️⃣ Mensaje introductorio inteligente  
    // ==============================================================
    if (!esFollowUp || msgLower.includes("buscar") || msgLower.includes("quiero")) {
      await sendTextPremium(
        userPhone,
        iaRespuesta || MENSAJES.intro_propiedades_default,
        session
      );
    } else if (followUpTriggers.some(t => msgLower.includes(t))) {
      await sendTextPremium(
        userPhone,
        "Perfecto 👌 Te muestro más opciones alineadas con lo que buscas:",
        session
      );
    }

    // ==============================================================
    // 6️⃣ Enviar cada propiedad (imagen + caption premium)  
    // ==============================================================
    for (let p of propiedadesPagina) {
      const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;

      const caption = `
🏡 *${p.title}*
💵 *US$ ${p.price}*
📍 ${p.location || "Ubicación por confirmar"}

🛏 ${p.bedrooms || 0} dorm  
🚿 ${p.bathrooms || 0} baños  
🚗 ${p.cocheras || 0} coch

🔗 ${url}
      `.trim();

      await sendImagePremium(userPhone, p.image, caption, session);
    }

    // ==============================================================
    // 7️⃣ Cierre Premium  
    // ==============================================================
    const hasMore = propiedadesRankeadas.length > end;

    if (!hasMore) {
      await sendTextPremium(userPhone, cierrePremium(), session);
    } else {
      await sendTextPremium(
        userPhone,
        "¿Quieres ver *más opciones* o prefieres afinar la búsqueda (zona, precio, cuartos, extras)?",
        session
      );
    }

    // ==============================================================
    // 8️⃣ Actualizar sesión  
    // ==============================================================
    updateSession(userPhone, {
      lastIntent: "buscar_propiedades",
      lastFilters: filtros,
      lastProperties: propiedadesRankeadas,
      lastPage: page
    });

    return null;
  }
};

export default propiedadesController;