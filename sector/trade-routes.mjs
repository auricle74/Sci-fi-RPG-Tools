const commerce = /\b(trade|trading|market|merchant|commerce|commercial|freight|cargo|refuelling|refueling|shipyard|starport|pilgrimage|tourism|salvage|exports?|imports?|suppl(?:y|ies))\b/i;
const industry = /\b(industrial|industry|manufactur\w*|shipyard|factor(?:y|ies))\b/i;
const resources = /\b(mines?|miners?|mining|ore|minerals?|agricultur\w*|farm\w*|raw materials)\b/i;
const vacant = /\b(abandoned|derelict|uninhabited|unoccupied|ancient preserved bodies|unthinking automated shopkeepers)\b/i;
const inhabitedTypes = /\b(station|base|outpost|settlement|colony|mine|starport)\b/i;

function offsetRow({ column, row }) {
  return row - Math.floor((column - 1) / 2);
}

export function hexDistance(first, second) {
  const columns = first.column - second.column;
  const rows = offsetRow(first) - offsetRow(second);
  return Math.max(Math.abs(columns), Math.abs(rows), Math.abs(columns + rows));
}

function economy(system, descriptions) {
  const tagText = (record, type) => (record.tags ?? []).filter(Boolean).map(name =>
    [name, descriptions.get(JSON.stringify([type.toLowerCase(), name.trim().toLowerCase()]))].join(" ")
  ).join(" ");

  let population = 0;
  const signals = [tagText(system, "System")];

  function inspectLocation(location) {
    const occupants = location.description.match(/^Occupants:\s*([^\n]+)/im)?.[1] ?? location.description;
    if (inhabitedTypes.test(location.type) && !vacant.test(occupants)) {
      population = Math.max(population, 1);
      signals.push(location.type, location.description, tagText(location, location.type));
    }
    for (const child of location.children ?? []) inspectLocation(child);
  }

  for (const world of [system.mainWorld, ...(system.worlds ?? [])]) {
    if (!world) continue;
    const residents = world.profile.Population.trim();
    if (residents && !/failed colony|uninhabited/i.test(residents)) {
      population = Math.max(population, /^outpost$/i.test(residents) ? 1 : 2);
      signals.push(tagText(world, "Planet"));
      if (["TL4", "TL4+", "TL5"].includes(world.profile["Tech level"])) signals.push("industrial");
    }
    for (const location of world.locations ?? []) inspectLocation(location);
  }
  for (const location of system.locations ?? []) inspectLocation(location);

  const text = signals.join(" ");
  return { population, commerce: commerce.test(text), industry: industry.test(text), resources: resources.test(text) };
}

export function findTradeRoutes(systems, tags) {
  const descriptions = new Map(tags.map(({ type, name, description }) =>
    [JSON.stringify([type.trim().toLowerCase(), name.trim().toLowerCase()]), description]));
  const ports = systems.map(system => ({ system, ...economy(system, descriptions), links: 0 }))
    .filter(port => port.population);
  const candidates = [];

  for (const [index, first] of ports.entries()) {
    for (let other = index + 1; other < ports.length; other += 1) {
      const second = ports[other];
      const distance = hexDistance(first.system, second.system);
      if (distance > 3) continue;
      const complementary = (first.industry && second.resources) || (second.industry && first.resources);
      const score = first.population + second.population + Number(first.commerce) +
        Number(second.commerce) + (complementary ? 2 : 0) - distance;
      if (score >= 1) candidates.push({ first, second, distance, score });
    }
  }

  // Favour plausible short links and keep the map from becoming a web of lines.
  candidates.sort((a, b) => b.score - a.score || a.distance - b.distance);
  const routes = [];
  for (const { first, second } of candidates) {
    if (first.links >= 3 || second.links >= 3) continue;
    first.links += 1;
    second.links += 1;
    routes.push([first.system, second.system]);
  }
  return routes;
}

export function validTradeRoutes(routes, systems) {
  const byId = new Map(systems.map(system => [system.id, system]));
  const seen = new Set();
  return routes.filter(route => {
    if (!Array.isArray(route) || route.length !== 2) return false;
    const [first, second] = route.map(id => byId.get(id));
    if (!first || !second || first === second || hexDistance(first, second) > 3) return false;
    const key = JSON.stringify([...route].sort());
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
