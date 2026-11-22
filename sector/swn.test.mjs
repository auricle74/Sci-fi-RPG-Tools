import assert from "node:assert/strict";
import { test } from "node:test";
import { generateSystems, placeStars, rollWorld, starCount } from "./swn.mjs";

test("star-count policies preserve SWN rolls, scale large maps and fit small maps", () => {
  for (const policy of ["fixed", "scaled"]) {
    assert.equal(starCount(8, 10, policy, 1), 21);
    assert.equal(starCount(8, 10, policy, 10), 30);
    assert.equal(starCount(1, 1, policy, 10), 1);
  }
  assert.deepEqual([1, 10].map((d10) => starCount(32, 40, "fixed", d10)), [21, 30]);
  assert.deepEqual([1, 10].map((d10) => starCount(32, 40, "scaled", d10)), [336, 480]);
});

test("collisions at a boundary select a unique adjacent edge hex", () => {
  const rolls = [1, 1, 1, 1];
  assert.deepEqual(placeStars(8, 10, 2, 2, () => rolls.shift()), [
    { column: 1, row: 1 }, { column: 1, row: 2 },
  ]);
});

test("a reserved star bridges two clusters within spike-3 range", () => {
  const rolls = [1, 1, 7, 1];
  const placed = placeStars(8, 10, 3, 2, () => rolls.shift());
  assert.equal(placed[2].column, 4);
  assert.equal(rolls.length, 0);
});

test("all 2d6 totals map to the expected bands, with distinct percentile tags", () => {
  const expected = [
    ["Corrosive", "Frozen", "Remnant biosphere", "Failed colony", "TL0"],
    ["Inert gas", "Cold", "Microbial life", "Outpost", "TL1"],
    ["Airless or thin", "Variable cold", "No native biosphere", "Fewer than a million", "TL2"],
    ["Breathable", "Variable cold", "No native biosphere", "Fewer than a million", "TL2"],
    ["Breathable", "Temperate", "Human-miscible biosphere", "Several million", "TL4"],
    ["Breathable", "Temperate", "Human-miscible biosphere", "Several million", "TL4"],
    ["Breathable", "Temperate", "Human-miscible biosphere", "Several million", "TL4"],
    ["Breathable", "Variable warm", "Immiscible biosphere", "Hundreds of millions", "TL3"],
    ["Thick", "Variable warm", "Immiscible biosphere", "Hundreds of millions", "TL3"],
    ["Invasive", "Warm", "Hybrid biosphere", "Billions", "TL4+"],
    ["Corrosive and invasive", "Burning", "Engineered biosphere", "Alien inhabitants", "TL5"],
  ];
  for (let total = 2; total <= 12; total += 1) {
    let call = 0;
    const world = rollWorld((sides) => {
      if (sides === 100) return 1;
      if (sides === 99) return 99;
      return call++ % 2 === 0 ? Math.min(6, total - 1) : Math.max(1, total - 6);
    });
    assert.deepEqual(Object.values(world.profile), expected[total - 2]);
    assert.deepEqual(world.tags, ["Abandoned Colony", "Zombies"]);
  }
  assert.deepEqual(rollWorld(() => 1).tags, ["Abandoned Colony", "Alien Ruins"]);
});

test("Large custom-map generation remains unique under repeated coordinate rolls", () => {
  let id = 0;
  const systems = generateSystems({grid: {width: 32, height: 40}, ruleset: { id: "swn-revised" }},
    "scaled", () => 1, () => String(++id));
  assert.equal(systems.length, 336);
  assert.equal(new Set(systems.map(({column, row}) => `${column},${row}`)).size, 336);
  assert.equal(new Set(systems.flatMap((system) => [system.id, system.mainWorld.id])).size, 672);
});

test("generated worlds and points have names distinct from their types and each other", () => {
  let id = 0;
  const sector = { grid: { width: 2, height: 1 }, ruleset: { id: "swn-revised" }, systemPointDie: 4 };
  const systems = generateSystems(sector, "fixed", () => 1, () => String(++id));
  const entries = systems.flatMap(system => [system.mainWorld, ...system.locations]);
  assert.equal(entries.length, 4);
  assert.equal(new Set(entries.map(entry => entry.name)).size, entries.length);
  for (const entry of entries) assert.match(entry.name, /^Aelara(?: [2-4])?$/);
});
