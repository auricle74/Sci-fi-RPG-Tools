import { relationships } from "./tpv-factions.mjs";
import { tpvDistance, tpvRules } from "./tpv.mjs";
import { validTradeRoutes } from "./trade-routes.mjs";

export const presets = { swn: [8, 10], traveller: [8, 10], void: [10, 10] };
export const profileFields = ["Atmosphere", "Temperature", "Biosphere", "Population", "Tech level"];
export const validDimension = (value) => Number.isInteger(value) && value >= 1 && value <= 64;
export const validHex = ({ column, row }, { width, height }) =>
  validDimension(column) && validDimension(row) && column <= width && row <= height;

const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const provenance = (value) => record(value) && value.id === "swn-revised" && value.version === "revised";

const strings = value => Array.isArray(value) && value.every(item => typeof item === "string");
const validSwnTags = ({ swnTags, swnTagsEdited }) =>
  (swnTagsEdited === undefined || typeof swnTagsEdited === "boolean") &&
  (swnTags === undefined || Array.isArray(swnTags) && swnTags.every(tag =>
    record(tag) && typeof tag.type === "string" && typeof tag.name === "string"));

function validSite(areas) {
  return Array.isArray(areas) && areas.length > 0 && areas.every((area, index) =>
    record(area) && ["name", "occupant", "obstacle", "discovery"].every(key => typeof area[key] === "string") &&
    (area.position === undefined || Array.isArray(area.position) && area.position.length === 2 &&
      area.position.every(coordinate => Number.isSafeInteger(coordinate) && Math.abs(coordinate) <= areas.length)) &&
    Array.isArray(area.connects) && area.connects.every(number =>
      Number.isInteger(number) && number >= 1 && number <= areas.length && number !== index + 1));
}

function validSettlement(value) {
  return record(value) && typeof value.problem === "string" && typeof value.arrival === "string" &&
    Array.isArray(value.people) && value.people.every(person => record(person) &&
      ["name", "role", "motive"].every(key => typeof person[key] === "string")) &&
    Array.isArray(value.places) && value.places.every(place => record(place) &&
      typeof place.name === "string" && typeof place.detail === "string" &&
      (place.site === undefined || validSite(place.site)));
}

