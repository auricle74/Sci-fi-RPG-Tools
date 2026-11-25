import { hexDistance } from "./trade-routes.mjs";

export const tpvRules = { id: "perilous-void", version: "1" };

const pick = (value, table) => table.find(([end]) => value <= end)[1];
const starTypes = [
  [10, ["White dwarf", 0, 0]], [13, ["Massive blue (O)", 0, 0]],
  [14, ["Huge blue (B)", 0, 0]], [15, ["Blue (A)", 1, 5]],
  [17, ["Blue-white (F)", 1, 3]], [20, ["White-yellow (G)", 1, 1]],
  [29, ["Orange-red (K)", 2, 5]], [114, ["Red (M)", 2, 2]],
];
const nebulae = ["Emission nebula", "Reflection nebula", "Dark nebula", "Planetary nebula",
  "Supernova remnant", "Ionic nebula", "Protoplanetary nebula", "Astrophage nebula",
  "Giant molecular cloud", "Supergiant shell nebula"];
const anomalies = [
  [6, "Black hole"], [10, "Cosmic mirage"], [14, "Gravitational sirens"], [23, "Gravity spire"],
  [32, "Jumpspace fog"], [41, "Jumpspace nexus"], [47, "Quantum rift"], [51, "Nanite swarm"],
  [57, "Neutron star"], [59, "Paranormal vortex"], [65, "Pulsar"], [66, "Quasar"],
  [67, "Sentient star"], [76, "Stellar maelstrom"], [80, "Supermassive black hole"],
  [84, "Temporal anomaly"], [90, "Void whorl"], [95, "Warp vortex"], [100, "Wormhole"],
];

function rollStars(roll) {
  const first = roll(100);
  let remaining = first <= 5 ? 2 : 1;
  let result = first <= 5 ? roll(100) : first;
  const stars = [];
  while (remaining > 0) {
    if (result <= 5) {
      remaining += 1;
    } else {
      const prefix = result === 11 ? "Giant" : result === 12 ? "Supergiant" : "";
      const [type, dice, penalty] = pick(prefix ? roll(100) + 14 : result, starTypes);
      stars.push({ type: prefix ? `${prefix} · ${type}` : type, dice, penalty });
      remaining -= 1;
    }
    if (remaining) result = roll(100);
  }
  return stars;
}


const shifted = ({ column, row }) => ({ column, row: row + column % 2 });
export const tpvDistance = (cell, other) => hexDistance(shifted(cell), shifted(other));
const adjacent = (cell, other) => tpvDistance(cell, other) === 1;
export const jumpRisk = (distance) => ["Safe", "Unsafe", "Dangerous"][distance - 1];

// Sector Creation, pp. 32–37.
export function generateTpvSector(roll, makeId, nameFor, starting, { width = 10, height = 10 } = {}) {
  const area = width * height;
  const cells = Array.from({ length: area }, (_, index) => ({
    column: 1 + Math.floor(index / height), row: 1 + index % height,
  }));
  const count = Math.max(1, Math.round(area / 5), starting && area > 1 ? 2 : 0);
  const placed = new Set();
  if (starting) {
    const middle = Math.ceil(width / 2);
    const row = Math.ceil(height / 2);
    const central = [
      [middle - 1, row + 1], [middle, row], [middle, row + 1], [middle + 1, row + 1],
    ].map(([column, row]) => cells.find(cell => cell.column === column && cell.row === row)).filter(Boolean);
    if (central.length < Math.min(2, count)) {
      central.push(cells.find(cell => !central.includes(cell)));
    }
    for (let index = 0; index < Math.min(2, count); index += 1) {
      placed.add(central.splice(roll(central.length) - 1, 1)[0]);
    }
  }
  while (placed.size < count) {
    const chosen = cells[(roll(width) - 1) * height + roll(height) - 1];
    const free = cells.filter(cell => !placed.has(cell));
    const neighbours = free.filter(cell => adjacent(chosen, cell));
    const alternatives = neighbours.length ? neighbours : free;
    placed.add(placed.has(chosen) ? alternatives[roll(alternatives.length) - 1] : chosen);
  }

  return cells.filter(cell => placed.has(cell)).map(cell => {
    const base = { ...cell, id: makeId(), name: nameFor(), ruleset: { ...tpvRules } };
    const category = roll(100);
    if (category <= 85) {
      const stars = rollStars(roll);
      return { ...base, kind: "star", type: stars.map(star => star.type).join(" / "), stars };
    }
    if (category <= 95) {
      const index = Math.floor((roll(100) - 1) / 10);
      const coverage = [cell];
      if (index >= 8) {
        const extent = roll(10) + roll(10) + (index === 9 ? 18 : 0);
        for (let i = 0; i < extent && coverage.length < area; i += 1) {
          const frontier = cells.filter(other => !coverage.includes(other) &&
            coverage.some(existing => adjacent(existing, other)));
          coverage.push(frontier[roll(frontier.length) - 1]);
        }
      }
      return { ...base, kind: "nebula", type: nebulae[index], coverage };
    }
    const type = pick(roll(100), anomalies);
    return { ...base, kind: "anomaly", type, ...(type === "Sentient star" ? { stars: rollStars(roll) } : {}) };
  });
}

