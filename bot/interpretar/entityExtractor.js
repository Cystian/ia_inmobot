// /bot/interpretar/entityExtractor.js
// -------------------------------------------------------
// Mejora los filtros entregados por la IA mediante reglas
// específicas del mercado local y follow-ups.
// -------------------------------------------------------

const ZONAS_MAP = [
  { match: "nuevo chimbote", label: "Nuevo Chimbote" },
  { match: "chimbote", label: "Chimbote" },
  { match: "buenos aires", label: "Buenos Aires" },
  { match: "bellamar", label: "Bellamar" },
  { match: "villa maria", label: "Villa María" },
  { match: "la caleta", label: "La Caleta" }
];

const EXTRAS_RULES = [
  { match: "frente a parque", key: "frente_parque" },
  { match: "frente al parque", key: "frente_parque" },
  { match: "esquina", key: "esquina" },
  { match: "negociable", key: "negociable" },
  { match: "papeles", key: "papeles_ok" },
  { match: "documentos al dia", key: "papeles_ok" },
  { match: "estreno", key: "estreno" },
  { match: "remodelado", key: "remodelado" },
  { match: "amoblado", key: "amoblado" },
  { match: "amoblada", key: "amoblado" },
  { match: "piscina", key: "piscina" },
  { match: "jardin", key: "jardin" },
  { match: "jardín", key: "jardin" },
  { match: "patio", key: "patio" }
];

export function enrichFiltersWithRules(msg, filtrosBase = {}, session = {}) {
  // Partimos de lo que dio la IA y de lo que había en sesión (para follow-up)
  const filtros = {
    ...(session.lastFilters || {}),
    ...(filtrosBase || {})
  };

  // ============================
  // Distritos / zonas
  // ============================
  const dist = new Set(filtros.distritos || []);

  for (const z of ZONAS_MAP) {
    if (msg.includes(z.match)) dist.add(z.label);
  }

  if (dist.size > 0) {
    filtros.distritos = Array.from(dist);
  }

  // ============================
  // Status (venta / alquiler)
  // ============================
  if (msg.includes("comprar") || msg.includes("venta") || msg.includes("vendo")) {
    filtros.status = "venta";
  }

  if (
    msg.includes("alquilar") ||
    msg.includes("alquiler") ||
    msg.includes("rentar") ||
    msg.includes("renta") ||
    msg.includes("alquilo")
  ) {
    filtros.status = "alquiler";
  }

  // ============================
  // Tipo de inmueble
  // ============================
  if (msg.includes("casa")) filtros.tipo = "casa";
  if (msg.includes("departamento") || msg.includes("depa") || msg.includes("dpto"))
    filtros.tipo = "departamento";
  if (msg.includes("terreno")) filtros.tipo = "terreno";
  if (msg.includes("local")) filtros.tipo = "local";
  if (msg.includes("oficina")) filtros.tipo = "oficina";

  // ============================
  // Dormitorios
  // ============================
  const beds = msg.match(/(\d+)\s*(dorm|hab|cuarto|habitacion|habitaciones)/);
  if (beds) filtros.bedrooms = Number(beds[1]);

  // ============================
  // Baños
  // ============================
  const baths = msg.match(/(\d+)\s*(baños|banos|baño|bano)/);
  if (baths) filtros.bathrooms = Number(baths[1]);

  // ============================
  // Cocheras
  // ============================
  const coch = msg.match(
    /(\d+)\s*(coch|cocheras|cochera|parking|estacionamiento)/
  );
  if (coch) filtros.cocheras = Number(coch[1]);

  // ============================
  // Área mínima (m2)
  // Ej: "más de 200 m2", "de 150 metros"
  // ============================
  const areaMatch = msg.match(
    /(mas de|más de|de|desde)?\s*(\d+)\s*(m2|metros|metros cuadrados)/
  );
  if (areaMatch) {
    const areaVal = Number(areaMatch[2]);
    if (!Number.isNaN(areaVal)) {
      filtros.area_min = areaVal;
    }
  }

  // ============================
  // Precio: rango "entre X y Y"
  // ============================
  const rango = msg.match(
    /entre\s+(\d+[\.,]?\d{0,3})\s*(mil|k)?\s+y\s+(\d+[\.,]?\d{0,3})\s*(mil|k)?/
  );
  if (rango) {
    let min = Number(rango[1].replace(",", ""));
    let max = Number(rango[3].replace(",", ""));
    if (rango[2]) min *= 1000;
    if (rango[4]) max *= 1000;

    filtros.precio_min = min;
    filtros.precio_max = max;
  } else {
    // Precio máximo simple, ej: "hasta 90 mil", "a unos 120k"
    const price = msg.match(/(\d+[\.,]?\d{0,3})\s*(mil|k|lucas)?/);
    if (price) {
      let n = Number(price[1].replace(",", ""));
      if (price[2]) n *= 1000;
      filtros.precio_max = n;
    }
  }

  // ============================
  // Extras
  // ============================
  const extras = new Set(filtros.extras || []);

  for (const rule of EXTRAS_RULES) {
    if (msg.includes(rule.match)) extras.add(rule.key);
  }

  if (extras.size > 0) {
    filtros.extras = Array.from(extras);
  }

  return filtros;
}