// /bot/controllers/detallePropiedadController.js
// -------------------------------------------------------
// FASE 5.7 — DETALLE DE PROPIEDAD
// - Selección inteligente de la propiedad (ordinal + semántico)
// - Uso de description + distribution (campos extra BD)
// - Respuestas elegantes y sin spam
// - Compatible con SendMessageManager Premium
// -------------------------------------------------------

import { FRONTEND_BASE_URL } from "../config/env.js";
import { updateSession } from "../interpretar/contextManager.js";
import { sendTextPremium, sendImagePremium } from "../services/sendMessageManager.js";

function matchBySemantic(msg, lista) {
  const lower = msg.toLowerCase();

  // Número ordinal 1,2,3...
  const ordinal = lower.match(/la\s*(\d+)/);
  if (ordinal) {
    const index = Number(ordinal[1]) - 1;
    if (lista[index]) return lista[index];
  }

  // Coincidencia por precio
  const precio = lower.match(/(\d{2,6})/);
  if (precio) {
    const num = Number(precio[1]);
    const byPrice = lista.find(p => Math.abs(p.price - num) < 2000);
    if (byPrice) return byPrice;
  }

  // Coincidencia por zona o parte del título
  for (const p of lista) {
    if (
      lower.includes((p.location || "").toLowerCase()) ||
      lower.includes((p.title || "").toLowerCase())
    ) {
      return p;
    }
  }

  // Si dice “esta casa”, “esa casa” → tomar la última mostrada
  if (lower.includes("esta") || lower.includes("esa")) {
    return lista[0]; // fallback: primera de la lista
  }

  return lista[0]; // fallback seguro
}

const detallePropiedadController = {
  async responder(contexto = {}) {
    const { session, rawMessage, userPhone } = contexto;
    const msg = (rawMessage || "").toLowerCase().trim();

    const lista = session?.lastProperties || [];

    // 0️⃣ Sin historial
    if (!Array.isArray(lista) || lista.length === 0) {
      await sendTextPremium(
        userPhone,
        "Aún no te he mostrado propiedades como para identificar cuál es 😊.\nDime por ejemplo: *casa en Nuevo Chimbote de 3 cuartos* y empiezo a compartirte opciones.",
        session
      );
      return null;
    }

    // 1️⃣ Selección inteligente
    const p = matchBySemantic(msg, lista);

    updateSession(userPhone, { lastSelectedProperty: p });

    // 2️⃣ Detectar si pide un atributo específico
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
    let respuesta = `📌 *Detalles de la propiedad que mencionas*\n\n`;
    let esPreguntaEspecifica = false;

    // 3️⃣ Atributos individuales
    if (ask.precio) {
      esPreguntaEspecifica = true;
      respuesta += `💵 Precio: *US$ ${p.price}*\n`;
    }

    if (ask.dormitorios) {
      esPreguntaEspecifica = true;
      respuesta += `🛏 Dormitorios: *${p.bedrooms || 0}*\n`;
    }

    if (ask.banios) {
      esPreguntaEspecifica = true;
      respuesta += `🚿 Baños: *${p.bathrooms || 0}*\n`;
    }

    if (ask.cocheras) {
      esPreguntaEspecifica = true;
      respuesta += `🚗 Cocheras: *${p.cocheras || 0}*\n`;
    }

    if (ask.area) {
      esPreguntaEspecifica = true;
      respuesta += `📐 Área: *${p.area || "—"} m²*\n`;
    }

    if (ask.ubicacion) {
      esPreguntaEspecifica = true;
      respuesta += `📍 Ubicación: *${p.location || "Por confirmar"}*\n`;
    }

    if (ask.papeles) {
      esPreguntaEspecifica = true;
      respuesta += `📑 Documentos listos para revisión. ¿Quieres que un asesor los valide?\n`;
    }

    // 3B️⃣ Detalles extendidos desde BD (description + distribution)
    if (ask.detalles || msg.includes("mas detalles")) {
      esPreguntaEspecifica = true;

      respuesta += `\n📝 *Descripción:*  
${p.description || "Sin descripción disponible."}\n\n`;

      respuesta += `📦 *Distribución:*  
${p.distribution || "Sin detalles de distribución registrados."}\n`;
    }

    // 4️⃣ Resumen elegante si no pidió algo específico
    if (!esPreguntaEspecifica) {
      respuesta += `🏡 *${p.title}*\n`;
      respuesta += `📍 ${p.location}\n`;
      respuesta += `💵 US$ ${p.price}\n`;
      respuesta += `🛏 ${p.bedrooms} dorm – 🚿 ${p.bathrooms} baños – 🚗 ${p.cocheras} coch\n`;
      respuesta += `📐 ${p.area} m²\n\n`;

      if (p.description) {
        respuesta += `📝 ${p.description}\n\n`;
      }
    }

    respuesta += `🔗 Ver ficha completa: ${url}`;

    // 5️⃣ Envío premium
    await sendTextPremium(userPhone, respuesta.trim(), session);

    if (!esPreguntaEspecifica && p.image) {
      const cap = `🏡 *${p.title}*\n💵 US$ ${p.price}\n📍 ${p.location}\n\n🔗 ${url}`;
      await sendImagePremium(userPhone, p.image, cap, session);
    }

    return null;
  }
};

export default detallePropiedadController;