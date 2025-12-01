// /bot/controllers/detallePropiedadController.js
// -------------------------------------------------------
// FASE 5 COMPLETA
// Responde sobre propiedades específicas utilizando:
// - Property Memory
// - Análisis contextual del mensaje
// - Envío Premium (texto + imagen)
// - Follow-Up inteligente dentro del detalle
// -------------------------------------------------------

import { FRONTEND_BASE_URL } from "../config/env.js";
import { updateSession } from "../interpretar/contextManager.js";
import { sendTextPremium, sendImagePremium } from "../services/sendMessageManager.js";

const detallePropiedadController = {
  async responder(contexto = {}) {
    const { session, rawMessage, userPhone } = contexto;
    const lower = (rawMessage || "").toLowerCase();

    const lista = session?.lastProperties || [];

    // =====================================================
    // 0️⃣ Si NO existe contexto previo → no puedo saber "esa"
    // =====================================================
    if (!Array.isArray(lista) || lista.length === 0) {
      const msg =
        "Todavía no te mostré propiedades como para identificar cuál quieres. 😊\n" +
        "Dime por ejemplo: *casa en Nuevo Chimbote de 3 cuartos* y empiezo a mostrarte opciones.";
      await sendTextPremium(userPhone, msg, session);
      return null;
    }

    // =====================================================
    // 1️⃣ Determinar a qué propiedad se refiere
    // =====================================================
    let index = 0;
    if (lower.includes("segunda") || lower.includes("la 2")) index = 1;
    if (lower.includes("tercera") || lower.includes("la 3")) index = 2;
    if (index >= lista.length) index = 0;

    const p = lista[index];

    // Guardamos como propiedad seleccionada
    updateSession(userPhone, { lastSelectedProperty: p });

    // =====================================================
    // 2️⃣ Detectar qué DETALLE está preguntando
    // =====================================================
    const ask = {
      cocheras:
        lower.includes("cochera") ||
        lower.includes("cocheras") ||
        lower.includes("parking"),
      banios:
        lower.includes("baño") ||
        lower.includes("baños") ||
        lower.includes("bano"),
      area:
        lower.includes("m2") ||
        lower.includes("metros cuadr") ||
        lower.includes("area") ||
        lower.includes("área"),
      precio:
        lower.includes("precio") ||
        lower.includes("cuanto cuesta") ||
        lower.includes("cuánto cuesta") ||
        lower.includes("usd") ||
        lower.includes("dolares"),
      papeles:
        lower.includes("papeles") ||
        lower.includes("documentos") ||
        lower.includes("sunarp") ||
        lower.includes("partida"),
      dormitorios:
        lower.includes("dorm") ||
        lower.includes("habitacion") ||
        lower.includes("cuarto"),
    };

    const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;

    let respuesta = `📌 *Detalles sobre la propiedad que mencionas*\n\n`;

    // =====================================================
    // 3️⃣ Responder según el atributo solicitado
    // =====================================================

    if (ask.cocheras) {
      respuesta += p.cocheras
        ? `🚗 Tiene *${p.cocheras}* cochera(s).\n`
        : `🚗 Esta propiedad no tiene cochera registrada.\n`;
    }

    if (ask.banios) {
      respuesta += p.bathrooms
        ? `🚿 Cuenta con *${p.bathrooms}* baño(s).\n`
        : `🚿 No aparece cantidad de baños en la ficha.\n`;
    }

    if (ask.area) {
      respuesta += p.area
        ? `📐 Área aproximada: *${p.area} m²*.\n`
        : `📐 No tengo área registrada, pero puedo consultarla con el asesor.\n`;
    }

    if (ask.precio) {
      respuesta += p.price
        ? `💵 Precio actual: *US$ ${p.price}*.\n`
        : `💵 No tengo precio fijo registrado, puedo validarlo contigo.\n`;
    }

    if (ask.papeles) {
      respuesta +=
        "📑 Sobre documentos (partida, cargas, etc.), el asesor puede confirmarlo. ¿Deseas que te conecte ahora?\n";
    }

    if (ask.dormitorios) {
      respuesta += p.bedrooms
        ? `🛏 Tiene *${p.bedrooms}* dormitorio(s).\n`
        : `🛏 No aparece cantidad de dormitorios registrada.\n`;
    }

    // =====================================================
    // 4️⃣ Si la pregunta fue general → enviar mini resumen
    // =====================================================
    const noSpecific = Object.values(ask).every((v) => v === false);
    if (noSpecific) {
      respuesta += `🏡 *${p.title}*\n`;
      respuesta += `📍 ${p.location || "Zona por confirmar"}\n`;
      if (p.price) respuesta += `💵 US$ ${p.price}\n`;
      if (p.bedrooms != null) respuesta += `🛏 ${p.bedrooms} dorm\n`;
      if (p.bathrooms != null) respuesta += `🚿 ${p.bathrooms} baños\n`;
      if (p.cocheras != null) respuesta += `🚗 ${p.cocheras} coch\n`;
      if (p.area != null) respuesta += `📐 ${p.area} m²\n`;
    }

    respuesta += `\n🔗 Más detalles: ${url}\n`;

    // =====================================================
    // 5️⃣ Enviar respuesta PREMIUM (texto + imagen)
    // =====================================================
    await sendTextPremium(userPhone, respuesta.trim(), session);

    if (p.image) {
      const caption = `🏡 *${p.title}*\n💵 US$ ${p.price}\n📍 ${p.location}\n\n🔗 ${url}`;
      await sendImagePremium(userPhone, p.image, caption, session);
    }

    return null;
  },
};

export default detallePropiedadController;
