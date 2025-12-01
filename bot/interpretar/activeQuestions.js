// /bot/interpretar/activeQuestions.js
// -------------------------------------------------------
// Sistema de Preguntas Activas (Fase 5)
// Decide si falta información crítica antes de buscar.
// Se basa en:
// - Preferencias explícitas (filtros)
// - Perfil del usuario (memoria)
// - Semántica del mensaje
// - Follow-up
// No repite preguntas innecesarias.
// -------------------------------------------------------

import { MENSAJES } from "../utils/messages.js";

export function detectMissingInfo(filtros = {}, session = {}) {
  const profile = session.userProfile || {};
  const msg = (session.lastMessage || "").toLowerCase();

  const tipo = filtros.tipo || profile.tipoPreferido;
  const zona = filtros.distritos?.[0] || profile.zonaPreferida;
  const presupuesto = filtros.precio_max || profile.presupuesto;

  // ======================================================
  // 1️⃣ Evitar preguntar si es un follow-up
  // ======================================================
  if (session?.esFollowUp) {
    return null;
  }

  // ======================================================
  // 2️⃣ Si el usuario está preguntando por una propiedad → no preguntar nada
  // ======================================================
  if (session.lastIntent === "pregunta_propiedad") {
    return null;
  }

  // ======================================================
  // 3️⃣ PREGUNTA 1: Tipo de propiedad
  // ======================================================
  if (!tipo) {
    return "¿Buscas *casa*, *departamento* o *terreno*? 🏡";
  }

  // ======================================================
  // 4️⃣ PREGUNTA 2: Zona (solo si el negocio es local)
  // ======================================================
  if (!zona) {
    // Evitar preguntar si usuario ya dio señal de no querer zona local
    if (
      msg.includes("otro lado") ||
      msg.includes("fuera") ||
      msg.includes("no sea chimbote") ||
      msg.includes("no sea nuevo chimbote")
    ) {
      return "Perfecto, ¿en qué ciudad o distrito te gustaría buscar? 🙂";
    }

    return "¿En qué zona te gustaría buscar? ¿Chimbote o Nuevo Chimbote? 📍";
  }

  // ======================================================
  // 5️⃣ PREGUNTA 3: Presupuesto
  // ======================================================
  if (!presupuesto) {
    return "¿Cuál es tu presupuesto aproximado para esta compra? 💵";
  }

  // ======================================================
  // 6️⃣ Lógica avanzada: coherencia entre tipo y zona
  //    Ejemplo: si es terreno + zona premium → reconfirmar intención
  // ======================================================
  if (
    tipo === "terreno" &&
    zona &&
    !msg.includes("lote") &&
    !msg.includes("terreno")
  ) {
    return `Para asegurar la mejor búsqueda: ¿Confirmas que deseas un *terreno* en *${zona}*?`;
  }

  // ======================================================
  // 7️⃣ Lógica avanzada: recomendaciones por perfil
  // ======================================================
  if (profile.uso === "familiar" && !profile.dormitoriosMin) {
    return "Para tu familia, ¿cuántos dormitorios te gustaría que tenga la propiedad? 🛏️";
  }

  if (profile.uso === "oficina" && !profile.areaMin) {
    return "¿De cuántos m² mínimo debería ser el espacio que buscas? 📐";
  }

  // ======================================================
  // 8️⃣ Nada falta → proceder con búsqueda
  // ======================================================
  return null;
}