const populationTypes = ["Deep-space outpost", "Orbital outpost", "Lunar outpost", "Planetary outpost",
  "Lunar colony", "Planetary colony", "Deep-space station", "Orbital space station", "Populated moon", "Populated planet"];
const population = [
  [[5, 6], [15, 7], [25, 8], [100, 9]],
  [10, 20, 30, 45, 50, 60, 80, 85, 90, 100].map((end, index) => [end, index]),
  [[75, -1], ...[80, 85, 90, 96, 97, 98, 99, 100].map((end, index) => [end, index])],
];

const asteroidTypes = [[10, "Lone asteroid"], [50, "Asteroid field"], [90, "Asteroid belt"], [100, "Debris cluster"]];
const gasTypes = ["Typical giant", "Helium-rich giant", "Hydrogen-rich giant", "Ammonia-cloud giant",
  "Methane-ice giant", "Water-vapour giant", "Exotic-molecule giant"];
const artificialTypes = [[25, populationTypes[0]], [45, populationTypes[6]], [50, "Beacon network"],
  [55, "Communications relay"], [60, "Observation post"], [65, "Solar farm array"], [70, "Defence platform"],
  [75, "Distribution drones"], [80, "Mirror array"], [85, "Environmental control system"], [90, "Celestial observatory"],
  [95, "Spy network"], [99, "Transport relay"], [100, "Megastructure"]];
const phenomena = ["Corona cloud", "Flare belt", "Resonance ring", "Wisp stream", "Photon ring",
  "Dust halo", "Ice flotilla", "Photonic tide", "Magnetic wake", "Ion beacon"];

const asteroidFeatures = [[30, "Unremarkable"], [50, "Icy"], [70, "Resource rich"],
  [73, "Impact craters"], [76, "Unstable composition"], [79, "Magnetic field swarm"],
  [82, "Hollowed out"], [85, "Hyperkinetic cluster"], [88, "Mysterious signals"],
  [91, "Microbial life"], [94, "Biochemical anomalies"], [95, "Ancient relics"]];
const giantFeatures = [[30, "Typical"], [40, "Moons"], [45, "Ringed"], [50, "Multiple rings"],
  [55, "Gas plumes"], [60, "Cyclonic"], [65, "Polychromatic"], [70, "Subsurface ocean"],
  [75, "Radioactive core"], [80, "Zonal shear layers"], [85, "High-energy aurora"],
  [90, "Fluorescent"], [95, "Metallic atmosphere"]];

function rollFeatures(roll, table) {
  const result = roll(100);
  if (result < 96) return [pick(result, table)];
  return Array.from({ length: 2 }, () => {
    return pick(roll(65) + 30, table);
  });
}

function satellite(roll) {
  const result = roll(100);
  if (result <= 15) {
    const type = pick(roll(100), asteroidTypes);
    return ["asteroid", type, type === "Debris cluster" ? [] : rollFeatures(roll, asteroidFeatures)];
  }
  if (result <= 30) {
    const type = gasTypes[Math.max(0, Math.floor((roll(100) - 31) / 10))];
    const features = rollFeatures(roll, giantFeatures).map(feature => {
      if (feature === "Moons") {
        const moons = roll(10) + roll(10) - 1;
        const moonlets = Array.from({ length: moons }, () => Math.max(0, roll(10) - 5));
        return `${moons} moons · Moonlets per moon: ${moonlets.join(", ")}`;
      }
      if (feature === "Multiple rings") return `${Math.max(2, roll(10) - 2)} rings`;
      return feature;
    });
    return ["giant", type, features];
  }
  if (result <= 85) return ["planet", "Planet"];
  if (result <= 95) return ["station", pick(roll(100), artificialTypes)];
  return ["phenomenon", phenomena[Math.floor((roll(100) - 1) / 10)]];
}

export function orbitZone(band) {
  return pick(band, [[2, "Close"], [5, "Near"], [8, "Far"], [10, "Extreme"]]);
}

// System Creation, pp. 38–45. Detailed world and settlement profiles are developed separately.
export function developTpvSystem(stars, status, roll, nameFor) {
  const count = stars.reduce((sum, star) => sum + Math.max(0,
    Array.from({ length: star.dice }, () => roll(10)).reduce((total, die) => total + die, 0) - star.penalty), 0);
  const bands = Array.from({ length: Math.max(status === "Wild" ? 0 : 1, count) }, () => roll(10))
    .sort((first, second) => first - second);
  let column = ["Core", "Frontier", "Wild"].indexOf(status);
  let previous = 0;
  let unpopulated = false;
  return bands.map(band => {
    let centre = -1;
    if (!unpopulated) {
      const result = roll(100);
      if (result < previous) column = Math.min(2, column + 1);
      previous = result;
      centre = pick(result, population[column]);
      unpopulated = centre === -1;
    }
    const [kind, type, features] = centre < 0 ? satellite(roll) :
      [centre === 8 ? "moon" : centre === 9 ? "planet" : "station", populationTypes[centre]];
    const sizes = [[10, "Tiny"], [30, "Small"], [75, "Medium"], [95, "Large"], [100, "Huge"]];
    const size = kind === "moon" || kind === "planet" ? pick(roll(100), sizes) : undefined;
    return { band, kind, type, size, features, name: nameFor() };
  });
}