function validDevelopment(data) {
  return record(data) && Array.isArray(data.worlds) && data.worlds.every(world => record(world) && validSwnTags(world) &&
    ["classification", "type", "position", "size", "climate", "gravity", "atmosphere", "composition",
      "water", "life", "resources"].every(key => typeof world[key] === "string") &&
    Number.isInteger(world.diameter) && world.diameter > 0 &&
    Number.isInteger(world.waterPercent) && world.waterPercent >= 0 && world.waterPercent <= 100 &&
    strings(world.notes) && (world.lifeforms === undefined || Array.isArray(world.lifeforms) &&
      world.lifeforms.every(lifeform => record(lifeform) && typeof lifeform.form === "string" &&
        ["Microbial", "Simple", "Complex", "Advanced"].includes(lifeform.level) && strings(lifeform.traits) &&
        (lifeform.size === undefined || typeof lifeform.size === "string") &&
        (lifeform.quantity === undefined || Number.isInteger(lifeform.quantity) && lifeform.quantity > 0)))) && (data.centre === undefined || record(data.centre) &&
      (data.centre.name === undefined || typeof data.centre.name === "string") &&
      validSwnTags(data.centre) && typeof data.centre.type === "string" && Number.isInteger(data.centre.population) &&
      data.centre.population > 0 && strings(data.centre.purposes) && strings(data.centre.features) &&
      strings(data.centre.prompts) && (data.centre.settlement === undefined || validSettlement(data.centre.settlement)));
}

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
      if (location.tags !== undefined) {
        check(Array.isArray(location.tags) && location.tags.every(tag => typeof tag === "string"));
      }
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
  const tpv = sector.ruleset?.id === tpvRules.id && sector.ruleset.version === tpvRules.version;
  check(sector.schemaVersion === 1 && (tpv || provenance(sector.ruleset)) &&
    record(sector.grid) && record(sector.selectedHex) && Array.isArray(sector.systems));
  check(sector.addSwnTags === undefined || typeof sector.addSwnTags === "boolean");
  check(sector.name === undefined || typeof sector.name === "string");
  check(sector.generateTradeRoutes === undefined || typeof sector.generateTradeRoutes === "boolean");
  check(sector.systemPointDie === undefined || [0, 4, 6, 8, 10, 20].includes(sector.systemPointDie));
  check(sector.starCountPolicy === undefined || ["fixed", "scaled"].includes(sector.starCountPolicy));
  const { grid } = sector;
  check(validDimension(grid.width) && validDimension(grid.height) && validHex(sector.selectedHex, grid));
  if (tpv) check(!sector.generateTradeRoutes);
  if (grid.preset === "traveller" && grid.width === 32 && grid.height === 40) grid.preset = "custom";
  if (grid.preset !== "custom") {
    check(Object.hasOwn(presets, grid.preset) &&
      presets[grid.preset][0] === grid.width && presets[grid.preset][1] === grid.height);
  }
  for (const system of sector.systems) {
    identify(system);
    check((tpv ? system.ruleset?.id === tpvRules.id && system.ruleset.version === tpvRules.version :
      provenance(system.ruleset)) && typeof system.name === "string" && validHex(system, grid));
    const hex = `${system.column},${system.row}`;
    check(!coords.has(hex));
    coords.add(hex);
    if (tpv) {
      delete system.faction;
      check(validSwnTags(system));
      check(["star", "nebula", "anomaly"].includes(system.kind) && typeof system.type === "string");
      if (system.kind === "star" || system.type === "Sentient star" || system.stars !== undefined) {
        check(Array.isArray(system.stars) && system.stars.length && system.stars.every(star =>
          record(star) && typeof star.type === "string" && [0, 1, 2].includes(star.dice) &&
          Number.isInteger(star.penalty) && star.penalty >= 0 && star.penalty <= 5));
      }
      if (system.coverage !== undefined) check(Array.isArray(system.coverage) &&
        system.coverage.every(cell => record(cell) && validHex(cell, grid)));
      if (system.satellites !== undefined) check(system.stars &&
        ["Core", "Frontier", "Wild"].includes(system.status) && Array.isArray(system.satellites) &&
        system.satellites.every(body => record(body) && validSwnTags(body) && Number.isInteger(body.band) && body.band >= 1 &&
          body.band <= 10 && typeof body.name === "string" && typeof body.type === "string" &&
          ["planet", "moon", "station", "giant", "asteroid", "phenomenon"].includes(body.kind) &&
          (body.size === undefined || ["Tiny", "Small", "Medium", "Large", "Huge"].includes(body.size)) &&
          (body.development === undefined || validDevelopment(body.development)) &&
          (body.features === undefined || Array.isArray(body.features) &&
            body.features.every(feature => typeof feature === "string"))));
      continue;
    }
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
  if (sector.tradeRoutes !== undefined) {
    check(Array.isArray(sector.tradeRoutes) &&
      validTradeRoutes(sector.tradeRoutes, tpv ? sector.systems.filter(system => system.stars) : sector.systems,
        tpv ? tpvDistance : undefined).length === sector.tradeRoutes.length);
  }
  if (tpv) {
    const societies = sector.societies ?? [];
    check(Array.isArray(societies));
    const societyIds = new Set();
    const stars = new Set(sector.systems.filter(system => system.stars).map(system => system.id));
    for (const society of societies) {
      identify(society);
      check(typeof society.name === "string" && society.name.trim() &&
        Number.isInteger(society.tech) && society.tech >= 0 && society.tech <= 5 &&
        Number.isInteger(society.area) && society.area >= 0 && society.area <= 100 &&
        typeof society.condition === "string" && typeof society.politics === "string");
      const faction = society.faction;
      if (faction !== undefined) {
        check(record(faction) && strings(faction.type) && strings(faction.assets) && strings(faction.complications) &&
          ["reach", "base", "goal"].every(key => typeof faction[key] === "string") &&
          record(faction.leader) && strings(faction.leader.traits) &&
          ["name", "surname", "pronouns", "motivation"].every(key => typeof faction.leader[key] === "string"));
      }
      check(society.homeSystemId === undefined || stars.has(society.homeSystemId));
      for (const key of ["coreSystems", "frontierSystems"]) {
        check(society[key] === undefined || Array.isArray(society[key]) && society[key].every(id => stars.has(id)));
      }
      const claimed = [...(society.coreSystems ?? []), ...(society.frontierSystems ?? [])];
      if (society.homeSystemId !== undefined) claimed.push(society.homeSystemId);
      check(new Set(claimed).size === claimed.length);
      societyIds.add(society.id);
    }
    const relations = sector.societyRelationships ?? [];
    check(Array.isArray(relations));
    const pairs = new Set();
    for (const relation of relations) {
      check(record(relation) && societyIds.has(relation.first) && societyIds.has(relation.second) &&
        relation.first !== relation.second && relationships.includes(relation.kind));
      const pair = JSON.stringify([relation.first, relation.second].sort());
      check(!pairs.has(pair));
      pairs.add(pair);
    }
    for (const system of sector.systems) {
      for (const body of system.satellites ?? []) {
        const data = body.development;
        for (const target of [...(data?.worlds ?? []), data?.centre]) {
          check(target?.societyId === undefined || societyIds.has(target.societyId));
        }
      }
    }
  }
  return sector;
}
