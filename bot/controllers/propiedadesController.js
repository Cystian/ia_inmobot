// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador FASE 5.7 — Alineado con:
// - IntentClassifier 5.7 + E3
// - preTypeExtractor (refuerzo de tipo)
// - SendMessageManager Premium
// - Follow-Up real, sin loops ni repeticiones
// - Paginación inteligente compatible con inversión
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
import { FRONTEND_BASE_URL } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logInfo } from "../utils/log.js";
import { extractTipo } from "../interpretar/preTypeExtractor.js"; // 👈 IMPORT CORRECTO

const ITEMS_PER_PAGE = 6;

// Activadores de follow-up explícito
const FOLLOW_TRIGGERS = [
  "más opciones", "mas opciones",
  "muestrame mas", "muéstrame más",
  "otra opcion", "otra opción",
  "siguiente", "más", "mas"
];

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    let {
      iaRespuesta,       // lo mantenemos por compat, aunque ya no lo usamos
      userPhone,
      session = {},
      rawMessage,
      semanticPrefs,
      esFollowUp
    } = contexto;

    logInfo("BUSCAR PROPIEDADES — FASE 5.7", {
      filtros,
      rawMessage,
      semanticPrefs,
      esFollowUp
    });

    const msg = (rawMessage || "").toLowerCase();

    // ----------------------------------------------------------
    // 🔍 Refuerzo de TIPO usando el mensaje crudo del usuario
    // ----------------------------------------------------------
    const tipoMensaje = extractTipo(rawMessage || "");
    if (tipoMensaje && !filtros.tipo) {
      filtros = { ...filtros, tipo: tipoMensaje };
      logInfo("Refuerzo tipo por preTypeExtractor", { tipoMensaje });
    }

    // ----------------------------------------------------------
    // 1️⃣ Paginación base
    // ----------------------------------------------------------
    let page = esFollowUp ? (session.lastPage || 1) : 1;

    // ----------------------------------------------------------
    // 2️⃣ BÚSQUEDA PRINCIPAL (con ranking semántico opcional)
    // ----------------------------------------------------------
    let propiedades = await buscarPropiedades(filtros, semanticPrefs);

    // ----------------------------------------------------------
    // 3️⃣ SIN RESULTADOS → SUGERIDAS
    // ----------------------------------------------------------
    if (propiedades.length === 0) {
      await sendTextPremium(
        userPhone,
        MENSAJES.intro_propiedades_sugeridas,
        session
      );

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
          "Por ahora no tengo alternativas exactas, pero puedo ampliar zonas o ajustar precio si deseas 😊.",
          session
        );
        return null;
      }
    }

    // ----------------------------------------------------------
    // 4️⃣ FOLLOW-UP EXPLÍCITO (usuario pide MÁS)
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
    // 5️⃣ PAGINACIÓN REAL
    // ----------------------------------------------------------
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const propsPagina = propiedades.slice(start, end);

    // ----------------------------------------------------------
    // 6️⃣ SIN MÁS PÁGINAS
    // ----------------------------------------------------------
    if (propsPagina.length === 0) {
      await sendTextPremium(
        userPhone,
        "Ya no tengo más propiedades dentro de estos filtros. 😊\n" +
          "Puedo ampliar zona, precio o dormitorios si deseas.",
        session
      );

      await sendTextPremium(userPhone, cierrePremium(), session);

      updateSession(userPhone, { lastPage: page });
      return null;
    }

    // ----------------------------------------------------------
    // 7️⃣ INTRO (solo primera vez, SIN usar texto de Groq)
    // ----------------------------------------------------------
    if (!esFollowUp && !isFollowTrigger) {
      await sendTextPremium(
        userPhone,
        MENSAJES.intro_propiedades_default,
        session
      );
    }

    // ----------------------------------------------------------
    // 8️⃣ ENVÍO PREMIUM — PROPIEDADES
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
    // 9️⃣ ¿HAY MÁS?
    // ----------------------------------------------------------
    const hasMore = propiedades.length > end;

    if (hasMore) {
      await sendTextPremium(
        userPhone,
        "¿Quieres ver *más opciones* o prefieres afinar tu búsqueda (zona, precio, dormitorios)? 👇",
        session
      );
    } else {
      await sendTextPremium(
        userPhone,
        "Estas son *todas* las opciones disponibles según tu búsqueda 😊.",
        session
      );
      await sendTextPremium(userPhone, cierrePremium(), session);
    }

    // ----------------------------------------------------------
    // 🔟 GUARDAR CONTEXTO COMPLETO
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
