// /bot/interpretar/contextManager.js
// -------------------------------------------------------
// Memoria conversacional por usuario (versión FASE 5.6 / FASE 6 Ready)
// - Saludo único por sesión
// - Memoria de último lead detectado
// - Anti-loop de saludo
// - Propiedad referida
// - Estado de búsqueda y follow-up
// -------------------------------------------------------

const sessionStore = {};

// Tiempo máximo de inactividad (30 min)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// -------------------------------------------------------
// Detecta expiración de sesión
// -------------------------------------------------------
function isSessionExpired(session) {
  if (!session?.timestamp) return true;
  return Date.now() - session.timestamp > SESSION_TIMEOUT_MS;
}

// -------------------------------------------------------
// Crear sesión nueva limpia
// -------------------------------------------------------
function createNewSession() {
  return {
    lastIntent: null,
    lastFilters: {},
    lastProperties: [],
    lastPage: 1,
    lastSelectedProperty: null,
    lastMessage: "",
    hasGreeted: false,          // 👈 Saludo único por sesión
    lastLeadData: null,         // 👈 Registro de leads de Meta Ads
    antiSaludoLoop: false,      // 👈 Evita que responda "Hola" varias veces
    timestamp: Date.now()
  };
}

// -------------------------------------------------------
// Obtener sesión actual
// -------------------------------------------------------
export function getSession(userPhone) {
  if (!userPhone) return {};

  const session = sessionStore[userPhone];

  // Si no existe o expiró → nueva sesión
  if (!session || isSessionExpired(session)) {
    sessionStore[userPhone] = createNewSession();
  }

  return sessionStore[userPhone];
}

// -------------------------------------------------------
// Actualizar campos específicos sin perder los anteriores
// -------------------------------------------------------
export function updateSession(userPhone, data = {}) {
  if (!userPhone) return;

  const current = getSession(userPhone);

  sessionStore[userPhone] = {
    ...current,
    ...data,
    timestamp: Date.now()
  };
}

// -------------------------------------------------------
// Reset manual
// -------------------------------------------------------
export function resetSession(userPhone) {
  if (sessionStore[userPhone]) {
    delete sessionStore[userPhone];
  }
}