export const presets = { swn: [8, 10], traveller: [8, 10], void: [10, 10] };
export const profileFields = ["Atmosphere", "Temperature", "Biosphere", "Population", "Tech level"];
export const validDimension = (value) => Number.isInteger(value) && value >= 1 && value <= 64;
export const validHex = ({ column, row }, { width, height }) =>
  validDimension(column) && validDimension(row) && column <= width && row <= height;

const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const provenance = (value) => record(value) && value.id === "swn-revised" && value.version === "revised";

export function readSector(json) {
  const sector = JSON.parse(json);
  const ids = new Set();
  const coords = new Set();
  const check = (condition) => {
    if (!condition) throw new Error("Invalid sector data.");
  };
  function identify(value) {
    check(record(value) && typeof value.id === "string" && value.id.length && !ids.has(value.id));
    ids.add(value.id);
  }
  function locations(values) {
    check(Array.isArray(values));
    for (const location of values) {
      identify(location);
      check(typeof location.name === "string" && typeof location.type === "string" &&
        typeof location.description === "string");
      if (location.children !== undefined) locations(location.children);
    }
  }
  function world(value) {
    identify(value);
    check(provenance(value.ruleset) && typeof value.name === "string" &&
      typeof value.description === "string" && record(value.profile) &&
      profileFields.every((field) => typeof value.profile[field] === "string") &&
      Array.isArray(value.tags) && value.tags.length === 2 &&
      value.tags.every((tag) => typeof tag === "string"));
    if (value.locations !== undefined) locations(value.locations);
  }
  identify(sector);
  check(sector.schemaVersion === 1 && provenance(sector.ruleset) &&
    record(sector.grid) && record(sector.selectedHex) && Array.isArray(sector.systems));
  check(sector.name === undefined || typeof sector.name === "string");
  check(sector.systemPointDie === undefined || [0, 4, 6, 8, 10, 20].includes(sector.systemPointDie));
  check(sector.starCountPolicy === undefined || ["fixed", "scaled"].includes(sector.starCountPolicy));
  const { grid } = sector;
  check(validDimension(grid.width) && validDimension(grid.height) && validHex(sector.selectedHex, grid));
  if (grid.preset === "traveller" && grid.width === 32 && grid.height === 40) grid.preset = "custom";
  if (grid.preset !== "custom") {
    check(Object.hasOwn(presets, grid.preset) &&
      presets[grid.preset][0] === grid.width && presets[grid.preset][1] === grid.height);
  }
  for (const system of sector.systems) {
    identify(system);
    check(provenance(system.ruleset) && typeof system.name === "string" && validHex(system, grid));
    const hex = `${system.column},${system.row}`;
    check(!coords.has(hex));
    coords.add(hex);
    check(system.description === undefined || typeof system.description === "string");
    if (system.tags !== undefined) {
      check(Array.isArray(system.tags) &&
        system.tags.every(tag => typeof tag === "string"));
    }
    if (system.mainWorld !== null) world(system.mainWorld);
    if (system.worlds !== undefined) {
      check(Array.isArray(system.worlds));
      system.worlds.forEach(world);
    }
    if (system.locations !== undefined) locations(system.locations);
  }
  return sector;
}
