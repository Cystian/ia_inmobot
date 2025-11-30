
// /bot/interpretar/activeQuestions.js
// --------------------------------------------------------
// Motor de preguntas activas: el bot detecta cuando falta
// información clave y realiza preguntas naturales.
// --------------------------------------------------------

export function detectMissingInfo(filtros = {}, session = {}) {
  const profile = session.userProfile || {};

  const preguntas = [];

  // Falta presupuesto
  if (!filtros.precio_max && !profile.presupuesto) {
    preguntas.push("¿Cuál es tu presupuesto aproximado para esta compra?");
  }

  // Falta tipo
  if (!filtros.tipo && !profile.tipoPreferido) {
    preguntas.push("¿Buscas casa, departamento o terreno?");
  }

  // Falta zona
  if (!filtros.distritos?.length && !profile.zonaPreferida) {
    preguntas.push("¿En qué zona te gustaría vivir? ¿Nuevo Chimbote o Chimbote?");
  }

  // Falta dormitorios
  if (!filtros.bedrooms && !profile.dormitoriosMin) {
    preguntas.push("¿Cuántos dormitorios necesitas como mínimo?");
  }

  // Falta cochera
  if (!filtros.cocheras && !profile.cocherasMin) {
    preguntas.push("¿Necesitas cochera?");
  }

  // Si hay preguntas pendientes → devolver la primera
  return preguntas.length > 0 ? preguntas[0] : null;
}