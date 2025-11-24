// /bot/controllers/propiedadesController.js
// -------------------------------------------------------
// Controlador principal para búsquedas de propiedades.
// Aplica lógica de negocio y arma respuesta humanizada.
// -------------------------------------------------------

import {
  buscarPropiedades,
  buscarSugeridas
} from "../services/propiedadesService.js";
import { MENSAJES } from "../utils/messages.js";
import { FRONTEND_BASE_URL } from "../config/env.js";
import { logInfo } from "../utils/log.js";

const propiedadesController = {
  async buscar(filtros = {}, contexto = {}) {
    const { iaRespuesta } = contexto;

    logInfo("Buscar propiedades", { filtros });

    let propiedades = await buscarPropiedades(filtros);

    // Caso alquiler sin resultados
    if (filtros.status === "alquiler" && propiedades.length === 0) {
      return MENSAJES.sin_alquiler;
    }

    let intro = iaRespuesta || MENSAJES.intro_propiedades_default;

    // Caso sin resultados → sugeridas
    if (propiedades.length === 0) {
      propiedades = await buscarSugeridas();
      intro = MENSAJES.intro_propiedades_sugeridas;
    }

    let respuesta = intro;

    // Construir listado
    propiedades.slice(0, 6).forEach((p) => {
      const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;

      respuesta += `\n\n🏡 *${p.title}*`;
      respuesta += `\n💵 US$ ${p.price}`;
      respuesta += `\n📍 ${p.location || "Zona por confirmar"}`;
      respuesta += `\n🛏 ${p.bedrooms || 0} dorm | 🚿 ${
        p.bathrooms || 0
      } baños | 🚗 ${p.cocheras || 0} coch`;
      respuesta += `\n🔗 ${url}`;
    });

    respuesta += MENSAJES.cierre_generico;

    return respuesta;
  }
};

export default propiedadesController;

