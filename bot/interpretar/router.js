// /bot/interpretar/router.js
// -------------------------------------------------------
// Router oficial FASE 5.7
// • Corrección de loops y mensajes duplicados
// • Manejo refinado de pregunta_propiedad
// • Follow-up inteligente alineado a IntentClassifier 5.7
// • Secuencia limpia y profesional
// -------------------------------------------------------

import propiedadesController from "../controllers/propiedadesController.js";
import saludoController from "../controllers/saludoController.js";
import ayudaController from "../controllers/ayudaController.js";
import detallePropiedadController from "../controllers/detallePropiedadController.js";
import inversionController from "../controllers/inversionController.js";
import { MENSAJES } from "../utils/messages.js";

export async function routeIntent(intencion, filtros, contexto = {}) {
  const { esFollowUp, session = {}, userPhone } = contexto;

  // ==============================================
  // 0️⃣ LEAD DE FACEBOOK (alta prioridad)
  // ==============================================
  if (intencion === "lead_meta" || session.isLead) {
    return `
Gracias por tu interés 👍  
Voy a analizar tus datos y prepararte opciones ideales según tu presupuesto.

¿Tienes alguna zona de preferencia?
    `;
  }

  // ==============================================
  // 1️⃣ FOLLOW-UP INTELIGENTE (Fase 5.7)
  // ==============================================
  if (esFollowUp) {
    const prev = session.lastIntent || "buscar_propiedades";

    switch (prev) {
      case "buscar_propiedades":
        return propiedadesController.buscar(filtros, {
          ...contexto,
          esFollowUp: true
        });

      case "pregunta_propiedad":
        // Follow-up sobre una propiedad → más detalles
        return detallePropiedadController.responder(contexto);

      case "inversion":
        return inversionController.recomendar(filtros, {
          ...contexto,
          esFollowUp: true
        });

      default:
        return ayudaController.generica(contexto);
    }
  }

  // ==============================================
  // 2️⃣ INTENCIONES PRINCIPALES
  // ==============================================
  switch (intencion) {
    // 🔍 BÚSQUEDA
    case "buscar_propiedades":
      return propiedadesController.buscar(filtros, contexto);

    // 👋 SALUDO
    case "saludo":
    case "saludo_simple":
      if (session.hasGreeted) return null;
      return saludoController.saludar();

    // 🏡 DETALLE DE PROPIEDAD
    case "pregunta_propiedad":
      return detallePropiedadController.responder(contexto);

    // 📈 INVERSIÓN
    case "inversion":
      return inversionController.recomendar(filtros, contexto);

    // 👋 DESPEDIDA
    case "despedida":
      return MENSAJES.despedida;

    // ❓ FALLBACK CORPORATIVO
    default:
      return ayudaController.generica(contexto);
  }
}