import { orbitZone } from "./tpv.mjs";
import { adaptations, climateTables, communityProfile, hazards, surfaces } from "./tpv-world-data.mjs";

const pick = (roll, table) => table.find(([end]) => roll <= end)[1];
const sizes = ["Tiny", "Small", "Medium", "Large", "Huge"];
const climates = ["Supercold", "Cold", "Temperate", "Hot", "Superhot"];
const climateByOrbit = {
  Close: [[10, 2], [70, 3], [100, 4]], Near: [[10, 1], [75, 2], [95, 3], [100, 4]],
  Far: [[20, 0], [90, 1], [100, 2]], Extreme: [[90, 0], [100, 1]],
};
const gravity = [
  [0, 0, 1, 1, 2], [0, 0, 1, 1, 2], [0, 1, 2, 2, 3], [1, 2, 2, 3, 4], [1, 2, 3, 4, 4],
];
const diameters = [[200, 600, 1200, 1800, 2000], [2000, 3000, 4000, 5000, 6000],
  [6000, 8000, 10000, 12000, 14000], [14000, 15000, 16000, 17000, 18000], [18000, 19000, 20000, 21000, 22000]];
const featureTable = [
  [70, ""], [75, "Extreme weather"], [77, "Tidal lock"], [79, "Binary orbit"], [81, "Ringed"],
  [82, "Multiple rings"], [83, "Unstable tides"], [84, "Magnetic inversion"], [85, "Eccentric orbit"],
  [86, "Unexpectedly warmer"], [87, "Unexpectedly colder"], [88, "Inverted atmosphere"],
  [89, "Crustal displacement"], [90, "Shattered"], [95, "Precursor evidence"],
];
const exotic = ["ammonia", "chlorine-rich", "fluorine", "hydrogen-sulfide", "krypton-methane",
  "neon-nitrogen", "nitrous oxide", "silane-rich", "sulfur dioxide", "xenon-helium"];

function world(body, roll, classification, size, inheritedClimate) {
  const position = orbitZone(body.band).toLowerCase();
  let climate = inheritedClimate ?? pick(roll(100), climateByOrbit[orbitZone(body.band)]);
  const featureRoll = roll(100);
  const features = (featureRoll <= 95 ? [pick(featureRoll, featureTable)] :
    Array.from({ length: 2 }, () => pick(70 + roll(25), featureTable))).filter(Boolean);
  if (inheritedClimate === undefined) {
    for (const feature of features) {
      if (feature === "Unexpectedly warmer") climate = Math.min(4, climate + 1);
      if (feature === "Unexpectedly colder") climate = Math.max(0, climate - 1);
    }
  }
  const sizeIndex = Math.max(0, sizes.indexOf(size));
  const column = () => pick(roll(10), [[3, 0], [6, 1], [9, 2], [10, 3]]);
  const sizeColumn = () => pick(roll(10), [[1, 0], [3, 1], [7, 2], [9, 3], [10, 4]]);
  const diameter = diameters[sizeIndex][sizeColumn()];
  let gravityIndex = gravity[sizeIndex][sizeColumn()];
  const typeRoll = roll(100);
  const types = (typeRoll <= 95 ? [typeRoll] : [roll(95), roll(95)]).map(result =>
    climateTables[climate].find(([end]) => result <= end));
  const [, type, matrix] = types[0];
  const resources = matrix[column()][0];
  const water = matrix[column()][1];
  const densities = ["none", "thin", "medium", "dense", "superdense"];
  let atmosphereIndex = densities.indexOf(matrix[column()][2]);
  const waterPercent = {
    none: () => 0, minimal: () => roll(10), moderate: () => roll(10) * 5 + 10,
    plentiful: () => roll(10) * 3 + 60, maximal: () => roll(10) + 90,
  }[water]();
  const notes = features.filter(feature => feature !== "Unstable tides" || waterPercent > 0)
    .map(feature => feature === "Multiple rings" ? `${Math.max(2, roll(10) - 2)} rings` : feature);
  if (features.includes("Extreme weather")) atmosphereIndex = Math.max(atmosphereIndex, 2);
  if (features.includes("Shattered")) {
    gravityIndex = Math.max(0, gravityIndex - 1);
    atmosphereIndex = Math.max(0, atmosphereIndex - 1);
  }
  const gas = atmosphereIndex ? matrix[column()][3] : "";
  const composition = gas === "exotic gas" ? exotic[roll(10) - 1] : gas;
  const life = atmosphereIndex ? matrix[column()][4] : "none";
  function surfacePart(rows, index, bonus = false) {
    const result = bonus ? roll(63) + 30 : roll(100);
    if (result > 93) return `${surfacePart(rows, index, true)} / ${surfacePart(rows, index, true)}`;
    return rows[Math.floor((result - 1) / 3)][index];
  }
  for (let count = roll(3); count > 0; count -= 1) {
    const rows = surfaces[types[roll(types.length) - 1][1]];
    notes.push(`${surfacePart(rows, 0)} ${surfacePart(rows, 1).toLowerCase()}`);
  }
  if (hazards[type]) notes.push(hazards[type][roll(10) - 1]);
  if (life !== "none" && adaptations[type]) notes.push(`Life adapted for ${adaptations[type][roll(10) - 1].toLowerCase()}`);
  return {
    classification, type: [...new Set(types.map(([, name]) => name))].join("/"), position, size: sizes[sizeIndex],
    climate: climates[climate].toLowerCase(), diameter, gravity: ["zero", "low", "moderate", "heavy", "crushing"][gravityIndex],
    atmosphere: densities[atmosphereIndex], composition, water, waterPercent, life, resources, notes,
  };
}

