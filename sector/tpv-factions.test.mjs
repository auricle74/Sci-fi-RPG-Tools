import { test } from "node:test";
import assert from "node:assert/strict";
import { availablePresence, factionPresence, rollRelationship } from "./tpv-factions.mjs";

test("core expansion needs a safe or unsafe link, frontier can use a dangerous link", () => {
  const systems = [1, 2, 4, 5].map(column => ({
    id: String(column), column, row: 1, stars: [{}],
  }));
  const society = { homeSystemId: "1", name: "Collective" };
  const sector = { systems, societies: [society], tradeRoutes: [["1", "2"], ["1", "4"]] };
  assert.deepEqual(availablePresence(sector, society, "Core").map(system => system.id), ["2"]);
  assert.deepEqual(availablePresence(sector, society, "Frontier").map(system => system.id), ["2", "4"]);
  sector.societies.push({ homeSystemId: "4", name: "Union" });
  assert.deepEqual(availablePresence(sector, society, "Frontier").map(system => system.id), ["2"]);
  assert.deepEqual(factionPresence(sector, "4"), [{ name: "Union", role: "Home" }]);
  assert.equal(rollRelationship(() => 13), "Trade Partners");
});
