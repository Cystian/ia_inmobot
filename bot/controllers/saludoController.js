// /bot/controllers/saludoController.js
// -------------------------------------------------------
// SALUDO INTELIGENTE FASE 5.6
// - Saludo único por sesión
// - Mensaje contextual según hora
// - Preparado para CRM y Fase 6
// -------------------------------------------------------

import { MENSAJES } from "../utils/messages.js";
import { updateSession } from "../interpretar/contextManager.js";

function saludoPorHora() {
  const hour = new Date().getHours();

  if (hour < 12) return "¡Buenos días! ☀️";
  if (hour < 18) return "¡Buenas tardes! 🌤️";
  return "¡Buenas noches! 🌙";
}

const saludoController = {
  saludar(userPhone, session = {}) {
    // Saludo único — si ya saludó, no repetir
    if (session.hasGreeted) {
      return null;
    }

    // Selección de saludo
    const saludoHora = saludoPorHora();
    const saludoBase = MENSAJES.saludo_inicial;

    // Registrar saludo en sesión
    updateSession(userPhone, {
      hasGreeted: true,
      greetedAt: Date.now()
    });

    // Saludo compuesto profesional
    return `${saludoHora}\n${saludoBase}`;
  }
};

export default saludoController;