const sizeRoll = roll => sizes[pick(roll(100), [[10, 0], [30, 1], [75, 2], [95, 3], [100, 4]])];
const outpost = [[35, "Resupply depot"], [55, "Mining outpost"], [70, "Communications relay"],
  [75, "Weather station"], [85, "Research outpost"], [95, "Military outpost"]];
const station = [[5, "Prison station"], [15, "Shipyard"], [30, "Habitat"], [45, "Corporate franchise"],
  [75, "Trade hub"], [85, "Research station"], [95, "Military base"]];
const colony = [[5, "Prison colony"], [15, "Farming colony"], [35, "Mining colony"], [50, "Industrial colony"],
  [60, "Corporate franchise"], [75, "Trading post"], [85, "Research base"], [95, "Military base"]];
const special = {
  Outpost: ["Adaptive energy shield", "Cryostasis chambers", "Emergency shelters", "Extensive hydroponics",
    "Gravity manipulator", "Holographic recreation", "Mobile defences", "Modular habitation pods",
    "Radiation shielding", "Renewable energy source", "Terraforming station", "Weather management"],
  Station: ["Artificial sky", "Atmospheric controls", "Central AI hub", "Cultural heritage level",
    "Dynamic shielding dome", "Escape pod network", "Holographic installations", "Memorial promenade",
    "Observation deck", "Orbital greenhouses", "Rotational gravity rings", "Zero-G recreation"],
  Colony: ["Adaptive architecture", "Aquatic habitat", "Atmosphere processors", "Biome integration",
    "Climate control shield", "Cloning facility", "Cultural preserve", "Shielded domes", "Floating structures",
    "Mobile structures", "Simulated weather", "Subterranean sectors"],
};

export function developBody(body, roll) {
  const worlds = [];
  const lunar = /lunar|populated moon/i.test(body.type) || body.kind === "moon";
  const land = lunar || /planetary|orbital space station/i.test(body.type) || body.kind === "planet";
  if (land) {
    const hostSize = lunar ? sizeRoll(roll) : (body.size ?? sizeRoll(roll));
    worlds.push(world(body, roll, "planet", hostSize));
    if (lunar) {
      const proposed = body.size ?? sizeRoll(roll);
      const moonSize = sizes.indexOf(proposed) < sizes.indexOf(hostSize) ? proposed : "Tiny";
      worlds.push(world(body, roll, "moon", moonSize));
    }
  }
  const type = /outpost/i.test(body.type) ? "Outpost" : /station/i.test(body.type) ? "Station" :
    /colony/i.test(body.type) ? "Colony" : "";
  if (!type) return { worlds };
  const functions = { Outpost: outpost, Station: station, Colony: colony }[type];
  const purposeRoll = roll(100);
  const purposes = (purposeRoll > 95 ? [roll(95), roll(95)] : [purposeRoll]).map(result => pick(result, functions));
  const specialRoll = roll(100);
  const features = specialRoll <= 35 ? [] : (specialRoll > 95 ? [roll(60) + 35, roll(60) + 35] : [specialRoll])
    .map(result => special[type][Math.floor((result - 36) / 5)]);
  const population = (roll(10) + roll(10)) * (type === "Outpost" ? 25 : 1000) *
    (purposes.includes("Habitat") ? 2 : 1);
  const prompts = [0, 1, 2].map(index => {
    const result = roll(100);
    const entry = value => communityProfile[Math.floor((value - 1) / 4)][index];
    return result <= 96 ? entry(result) : `${entry(roll(96))} / ${entry(roll(96))}`;
  });
  return { worlds, centre: { type, purposes, features, population, prompts } };
}

export const canDevelopBody = body => ["planet", "moon"].includes(body.kind) || /outpost|station|colony/i.test(body.type);

export function worldNotation(name, profile) {
  const gas = profile.composition ? ` (${profile.composition})` : "";
  const details = profile.notes.length ? ` ${profile.notes.join(", ")}.` : "";
  return `${name.toUpperCase()}: ${profile.type} ${profile.classification}, ${profile.position}, ${profile.size.toLowerCase()}, ${profile.climate}, G ${profile.gravity}, A ${profile.atmosphere}${gas}, W ${profile.water} (${profile.waterPercent}%), L ${profile.life}, R ${profile.resources}.${details}`;
}
