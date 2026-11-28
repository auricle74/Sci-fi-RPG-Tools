import assert from "node:assert/strict";
import { test } from "node:test";
import { recordWorldResources, rollWorldResources } from "./tpv-resources.mjs";

test("resource rating controls roll count and world type controls category", () => {
  for (const [resources, count] of Object.entries({ negligible: 0, poor: 1, average: 3, rich: 5, "ultra-rich": 10 })) {
    assert.deepEqual(rollWorldResources({ type: "Frozen", resources }, () => 1),
      Array.from({ length: count }, () => ({ category: "Water ice" })));
  }
  assert.deepEqual(rollWorldResources({ type: "Barren", resources: "poor" }, () => 1),
    [{ category: "Mineral ores", name: "Iron" }]);
  assert.deepEqual(rollWorldResources({ type: "Metallic", resources: "poor" }, (() => {
    const results = [56, 100];
    return () => results.shift();
  })()), [{ category: "Rare elements", name: "Tantalum" }]);
});

test("planet and moon deposits are recorded once, including empty results", () => {
  const worlds = [{ type: "Barren", resources: "negligible" }, { type: "Frozen", resources: "poor" }];
  const body = { development: { worlds } };
  assert.equal(recordWorldResources(body, () => 1), true);
  assert.deepEqual(worlds.map(world => world.resourceDeposits), [[], [{ category: "Water ice" }]]);
  assert.equal(recordWorldResources(body, () => assert.fail("should not reroll")), false);
});
