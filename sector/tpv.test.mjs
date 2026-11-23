import { test } from "node:test";
import assert from "node:assert/strict";
import { developTpvSystem, generateTpvSector, orbitZone, tpvDistance, tpvRules } from "./tpv.mjs";
import { readSector } from "./sector-data.mjs";

test("TPV starting sector has twenty distinct subsectors, including two central hexes", () => {
  let sequence = 0;
  const id = () => String(++sequence);
  const systems = generateTpvSector(sides => sides === 100 ? 80 : 1, id, id, true);
  const coordinates = new Set(systems.map(({ column, row }) => `${column},${row}`));
  assert.equal(coordinates.size, 20);
  assert.ok(coordinates.has("4,6") && coordinates.has("5,5"));
  assert.ok(systems.every(system => system.kind === "star" && system.stars.length === 1));
  const sector = {
    id: "sector", schemaVersion: 1, name: "Test sector", ruleset: tpvRules,
    grid: { preset: "void", width: 10, height: 10 },
    selectedHex: { column: 4, row: 6 }, systems, tradeRoutes: [],
  };
  assert.deepEqual(readSector(JSON.stringify(sector)), sector);
});

test("TPV feature rolls preserve anomalies and expand large nebulae", () => {
  let sequence = 0;
  const id = () => String(++sequence);
  const nebulae = generateTpvSector(sides => sides === 100 ? 91 : 1, id, id, false);
  assert.equal(nebulae[0].type, "Supergiant shell nebula");
  assert.equal(nebulae[0].coverage.length, 21);
  const anomalies = generateTpvSector(sides => sides === 100 ? 100 : 1, id, id, false);
  assert.ok(anomalies.every(feature => feature.kind === "anomaly" && feature.type === "Wormhole"));
});

test("population class affects orbital generation and guarantees a core satellite", () => {
  const compact = [{ type: "White dwarf", dice: 0, penalty: 0 }];
  assert.deepEqual(developTpvSystem(compact, "Wild", () => 6, () => "Test"), []);
  assert.deepEqual(developTpvSystem(compact, "Core", sides => sides === 100 ? 50 : 6, () => "Test"), [
    { band: 6, kind: "planet", type: "Populated planet", size: "Medium", features: undefined, name: "Test" },
  ]);
  assert.equal(orbitZone(6), "Far");
  assert.equal(tpvDistance({ column: 1, row: 1 }, { column: 2, row: 2 }), 1);
});
