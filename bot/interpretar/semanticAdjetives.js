// /bot/interpretar/semanticAdjetives.js
// -------------------------------------------------------
// FASE 6 — Procesador Semántico de Adjetivos
// Convierte lenguaje natural subjetivo en filtros técnicos
// -------------------------------------------------------

export function procesarAdjetivos(msg = "", filtros = {}) {
  const text = msg.toLowerCase().trim();
  let f = { ...filtros };

  // =====================================================
  // 1️⃣ GRANDE / AMPLIO → Filtrar por área mayor
  // =====================================================
  if (
    text.includes("grande") ||
    text.includes("amplio") ||
    text.includes("espacioso")
  ) {
    // Aumentamos área mínima si no existe
    f.area_min = f.area_min ? f.area_min * 1.2 : 120;
  }

  // =====================================================
  // 2️⃣ BARATO / ECONÓMICO → Reducir precio máximo
  // =====================================================
  if (
    text.includes("barato") ||
    text.includes("económico") ||
    text.includes("economico")
  ) {
    f.precio_max = f.precio_max ? f.precio_max * 0.85 : 90000;
  }

  // =====================================================
  // 3️⃣ BONITA / LINDA / MODERNA / ELEGANTE
  // =====================================================
  if (
    text.includes("bonita") ||
    text.includes("linda") ||
    text.includes("moderna") ||
    text.includes("elegante")
  ) {
    // No existe columna "bonita" → heurística:
    f._semanticScore = "estetica"; 
  }

  // =====================================================
  // 4️⃣ LOCAL GRANDE / CASA BONITA → Detectar tipo
  // =====================================================

  if (text.includes("local")) {
    f.tipo = "local";
  }
  if (text.includes("casa")) {
    f.tipo = "casa";
  }
  if (text.includes("departamento") || text.includes("depa") || text.includes("dpto")) {
    f.tipo = "departamento";
  }
  if (text.includes("terreno") || text.includes("lote")) {
    f.tipo = "terreno";
  }

  return f;
}