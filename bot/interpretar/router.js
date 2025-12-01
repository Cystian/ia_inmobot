// /bot/interpretar/router.js
// -------------------------------------------------------
// Router oficial fase 5. Sin loops, sin repeticiones,
// follow-up inteligente, y compatibilidad total con v5.
// -------------------------------------------------------

import propiedadesController from "../controllers/propiedadesController.js";
import saludoController from "../controllers/saludoController.js";
import ayudaController from "../controllers/ayudaController.js";
import detallePropiedadController from "../controllers/detallePropiedadController.js";
import { MENSAJES } from "../utils/messages.js";

export async function routeIntent(intencion, filtros, contexto = {}) {
  const { esFollowUp, session = {} } = contexto;

  // ==============================================
  // 1️⃣ FOLLOW-UP → Ajusta, NO reemplaza intención
  // ==============================================
  if (esFollowUp) {
    // Mantener intención previa SOLO si tiene sentido
    const intentPrevio = session.lastIntent || "buscar_propiedades";

    // FOLLOW-UP SOBRE LISTA DE PROPIEDADES
    if (intentPrevio === "buscar_propiedades") {
      return propiedadesController.buscar(filtros, {
        ...contexto,
        esFollowUp: true
      });
    }

    // FOLLOW-UP SOBRE DETALLE DE PROPIEDAD
    if (intentPrevio === "pregunta_propiedad") {
      return detallePropiedadController.responder(contexto);
    }

    // Si no se reconoce → manejar como intención nueva
  }

  // ==============================================
  // 2️⃣ Intenciones principales
  // ==============================================
  switch (intencion) {
    case "buscar_propiedades":
      return propiedadesController.buscar(filtros, contexto);

    case "saludo":
    case "saludo_simple":
      return saludoController.saludar();

    case "despedida":
      return MENSAJES.despedida;

    case "pregunta_propiedad":
      return detallePropiedadController.responder(contexto);

    default:
      // ==============================================
      // 3️⃣ Manejo universal de intenciones ambiguas
      // ==============================================
      return ayudaController.generica(contexto);
  }
}
