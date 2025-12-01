// /bot/interpretar/router.js
// -------------------------------------------------------
// Direcciona la intención hacia el controlador correspondiente.
// Incluye soporte para Follow-Up avanzado (fase 5).
// -------------------------------------------------------

import propiedadesController from "../controllers/propiedadesController.js";
import saludoController from "../controllers/saludoController.js";
import ayudaController from "../controllers/ayudaController.js";
import detallePropiedadController from "../controllers/detallePropiedadController.js";
import { MENSAJES } from "../utils/messages.js";

export async function routeIntent(intencion, filtros, contexto = {}) {
  const { esFollowUp, session } = contexto;

  // ==============================================
  // 1️⃣ FOLLOW-UP detectado → forzar intención previa
  // ==============================================
  if (esFollowUp) {
    const intentPrevio = session?.lastIntent || "buscar_propiedades";

    if (intentPrevio === "buscar_propiedades") {
      return await propiedadesController.buscar(filtros, {
        ...contexto,
        esFollowUp: true
      });
    }

    if (intentPrevio === "pregunta_propiedad") {
      return await detallePropiedadController.responder(contexto);
    }
  }

  // ==============================================
  // 2️⃣ Intenciones principales
  // ==============================================
  switch (intencion) {
    case "buscar_propiedades":
      return await propiedadesController.buscar(filtros, contexto);

    case "saludo":
    case "saludo_simple":
      return saludoController.saludar();

    case "despedida":
      return MENSAJES.despedida;

    case "pregunta_propiedad":
      return await detallePropiedadController.responder(contexto);

    default:
      // ==============================================
      // 3️⃣ Fallback seguro (no romper flujo)
      // ==============================================
      return ayudaController.generica(contexto);
  }
}
