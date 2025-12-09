// /bot/controllers/detallePropiedadController.js
// -------------------------------------------------------
// FASE 5.6 — DETALLE DE PROPIEDAD
// - Property Memory sólido
// - Atributo detectado con precisión
// - Respuesta Premium sin spam
// - Preparado para Fase 6 (Q&A contextual)
// -------------------------------------------------------

import { FRONTEND_BASE_URL } from "../config/env.js";
import { updateSession } from "../interpretar/contextManager.js";
import {
  sendTextPremium,
  sendImagePremium
} from "../services/sendMessageManager.js";

const detallePropiedadController = {
  async responder(contexto = {}) {
    const { session, rawMessage, userPhone } = contexto;
    const msg = (rawMessage || "").toLowerCase().trim();

    const lista = session?.lastProperties || [];

    // =====================================================
    // 0️⃣ Si no hay historial → no sé qué propiedad es “esa”
    // =====================================================
    if (!Array.isArray(lista) || lista.length === 0) {
      await sendTextPremium(
        userPhone,
        "Aún no te he mostrado propiedades como para identificar cuál quieres 😊.\n" +
        "Dime por ejemplo: *casa en Nuevo Chimbote de 3 cuartos* y empiezo a mostrarte opciones.",
        session
      );
      return null;
    }

    // =====================================================
    // 1️⃣ Determinar QUÉ propiedad menciona
    // =====================================================
    let index = 0; // default: primera

    if (msg.includes("segunda") || msg.includes("la 2")) index = 1;
    if (msg.includes("tercera") || msg.includes("la 3")) index = 2;

    // Límites defensivos
    if (index >= lista.length) index = 0;

    const p = lista[index];

    // Guardamos la propiedad activa
    updateSession(userPhone, { lastSelectedProperty: p });

    // =====================================================
    // 2️⃣ Detectar qué atributo pregunta el usuario
    // =====================================================

    const ask = {
      cocheras: /(coch|parking|estacionamiento)/.test(msg),
      banios: /(baño|baños|bano|banos)/.test(msg),
      area: /(m2|metro|area|área)/.test(msg),
      precio: /(precio|cuanto cuesta|cuánto cuesta|usd|dolares)/.test(msg),
      papeles: /(papeles|documentos|sunarp|partida)/.test(msg),
      dormitorios: /(dorm|hab|cuarto|habitacion)/.test(msg),
      ubicacion: /(donde queda|zona exacta|ubicación exacta|direccion)/.test(msg)
    };

    const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;
    let respuesta = `📌 *Detalles de la propiedad que mencionas*\n\n`;

    let esPreguntaEspecifica = false;

    // =====================================================
    // 3️⃣ Responder atributos individuales
    // =====================================================

    if (ask.cocheras) {
      esPreguntaEspecifica = true;
      respuesta += p.cocheras
        ? `🚗 Tiene *${p.cocheras}* cochera(s).\n`
        : `🚗 No tiene cochera registrada.\n`;
    }

    if (ask.banios) {
      esPreguntaEspecifica = true;
      respuesta += p.bathrooms
        ? `🚿 Cuenta con *${p.bathrooms}* baño(s).\n`
        : `🚿 No tengo la cantidad exacta de baños registrada.\n`;
    }

    if (ask.dormitorios) {
      esPreguntaEspecifica = true;
      respuesta += p.bedrooms
        ? `🛏 Tiene *${p.bedrooms}* dormitorio(s).\n`
        : `🛏 No aparece cantidad de dormitorios registrada.\n`;
    }

    if (ask.area) {
      esPreguntaEspecifica = true;
      respuesta += p.area
        ? `📐 Área aproximada: *${p.area} m²*.\n`
        : `📐 No tengo área registrada, puedo consultarla con el asesor.\n`;
    }

    if (ask.precio) {
      esPreguntaEspecifica = true;
      respuesta += p.price
        ? `💵 Precio actual: *US$ ${p.price}*.\n`
        : `💵 No tengo precio fijo registrado, puedo validarlo con el asesor.\n`;
    }

    if (ask.papeles) {
      esPreguntaEspecifica = true;
      respuesta += `📑 Sobre documentos (partida, cargas, etc.), puedo pedir confirmación al asesor. ¿Deseas que lo consulte?\n`;
    }

    if (ask.ubicacion) {
      esPreguntaEspecifica = true;
      respuesta += p.location
        ? `📍 Está ubicada en: *${p.location}*.\n`
        : `📍 No tengo la ubicación exacta registrada, pero puedo confirmarla.\n`;
    }

    // =====================================================
    // 4️⃣ Si no pidió algo específico → enviar resumen elegante
    // =====================================================
    if (!esPreguntaEspecifica) {
      respuesta += `🏡 *${p.title}*\n`;
      respuesta += `📍 ${p.location || "Zona por confirmar"}\n`;
      if (p.price) respuesta += `💵 US$ ${p.price}\n`;
      if (p.bedrooms != null) respuesta += `🛏 ${p.bedrooms} dorm\n`;
      if (p.bathrooms != null) respuesta += `🚿 ${p.bathrooms} baños\n`;
      if (p.cocheras != null) respuesta += `🚗 ${p.cocheras} coch\n`;
      if (p.area != null) respuesta += `📐 ${p.area} m²\n`;
    }

    respuesta += `\n🔗 Ver más detalles: ${url}`;

    // =====================================================
    // 5️⃣ Enviar respuesta — sin spam
    // =====================================================
    await sendTextPremium(userPhone, respuesta.trim(), session);

    // Solo enviar imagen SI la pregunta NO era un simple atributo
    if (!esPreguntaEspecifica && p.image) {
      const caption = `🏡 *${p.title}*\n💵 US$ ${p.price}\n📍 ${p.location}\n\n🔗 ${url}`;
      await sendImagePremium(userPhone, p.image, caption, session);
    }

    return null;
  }
};

export default detallePropiedadController;