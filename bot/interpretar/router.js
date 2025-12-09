// /bot/interpretar/router.js
// -------------------------------------------------------
// Router oficial FASE 5.6
// ● Maneja leads de Facebook
// ● Saludo único por sesión
// ● Follow-up inteligente
// ● Inversión integrada
// ● Zero loops
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
  // 1️⃣ FOLLOW-UP INTELIGENTE
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
    case "buscar_propiedades":
      return propiedadesController.buscar(filtros, contexto);

    case "saludo":
    case "saludo_simple":
      // Saludo único por sesión
      if (session.hasGreeted) {
        return null; // no volvemos a saludar
      }
      return saludoController.saludar();

    case "pregunta_propiedad":
      return detallePropiedadController.responder(contexto);

    case "inversion":
      return inversionController.recomendar(filtros, contexto);

    case "despedida":
      return MENSAJES.despedida;

    default:
      // ==============================================
      // 3️⃣ Fallback corporativo reforzado (intención “otro”)
      // ==============================================
      return ayudaController.generica(contexto);
  }
}