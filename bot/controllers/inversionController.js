// /bot/controllers/inversionController.js
// -------------------------------------------------------
// Controlador de inversión (Versión C - Inteligencia Avanzada)
// Analiza BD + genera insight de inversión con IA controlada
// -------------------------------------------------------

import { buscarPropiedades } from "../services/propiedadesService.js";
import enviarMensaje, { enviarImagen } from "../services/sendMessage.js";
import { FRONTEND_BASE_URL } from "../config/env.js";
import { openaiClient } from "../config/openai.js";
import { updateSession } from "../interpretar/contextManager.js";
import { logInfo } from "../utils/log.js";
import { cierrePremium } from "../services/sendMessageManager.js";

// -------------------------------------------------------
// 1️⃣ Analizar BD real (zonas, volumen y precio/m2 si existe área)
// -------------------------------------------------------
async function obtenerZonasDeBD() {
  const propiedades = await buscarPropiedades({});
  const zonas = {};

  for (const p of propiedades) {
    const zona = p.location?.trim() || "Zona desconocida";

    if (!zonas[zona]) zonas[zona] = { total: 0, precios: [] };

    zonas[zona].total++;

    // Si tienes área registrada en tu BD
    if (p.area && p.area > 0) {
      zonas[zona].precios.push(p.price / p.area);
    }
  }

  return zonas;
}

// -------------------------------------------------------
// 2️⃣ Generar análisis con IA guiada (sin inventar zonas)
// -------------------------------------------------------
async function generarAnalisisIA(zonas) {
  const zonasLista = Object.keys(zonas);

  const prompt = `
Eres un asesor inmobiliario profesional especializado en inversión.
Usa EXCLUSIVAMENTE estas zonas (no inventes distritos):

${zonasLista.join(", ")}

Analiza:
- Potencial de revalorización según inventario
- Precio/m2 relativo por zona
- Actividad inmobiliaria (volumen de propiedades)
- Zonas emergentes o subvaluadas

Genera un análisis ejecutivo, directo y profesional.
NO menciones zonas fuera de la lista.
`;

  const res = await openaiClient.responses.create({
    model: "gpt-4.1-mini",
    input: prompt
  });

  return res.output_text;
}

// -------------------------------------------------------
// 3️⃣ Controlador principal
// -------------------------------------------------------
const inversionController = {
  async recomendar(filtros = {}, contexto = {}) {
    const { userPhone, rawMessage, session } = contexto;

    logInfo("INTENT: INVERSION — FASE 6 AVANZADA", {
      filtros,
      rawMessage
    });

    try {
      // 1. Obtener data real de BD
      const zonas = await obtenerZonasDeBD();

      if (!Object.keys(zonas).length) {
        await enviarMensaje(
          userPhone,
          "Aún no cuento con suficiente inventario activo para recomendar zonas de inversión 📊."
        );
        return null;
      }

      // 2. Generar análisis IA basado en TU inventario real
      const analisisIA = await generarAnalisisIA(zonas);

      await enviarMensaje(
        userPhone,
        `Perfecto 👌 Aquí tienes un análisis de inversión basado en el mercado actual:\n\n${analisisIA}`
      );

      // 3. Propiedades recomendadas (máx. 6)
      const propiedades = await buscarPropiedades({});
      const recomendadas = propiedades.slice(0, 6);

      for (const p of recomendadas) {
        const url = `${FRONTEND_BASE_URL}/detalle/${p.id}`;
        const caption = `
🏡 *${p.title}*
💵 US$ ${p.price}
📍 ${p.location}

🔗 ${url}
        `.trim();

        await enviarImagen(userPhone, p.image, caption);
      }

      await enviarMensaje(
        userPhone,
        `${cierrePremium()} ¿Deseas filtrar por presupuesto o por tipo de propiedad?`
      );

      // 4. Guardar estado de sesión
      updateSession(userPhone, {
        lastIntent: "inversion",
        lastFilters: filtros,
        lastProperties: recomendadas,
        lastPage: 1
      });

      return null;
    } catch (error) {
      console.error("⚠ ERROR en inversionController:", error);
      await enviarMensaje(
        userPhone,
        "Ocurrió un inconveniente analizando las zonas de inversión. Puedo mostrarte opciones manualmente si deseas 📌."
      );
      return null;
    }
  }
};

export default inversionController;