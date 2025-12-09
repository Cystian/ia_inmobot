// /bot/utils/messages.js
// -------------------------------------------------------
// MENSAJES CORPORATIVOS — FASE 5.6 / PREPARADO PARA FASE 6
// -------------------------------------------------------

export const MENSAJES = {
  // -----------------------------------------------------
  // SALUDO INICIAL (usado solo 1 vez por sesión)
  // -----------------------------------------------------
  saludo_inicial:
    "Soy el asistente virtual de *Inmobiliaria Alfaro*. " +
    "Estoy aquí para ayudarte a encontrar la propiedad ideal. 🏡\n" +
    "¿Qué tipo de inmueble deseas ver hoy? Casa, departamento, terreno o local comercial.",

  // -----------------------------------------------------
  // SIN RESULTADOS EXACTOS
  // -----------------------------------------------------
  intro_propiedades_sugeridas:
    "No encontré coincidencias exactas, pero preparé algunas *alternativas recomendadas* para ti 👇",

  intro_propiedades_default:
    "Perfecto, aquí tienes algunas opciones que encajan muy bien con lo que estás buscando. 😊",

  // -----------------------------------------------------
  // CASOS DE ALQUILER SIN STOCK (tu empresa casi no maneja)
  // -----------------------------------------------------
  sin_alquiler:
    "De momento no tengo alquileres disponibles en esa zona 📍.\n" +
    "Pero sí cuento con *excelentes oportunidades de compra* que podrían interesarte. 💰\n" +
    "¿Deseas ver algunas opciones?",

  // -----------------------------------------------------
  // CIERRE GENÉRICO PARA AUMENTAR CONVERSIÓN
  // -----------------------------------------------------
  cierre_generico:
    "\n\nSi alguna propiedad te interesa, puedo ayudarte a coordinar una visita o derivarte con un asesor especializado. 🤝",

  // -----------------------------------------------------
  // AYUDA UNIVERSAL
  // -----------------------------------------------------
  ayuda_generica:
    "Puedo ayudarte a buscar por tipo de propiedad, zona, número de dormitorios, precio aproximado o finalidad (vivienda o inversión). " +
    "Cuéntame con confianza qué estás buscando. 🙂",

  // -----------------------------------------------------
  // DESPEDIDA CORPORATIVA
  // -----------------------------------------------------
  despedida:
    "Ha sido un gusto ayudarte 🙌. Si deseas continuar más tarde, solo escríbeme por aquí. ¡Que tengas un excelente día! 🌟",

  // -----------------------------------------------------
  // TEXTO PARA LEADS DE META
  // -----------------------------------------------------
  lead_detectado:
    "Gracias por tu interés 🙌. He detectado que vienes desde un formulario. " +
    "Puedo ayudarte con propiedades según tu presupuesto o la zona que indicaste. ¿Qué deseas ver primero?",

  // -----------------------------------------------------
  // CUANDO EL USUARIO CONFIRMA INTERÉS
  // -----------------------------------------------------
  interes_confirmado:
    "Perfecto 👌. Te muestro opciones relevantes y si alguna te gusta, puedo ayudarte a coordinar una visita. ¿Te parece?",

  // -----------------------------------------------------
  // CUANDO EL BOT RECONOCE UNA PROPIEDAD REFERIDA
  // -----------------------------------------------------
  propiedad_referida:
    "Entiendo, quieres saber más sobre esa propiedad 📌. Dame un instante para prepararte los detalles.",
};