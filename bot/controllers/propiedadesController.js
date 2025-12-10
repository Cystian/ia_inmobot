// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador FASE 5.7 — VERSIÓN FINAL PRO
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

import { extractTipo } from "../interpretar/preTypeExtractor.js"; // ✔ IMPORT CORRECTO

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

    logInfo("BUSCAR PROPIEDADES — CONTROLADOR FINAL", {
      filtros,
      rawMessage,
      semanticPrefs,
      esFollowUp
    });

    const msg = (rawMessage || "").toLowerCase();

    // ----------------------------------------------------
    // 🔥 REFORZAR TIPO SI EL USUARIO LO MENSIONA
    // ----------------------------------------------------
    const tipoDetectado = extractTipo(rawMessage);
    if (tipoDetectado) {
      filtros.tipo = tipoDetectado;
      console.log("🔥 Tipo reforzado:", tipoDetectado);
    }

    // ----------------------------------------------------
    // 🔍 BÚSQUEDA PRINCIPAL
    // ----------------------------------------------------
    const propiedades = await buscarPropiedades(filtros, semanticPrefs);

    let allProps = propiedades;

    // ----------------------------------------------------
    // ❌ SIN RESULTADOS
    // ----------------------------------------------------
    if (allProps.length === 0) {
      await sendTextPremium(
        userPhone,
        MENSAJES.intro_propiedades_sugeridas,
        session
      );

      allProps = await buscarSugeridas(filtros);

      updateSession(userPhone, {
        lastIntent: "buscar_propiedades",
        lastFilters: filtros,
        lastProperties: allProps,
        lastPage: 1
      });

      if (allProps.length === 0) {
        await sendTextPremium(
          userPhone,
          "No encontré opciones exactas, pero puedo ajustar zona o presupuesto 😊.",
          session
        );
        return null;
      }
    }

    // ----------------------------------------------------
    // 🔁 FOLLOW-UP (más opciones)
    // ----------------------------------------------------
    let page = esFollowUp ? (session.lastPage || 1) : 1;
    const isFollowTrigger = FOLLOW_TRIGGERS.some(t => msg.includes(t));

    if (isFollowTrigger) {
      page = (session.lastPage || 1) + 1;

      await sendTextPremium(
        userPhone,
        "Perfecto 👌 Te muestro opciones adicionales:",
        session
      );
    }

    // ----------------------------------------------------
    // 📄 PAGINACIÓN
    // ----------------------------------------------------
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const propsPagina = allProps.slice(start, end);

    if (propsPagina.length === 0) {
      await sendTextPremium(
        userPhone,
        "Ya no tengo más propiedades con estos filtros. ¿Deseas ampliar zona o precio? 😊",
        session
      );
      await sendTextPremium(userPhone, cierrePremium(), session);
      updateSession(userPhone, { lastPage: page });
      return null;
    }

    // ----------------------------------------------------
    // 🟢 INTRO SOLO UNA VEZ
    // ----------------------------------------------------
    if (!esFollowUp && !isFollowTrigger) {
      await sendTextPremium(
        userPhone,
        MENSAJES.intro_propiedades_default,
        session
      );
    }

    // ----------------------------------------------------
    // 🏡 ENVÍO DE PROPIEDADES
    // ----------------------------------------------------
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

    // ----------------------------------------------------
    // 🔚 ¿HAY MÁS?
    // ----------------------------------------------------
    const hasMore = allProps.length > end;

    if (hasMore) {
      await sendTextPremium(
        userPhone,
        "¿Quieres ver más opciones o prefieres afinar zona/precio? 👇",
        session
      );
    } else {
      await sendTextPremium(
        userPhone,
        "Estas son *todas* las opciones disponibles 😊.",
        session
      );
      await sendTextPremium(userPhone, cierrePremium(), session);
    }

    // ----------------------------------------------------
    // 💾 GUARDAR CONTEXTO
    // ----------------------------------------------------
    updateSession(userPhone, {
      lastIntent: "buscar_propiedades",
      lastFilters: filtros,
      lastProperties: allProps,
      lastPage: page,
      semanticPrefs
    });

    return null;
  }
};

export default propiedadesController;

