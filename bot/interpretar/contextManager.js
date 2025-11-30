// /bot/interpretar/contextManager.js
// -------------------------------------------------------
// Maneja memoria conversacional por número de teléfono.
// Guarda filtros, propiedades, página, etc.
// -------------------------------------------------------

const sessionStore = {}; 
// Estructura:
// sessionStore[userPhone] = {
//   lastIntent,
//   lastFilters,
//   lastProperties,
//   lastPage,
//   lastSelectedProperty,
//   lastMessage,
//   timestamp
// }

// Tiempo máximo antes de limpiar sesión (30 min)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// -------------------------------------------------------
// Limpia sesión si tiene más de 30 minutos de inactividad
// -------------------------------------------------------
function isSessionExpired(session) {
  if (!session?.timestamp) return true;
  return Date.now() - session.timestamp > SESSION_TIMEOUT_MS;
}

// -------------------------------------------------------
// Obtener sesión de un usuario (crea si no existe)
// -------------------------------------------------------
export function getSession(userPhone) {
  if (!userPhone) return {};

  const session = sessionStore[userPhone];

  if (!session || isSessionExpired(session)) {
    sessionStore[userPhone] = {
      lastIntent: null,
      lastFilters: {},
      lastProperties: [],
      lastPage: 1,
      lastSelectedProperty: null,
      lastMessage: "",
      timestamp: Date.now()
    };
  }

  return sessionStore[userPhone];
}

// -------------------------------------------------------
// Actualizar solo campos necesarios
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
// Resetear sesión manualmente (opcional)
// -------------------------------------------------------
export function resetSession(userPhone) {
  if (sessionStore[userPhone]) {
    delete sessionStore[userPhone];
  }
}