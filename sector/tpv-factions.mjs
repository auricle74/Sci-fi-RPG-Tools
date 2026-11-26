import { tpvDistance } from "./tpv.mjs";

export const relationships = ["Allies", "Trade Partners", "Indifferent", "Wary", "Rivals",
  "Overlord and Vassal", "Coloniser and Indigenous", "Enemies"];
const relationshipBounds = [12, 25, 40, 52, 64, 76, 88, 100];

export function rollRelationship(roll) {
  const result = roll(100);
  return relationships[relationshipBounds.findIndex(end => result <= end)];
}

export function availablePresence(sector, society, type) {
  const systems = sector.systems.filter(system => system.stars);
  const core = new Set([society.homeSystemId, ...(society.coreSystems ?? [])].filter(Boolean));
  const claimed = new Set([...core, ...(society.frontierSystems ?? [])]);
  const occupiedCore = new Set((sector.societies ?? []).flatMap(other =>
    [other.homeSystemId, ...(other.coreSystems ?? [])]).filter(Boolean));
  const byId = new Map(systems.map(system => [system.id, system]));
  const eligible = new Set();
  for (const route of sector.tradeRoutes ?? []) {
    const [first, second] = route;
    if (!core.has(first) && !core.has(second)) continue;
    const destination = core.has(first) ? second : first;
    if (type === "Core" && tpvDistance(byId.get(first), byId.get(second)) > 2) continue;
    if (type === "Frontier" && occupiedCore.has(destination)) continue;
    eligible.add(destination);
  }
  return systems.filter(system => eligible.has(system.id) && !claimed.has(system.id));
}

export function factionPresence(sector, systemId) {
  return (sector.societies ?? []).flatMap(society => {
    const role = society.homeSystemId === systemId ? "Home" :
      society.coreSystems?.includes(systemId) ? "Core" :
      society.frontierSystems?.includes(systemId) ? "Frontier" : undefined;
    return role ? [{ name: society.name, role }] : [];
  });
}

export function satelliteLocationId(system, body, index = system.satellites.indexOf(body)) {
  return body.id ?? `${system.id}:${body.band}:${body.name}:${index}`;
}

export function satelliteHomeSocieties(sector, system, body) {
  const id = satelliteLocationId(system, body);
  return (sector.factionManager?.factions ?? []).flatMap(faction => {
    if (faction.home !== id && faction.home !== `${id}:host`) return [];
    const society = (sector.societies ?? []).find(item => item.id === faction.sourceId);
    if (society?.homeSystemId && society.homeSystemId !== system.id) return [];
    return [{ name: society?.name ?? faction.name, colour: faction.colour }];
  });
}
