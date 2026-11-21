import assert from "node:assert/strict";
import { test } from "node:test";
import { readSector } from "./sector-data.mjs";
import { generateSystems, rerollTag } from "./swn.mjs";

function sample() {
  const grid = { preset: "custom", width: 12, height: 9 };
  const ruleset = { id: "swn-revised", version: "revised" };
  const sector = {
    schemaVersion: 1, id: "sector-id", name: "Home sector", grid, ruleset,
    selectedHex: { column: 12, row: 9 }, starCountPolicy: "fixed",
  };
  let id = 0;
  sector.systems = generateSystems(sector, "fixed", () => 1, () => String(++id));
  const system = sector.systems[0];
  Object.assign(system, sector.selectedHex, { name: "Moved system" });
  system.mainWorld.tags[0] = "Custom tag";
  system.mainWorld.profile.Atmosphere = "Custom atmosphere";
  system.locations = [{ id: "base", name: "Base", type: "Station", description: "",
    children: [{ id: "dock", name: "Dock", type: "Room", description: "Quarantine" }] }];
  system.worlds = [{ ...structuredClone(system.mainWorld), id: "other-world" }];
  return sector;
}

test("edited sectors preserve IDs, empty hexes, moved systems and nested locations", () => {
  const original = sample();
  assert.deepEqual(readSector(JSON.stringify(original)), original);
  assert.equal(original.systems.length, 21);
});

test("invalid structures, coordinates and duplicate IDs are rejected", () => {
  assert.throws(() => readSector("{"), SyntaxError);
  const corruptions = [
    (sector) => { sector.systems[0].mainWorld.tags = []; },
    (sector) => { sector.systems[0].column = 13; },
    (sector) => { sector.systems[0].id = sector.id; },
    (sector) => { sector.systems[0].locations[0].children = {}; },
    (sector) => { sector.systems[0].mainWorld.profile = {}; },
    (sector) => { sector.systems[0].column = sector.systems[1].column;
      sector.systems[0].row = sector.systems[1].row; },
  ];
  for (const corrupt of corruptions) {
    const sector = sample();
    corrupt(sector);
    assert.throws(() => readSector(JSON.stringify(sector)), /Invalid sector data/);
  }
});

test("original blank sectors and the legacy Traveller preset can still load", () => {
  const sector = sample();
  sector.systems = [];
  delete sector.name;
  delete sector.starCountPolicy;
  sector.grid = { preset: "traveller", width: 32, height: 40 };
  assert.deepEqual(readSector(JSON.stringify(sector)).grid, { ...sector.grid, preset: "custom" });
});

test("tag rerolls exclude the other tag and accept user-entered tags", () => {
  assert.equal(rerollTag("Abandoned Colony", () => 1), "Alien Ruins");
  assert.equal(rerollTag("Custom tag", () => 1), "Abandoned Colony");
});
