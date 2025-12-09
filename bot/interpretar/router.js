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

export async function routeIntent(intencion, filtros, contexto = {}) {
  const { esFollowUp, session = {}, userPhone } = contexto;

  // 0️⃣ LEAD META
  if (intencion === "lead_meta" || session.isLead) {
    return MENSAJES.lead_detectado;
  }

  // 1️⃣ FOLLOW UP
  if (esFollowUp) {
    const prev = session.lastIntent || "buscar_propiedades";

    switch (prev) {
      case "buscar_propiedades":
        return propiedadesController.buscar(filtros, { ...contexto, esFollowUp: true });

      case "pregunta_propiedad":
        return detallePropiedadController.responder(contexto);

      case "inversion":
        return inversionController.recomendar(filtros, { ...contexto, esFollowUp: true });

      default:
        return ayudaController.generica(contexto);
    }
  }

  // 2️⃣ INTENCIONES PRINCIPALES
  switch (intencion) {
    case "buscar_propiedades":
      return propiedadesController.buscar(filtros, contexto);

    case "saludo":
    case "saludo_simple":
      if (session.hasGreeted) return null;
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