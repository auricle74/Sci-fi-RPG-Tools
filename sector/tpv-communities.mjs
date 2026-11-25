import { districtTables, facilityObjects, villageBasic } from "./tpv-community-tables.mjs";
import { rollNpcName } from "./tpv-npc-names.mjs";
import { rollSiteName } from "./tpv-site-names.mjs";
import { communityProfile } from "./tpv-world-data.mjs";

export const siteTypes = ["Outpost", "Colony", "Village", "Town", "City", "Megacity", "Facility"];
const pick = (values, roll) => values[roll(values.length) - 1];
const weighted = (rows, result) => rows.find(([limit]) => result <= limit)[1];
const dice = (count, roll) => Array.from({ length: count }, () => roll(10)).reduce((a, b) => a + b);
const counts = [5, 15, 30, 50, 70, 85, 95, 100].map((limit, index) => [limit, index]);
const districts = ["Mixed", "Slum", "Residential", "Industrial", "Transit", "Commercial",
  "Financial/Corporate", "Religious/Historic", "Academic", "Science/Medical", "Municipal"];
const cityOdds = [20, 30, 45, 50, 60, 75, 80, 85, 90, 95, 100].map((limit, index) => [limit, districts[index]]);
const townFunctions = [
  [20, ["Residential centre", [2, 2, 0], [0, 0, 1, 2, 2, 2, 5, 5, 7, 10]]],
  [45, ["Industrial centre", [3, 3, 0], [0, 1, 1, 2, 3, 3, 3, 4, 4, 7]]],
  [55, ["Transportation centre", [4, 2, 0], [0, 1, 2, 3, 3, 4, 4, 5, 6, 10]]],
  [80, ["Commercial centre", [5, 2, 0], [0, 0, 1, 2, 4, 5, 5, 6, 7, 10]]],
  [90, ["Academic centre", [8, 2, 0], [0, 1, 2, 5, 8, 8, 9, 9, 7, 10]]],
  [100, ["Government centre", [10, 2, 0], [0, 0, 1, 2, 4, 5, 5, 9, 7, 10]]],
];
const villageFunctions = [[40, "Subsistence"], [60, "Farming"], [75, "Mining"], [90, "Crossroads"], [95, "Religious site"]];
const villageAreas = {
  Subsistence: ["Homes", "Water source", "Workshop", "Gathering area"],
  Farming: ["Granary", "Irrigation works", "Harvest centre", "Farmers’ homes"],
  Mining: ["Miners’ quarters", "Minehead", "Refinery", "Equipment depot"],
  Crossroads: ["Landing platform", "Warehouse", "Market", "Public house"],
  "Religious site": ["Pilgrims’ hostel", "Monastery", "Shrine", "Sacred grove"],
};
const villageRoles = {
  Subsistence: ["Food producer", "Builder"], Farming: ["Irrigator", "Seedkeeper"],
  Mining: ["Miner", "Prospector"], Crossroads: ["Vendor", "Merchant"],
  "Religious site": ["Pilgrim", "Priest"],
};
const facilityFunctions = [[15, "Corporate"], [25, "Covert"], [35, "Government"], [65, "Industrial"],
  [75, "Medical"], [90, "Military/Security"], [100, "Science/Research"]];
const facilityAreas = {
  Corporate: ["Data vault", "Meeting room", "Executive office"],
  Covert: ["Surveillance room", "Training area", "Interview room"],
  Government: ["Security bunker", "Council chamber", "Diplomatic wing"],
  Industrial: ["Extraction area", "Processing floor", "Worker quarters"],
  Medical: ["Triage", "Recovery ward", "Surgery"],
  "Military/Security": ["Detention area", "Barracks", "Command bunker"],
  "Science/Research": ["Specimen storage", "Laboratory", "Data analysis"],
};
const special = [[35, ""], [40, "Historic site"], [45, "Ecological relationship"], [50, "Burial structures"],
  [55, "Novel architecture"], [60, "Tunnels"], [65, "Caldera"], [70, "Monument"], [75, "Grove"],
  [80, "Waterfall"], [85, "Chasm"], [90, "Dramatic terrain"], [95, "Energy collection zone"]];
