// /bot/controllers/ayudaController.js
// -------------------------------------------------------
// FASE 5.6 – AYUDA INTELIGENTE
// - Usa contexto conversacional
// - No repite información innecesaria
// - Pide solo los datos faltantes (tipo / zona / presupuesto)
// - Respuesta profesional y breve cuando corresponde
// -------------------------------------------------------

import { MENSAJES } from "../utils/messages.js";

const ayudaController = {
  generica(contexto = {}) {
    const raw = (contexto.rawMessage || "").trim();
    const filtros = contexto.session?.lastFilters || {};
    const tipo = filtros?.tipo || null;
    const zonas = filtros?.distritos || [];

    let respuesta = "Te ayudo con gusto 😊.\n\n";

    respuesta += MENSAJES.ayuda_generica + "\n";

    // =====================================================
    // 1️⃣ Si el usuario dijo algo, mencionarlo de forma elegante
    // =====================================================
    if (raw) {
      respuesta += `\nSobre lo que comentas: *"${raw}"*.\n`;
    }

    // =====================================================
    // 2️⃣ Preguntar SOLO por lo que falta (tipo / zona / precio)
    // =====================================================

    // ✔ Falta tipo
    if (!tipo) {
      respuesta +=
        "\n¿El inmueble que buscas es *casa, departamento o terreno*?";
    }

    // ✔ Falta zona
    if (zonas.length === 0) {
      respuesta +=
        "\n¿Tienes alguna zona en mente? Ejemplo: *Nuevo Chimbote, Chimbote, Buenos Aires*.";
    }

    // ✔ Faltan ambos → evitar que se sienta repetitivo
    if (!tipo && zonas.length === 0) {
      respuesta +=
        "\nCon esa información ya puedo empezar a compartirte opciones precisas. 🏡✨";
    }

    // ✔ Si ya tiene tipo y zona
    if (tipo && zonas.length > 0) {
      respuesta +=
        "\nPerfecto 👌. Si deseas puedo ajustar el presupuesto o mostrarte propiedades similares.";
    }

    return respuesta.trim();
  }
};

export default ayudaController;