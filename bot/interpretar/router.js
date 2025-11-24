// /bot/interpretar/router.js
// -------------------------------------------------------
// Direcciona la intención hacia el controlador correspondiente.
// -------------------------------------------------------

import propiedadesController from "../controllers/propiedadesController.js";
import saludoController from "../controllers/saludoController.js";
import ayudaController from "../controllers/ayudaController.js";
import { MENSAJES } from "../utils/messages.js";

export async function routeIntent(intencion, filtros, contexto = {}) {
  switch (intencion) {
    case "buscar_propiedades":
      return await propiedadesController.buscar(filtros, contexto);

    case "saludo":
    case "saludo_simple":
      return saludoController.saludar();

    case "despedida":
      return MENSAJES.despedida;

    default:
      return ayudaController.generica(contexto);
  }
}

