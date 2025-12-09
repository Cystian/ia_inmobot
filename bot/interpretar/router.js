// /bot/interpretar/router.js
// -------------------------------------------------------
// Router oficial FASE 5.7 (Estable)
// -------------------------------------------------------
// – Evita respuestas duplicadas
// – Respeta prioridad: detalle > búsqueda > inversión > ayuda
// – Follow-up limpio (sin loops)
// – No responde “¿En qué puedo ayudarte?” fuera de contexto
// -------------------------------------------------------

import propiedadesController from "../controllers/propiedadesController.js";
import saludoController from "../controllers/saludoController.js";
import ayudaController from "../controllers/ayudaController.js";
import detallePropiedadController from "../controllers/detallePropiedadController.js";
import inversionController from "../controllers/inversionController.js";
import { MENSAJES } from "../utils/messages.js";

export async function routeIntent(intencion, filtros, contexto = {}) {
  const { esFollowUp, session = {} } = contexto;

  // ======================================================
  // 0️⃣ LEAD DE META (máxima prioridad)
  // ======================================================
  if (intencion === "lead_meta" || session.isLead) {
    return MENSAJES.lead_detectado;
  }

  // ======================================================
  // 1️⃣ FOLLOW-UP REAL
  // ======================================================
  if (esFollowUp) {
    const prev = session.lastIntent;

    // — FOLLOW-UP DE RESULTADOS
    if (prev === "buscar_propiedades") {
      return propiedadesController.buscar(filtros, {
        ...contexto,
        esFollowUp: true
      });
    }

    // — FOLLOW-UP DE DETALLE
    if (prev === "pregunta_propiedad") {
      return detallePropiedadController.responder(contexto);
    }

    // — FOLLOW-UP DE INVERSIÓN
    if (prev === "inversion") {
      return inversionController.recomendar(filtros, {
        ...contexto,
        esFollowUp: true
      });
    }

    // Caso residual: ayuda
    return ayudaController.generica(contexto);
  }

  // ======================================================
  // 2️⃣ INTENCIONES PRINCIPALES
  // ======================================================
  switch (intencion) {
    case "saludo":
    case "saludo_simple":
      if (session.hasGreeted) return null;
      return saludoController.saludar();

    case "buscar_propiedades":
      return propiedadesController.buscar(filtros, contexto);

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