// /bot/controllers/inversionController.js
// -------------------------------------------------------
// FASE 5.6 — Análisis de inversión profesional SIN IA.
// - Ranking de inversión (ROI, m², valorización)
// - Enfoque automático en terrenos/locales
// - Uso de filtros del usuario
// - Compatible con motor semántico Fase 5.6
// -------------------------------------------------------

import { buscarPropiedades } from "../services/propiedadesService.js";
import enviarMensaje, { enviarImagen } from "../services/sendMessage.js";
import { FRONTEND_BASE_URL } from "../config/env.js";
import { updateSession } from "../interpretar/contextManager.js";


// -------------------------------------------------------
// 1️⃣ Análisis de zonas (inventario actual)
// -------------------------------------------------------
async function obtenerZonasDeBD() {
  const propiedades = await buscarPropiedades({});
  const zonas = {};

  for (const p of propiedades) {
    const zona = p.location || "Sin ubicación";
    if (!zonas[zona]) zonas[zona] = { total: 0, m2values: [] };

    zonas[zona].total++;

    if (p.area > 0) zonas[zona].m2values.push(p.price / p.area);
  }

  return zonas;
}


// -------------------------------------------------------
// 2️⃣ Mensaje profesional de análisis de zonas
// -------------------------------------------------------
function generarAnalisisLocal(zonas) {
  let texto = "📊 *Análisis de inversión con datos reales de tu inventario:*\n\n";

  for (const zona of Object.keys(zonas)) {
    const z = zonas[zona];
    const prom =
      z.m2values.length > 0
        ? (z.m2values.reduce((a, b) => a + b, 0) / z.m2values.length).toFixed(0)
        : null;

    texto += `🏙️ *${zona}*\n`;
    texto += `• Propiedades activas: ${z.total}\n`;
    texto += prom ? `• Precio promedio m²: US$ ${prom}\n` : `• Precio promedio m²: Sin datos\n`;

    if (z.total >= 5) texto += "• 📈 Mercado con movimiento significativo\n";
    if (prom && prom < 350) texto += "• 💡 Zona subvaluada — buen punto para invertir\n";
    if (prom && prom > 700) texto += "• ⭐ Zona de alta valorización\n";

    texto += "\n";
  }

  texto += "¿Deseas ver *oportunidades concretas*?\n";
  return texto;
}


// -------------------------------------------------------
// 3️⃣ Ranking de inversión
// -------------------------------------------------------
function rankInversion(propiedades) {
  return propiedades
    .map((p) => {
      let score = 0;

      // Terrenos y locales → prioridad alta
      if (/terreno|lote|local/i.test(p.title)) score += 40;

      // Precio bajo o entrada accesible
      if (p.price <= 60000) score += 25;
      if (p.price <= 90000) score += 15;

      // Costo por m²
      if (p.area > 0) {
        const m2 = p.price / p.area;
        if (m2 < 250) score += 20;
        if (m2 < 350) score += 12;
      }

      // Potencial de valorización (zonas conocidas)
      if (/nuevo chimbote|la caleta|bellamar/i.test(p.location))
        score += 18;

      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);
}


// -------------------------------------------------------
// 4️⃣ CONTROLADOR PRINCIPAL
// -------------------------------------------------------
const inversionController = {
  async recomendar(filtros = {}, contexto = {}) {
    const { userPhone, session, semanticPrefs = {} } = contexto;

    // 1️⃣ Análisis general por zonas
    const zonas = await obtenerZonasDeBD();
    if (!Object.keys(zonas).length) {
      await enviarMensaje(userPhone, "No tengo inventario suficiente para análisis.");
      return null;
    }

    const analisis = generarAnalisisLocal(zonas);
    await enviarMensaje(userPhone, analisis);

    // 2️⃣ Buscar propiedades que calzan con intención de inversión
    //    Usamos Filtros + Semántica
    const propiedades = await buscarPropiedades(
      filtros,
      { ...semanticPrefs, inversion: true }
    );

    if (!propiedades.length) {
      await enviarMensaje(
        userPhone,
        "No encontré oportunidades exactas, pero puedo revisar alternativas si me indicas tu presupuesto."
      );
      return null;
    }

    // 3️⃣ Ranking especializado de inversión
    const mejores = rankInversion(propiedades).slice(0, 6);

    await enviarMensaje(userPhone, "📈 *Oportunidades destacadas de inversión:*");

    // 4️⃣ Enviar propiedades con caption
    for (const p of mejores) {
      const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;

      const caption = `
🏡 *${p.title}*
💵 US$ ${p.price}
📍 ${p.location}
📐 ${p.area ? p.area + " m²" : "Área por confirmar"}

🔎 *Índice de Inversión:* ${p.score}/100
🔗 ${url}
`.trim();

      await enviarImagen(userPhone, p.image, caption);
    }

    await enviarMensaje(
      userPhone,
      "¿Quieres ver opciones *según tu presupuesto* o *solo terrenos / locales*?"
    );

    updateSession(userPhone, { lastIntent: "inversion" });

    return null;
  }
};

export default inversionController;