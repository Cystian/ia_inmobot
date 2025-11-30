// /bot/interpretar/userProfile.js
// --------------------------------------------------------
// Maneja el perfil del usuario: preferencias aprendidas.
// No afecta BD. Se guarda en memoria de sesión.
// --------------------------------------------------------

export function createEmptyProfile() {
  return {
    presupuesto: null,
    tipoPreferido: null,
    zonaPreferida: null,
    cocherasMin: null,
    dormitoriosMin: null,
    estilo: null,
    vibe: null,
    uso: null
  };
}

// Fusiona el perfil previo con nuevo conocimiento
export function updateUserProfile(session = {}, semantic = {}, filtros = {}) {
  const profile = session.userProfile || createEmptyProfile();

  // Tipo preferido
  if (filtros.tipo) profile.tipoPreferido = filtros.tipo;

  // Zona preferida
  if (filtros.distritos?.length > 0) {
    profile.zonaPreferida = filtros.distritos[0];
  }

  // Presupuesto
  if (filtros.precio_max) profile.presupuesto = filtros.precio_max;

  // Cocheras
  if (filtros.cocheras) profile.cocherasMin = filtros.cocheras;

  // Dormitorios
  if (filtros.bedrooms) profile.dormitoriosMin = filtros.bedrooms;

  // Preferencias semánticas
  if (semantic.estilo) profile.estilo = semantic.estilo;
  if (semantic.vibe) profile.vibe = semantic.vibe;
  if (semantic.uso) profile.uso = semantic.uso;

  return profile;
}