const mixedOdds = [5, 35, 40, 50, 70, 75, 80, 85, 90, 100].map((limit, index) => [limit, districts[index + 1]]);

function districtEntry(type, column, roll, depth = 0) {
  const district = type === "Mixed" ? weighted(mixedOdds, roll(100)) : type;
  const rows = districtTables[district][column];
  const result = weighted(rows, roll(depth < 4 ? 100 : 98));
  const reference = districts.find(name => name.toUpperCase() === result.replace(/^Roll /i, ""));
  return reference ? districtEntry(reference, column, roll, depth + 1) : result;
}

function facilityObjectsFor(roll) {
  const entries = [];
  for (let index = 0, count = roll(3); index < count; index += 1) {
    const result = roll(100);
    for (let detailIndex = 0; detailIndex < (result > 96 ? 2 : 1); detailIndex += 1) {
      const prop = weighted(facilityObjects.map(([limit, , item]) => [limit, item]), roll(96));
      const detail = weighted(facilityObjects, result > 96 ? roll(96) : result);
      entries.push(["Detail", detail.replace("PROP", prop.toLowerCase())], ["Prop", prop]);
    }
  }
  return entries;
}

function named(type, roll, fields = {}) {
  return { id: crypto.randomUUID(), type, name: rollSiteName(roll), ...fields };
}

export function makeCommunity(type, roll, world) {
  const site = named(type, roll, {
    summary: [], children: [],
  });
  if (type === "Facility") {
    site.function = weighted(facilityFunctions, roll(100));
    const themes = ["Corporate exploitation", "Dark secrets", "Environmental collapse", "Genetic manipulation",
      "Lost knowledge", "Military oppression", "Squandered potential", "Survival of the fittest",
      "Technological overreach", "Unethical experiments"];
    const causes = ["Budget cuts", "Evacuation", "Failed experiment", "Hostile takeover", "Invasion",
      "Obsolescence", "Political collapse", "Quarantine", "Rebellion", "Resource depletion"];
    const condition = weighted([[10, "Pristine"], [20, "Functional"], [30, "Damaged"], [65, "Abandoned"],
      [100, "Ruined"]], roll(100));
    site.summary.push(["Theme", pick(themes, roll)], ["Condition", condition]);
    if (!["Pristine", "Functional"].includes(condition)) site.summary.push(["Cause of collapse", pick(causes, roll)]);
  } else {
    const population = { Outpost: [2, 25], Colony: [2, 1000], Village: [5, 200], Town: [10, 1000],
      City: [10, 500000], Megacity: [10, 100000000] }[type];
    site.summary.push(["Population", dice(population[0], roll) * population[1]]);
    const profile = ["Theme", "Appearance", "Complication"].map((label, index) =>
      [label, communityProfile[roll(communityProfile.length) - 1][index]]);
    site.summary.push(...profile);
  }
  if (type === "Village" || type === "Town") {
    const result = roll(100);
    const features = result >= 96
      ? [weighted(special, 35 + roll(60)), weighted(special, 35 + roll(60))]
      : [weighted(special, result)];
    if (features[0]) site.summary.push(["Features", [...new Set(features)].join(", ")]);
  }
  if (type === "Village") {
    const result = roll(100);
    site.functions = [...new Set((result >= 96 ? [roll(95), roll(95)] : [result])
      .map(value => weighted(villageFunctions, value)))];
    site.summary.push(["Function", site.functions.join(" / ")]);
  }
  if (type === "Town") {
    const [purpose, base, extra] = weighted(townFunctions, roll(100));
    site.summary.push(["Function", purpose]);
    const count = 3 + weighted(counts, roll(100));
    const types = [...base, ...Array.from({ length: count - base.length }, () => pick(extra, roll))];
    site.children = types.map(index => makeDistrict(districts[index], roll));
  }
  if (type === "City") site.children = makeDistricts(roll, true);
  if (type === "Megacity") {
    const result = roll(100);
    const scope = result <= 65 ? 1 : roll(10) + (result <= 85 ? 1 : result <= 95 ? 11 : result <= 99 ? 21 : 31);
    // TPV SIZE table, p. 51. Region count is independent of diameter.
    const regionCounts = { Tiny: [1, 1, 2, 2, 3], Small: [2, 3, 4, 5, 6], Medium: [6, 8, 10, 12, 14],
      Large: [16, 18, 20, 22, 24], Huge: [26, 28, 32, 36, 40] };
    const worldRegions = world ? (world.regions ??= weighted([1, 3, 7, 9, 10].map((limit, index) =>
      [limit, (regionCounts[world.size] ?? regionCounts.Medium)[index]]), roll(10))) : 16;
    site.worldSpanning = scope >= worldRegions;
    site.children = Array.from({ length: Math.min(scope, worldRegions) }, () => makeRegion(roll));
    site.summary.push(["Scope", site.worldSpanning ? "World-spanning" : `${scope} regions`]);
  }
  return site;
}

