// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador FASE 5.7 — PREMIUM ADAPTATIVO + RANKING
// -------------------------------------------------------
// - Cantidad de resultados según especificidad
//   • Consulta genérica   → hasta 6 propiedades
//   • Consulta media      → 4 propiedades
//   • Consulta específica → 3 propiedades
//   • Súper específica    → 1 propiedad
// - Ordena por mejor coincidencia semántica
//   (tipo + zona + precio + dormitorios + adjetivos)
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

// -------------------------------------------------------
// Detectores de follow-up explícito
// -------------------------------------------------------
const FOLLOW_TRIGGERS = [
  "más opciones", "mas opciones",
  "muestrame mas", "muéstrame más",
  "otra opcion", "otra opción",
  "siguiente", "más", "mas"
];

// -------------------------------------------------------
// Cálculo dinámico de cuántos items enviar
// -------------------------------------------------------
function calcularItemsPorPagina(filtros = {}, semanticPrefs = {}) {
  const tieneTipo      = !!filtros.tipo;
  const tieneZona      = Array.isArray(filtros.distritos) && filtros.distritos.length > 0;
  const tienePrecio    = !!filtros.precio_min || !!filtros.precio_max;
  const tieneDorms     = !!filtros.bedrooms;
  const tieneAdjetivos = Array.isArray(semanticPrefs.adjectives) && semanticPrefs.adjectives.length > 0;

  const especificidad =
    (tieneTipo ? 1 : 0) +
    (tieneZona ? 1 : 0) +
    (tienePrecio ? 1 : 0) +
    (tieneDorms ? 1 : 0) +
    (tieneAdjetivos ? 1 : 0);

  // Súper específica → tipo + zona + (precio o dormitorios) + adjetivos
  if (especificidad >= 4) return 1; // ✅ SOLO 1 PROPIEDAD
  if (especificidad === 3) return 3;
  if (especificidad === 2) return 4;
  return 6;
}

// -------------------------------------------------------
// Ranking semántico simple (sin IA extra)
// -------------------------------------------------------
function scoreProp(p, filtros = {}, semanticPrefs = {}) {
  let score = 0;

  const title    = (p.title || "").toLowerCase();
  const location = (p.location || "").toLowerCase();
  const desc     = (p.description || "").toLowerCase();
  const distrib  = (p.distribution || "").toLowerCase();
  const price    = Number(p.price) || 0;
  const beds     = Number(p.bedrooms) || 0;

  // 1) Tipo de propiedad
  if (filtros.tipo) {
    const t = filtros.tipo.toLowerCase();
    if (title.includes(t)) score += 6;
  }

  // 2) Zona / distritos
  if (Array.isArray(filtros.distritos)) {
    for (const d of filtros.distritos) {
      const z = (d || "").toLowerCase();
      if (z && location.includes(z)) score += 4;
    }
  }

  // 3) Rango de precio
  if (filtros.precio_min || filtros.precio_max) {
    const min = filtros.precio_min ? Number(filtros.precio_min) : null;
    const max = filtros.precio_max ? Number(filtros.precio_max) : null;

    if ((min && price < min) || (max && price > max)) score -= 5;
    else score += 3;
  }

  // 4) Dormitorios
  if (filtros.bedrooms) {
    const target = Number(filtros.bedrooms);
    if (beds >= target) score += 2;
    if (beds === target) score += 1;
  }

  // 5) Adjetivos semánticos
  const adjs = semanticPrefs.adjectives || [];
  for (const a of adjs) {
    const adj = a.toLowerCase();
    if (title.includes(adj) || desc.includes(adj) || distrib.includes(adj)) {
      score += 1;
    }
  }

  return score;
}

