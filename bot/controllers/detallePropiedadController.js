// /bot/controllers/detallePropiedadController.js
// -------------------------------------------------------
// FASE 5.7 — DETALLE DE PROPIEDAD (ESTRATEGIA D)
// -------------------------------------------------------
// - Selección por ordinal: "la primera", "la 2", "la tercera", etc.
// - Usa description + distribution (campos extra BD)
// - Si no identifica la propiedad → pide aclaración
// - Respuestas elegantes y sin spam
// - Compatible con SendMessageManager Premium
// -------------------------------------------------------

import { FRONTEND_BASE_URL } from "../config/env.js";
import { updateSession } from "../interpretar/contextManager.js";
import { sendTextPremium, sendImagePremium } from "../services/sendMessageManager.js";

// ---------------------------------------------
// Mapea texto a índice (0,1,2,3...)
// ---------------------------------------------
function getIndexFromMessage(msg, total) {
  const lower = msg.toLowerCase();

  // 1) Forma numérica: "la 1", "la 2", "la 3", "la 4"
  const numMatch = lower.match(/la\s*(\d{1,2})/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (!isNaN(n) && n >= 1 && n <= total) {
      return n - 1; // índice base 0
    }
  }

  // 2) Formas textuales: primera, segunda, tercera, cuarta, quinta
  if (/(primera|1ra|1era)/.test(lower)) return 0;
  if (/(segunda|2da|2nda)/.test(lower) && total >= 2) return 1;
  if (/(tercera|3ra|3era)/.test(lower) && total >= 3) return 2;
  if (/(cuarta|4ta|4ta)/.test(lower) && total >= 4) return 3;
  if (/(quinta|5ta|5ta)/.test(lower) && total >= 5) return 4;

  // Si no encuentra nada claro → -1 (no identificado)
  return -1;
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
        "Aún no te he mostrado propiedades como para identificar cuál es 😊.\n" +
          "Dime por ejemplo: *casa en Nuevo Chimbote de 3 cuartos* y empiezo a compartirte opciones.",
        session
      );
      return null;
    }

    // 1️⃣ Determinar índice por ORDEN (ESTRATEGIA D)
    const idx = getIndexFromMessage(msg, lista.length);

    if (idx === -1) {
      // No se identificó con seguridad → pedir precisión
      await sendTextPremium(
        userPhone,
        "Para ayudarte mejor, dime por favor *de cuál opción* quieres más detalles. Por ejemplo: *la primera*, *la segunda* o *la 3* 😊.",
        session
      );
      return null;
    }

    const p = lista[idx];

    // Guardamos la propiedad activa seleccionada por el usuario
    updateSession(userPhone, { lastSelectedProperty: p });

    // 2️⃣ Detectar si pide un atributo específico
    const ask = {
      cocheras: /(coch|parking|estacionamiento)/.test(msg),
      banios: /(baño|baños|bano|banos)/.test(msg),
      area: /(m2|metro|area|área)/.test(msg),
      precio: /(precio|cuanto cuesta|cuánto cuesta|usd|dolares|dólares)/.test(msg),
      papeles: /(papeles|documentos|sunarp|partida)/.test(msg),
      dormitorios: /(dorm|hab|cuarto|habitacion|habitaciones)/.test(msg),
      ubicacion: /(donde queda|zona exacta|ubicación exacta|ubicacion exacta|direccion|dirección|ubicación|ubicacion)/.test(msg),
      detalles: /(detalles|mas info|más info|informacion|información|más detalles|mas detalles)/.test(msg)
    };

    const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;
    let respuesta = `📌 *Detalles de la propiedad que mencionas*\n\n`;
    let esPreguntaEspecifica = false;

    // 3️⃣ Atributos individuales
    if (ask.precio) {
      esPreguntaEspecifica = true;
      respuesta += p.price
        ? `💵 Precio: *US$ ${p.price}*\n`
        : `💵 No tengo un precio fijo registrado, puedo validarlo con el asesor.\n`;
    }

    if (ask.dormitorios) {
      esPreguntaEspecifica = true;
      respuesta += p.bedrooms != null
        ? `🛏 Dormitorios: *${p.bedrooms}*\n`
        : `🛏 No tengo registrada la cantidad exacta de dormitorios.\n`;
    }

    if (ask.banios) {
      esPreguntaEspecifica = true;
      respuesta += p.bathrooms != null
        ? `🚿 Baños: *${p.bathrooms}*\n`
        : `🚿 No tengo registrada la cantidad exacta de baños.\n`;
    }

    if (ask.cocheras) {
      esPreguntaEspecifica = true;
      respuesta += p.cocheras != null
        ? `🚗 Cocheras: *${p.cocheras}*\n`
        : `🚗 No tengo cocheras registradas para esta propiedad.\n`;
    }

    if (ask.area) {
      esPreguntaEspecifica = true;
      respuesta += p.area != null
        ? `📐 Área aproximada: *${p.area} m²*.\n`
        : `📐 No tengo registrada el área exacta, pero puedo consultarla con el asesor.\n`;
    }

    if (ask.ubicacion) {
      esPreguntaEspecifica = true;
      respuesta += p.location
        ? `📍 Está ubicada en: *${p.location}*.\n`
        : `📍 Aún no tengo la ubicación exacta registrada, pero puedo confirmarla.\n`;
    }

    if (ask.papeles) {
      esPreguntaEspecifica = true;
      respuesta += `📑 Sobre documentos (partida, cargas, etc.), puedo pedir confirmación al asesor. ¿Quieres que lo consulte por ti?\n`;
    }

    // 3B️⃣ Detalles extendidos desde BD (description + distribution)
    if (ask.detalles) {
      esPreguntaEspecifica = true;

      respuesta += `\n📝 *Descripción:*  
${p.description || "Sin descripción disponible por el momento."}\n\n`;

      respuesta += `📦 *Distribución:*  
${p.distribution || "Sin detalles de distribución registrados aún."}\n`;
    }

    // 4️⃣ Resumen elegante si NO pidió algo específico
    if (!esPreguntaEspecifica) {
      respuesta += `🏡 *${p.title}*\n`;
      respuesta += `📍 ${p.location || "Zona por confirmar"}\n`;
      if (p.price != null) respuesta += `💵 US$ ${p.price}\n`;
      if (p.bedrooms != null) respuesta += `🛏 ${p.bedrooms} dorm\n`;
      if (p.bathrooms != null) respuesta += `🚿 ${p.bathrooms} baños\n`;
      if (p.cocheras != null) respuesta += `🚗 ${p.cocheras} coch\n`;
      if (p.area != null) respuesta += `📐 ${p.area} m²\n`;

      if (p.description) {
        respuesta += `\n📝 ${p.description}\n`;
      }
    }

    respuesta += `\n🔗 Ver ficha completa: ${url}`;

    // 5️⃣ Envío premium
    await sendTextPremium(userPhone, respuesta.trim(), session);

    // Solo enviar imagen si NO era una pregunta puntual de atributo
    if (!esPreguntaEspecifica && p.image) {
      const caption = `🏡 *${p.title}*\n💵 US$ ${p.price}\n📍 ${p.location}\n\n🔗 ${url}`;
      await sendImagePremium(userPhone, p.image, caption, session);
    }

    return null;
  }
};

export default detallePropiedadController;