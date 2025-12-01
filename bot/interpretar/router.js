// /bot/interpretar/router.js
// -------------------------------------------------------
// Router oficial fase 5–6. Sin loops, sin repeticiones,
// follow-up inteligente y compatibilidad completa.
// -------------------------------------------------------

import propiedadesController from "../controllers/propiedadesController.js";
import saludoController from "../controllers/saludoController.js";
import ayudaController from "../controllers/ayudaController.js";
import detallePropiedadController from "../controllers/detallePropiedadController.js";
import inversionController from "../controllers/inversionController.js"; // ✅ IMPORT NECESARIO
import { MENSAJES } from "../utils/messages.js";

export async function routeIntent(intencion, filtros, contexto = {}) {
  const { esFollowUp, session = {} } = contexto;

  // ==============================================
  // 1️⃣ FOLLOW-UP → Mantiene intención coherente
  // ==============================================
  if (esFollowUp) {
    const intentPrevio = session.lastIntent || "buscar_propiedades";

    // Follow-up sobre lista de propiedades
    if (intentPrevio === "buscar_propiedades") {
      return propiedadesController.buscar(filtros, {
        ...contexto,
        esFollowUp: true
      });
    }

    // Follow-up sobre detalle de propiedad
    if (intentPrevio === "pregunta_propiedad") {
      return detallePropiedadController.responder(contexto);
    }

    // Follow-up sobre inversión
    if (intentPrevio === "inversion") {
      return inversionController.recomendar(filtros, {
        ...contexto,
        esFollowUp: true
      });
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
      return saludoController.saludar();

    case "despedida":
      return MENSAJES.despedida;

    case "pregunta_propiedad":
      return detallePropiedadController.responder(contexto);

    case "inversion":
      return inversionController.recomendar(filtros, contexto); // ✔ AHORA FUNCIONA

    default:
      // ==============================================
      // 3️⃣ INTENCIÓN AMBIGUA → Ayuda genérica
      // ==============================================
      return ayudaController.generica(contexto);
  }
}