// -------------------------------------------------------
// CONTROLADOR PRINCIPAL
// -------------------------------------------------------
const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const {
      userPhone,
      session = {},
      rawMessage,
      semanticPrefs = {},
      esFollowUp
    } = contexto;

    // ----------------------------------------------------
    // 🛑 Filtro para evitar procesar eventos NO textuales
    // ----------------------------------------------------
    if (!rawMessage || !rawMessage.trim()) {
      console.log("⚠️ Evento no textual ignorado.");
      return null;
    }

    const msg = (rawMessage || "").toLowerCase();

    logInfo("BUSCAR PROPIEDADES — CONTROLADOR PREMIUM ADAPTATIVO", {
      filtros,
      rawMessage,
      semanticPrefs,
      esFollowUp
    });

    const isFollowTrigger = FOLLOW_TRIGGERS.some(t => msg.includes(t));
    const lastPageInSession = session.lastPage || 1;

    // ✅ FLAG para evitar doble intro (default vs sugeridas)
    let introYaEnviado = false;

    // ----------------------------------------------------
    // 🔥 Refuerzo de TIPO si el usuario lo menciona
    // ----------------------------------------------------
    if (!isFollowTrigger) {
      const tipoDetectado = extractTipo(rawMessage || "");
      if (tipoDetectado) {
        filtros.tipo = tipoDetectado;
        console.log("🔥 Tipo reforzado por preTypeExtractor:", tipoDetectado);
      }
    }

    // ----------------------------------------------------
    // 🔍 Búsqueda principal (servicio MySQL)
    // ----------------------------------------------------
    let allProps = await buscarPropiedades(filtros, semanticPrefs);

    // ----------------------------------------------------
    // ❌ Sin resultados → sugeridas (PATCH: sin doble mensaje)
    // ----------------------------------------------------
    if (allProps.length === 0) {
      const sugeridas = await buscarSugeridas(filtros);

      // Si tampoco hay sugeridas: 1 solo mensaje y corte limpio
      if (!sugeridas || sugeridas.length === 0) {
        await sendTextPremium(
          userPhone,
          "No encontré coincidencias para esa búsqueda 😕.\n¿Prefieres ampliar *zona* o ajustar *presupuesto*?",
          session
        );
        return null;
      }

      // Si sí hay sugeridas: recién comunicamos y continuamos
      await sendTextPremium(
        userPhone,
        MENSAJES.intro_propiedades_sugeridas,
        session
      );

      introYaEnviado = true;
      allProps = sugeridas;

      updateSession(userPhone, {
        lastIntent: "buscar_propiedades",
        lastFilters: filtros,
        lastProperties: allProps,
        lastPage: 1
      });
    }

    // ----------------------------------------------------
    // 🧠 Ordenar por mejor coincidencia semántica
    // ----------------------------------------------------
    allProps = [...allProps].sort(
      (a, b) => scoreProp(b, filtros, semanticPrefs) - scoreProp(a, filtros, semanticPrefs)
    );

    // ----------------------------------------------------
    // 📄 Calcular cuántos ítems mostrar (adaptativo)
    // ----------------------------------------------------
    const ITEMS_PER_PAGE = calcularItemsPorPagina(filtros, semanticPrefs);

    // ----------------------------------------------------
    // 🔢 Cálculo de página actual
    // ----------------------------------------------------
    let page = 1;

    if (isFollowTrigger) {
      page = lastPageInSession + 1;

      await sendTextPremium(
        userPhone,
        "Perfecto 👌 Te muestro opciones adicionales:",
        session
      );
    } else if (esFollowUp) {
      page = lastPageInSession;
    } else {
      page = 1;
    }

    // ----------------------------------------------------
    // 📄 Paginación real
    // ----------------------------------------------------
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end   = start + ITEMS_PER_PAGE;
    const propsPagina = allProps.slice(start, end);

    // No hay más propiedades para esta página
    if (propsPagina.length === 0) {
      await sendTextPremium(
        userPhone,
        "Ya no tengo más propiedades dentro de estos filtros 😊.\nPuedo ampliar zona o presupuesto si deseas.",
        session
      );

      await sendTextPremium(
        userPhone,
        cierrePremium(),
        session
      );

      updateSession(userPhone, { lastPage: page });
      return null;
    }

    // ----------------------------------------------------
    // 🟢 Intro solo la primera vez (no en follow-up)
    // PATCH: evita duplicar si ya se envió intro de sugeridas
    // ----------------------------------------------------
    if (!introYaEnviado && !esFollowUp && !isFollowTrigger) {
      await sendTextPremium(
        userPhone,
        MENSAJES.intro_propiedades_default,
        session
      );
    }

    // ----------------------------------------------------
    // 🏡 Enviar propiedades de la página actual (ordenadas)
    // ----------------------------------------------------
    const baseUrl = (FRONTEND_BASE_URL || "").replace(/\/+$/, "");

    for (const p of propsPagina) {
      const url = `${baseUrl}/detalle/${p.id}`;

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
      await sendTextPremium(
        userPhone,
        cierrePremium(),
        session
      );
    }

    // ----------------------------------------------------
    // 💾 Guardar estado de la búsqueda
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

