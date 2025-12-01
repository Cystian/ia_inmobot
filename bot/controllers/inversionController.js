import { buscarPropiedades } from "../services/propiedadesService.js";
import enviarMensaje, { enviarImagen } from "../services/sendMessage.js";
import { FRONTEND_BASE_URL } from "../config/env.js";
import { openaiClient } from "../config/openai.js"; 
import { updateSession } from "../interpretar/contextManager.js";

async function obtenerZonasDeBD() {
  const propiedades = await buscarPropiedades({});
  const zonas = {};

  for (const p of propiedades) {
    if (!zonas[p.location]) zonas[p.location] = { total: 0, precios: [] };
    zonas[p.location].total++;
    if (p.area && p.area > 0) {
      zonas[p.location].precios.push(p.price / p.area);
    }
  }

  return zonas;
}

async function generarAnalisisIA(zonas) {
  const zonasLista = Object.keys(zonas);
  const prompt = `
Eres un asesor inmobiliario profesional especializado en inversión.

Analiza ONLY estas zonas (no inventes lugares):

${zonasLista.join(", ")}

Para cada zona calcula mentalmente (no requieres números exactos):
- Alto potencial de revalorización
- Precio/m² comparado con las demás
- Actividad inmobiliaria según volumen
- Zonas emergentes con tendencia positiva

Genera un análisis corto, profesional, tipo ejecutivo.
No menciones lugares fuera de la lista.
`;

  const res = await openaiClient.responses.create({
    model: "gpt-4.1-mini",
    input: prompt
  });

  return res.output_text;
}

const inversionController = {
  async recomendar(filtros = {}, contexto = {}) {
    const { userPhone, session } = contexto;

    // 1️⃣ Obtener data real de tu BD
    const zonas = await obtenerZonasDeBD();

    if (!Object.keys(zonas).length) {
      await enviarMensaje(userPhone, "Aún no tengo suficiente inventario para analizar inversión.");
      return null;
    }

    // 2️⃣ Generar análisis inteligente basado en TU data
    const analisisIA = await generarAnalisisIA(zonas);

    await enviarMensaje(
      userPhone,
      "Perfecto 👌 Aquí tienes un análisis de inversión basado en el mercado actual:\n\n" +
      analisisIA
    );

    // 3️⃣ Mostrar propiedades recomendadas (solo 6)
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
  }
};

export default inversionController;
