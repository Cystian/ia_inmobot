// /bot/controllers/inversionController.js
// -------------------------------------------------------
// Análisis de inversión SIN OpenAI.
// Usa únicamente tu base de datos real para generar insights.
// -------------------------------------------------------

import { buscarPropiedades } from "../services/propiedadesService.js";
import enviarMensaje, { enviarImagen } from "../services/sendMessage.js";
import { FRONTEND_BASE_URL } from "../config/env.js";
import { updateSession } from "../interpretar/contextManager.js";

// 1️⃣ Agrupar datos por zona
async function obtenerZonasDeBD() {
  const propiedades = await buscarPropiedades({});
  const zonas = {};

  for (const p of propiedades) {
    const z = p.location || "Sin ubicación";

    if (!zonas[z]) zonas[z] = { total: 0, preciosM2: [] };

    zonas[z].total++;

    if (p.area > 0) {
      zonas[z].preciosM2.push(p.price / p.area);
    }
  }

  return zonas;
}

// 2️⃣ Generar análisis local (sin IA)
function generarAnalisisLocal(zonas) {
  const zonasLista = Object.keys(zonas);

  let texto = "📊 *Análisis de inversión basado en tu inventario actual:*\n\n";

  zonasLista.forEach((zona) => {
    const z = zonas[zona];

    const promedio =
      z.preciosM2.length > 0
        ? (z.preciosM2.reduce((a, b) => a + b, 0) / z.preciosM2.length).toFixed(2)
        : "SD";

    texto += `🏙️ *${zona}*\n`;
    texto += `• Propiedades activas: ${z.total}\n`;
    texto += `• Precio promedio m²: ${promedio === "SD" ? "Sin datos" : "US$ " + promedio}\n`;

    if (z.total >= 5) texto += "• 🔼 Zona con movimiento activo\n";
    if (promedio !== "SD" && promedio < 350) texto += "• 💡 Buen punto para inversión por costo/m²\n";
    if (promedio !== "SD" && promedio > 700) texto += "• ⭐ Alta demanda y valorización\n";

    texto += "\n";
  });

  texto += "¿Te gustaría revisar oportunidades concretas según tu presupuesto?\n";

  return texto;
}

const inversionController = {
  async recomendar(filtros = {}, contexto = {}) {
    const { userPhone, session } = contexto;

    // 1️⃣ Obtener data real de BD
    const zonas = await obtenerZonasDeBD();

    if (!Object.keys(zonas).length) {
      await enviarMensaje(userPhone, "Aún no tengo suficiente inventario para analizar inversión.");
      return null;
    }

    // 2️⃣ Crear análisis interno sin IA
    const analisis = generarAnalisisLocal(zonas);

    await enviarMensaje(userPhone, analisis);

    // 3️⃣ Enviar recomendaciones reales (primeras 6)
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

    await enviarMensaje(userPhone, "¿Quieres ver opciones específicas según tu presupuesto?");

    updateSession(userPhone, { lastIntent: "inversion" });

    return null;
  }
};

export default inversionController;