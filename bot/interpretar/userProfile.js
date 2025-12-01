// /bot/interpretar/userProfile.js
// --------------------------------------------------------
// Perfil inteligente del usuario (Fase 5)
// Aprende de filtros, semántica y follow-ups.
// Optimizado para influir en el ranker y personalización.
// --------------------------------------------------------

export function createEmptyProfile() {
  return {
    presupuesto: null,
    tipoPreferido: null,
    zonaPreferida: null,
    cocherasMin: null,
    dormitoriosMin: null,
    areaMin: null,
    estilo: null,
    vibe: null,
    uso: null,
    historialDistritos: [],
    historialTipos: [],
    interacciones: 0
  };
}

export function updateUserProfile(session = {}, semantic = {}, filtros = {}) {
  const profile = session.userProfile || createEmptyProfile();

  // Track de interacciones
  profile.interacciones += 1;

  // ======================================================
  // 1️⃣ Tipo de inmueble
  // ======================================================
  if (filtros.tipo) {
    profile.tipoPreferido = filtros.tipo;
    profile.historialTipos.push(filtros.tipo);
  }

  // ======================================================
  // 2️⃣ Zona
  // ======================================================
  if (filtros.distritos?.length > 0) {
    const zona = filtros.distritos[0];
    profile.zonaPreferida = zona;
    profile.historialDistritos.push(zona);
  }

  // ======================================================
  // 3️⃣ Presupuesto
  // ======================================================
  if (filtros.precio_max) {
    profile.presupuesto = filtros.precio_max;
  }

  // ======================================================
  // 4️⃣ Cocheras / Dormitorios
  // ======================================================
  if (filtros.cocheras) {
    profile.cocherasMin = filtros.cocheras;
  }

  if (filtros.bedrooms) {
    profile.dormitoriosMin = filtros.bedrooms;
  }

  // Área mínima (si el usuario pidió algo “más grande” antes)
  if (filtros.area_min) {
    profile.areaMin = filtros.area_min;
  }

  // ======================================================
  // 5️⃣ Semántica avanzada
  // ======================================================
  if (semantic.estilo) profile.estilo = semantic.estilo;
  if (semantic.vibe) profile.vibe = semantic.vibe;
  if (semantic.uso) profile.uso = semantic.uso;

  // ======================================================
  // 6️⃣ Normalización y limpieza
  // ======================================================
  profile.historialTipos = Array.from(new Set(profile.historialTipos));
  profile.historialDistritos = Array.from(new Set(profile.historialDistritos));

  return profile;
}
