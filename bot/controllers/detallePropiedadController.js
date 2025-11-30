// /bot/controllers/detallePropiedadController.js
// -------------------------------------------------------
// Responde preguntas sobre una propiedad previamente mostrada,
// usando la sesión (lastProperties) y el mensaje del usuario.
// -------------------------------------------------------

import { FRONTEND_BASE_URL } from "../config/env.js";

const detallePropiedadController = {
  async responder(contexto = {}) {
    const { session, rawMessage, userPhone } = contexto || {};
    const lower = (rawMessage || "").toLowerCase();

    const lista = session?.lastProperties || [];

    // Si no hay contexto de propiedades previas
    if (!Array.isArray(lista) || lista.length === 0) {
      return (
        "Aún no te he mostrado propiedades como para saber a cuál te refieres. 😊\n" +
        "Primero puedo ayudarte a buscar opciones, dime por ejemplo: *casa en Nuevo Chimbote con 3 habitaciones*."
      );
    }

    // ======================================
    // 1️⃣ Determinar A QUÉ propiedad se refiere
    // ======================================
    let index = 0; // por defecto, la primera del último listado

    if (lower.includes("segunda") || lower.includes("la 2")) index = 1;
    if (lower.includes("tercera") || lower.includes("la 3")) index = 2;
    if (index >= lista.length) index = 0; // fallback

    const p = lista[index];

    // ======================================
    // 2️⃣ Detectar QUÉ atributo está preguntando
    // ======================================
    const preguntaCocheras =
      lower.includes("cochera") ||
      lower.includes("cocheras") ||
      lower.includes("parking") ||
      lower.includes("estacionamiento");

    const preguntaBanios =
      lower.includes("baño") ||
      lower.includes("baños") ||
      lower.includes("bano") ||
      lower.includes("banos");

    const preguntaArea =
      lower.includes("m2") ||
      lower.includes("metros") ||
      lower.includes("metros cuadrados") ||
      lower.includes("area") ||
      lower.includes("área");

    const preguntaPrecio =
      lower.includes("precio") ||
      lower.includes("cuanto cuesta") ||
      lower.includes("cuánto cuesta") ||
      lower.includes("cuanto vale") ||
      lower.includes("cuánto vale") ||
      lower.includes("vale") ||
      lower.includes("usd") ||
      lower.includes("dolares") ||
      lower.includes("dólares");

    const preguntaPapeles =
      lower.includes("papeles") ||
      lower.includes("documentos") ||
      lower.includes("partida") ||
      lower.includes("sunarp");

    const preguntaDorms =
      lower.includes("dorm") ||
      lower.includes("habitacion") ||
      lower.includes("habitaciones") ||
      lower.includes("cuartos");

    const preguntaResumen =
      !preguntaCocheras &&
      !preguntaBanios &&
      !preguntaArea &&
      !preguntaPrecio &&
      !preguntaPapeles &&
      !preguntaDorms;

    const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;

    let respuesta = `Sobre la propiedad *${p.title}* que te mostré:\n\n`;

    // Cocheras
    if (preguntaCocheras) {
      if (p.cocheras && p.cocheras > 0) {
        respuesta += `🚗 Tiene *${p.cocheras}* cochera(s) registradas.\n`;
      } else {
        respuesta += `🚗 En el sistema no figura cochera registrada para esta propiedad.\n`;
      }
    }

    // Baños
    if (preguntaBanios) {
      if (p.bathrooms && p.bathrooms > 0) {
        respuesta += `🚿 Cuenta con *${p.bathrooms}* baño(s).\n`;
      } else {
        respuesta += `🚿 No tengo baños registrados en ficha para esta propiedad.\n`;
      }
    }

    // Área
    if (preguntaArea) {
      if (p.area && Number(p.area) > 0) {
        respuesta += `📐 El área registrada es de *${p.area} m²* aproximadamente.\n`;
      } else {
        respuesta += `📐 No tengo registrada el área exacta en el sistema, pero un asesor puede confirmártela.\n`;
      }
    }

    // Precio
    if (preguntaPrecio) {
      if (p.price && Number(p.price) > 0) {
        respuesta += `💵 El precio actual publicado es de *US$ ${p.price}*.\n`;
      } else {
        respuesta += `💵 No tengo un precio fijo registrado, pero un asesor puede darte el detalle actualizado.\n`;
      }
    }

    // Papeles
    if (preguntaPapeles) {
      respuesta +=
        "📑 Sobre papeles (partida, cargas, etc.), esa información la gestiona directamente el asesor. Te puedo conectar para que te confirme el estado legal de la propiedad.\n";
    }

    // Dormitorios
    if (preguntaDorms) {
      if (p.bedrooms && p.bedrooms > 0) {
        respuesta += `🛏 Tiene *${p.bedrooms}* dormitorio(s).\n`;
      } else {
        respuesta += `🛏 No tengo la cantidad de dormitorios registrada en ficha para esta propiedad.\n`;
      }
    }

    // Si no se detectó un atributo específico → mini resumen general
    if (preguntaResumen) {
      respuesta += `Te resumo los datos principales:\n\n`;
      respuesta += `📍 Ubicación: ${p.location || "Zona por confirmar"}\n`;
      if (p.price) respuesta += `💵 Precio: US$ ${p.price}\n`;
      if (p.bedrooms != null)
        respuesta += `🛏 Dormitorios: ${p.bedrooms}\n`;
      if (p.bathrooms != null)
        respuesta += `🚿 Baños: ${p.bathrooms}\n`;
      if (p.cocheras != null)
        respuesta += `🚗 Cocheras: ${p.cocheras}\n`;
      if (p.area != null)
        respuesta += `📐 Área aprox.: ${p.area} m²\n`;
    }

    respuesta += `\n🔗 Aquí tienes el enlace con más detalle: ${url}\n`;
    respuesta +=
      "\nSi quieres, puedo seguir afinando la búsqueda o mostrarte más opciones similares. 😊";

    return respuesta;
  }
};

export default detallePropiedadController;
