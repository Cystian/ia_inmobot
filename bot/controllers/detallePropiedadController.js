// /bot/controllers/detallePropiedadController.js
// -------------------------------------------------------
// FASE 5.8 — SELECCIÓN INTELIGENTE A+B+C+D
// A: “esta/esa” → última propiedad mostrada
// B: Coincidencia por zona o parte del título
// C: Coincidencia por precio
// D: Coincidencia ordinal (la 1, la 2...)
// -------------------------------------------------------

import { FRONTEND_BASE_URL } from "../config/env.js";
import { updateSession } from "../interpretar/contextManager.js";
import { sendTextPremium, sendImagePremium } from "../services/sendMessageManager.js";

// -------------------------------------------------------
// 🧠 MATCH INTELIGENTE (A + C + B + D)
// -------------------------------------------------------
function seleccionarPropiedad(msg, lista, session) {
  const lower = msg.toLowerCase().trim();

  // -------------------------------------------
  // 🅰 Si dice “esta/esa” → última mostrada
  // -------------------------------------------
  if (lower.includes("esta") || lower.includes("esa")) {
    return session.lastProperties?.[0] || lista[0];
  }

  // -------------------------------------------
  // 🅲 Coincidencia por zona o fragmentos de título
  // -------------------------------------------
  for (const p of lista) {
    const zona = (p.location || "").toLowerCase();
    const titulo = (p.title || "").toLowerCase();

    if (zona && lower.includes(zona)) return p;
    if (titulo && lower.includes(titulo)) return p;
  }

  // -------------------------------------------
  // 🅱 Coincidencia por precio cercano
  // -------------------------------------------
  const precio = lower.match(/(\d{2,7})/);
  if (precio) {
    const valor = Number(precio[1]);
    const match = lista.find(p => Math.abs(p.price - valor) < 2000);
    if (match) return match;
  }

  // -------------------------------------------
  // 🅳 Coincidencia ordinal: "la 1", "la 2", etc.
  // -------------------------------------------
  const ordinal = lower.match(/la\s*(\d+)/);
  if (ordinal) {
    const index = Number(ordinal[1]) - 1;
    if (lista[index]) return lista[index];
  }

  // Fallback seguro: primera propiedad mostrada
  return lista[0];
}

// -------------------------------------------------------
// 🧠 CONTROLADOR PRINCIPAL
// -------------------------------------------------------
const detallePropiedadController = {
  async responder(contexto = {}) {
    const { session, rawMessage, userPhone } = contexto;
    const msg = (rawMessage || "").toLowerCase().trim();

    const lista = session?.lastProperties || [];

    // -------------------------------
    // 0️⃣ Sin historial → error guiado
    // -------------------------------
    if (!Array.isArray(lista) || lista.length === 0) {
      await sendTextPremium(
        userPhone,
        "Aún no te he mostrado ninguna propiedad para identificar cuál te refieres 😊.\n" +
        "Dime por ejemplo: *casa en Buenos Aires de 3 dormitorios* y te muestro opciones.",
        session
      );
      return null;
    }

    // -------------------------------
    // 1️⃣ Selección inteligente
    // -------------------------------
    const p = seleccionarPropiedad(msg, lista, session);

    updateSession(userPhone, { lastSelectedProperty: p });

    // -------------------------------
    // 2️⃣ Detectar si pide un atributo específico
    // -------------------------------
    const ask = {
      cocheras: /(coch|parking|estacionamiento)/.test(msg),
      banios: /(baño|baños|bano|banos)/.test(msg),
      area: /(m2|metro|area|área)/.test(msg),
      precio: /(precio|cuanto cuesta|cuánto cuesta|usd|dolares|dólares)/.test(msg),
      papeles: /(papeles|documentos|sunarp|partida)/.test(msg),
      dormitorios: /(dorm|hab|cuarto|habitacion)/.test(msg),
      ubicacion: /(donde queda|zona|ubicación|ubicacion|direccion)/.test(msg),
      detalles: /(detalles|mas info|más info|informacion|información)/.test(msg)
    };

    const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;
    let respuesta = `📌 *Detalles de la propiedad que mencionas*\n\n`;
    let esPreguntaEspecifica = false;

    // -------------------------------
    // 3️⃣ Atributos individuales
    // -------------------------------
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
      respuesta += `📑 Documentación preparada para revisión. ¿Deseas que un asesor la valide?\n`;
    }

    // -------------------------------
    // 4️⃣ Más detalles (description + distribution)
    // -------------------------------
    if (ask.detalles) {
      esPreguntaEspecifica = true;

      respuesta += `\n📝 *Descripción:*  
${p.description || "Sin descripción disponible."}\n\n`;

      respuesta += `📦 *Distribución:*  
${p.distribution || "Sin detalles de distribución registrados."}\n`;
    }

    // -------------------------------
    // 5️⃣ Resumen general si NO pidió nada específico
    // -------------------------------
    if (!esPreguntaEspecifica) {
      respuesta += `
🏡 *${p.title}*
📍 ${p.location}
💵 US$ ${p.price}

🛏 ${p.bedrooms} dorm – 🚿 ${p.bathrooms} baños – 🚗 ${p.cocheras} coch
📐 ${p.area} m²\n`;

      if (p.description) {
        respuesta += `\n📝 ${p.description}\n`;
      }
    }

    respuesta += `\n🔗 Ver ficha completa: ${url}`;

    // -------------------------------
    // 6️⃣ Enviar respuesta
    // -------------------------------
    await sendTextPremium(userPhone, respuesta.trim(), session);

    if (!esPreguntaEspecifica && p.image) {
      await sendImagePremium(
        userPhone,
        p.image,
        `🏡 *${p.title}*\n💵 US$ ${p.price}\n📍 ${p.location}\n\n🔗 ${url}`,
        session
      );
    }

    return null;
  }
};

export default detallePropiedadController;