// The Perilous Void, pp. 50, 64–73. Each resource row ends at its inclusive d100 bound.
const rollsByRating = { none: 0, negligible: 0, poor: 1, average: 3, rich: 5, "ultra-rich": 10 };
const categories = [
  "Mineral ores", "Silicates", "Salt deposits", "Water ice", "Organic compounds",
  "Hydrocarbons", "Precious materials", "Rare elements", "Helium-3",
];

const byWorldType = {
  barren: [[40, 55, 65, 75, 80, 85, 90, 95, 100], [0, 1, 2, 3, 4, 5, 6, 7, 8]],
  frozen: [[35, 50, 65, 75, 80, 85, 90, 95, 100], [3, 1, 0, 2, 4, 5, 6, 7, 8]],
  arid: [[30, 50, 65, 75, 85, 90, 95, 100], [1, 0, 2, 3, 4, 5, 6, 7]],
  oceanic: [[20, 40, 55, 70, 80, 90, 95, 100], [3, 5, 4, 1, 2, 0, 6, 7]],
  arboreal: [[40, 55, 70, 75, 80, 85, 90, 95, 100], [4, 1, 5, 3, 2, 0, 6, 7, 8]],
  earthlike: [[15, 30, 45, 60, 75, 85, 90, 95, 100], [3, 1, 5, 4, 0, 2, 6, 7, 8]],
  volcanic: [[30, 55, 65, 75, 80, 85, 90, 95, 100], [0, 1, 7, 5, 4, 6, 2, 3, 8]],
  metallic: [[40, 55, 65, 75, 80, 85, 90, 95, 100], [0, 6, 7, 1, 5, 4, 2, 3, 8]],
};

const namedResources = {
  "Mineral ores": [
    [35, 50, 60, 70, 74, 78, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100],
    ["Iron", "Bauxite", "Copper", "Lead", "Zinc", "Nickel", "Tin", "Titanium",
      "Uranium", "Chromium", "Manganese", "Cobalt", "Tungsten", "Molybdenum", "Antimony", "Vanadium"],
  ],
  "Precious materials": [
    [20, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
    ["Silver", "Gold", "Platinum", "Palladium", "Iridium", "Garnet", "Opal", "Citrine",
      "Aquamarine", "Topaz", "Amethyst", "Ruby", "Emerald", "Sapphire", "Diamond"],
  ],
  "Organic compounds": [
    [20, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
    ["Chitin", "Terpenes", "Pigments", "Tannins", "Resins", "Flavonoids", "Volatile oils",
      "Steroids", "Glycosides", "Saponins", "Alkaloids", "Lignin", "Iridoids", "Mycotoxins", "Cytokines"],
  ],
  "Rare elements": [
    [20, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
    ["Lanthanum", "Cadmium", "Samarium", "Strontium", "Indium", "Tellurium", "Yttrium",
      "Neodymium", "Thallium", "Bismuth", "Gallium", "Hafnium", "Rhenium", "Promethium", "Tantalum"],
  ],
};

const indexFor = (bounds, result) => bounds.findIndex(bound => result <= bound);

export function rollWorldResources(world, roll) {
  const count = rollsByRating[world.resources.toLowerCase()] ?? 0;
  const types = world.type.toLowerCase().split("/").map(type => type.trim())
    .filter(type => Object.hasOwn(byWorldType, type));
  if (!types.length) return [];
  return Array.from({ length: count }, () => {
    const type = types.length === 1 ? types[0] : types[roll(types.length) - 1];
    const [bounds, results] = byWorldType[type];
    const category = categories[results[indexFor(bounds, roll(100))]];
    const names = namedResources[category];
    return names ? { category, name: names[1][indexFor(names[0], roll(100))] } : { category };
  });
}

export function recordWorldResources(body, roll) {
  let changed = false;
  for (const world of body.development?.worlds ?? []) {
    if (world.resourceDeposits !== undefined) continue;
    world.resourceDeposits = rollWorldResources(world, roll);
    changed = true;
  }
  return changed;
}