export function makeRegion(roll) {
  return named("Region", roll);
}

export function makeDistrict(type, roll) {
  return named("District", roll, { function: type });
}

function makeDistricts(roll, city) {
  const count = 5 + weighted(counts, roll(100));
  const base = city ? ["Mixed", "Slum", "Residential", "Transit", "Municipal"] : [];
  return [...base, ...Array.from({ length: count - base.length }, () => weighted(cityOdds, roll(100)))]
    .map(type => makeDistrict(type, roll));
}

export function developCommunity(site, roll) {
  if (site.type === "Region") {
    site.children = makeDistricts(roll, false);
    return;
  }
  let areas;
  let roles;
  if (site.type === "Village") {
    areas = [...new Set([
      ...site.functions.filter(purpose => purpose !== "Subsistence").map(purpose => pick(villageAreas[purpose], roll)),
      ...Array.from({ length: 3 }, () => weighted(villageBasic[0], roll(80))),
    ])];
    roles = [
      ...site.functions.filter(purpose => purpose !== "Subsistence").flatMap(purpose => villageRoles[purpose]),
      weighted(villageBasic[1], roll(80)),
    ];
  } else if (site.type === "District") {
    areas = [...new Set(Array.from({ length: 2 + roll(4) }, () => districtEntry(site.function, 0, roll)))];
  } else if (site.type === "Facility") {
    areas = ["Reception", ...facilityAreas[site.function], "Maintenance and storage"];
    roles = ["Facility technician", "Site manager"];
  } else {
    areas = ["Landing pad", "Habitation", "Supply depot", "Operations centre"];
    roles = ["Administrator", "Technician"];
  }
  site.children = areas.map(area => named("Location", roll, {
    function: area,
    summary: site.type === "Facility" ? facilityObjectsFor(roll) :
      [["Inhabitant", `${rollNpcName(roll).name} · ${site.type === "District" ? districtEntry(site.function, 1, roll) : pick(roles, roll)}`]],
  }));
}

export function initialWorldSites(world, populated, society, roll) {
  // App defaults: 1–3 settlements on populated worlds, up to 4 on large stable worlds.
  // Sparse societies reduce the cap; unpopulated worlds have a 1-in-6 chance of a facility.
  if (!populated) return roll(6) === 1 ? [makeCommunity("Facility", roll, world)] : [];
  const large = ["Large", "Huge"].includes(world.size);
  const sparse = /declin|collaps|abandon/i.test(society?.condition ?? "");
  const limit = sparse ? 2 : large ? 4 : 3;
  return Array.from({ length: roll(limit) }, (_, index) => {
    const type = weighted([[10, "Facility"], [20, "Outpost"], [30, "Colony"], [62, "Village"],
      [86, "Town"], [large ? 98 : 100, "City"], [100, "Megacity"]], index === 0 ? 10 + roll(90) : roll(100));
    return makeCommunity(type, roll, world);
  });
}
