
// /bot/interpretar/propertyRanker.js
// --------------------------------------------------------
// Motor de Ranking Inteligente (Fase 3)
// Calcula un score profesional por relevancia:
// - Coincidencias exactas -> mayor puntaje
// - Coincidencias parciales -> puntaje moderado
// - Recencia, imágenes, coherencia -> bonus
// --------------------------------------------------------

export function rankProperties(propiedades = [], filtros = {}) {
  const hoy = new Date();

  const zonasCercanas = {
    "nuevo chimbote": ["chimbote", "p-21", "bruces"],
    "chimbote": ["nuevo chimbote", "tambo real"]
  };

  // Normalizar entrada
  const filtroZona = filtros.distritos?.[0]?.toLowerCase() || "";
  const filtroTipo = filtros.tipo?.toLowerCase() || "";
  const filtroDorm = filtros.bedrooms || null;
  const filtroPrecio = filtros.precio_max || null;
  const filtroCoch = filtros.cocheras || null;

  return propiedades
    .map((p) => {
      let score = 0;

      const titulo = (p.title || "").toLowerCase();
      const ubicacion = (p.location || "").toLowerCase();

      // ----------------------------------------------------
      // 1. Tipo de inmueble
      // ----------------------------------------------------
      if (filtroTipo && titulo.includes(filtroTipo)) score += 35;

      // ----------------------------------------------------
      // 2. Zona exacta
      // ----------------------------------------------------
      if (filtroZona && ubicacion.includes(filtroZona)) score += 30;

      // ----------------------------------------------------
      // 3. Zona cercana
      // ----------------------------------------------------
      if (filtroZona) {
        const cercanas = zonasCercanas[filtroZona] || [];
        if (cercanas.some((z) => ubicacion.includes(z))) {
          score += 15;
        }
      }

      // ----------------------------------------------------
      // 4. Dormitorios
      // ----------------------------------------------------
      if (filtroDorm && p.bedrooms >= filtroDorm) {
        score += 20;
      } else if (filtroDorm) {
        score += 5;
      }

      // ----------------------------------------------------
      // 5. Cocheras
      // ----------------------------------------------------
      if (filtroCoch && p.cocheras >= filtroCoch) {
        score += 15;
      }

      // ----------------------------------------------------
      // 6. Precio
      // ----------------------------------------------------
      if (filtroPrecio && p.price <= filtroPrecio) {
        score += 15;
      }

      // ----------------------------------------------------
      // 7. Recencia (menos de 45 días)
      // ----------------------------------------------------
      const fecha = new Date(p.created_at);
      const diff = (hoy - fecha) / (1000 * 60 * 60 * 24);

      if (diff < 7) score += 10;
      else if (diff < 30) score += 6;
      else if (diff < 60) score += 3;

      // ----------------------------------------------------
      // 8. Calidad: tiene imagen
      // ----------------------------------------------------
      if (p.image) score += 10;

      // ----------------------------------------------------
      // 9. Keywords fuertes en título
      // ----------------------------------------------------
      const keywords = ["nuevo", "remodelado", "estreno", "amplio", "oferta"];
      if (keywords.some((k) => titulo.includes(k))) score += 5;

      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);
}