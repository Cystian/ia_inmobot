// /bot/interpretar/router.js
// -------------------------------------------------------
// Router oficial FASE 5.7
// -------------------------------------------------------
// ✔ Manejo fino de intención + contexto
// ✔ Follow-up real (sin loops ni repeticiones)
// ✔ Integración total con IntentClassifier 5.7
// ✔ Manejo elegante de lead_meta
// ✔ Respuestas sin cortes, sin spam, sin confusión
// -------------------------------------------------------

import propiedadesController from "../controllers/propiedadesController.js";
import saludoController from "../controllers/saludoController.js";
import ayudaController from "../controllers/ayudaController.js";
import detallePropiedadController from "../controllers/detallePropiedadController.js";
import inversionController from "../controllers/inversionController.js";
import { MENSAJES } from "../utils/messages.js";

export async function routeIntent(intencion, filtros, contexto = {}) {
  const { esFollowUp, session = {}, userPhone } = contexto;

  // ==========================================================
  // 0️⃣ LEAD META — prioridad máxima
  // ==========================================================
  if (intencion === "lead_meta" || session.isLead) {
    return `
Gracias por comunicarte 👍  
Voy a preparar opciones basadas en tu presupuesto.  

¿Tienes alguna *zona de preferencia* para afinar la búsqueda?
    `;
  }

  // ==========================================================
  // 1️⃣ FOLLOW-UP INTELIGENTE
  // ==========================================================
  if (esFollowUp) {
    const prev = session.lastIntent || "buscar_propiedades";

    switch (prev) {
      case "buscar_propiedades":
        return propiedadesController.buscar(filtros, {
          ...contexto,
          esFollowUp: true
        });

      case "pregunta_propiedad":
        return detallePropiedadController.responder({
          ...contexto,
          esFollowUp: true
        });

      case "inversion":
        return inversionController.recomendar(filtros, {
          ...contexto,
          esFollowUp: true
        });

      default:
        return ayudaController.generica(contexto);
    }
  }

  // ==========================================================
  // 2️⃣ INTENCIONES PRINCIPALES
  // ==========================================================
  switch (intencion) {

    // 🔍 BÚSQUEDA
    case "buscar_propiedades":
      return propiedadesController.buscar(filtros, contexto);


    // 👋 SALUDO FORMAL
    case "saludo":
    case "saludo_simple":
      if (session.hasGreeted) {
        return null; // No repetimos saludo
      }
      return saludoController.saludar();


    // 🏡 DETALLE DE PROPIEDAD
    case "pregunta_propiedad":
      return detallePropiedadController.responder(contexto);


    // 💰 INTENCIÓN DE INVERSIÓN
    case "inversion":
      return inversionController.recomendar(filtros, contexto);


    // 👋 DESPEDIDA
    case "despedida":
      return MENSAJES.despedida;


    // ❓ INTENCIÓN “OTRO” — fallback corporativo elegante
    default:
      return ayudaController.generica(contexto);
  }
}
