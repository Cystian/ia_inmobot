// -------------------------------------------------------
// FASE 5.8 — DETALLE DE PROPIEDAD (Match Inteligente Real)
// -------------------------------------------------------
// - Coincidencia por zona/título (C)
// - Coincidencia por precio (B)
// - Coincidencia por ordinal (D)
// - “Esta / Esa” → última propiedad mostrada (A)
// - Usa description + distribution
// - Respuestas limpias y sin duplicados
// -------------------------------------------------------

import { FRONTEND_BASE_URL } from "../config/env.js";
import { updateSession } from "../interpretar/contextManager.js";
import { sendTextPremium, sendImagePremium } from "../services/sendMessageManager.js";

// =====================================================
// FUNCIÓN CENTRAL: MATCH INTELIGENTE (A+B+C+D)
// =====================================================
function matchProperty(msg, lista, lastSelected) {
  if (!lista || lista.length === 0) return null;

  const t = msg.toLowerCase();

  // -------------------------------
  // A) “esta / esa” → última propiedad vista
  // -------------------------------
  if (t.includes("esta") || t.includes("esa")) {
    if (lastSelected) return lastSelected;
    return lista[lista.length - 1]; // fallback
  }

  // -------------------------------
  // D) Ordinal: la 1 / la 2 / la tercera
  // -------------------------------
  const ordinal = t.match(/la\s*(\d+)/);
  if (ordinal) {
    const index = Number(ordinal[1]) - 1;
    if (lista[index]) return lista[index];
  }

  // -------------------------------
  // B) Coincidencia por precio
  // -------------------------------
  const precio = t.match(/(\d{2,6})/);
  if (precio) {
    const num = Number(precio[1]);
    const byPrice = lista.find(p => Math.abs(p.price - num) <= 3000);
    if (byPrice) return byPrice;
  }

  // -------------------------------
  // C) Coincidencia por zona o título
  // -------------------------------
  for (const p of lista) {
    if (
      t.includes((p.location || "").toLowerCase()) ||
      t.includes((p.title || "").toLowerCase())
    ) {
      return p;
    }
  }

  // Fallback: última mostrada
  return lastSelected || lista[0];
}

// =====================================================
// CONTROLADOR
// =====================================================
const detallePropiedadController = {
  async responder(contexto = {}) {
    const { session, rawMessage, userPhone } = contexto;
    const msg = (rawMessage || "").toLowerCase().trim();

    const lista = session?.lastProperties || [];
    const lastSelected = session?.lastSelectedProperty || null;

    // Sin historial → no puedo identificar
    if (lista.length === 0) {
      await sendTextPremium(
        userPhone,
        "Aún no te he mostrado propiedades como para identificar cuál es 😊.\n" +
          "Dime por ejemplo: *casa en Nuevo Chimbote de 3 cuartos* y empiezo a compartirte opciones.",
        session
      );
      return null;
    }

    // Selección real
    const p = matchProperty(msg, lista, lastSelected);

    updateSession(userPhone, { lastSelectedProperty: p });

    // Detectar si pregunta algo específico
    const ask = {
      cocheras: /(coch|parking|estacionamiento)/.test(msg),
      banios: /(baño|baños|bano|banos)/.test(msg),
      area: /(m2|metro|area|área)/.test(msg),
      precio: /(precio|cuanto cuesta|cuánto cuesta|usd|dolares)/.test(msg),
      papeles: /(papeles|documentos|sunarp|partida)/.test(msg),
      dormitorios: /(dorm|hab|cuarto|habitacion)/.test(msg),
      ubicacion: /(donde queda|zona|ubicación|direccion)/.test(msg),
      detalles: /(detalles|mas info|más info|informacion|información)/.test(msg)
    };

    const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;
    let respuesta = `📌 *Detalles de la propiedad*\n\n`;
    let especifica = false;

    // Respuestas específicas
    if (ask.precio) { respuesta += `💵 *US$ ${p.price}*\n`; especifica = true; }
    if (ask.dormitorios) { respuesta += `🛏 *${p.bedrooms} dormitorios*\n`; especifica = true; }
    if (ask.banios) { respuesta += `🚿 *${p.bathrooms} baños*\n`; especifica = true; }
    if (ask.cocheras) { respuesta += `🚗 *${p.cocheras} cocheras*\n`; especifica = true; }
    if (ask.area) { respuesta += `📐 *${p.area} m²*\n`; especifica = true; }
    if (ask.ubicacion) { respuesta += `📍 *${p.location}*\n`; especifica = true; }
    if (ask.papeles) { respuesta += `📑 Documentos listos para revisión.\n`; especifica = true; }

    // Detalles extendidos de BD
    if (ask.detalles) {
      especifica = true;
      respuesta += `\n📝 *Descripción:*  
${p.description || "Sin descripción disponible."}\n\n`;

      respuesta += `📦 *Distribución:*  
${p.distribution || "Sin detalles de distribución."}\n`;
    }

    // Resumen general si no pidió algo puntual
    if (!especifica) {
      respuesta += `🏡 *${p.title}*\n`;
      respuesta += `📍 ${p.location}\n`;
      respuesta += `💵 US$ ${p.price}\n`;
      respuesta += `🛏 ${p.bedrooms} dorm – 🚿 ${p.bathrooms} baños – 🚗 ${p.cocheras} coch\n`;
      respuesta += `📐 ${p.area} m²\n\n`;

      if (p.description) respuesta += `📝 ${p.description}\n\n`;
    }

    respuesta += `🔗 Ficha completa: ${url}`;

    await sendTextPremium(userPhone, respuesta.trim(), session);

    // Imagen solo si es resumen general
    if (!especifica && p.image) {
      const cap = `🏡 ${p.title}\nUS$ ${p.price}\n📍 ${p.location}\n\n${url}`;
      await sendImagePremium(userPhone, p.image, cap, session);
    }

    return null;
  }
};

export default detallePropiedadController;