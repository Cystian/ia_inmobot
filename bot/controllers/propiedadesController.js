// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador principal de búsqueda inmobiliaria.
// FASE 5 completada:
// - Ranking Inteligente (F3)
// - Semántica avanzada (F4)
// - Perfil del usuario (F5 M1)
// - Preguntas activas (F5 M2)
// - Premium Messaging
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
import { updateUserProfile } from "../interpretar/userProfile.js";
import { detectMissingInfo } from "../interpretar/activeQuestions.js";
import { rankProperties } from "../interpretar/propertyRanker.js";

import { FRONTEND_BASE_URL } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logInfo } from "../utils/log.js";

const ITEMS_PER_PAGE = 6;

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const { iaRespuesta, userPhone, session, rawMessage, esFollowUp } = contexto;

    logInfo("BUSCAR PROPIEDADES v5", {
      filtros,
      rawMessage,
      esFollowUp,
      sessionUserProfile: session.userProfile
    });

    // ==============================================================
    // 1️⃣ Actualizar el perfil del usuario
    // ==============================================================
    const newProfile = updateUserProfile(
      session,
      filtros.semantic || {},
      filtros
    );

    updateSession(userPhone, {
      userProfile: newProfile
    });

    // ==============================================================
    // 2️⃣ ¿Falta información? → Pregunta activa
    // ==============================================================
    const pregunta = detectMissingInfo(filtros, session);

    if (pregunta) {
      await sendTextPremium(userPhone, pregunta, session);
      updateSession(userPhone, { lastIntent: "pregunta_pendiente" });
      return null;
    }

    // ==============================================================
    // 3️⃣ Control de paginación
    // ==============================================================
    let page = esFollowUp ? session.lastPage || 1 : 1;

    // ==============================================================
    // 4️⃣ Ejecutar búsqueda en BD
    // ==============================================================
    let propsDB = await buscarPropiedades(filtros);

    if (propsDB.length === 0) {
      await sendTextPremium(userPhone, MENSAJES.intro_propiedades_sugeridas, session);
      propsDB = await buscarSugeridas();

      updateSession(userPhone, {
        lastIntent: "buscar_propiedades",
        lastFilters: filtros,
        lastProperties: propsDB,
        lastPage: 1,
        userProfile: newProfile
      });
    }

    // ==============================================================
    // 5️⃣ Aplicar ranking inteligente + semántica + perfil usuario
    // ==============================================================
    const propiedadesRankeadas = rankProperties(propsDB, {
      ...filtros,
      semantic: filtros.semantic,
      userProfile: newProfile
    });

    // ==============================================================
    // 6️⃣ Follow-up: "más opciones"
    // ==============================================================
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

    if (followTriggers.some((t) => msgLower.includes(t))) {
      page = (session.lastPage || 1) + 1;
    }

    // ==============================================================
    // 7️⃣ Paginación
    // ==============================================================
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const propsPagina = propiedadesRankeadas.slice(start, end);

    if (propsPagina.length === 0) {
      await sendTextPremium(
        userPhone,
        "Ya no tengo más opciones en este segmento 😊.\nPuedo buscar alternativas ajustando zona o presupuesto si gustas.",
        session
      );
      updateSession(userPhone, { lastPage: page });
      return null;
    }

    // ==============================================================
    // 8️⃣ Intro Premium (solo al inicio)
    // ==============================================================
    if (!esFollowUp) {
      await sendTextPremium(
        userPhone,
        iaRespuesta || MENSAJES.intro_propiedades_default,
        session
      );
    } else if (followTriggers.some((t) => msgLower.includes(t))) {
      await sendTextPremium(
        userPhone,
        "Perfecto 👌 Aquí tienes más opciones alineadas con tus preferencias:",
        session
      );
    }

    // ==============================================================
    // 9️⃣ Enviar propiedades (imagen + caption)
    // ==============================================================
    for (const p of propsPagina) {
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

    const hasMore = propiedadesRankeadas.length > end;

    // ==============================================================
    // 🔟 Cierre Premium
    // ==============================================================
    if (hasMore) {
      await sendTextPremium(
        userPhone,
        "¿Quieres ver *más opciones* o deseas afinar la búsqueda (zona, presupuesto, cuartos, estilo)?",
        session
      );
    } else {
      await sendTextPremium(
        userPhone,
        cierrePremium(),
        session
      );
    }

    // ==============================================================
    // 1️⃣1️⃣ Guardar estado de sesión
    // ==============================================================
    updateSession(userPhone, {
      lastIntent: "buscar_propiedades",
      lastFilters: filtros,
      lastProperties: propiedadesRankeadas,
      lastPage: page,
      userProfile: newProfile
    });

    return null;
  }
};

export default propiedadesController;