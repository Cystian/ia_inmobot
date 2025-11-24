// /bot/interpretar/entityExtractor.js
// -------------------------------------------------------
// Mejora los filtros entregados por la IA mediante reglas
// específicas del mercado local (Chimbote / Nuevo Chimbote).
// -------------------------------------------------------

export function enrichFiltersWithRules(msg, filtrosBase = {}) {
  const filtros = { ...filtrosBase };

  // Distritos
  const dist = [];
  if (msg.includes("nuevo chimbote")) dist.push("Nuevo Chimbote");
  if (msg.includes("chimbote")) dist.push("Chimbote");

  if (dist.length > 0) filtros.distritos = dist;

  // Status
  if (msg.includes("comprar") || msg.includes("venta"))
    filtros.status = "venta";

  if (
    msg.includes("alquilar") ||
    msg.includes("alquiler") ||
    msg.includes("rentar")
  )
    filtros.status = "alquiler";

  // Tipo
  if (msg.includes("casa")) filtros.tipo = "casa";
  if (msg.includes("departamento") || msg.includes("depa"))
    filtros.tipo = "departamento";
  if (msg.includes("terreno")) filtros.tipo = "terreno";

  // Dormitorios
  const beds = msg.match(/(\d+)\s*(dorm|hab|cuarto|habitacion)/);
  if (beds) filtros.bedrooms = Number(beds[1]);

  // Precio
  const price = msg.match(/(\d+[\.,]?\d{0,3})\s*(mil|k|lucas)?/);
  if (price) {
    let n = Number(price[1].replace(",", ""));
    if (price[2]) n *= 1000;
    filtros.precio_max = n;
  }

  return filtros;
}

