import { test } from "node:test";
import assert from "node:assert/strict";
import { developBody, worldNotation } from "./tpv-development.mjs";

test("world notation follows the requested TPV example order", () => {
  assert.equal(worldNotation("Glanos IV", {
    type: "Oceanic", classification: "planet", position: "far", size: "Large", climate: "cold",
    gravity: "moderate", atmosphere: "medium", composition: "nitrogen", water: "maximal", waterPercent: 98,
    life: "simple", resources: "ultra-rich", notes: ["Violent storms"],
  }), "GLANOS IV: Oceanic planet, far, large, cold, G moderate, A medium (nitrogen), W maximal (98%), L simple, R ultra-rich. Violent storms.");
});

test("lunar colonies develop a host and moon, while deep-space outposts have no world", () => {
  const roll = sides => Math.ceil(sides / 2);
  const colony = developBody({ type: "Lunar colony", kind: "station", band: 6 }, roll);
  assert.deepEqual(colony.worlds.map(world => world.classification), ["planet", "moon"]);
  assert.equal(colony.worlds[1].size, "Tiny");
  assert.equal(colony.centre.population, 10000);
  const outpost = developBody({ type: "Deep-space outpost", kind: "station", band: 2 }, roll);
  assert.deepEqual(outpost.worlds, []);
  assert.equal(outpost.centre.population, 250);
});

test("all orbital zones generate valid profiles across dice-table boundaries", () => {
  for (const band of [1, 3, 6, 9]) {
    for (const fraction of [0.01, 0.25, 0.51, 0.76, 0.95, 0.99]) {
      const { worlds: [world] } = developBody({ band, kind: "planet", type: "Planet", size: "Large" },
        sides => Math.ceil(sides * fraction));
      assert.ok(world.type && world.gravity && world.notes.length);
      assert.ok(world.waterPercent >= 0 && world.waterPercent <= 100);
    }
  }
});
