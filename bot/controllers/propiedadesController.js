// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador FASE 5.7 — FINAL PRO
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

import { updateSession } from "../interpretar/contextManager.js";
import { extractTipo } from "../interpretar/preTypeExtractor.js"; // ✅ CORRECTO
import { FRONTEND_BASE_URL } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logInfo } from "../utils/log.js";

const ITEMS_PER_PAGE = 6;

const FOLLOW_TRIGGERS = [
  "más opciones","mas opciones",
  "muestrame mas","muéstrame más",
  "otra opcion","otra opción",
  "siguiente","más","mas"
];

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const {
      userPhone,
      session,
      rawMessage,
      semanticPrefs,
      esFollowUp
    } = contexto;

    logInfo("BUSCAR PROPIEDADES — FINAL PRO", {
      filtros,
      rawMessage,
      semanticPrefs,
      esFollowUp
    });

    const msg = (rawMessage || "").toLowerCase();
    let page = esFollowUp ? (session.lastPage || 1) : 1;

    // ----------------------------------------------------------
    // 🔥 REFORZAR TIPO ANTES DE BUSCAR
    // ----------------------------------------------------------
    const tipoAuto = extractTipo(rawMessage);
    if (tipoAuto) {
      filtros.tipo = tipoAuto;
      console.log("⚡ Tipo reforzado por preTypeExtractor:", tipoAuto);
    }

    // ----------------------------------------------------------
    // 1️⃣ BÚSQUEDA PRINCIPAL
    // ----------------------------------------------------------
    let propiedades = await buscarPropiedades(filtros, semanticPrefs);

    // ----------------------------------------------------------
    // 2️⃣ SIN RESULTADOS → SUGERIDAS
    // ----------------------------------------------------------
    if (propiedades.length === 0) {
      await sendTextPremium(userPhone, MENSAJES.intro_propiedades_sugeridas, session);

      propiedades = await buscarSugeridas(filtros);

      updateSession(userPhone, {
        lastIntent: "buscar_propiedades",
        lastFilters: filtros,
        lastProperties: propiedades,
        lastPage: 1
      });

      if (propiedades.length === 0) {
        await sendTextPremium(
          userPhone,
          "Por ahora no tengo alternativas exactas, pero puedo ampliar zona o ajustar precio si deseas 😊.",
          session
        );
        return null;
      }
    }

    // ----------------------------------------------------------
    // 3️⃣ FOLLOW-UP: “más”, “otra opción”
    // ----------------------------------------------------------
    const isFollowTrigger = FOLLOW_TRIGGERS.some(t => msg.includes(t));

    if (isFollowTrigger) {
      page = (session.lastPage || 1) + 1;

      await sendTextPremium(
        userPhone,
        "Perfecto 👌 Te muestro opciones adicionales:",
        session
      );
    }

    // ----------------------------------------------------------
    // 4️⃣ PAGINACIÓN
    // ----------------------------------------------------------
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const propsPagina = propiedades.slice(start, end);

    if (propsPagina.length === 0) {
      await sendTextPremium(
        userPhone,
        "Ya no tengo más propiedades dentro de estos filtros. 😊\nPuedes ajustar zona, precio o dormitorios.",
        session
      );

      await sendTextPremium(userPhone, cierrePremium(), session);
      updateSession(userPhone, { lastPage: page });
      return null;
    }

    // ----------------------------------------------------------
    // 5️⃣ INTRO (solo primera vez)
    // ----------------------------------------------------------
    if (!esFollowUp && !isFollowTrigger) {
      await sendTextPremium(userPhone, MENSAJES.intro_propiedades_default, session);
    }

    // ----------------------------------------------------------
    // 6️⃣ ENVÍO PREMIUM
    // ----------------------------------------------------------
    for (const p of propsPagina) {
      const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;

      const caption = `
🏡 *${p.title}*
💵 US$ ${p.price}
📍 ${p.location || "Ubicación por confirmar"}

🛏 ${p.bedrooms || 0} dorm  
🚿 ${p.bathrooms || 0} baños  
🚗 ${p.cocheras || 0} coch  
📐 ${p.area || "—"} m²

🔗 ${url}
      `.trim();

      if (p.image) {
        await sendImagePremium(userPhone, p.image, caption, session);
      } else {
        await sendTextPremium(userPhone, caption, session);
      }
    }

    // ----------------------------------------------------------
    // 7️⃣ ¿HAY MÁS?
    // ----------------------------------------------------------
    const hasMore = propiedades.length > end;

    if (hasMore) {
      await sendTextPremium(
        userPhone,
        "¿Quieres ver *más opciones* o prefieres afinar tu búsqueda (zona, precio, dormitorios)? 👇",
        session
      );
    } else {
      await sendTextPremium(userPhone, "Estas son *todas* las opciones disponibles 😊.", session);
      await sendTextPremium(userPhone, cierrePremium(), session);
    }

    // ----------------------------------------------------------
    // 8️⃣ GUARDAR CONTEXTO
    // ----------------------------------------------------------
    updateSession(userPhone, {
      lastIntent: "buscar_propiedades",
      lastFilters: filtros,
      lastProperties: propiedades,
      lastPage: page,
      semanticPrefs
    });

    return null;
  }
};

export default propiedadesController;

