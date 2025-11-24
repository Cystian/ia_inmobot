// /bot/utils/log.js

export function logInfo(label, data) {
  console.log(`ℹ️ [${label}]`, data);
}

export function logError(label, error) {
  console.error(`❌ [${label}]`, error);
}

