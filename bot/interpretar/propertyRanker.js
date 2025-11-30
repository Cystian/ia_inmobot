// /bot/interpretar/propertyRanker.js
// --------------------------------------------------------
// Motor de Ranking Inteligente (Fase 3 + Semántica Fase 4)
// Score por:
// - Coincidencias exactas
// - Coincidencias parciales
// - Recencia, imágenes
// - Preferencias semánticas (estilo, uso, vibe, vista)
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

  const semantic = filtros.semantic || {};
  const semKeywords = (semantic.keywords || []).map((k) => k.toLowerCase());

  return propiedades
    .map((p) => {
      let score = 0;

      const titulo = (p.title || "").toLowerCase();
      const ubicacion = (p.location || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();

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
      if (p.created_at) {
        const fecha = new Date(p.created_at);
        const diff = (hoy - fecha) / (1000 * 60 * 60 * 24);

        if (diff < 7) score += 10;
        else if (diff < 30) score += 6;
        else if (diff < 60) score += 3;
      }

      // ----------------------------------------------------
      // 8. Calidad: tiene imagen
      // ----------------------------------------------------
      if (p.image) score += 10;

      // ----------------------------------------------------
      // 9. Keywords fuertes en título
      // ----------------------------------------------------
      const strongKeywords = ["nuevo", "remodelado", "estreno", "amplio", "oferta"];
      if (strongKeywords.some((k) => titulo.includes(k))) score += 5;

      // ----------------------------------------------------
      // 🔟 SEMÁNTICA: estilo / uso / vibe / vista
      // ----------------------------------------------------

      // Estilo
      if (semantic.estilo === "moderno") {
        if (
          titulo.includes("moderno") ||
          desc.includes("moderno") ||
          titulo.includes("estreno") ||
          desc.includes("estreno") ||
          titulo.includes("minimalista") ||
          desc.includes("minimalista")
        ) {
          score += 12;
        }
      }

      if (semantic.estilo === "clasico") {
        if (
          titulo.includes("clásico") ||
          desc.includes("clásico") ||
          titulo.includes("rústico") ||
          desc.includes("rústico") ||
          titulo.includes("antiguo") ||
          desc.includes("antiguo")
        ) {
          score += 10;
        }
      }

      if (semantic.estilo === "premium") {
        if (
          titulo.includes("lujoso") ||
          desc.includes("lujoso") ||
          titulo.includes("exclusivo") ||
          desc.includes("exclusivo") ||
          titulo.includes("premium") ||
          desc.includes("premium")
        ) {
          score += 14;
        }
      }

      // Uso
      if (semantic.uso === "familiar") {
        if (
          desc.includes("familia") ||
          desc.includes("niños") ||
          desc.includes("ninos") ||
          desc.includes("parque") ||
          desc.includes("colegio")
        ) {
          score += 10;
        }
      }

      if (semantic.uso === "inversion") {
        if (
          desc.includes("rentable") ||
          desc.includes("renta") ||
          desc.includes("alta demanda") ||
          desc.includes("inversión") ||
          desc.includes("inversion")
        ) {
          score += 10;
        }
      }

      if (semantic.uso === "oficina") {
        if (
          desc.includes("oficina") ||
          desc.includes("consultorio") ||
          desc.includes("negocio") ||
          desc.includes("local comercial")
        ) {
          score += 10;
        }
      }

      // Vibe
      if (semantic.vibe === "tranquilo") {
        if (
          desc.includes("zona tranquila") ||
          desc.includes("poco tráfico") ||
          desc.includes("residencial")
        ) {
          score += 8;
        }
      }

      if (semantic.vibe === "centrico") {
        if (
          desc.includes("céntrico") ||
          desc.includes("centrico") ||
          desc.includes("avenida principal") ||
          desc.includes("cerca al centro")
        ) {
          score += 8;
        }
      }

      // Vista
      if (semantic.vista === "mar") {
        if (
          desc.includes("vista al mar") ||
          desc.includes("cerca al mar") ||
          desc.includes("playa")
        ) {
          score += 10;
        }
      }

      if (semantic.vista === "parque") {
        if (
          desc.includes("frente a parque") ||
          desc.includes("vista a parque") ||
          desc.includes("parque cerca")
        ) {
          score += 10;
        }
      }

      // Keywords semánticas libres
      if (semKeywords.length > 0) {
        const texto = `${titulo} ${desc}`;
        const hits = semKeywords.filter((k) => texto.includes(k)).length;
        score += hits * 3; // cada match semántico suma un poco
      }

      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);
}