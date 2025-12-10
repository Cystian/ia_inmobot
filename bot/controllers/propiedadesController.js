// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador FASE 5.7 — PREMIUM ADAPTATIVO
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

import { extractTipo } from "../interpretar/preTypeExtractor.js";
import { updateSession } from "../interpretar/contextManager.js";
import { FRONTEND_BASE_URL } from "../config/env.js";
import { MENSAJES } from "../utils/messages.js";
import { logInfo } from "../utils/log.js";

// --------------------------------------
// Adaptación de cantidad enviada
// --------------------------------------
function calcularItemsPorPagina(filtros, semanticPrefs) {
  const tieneTipo = !!filtros.tipo;
  const tieneZona = Array.isArray(filtros.distritos) && filtros.distritos.length > 0;
  const tienePrecio = filtros.precio_min || filtros.precio_max;
  const tieneDorms = filtros.bedrooms;
  const tieneAdjetivos = semanticPrefs?.adjectives?.length > 0;

  const especificidad =
    (tieneTipo ? 1 : 0) +
    (tieneZona ? 1 : 0) +
    (tienePrecio ? 1 : 0) +
    (tieneDorms ? 1 : 0) +
    (tieneAdjetivos ? 1 : 0);

  // Consulta muy específica → 2–3 resultados
  if (especificidad >= 3) return 3;

  // Consulta moderada → 4 resultados
  if (especificidad === 2) return 4;

  // Consulta muy genérica → 6 resultados
  return 6;
}

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const {
      userPhone,
      session,
      rawMessage,
      semanticPrefs,
      esFollowUp
    } = contexto;

    logInfo("BUSCAR PROPIEDADES — CONTROLADOR PREMIUM", {
      filtros,
      rawMessage,
      semanticPrefs,
      esFollowUp
    });

    const msg = (rawMessage || "").toLowerCase();

    // ----------------------------------------------------
    // 🔥 Refuerzo de TIPO si el usuario lo menciona
    // ----------------------------------------------------
    const tipoDetectado = extractTipo(rawMessage);
    if (tipoDetectado) {
      filtros.tipo = tipoDetectado;
      console.log("🔥 Tipo reforzado:", tipoDetectado);
    }

    // ----------------------------------------------------
    // 🔍 Búsqueda principal
    // ----------------------------------------------------
    const propiedades = await buscarPropiedades(filtros, semanticPrefs);
    let allProps = propiedades;

    // ----------------------------------------------------
    // ❌ Sin resultados → sugeridas
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
    // 📄 Calcular cuántos ítems mostrar
    // ----------------------------------------------------
    const ITEMS_PER_PAGE = calcularItemsPorPagina(filtros, semanticPrefs);

    let page = esFollowUp ? (session.lastPage || 1) : 1;

    const FOLLOW_TRIGGERS = [
      "más opciones","mas opciones",
      "muestrame mas","muéstrame más",
      "otra opcion","otra opción",
      "siguiente","más","mas"
    ];

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
    // 📄 Paginación real
    // ----------------------------------------------------
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const propsPagina = allProps.slice(start, end);

    if (propsPagina.length === 0) {
      await sendTextPremium(
        userPhone,
        "Ya no tengo más propiedades dentro de estos filtros 😊.\nPuedo ampliar zona o presupuesto si deseas.",
        session
      );
      await sendTextPremium(userPhone, cierrePremium(), session);
      updateSession(userPhone, { lastPage: page });
      return null;
    }

    // ----------------------------------------------------
    // 🟢 Intro solo la primera vez
    // ----------------------------------------------------
    if (!esFollowUp && !isFollowTrigger) {
      await sendTextPremium(
        userPhone,
        MENSAJES.intro_propiedades_default,
        session
      );
    }

    // ----------------------------------------------------
    // 🏡 Enviar propiedades
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
    // 🔚 ¿Hay más?
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
    // 💾 Guardar estado
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
