// /bot/interpretar/router.js
// -------------------------------------------------------
// Router oficial FASE 5.7
// -------------------------------------------------------

import propiedadesController from "../controllers/propiedadesController.js";
import saludoController from "../controllers/saludoController.js";
import ayudaController from "../controllers/ayudaController.js";
import detallePropiedadController from "../controllers/detallePropiedadController.js";
import inversionController from "../controllers/inversionController.js";
import { MENSAJES } from "../utils/messages.js";

function handled(reason = "handled") {
  return { handled: true, reason };
}

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
      case "buscar_propiedades": {
        const out = await propiedadesController.buscar(filtros, {
          ...contexto,
          esFollowUp: true
        });
        return out ?? handled("followup_buscar_propiedades");
      }

      case "pregunta_propiedad":
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
    case "buscar_propiedades": {
      const out = await propiedadesController.buscar(filtros, contexto);
      return out ?? handled("buscar_propiedades_handled");
    }

    case "saludo":
    case "saludo_simple":
      // ⚠️ antes retornabas null, eso puede gatillar fallback arriba
      if (session.hasGreeted) return handled("already_greeted");
      return saludoController.saludar();

    case "pregunta_propiedad":
      return detallePropiedadController.responder(contexto);

    case "inversion":
      return inversionController.recomendar(filtros, contexto);

    case "despedida":
      return MENSAJES.despedida;

    default:
      return ayudaController.generica(contexto);
  }
}
