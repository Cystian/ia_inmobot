
// /bot/interpretar/contextManager.js
// -------------------------------------------------------
// Manejo simple de contexto en memoria por número de teléfono.
// -------------------------------------------------------

const sessionStore = new Map();

export function getSession(userPhone) {
  if (!userPhone) return {};
  return sessionStore.get(userPhone) || {};
}

export function updateSession(userPhone, data = {}) {
  if (!userPhone) return;
  const prev = sessionStore.get(userPhone) || {};
  const next = { ...prev, ...data };
  sessionStore.set(userPhone, next);
}

export function clearSession(userPhone) {
  if (!userPhone) return;
  sessionStore.delete(userPhone);
}