// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador principal para búsquedas inmobiliarias.
// IA Premium v3: Follow-up avanzado, refinamiento dinámico,
// paginación profesional y experiencia de asesor humano.
// -------------------------------------------------------

import {
  buscarPropiedades,
  buscarSugeridas
} from "../services/propiedadesService.js";

import enviarMensaje, { enviarImagen } from "../services/sendMessage.js";
import { MENSAJES } from "../utils/messages.js";
import { FRONTEND_BASE_URL } from "../config/env.js";
import { logInfo } from "../utils/log.js";

import { updateSession } from "../interpretar/contextManager.js";

const ITEMS_PER_PAGE = 6;

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const { iaRespuesta, userPhone, session, rawMessage, esFollowUp } = contexto;

    logInfo("BUSCAR PROPIEDADES v3", {
      filtros,
      rawMessage,
      esFollowUp
    });

    // ==============================================================  
    // 1️⃣ Si es búsqueda nueva → reiniciar paginación  
    // ==============================================================  
    let page = esFollowUp ? session.lastPage || 1 : 1;

    // ==============================================================  
    // 2️⃣ Ejecutar búsqueda  
    // ==============================================================  
    let propiedades = await buscarPropiedades(filtros);

    // No hay resultados → sugerencias
    if (propiedades.length === 0) {
      await enviarMensaje(userPhone, MENSAJES.intro_propiedades_sugeridas);
      propiedades = await buscarSugeridas();
      updateSession(userPhone, {
        lastIntent: "buscar_propiedades",
        lastFilters: filtros,
        lastProperties: propiedades,
        lastPage: 1
      });
    }

    // ==============================================================  
    // 3️⃣ FOLLOW-UP "más opciones"  
    // ==============================================================  
    const msgLower = rawMessage.toLowerCase();

    if (
      msgLower.includes("más opciones") ||
      msgLower.includes("mas opciones") ||
      msgLower.includes("muestrame mas") ||
      msgLower.includes("muéstrame más") ||
      msgLower.includes("otra opcion") ||
      msgLower.includes("otra opción")
    ) {
      page = (session.lastPage || 1) + 1;
    }

    // ==============================================================  
    // 4️⃣ Paginación: calcular subset actual  
    // ==============================================================  
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const propiedadesPagina = propiedades.slice(start, end);

    if (propiedadesPagina.length === 0) {
      await enviarMensaje(
        userPhone,
        "Ya no tengo más opciones dentro de este conjunto 😊. " +
          "Puedo buscar alternativas en zonas cercanas o ajustar el presupuesto si deseas."
      );
      updateSession(userPhone, { lastPage: page });
      return null;
    }

    // ==============================================================  
    // 5️⃣ INTRODUCCIÓN DE BÚSQUEDA  
    // ==============================================================  
    if (!esFollowUp || msgLower.includes("buscar") || msgLower.includes("quiero")) {
      await enviarMensaje(userPhone, iaRespuesta || MENSAJES.intro_propiedades_default);
    } else if (
      msgLower.includes("más") ||
      msgLower.includes("mas") ||
      msgLower.includes("otra")
    ) {
      await enviarMensaje(
        userPhone,
        "Perfecto, te muestro más opciones alineadas con lo que estás buscando. 👇"
      );
    }

    // ==============================================================  
    // 6️⃣ Enviar imagen + caption por cada propiedad  
    // ==============================================================  
    for (let p of propiedadesPagina) {
      const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;

      const caption = `
🏡 *${p.title}*
💵 *US$ ${p.price}*
📍 ${p.location || "Ubicación por confirmar"}

🛏 ${p.bedrooms || 0} dorm | 🚿 ${p.bathrooms || 0} baños | 🚗 ${p.cocheras || 0} coch

🔗 ${url}
      `.trim();

      try {
        await enviarImagen(userPhone, p.image, caption);
      } catch (err) {
        console.error("⚠ Error enviando imagen/caption:", err);
        await enviarMensaje(
          userPhone,
          `🏡 *${p.title}*\n💵 *US$ ${p.price}*\n📍 ${p.location}\n🔗 ${url}`
        );
      }
    }

    // ==============================================================  
    // 7️⃣ Cierre profesional  
    // ==============================================================  
    if (propiedadesPagina.length < ITEMS_PER_PAGE) {
      await enviarMensaje(
        userPhone,
        "Esas son todas dentro de este segmento 😊. " +
          "Si quieres puedo ampliar zonas, ajustar precio o buscar algo más específico."
      );
    } else {
      await enviarMensaje(
        userPhone,
        "¿Quieres ver *más opciones* o prefieres afinar la búsqueda (zona, precio, cuartos, extras)?"
      );
    }

    // ==============================================================  
    // 8️⃣ Actualizar sesión  
    // ==============================================================  
    updateSession(userPhone, {
      lastIntent: "buscar_propiedades",
      lastFilters: filtros,
      lastProperties: propiedades,
      lastPage: page
    });

    return null;
  }
};

export default propiedadesController;