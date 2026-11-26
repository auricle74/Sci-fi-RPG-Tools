import { test } from "node:test";
import assert from "node:assert/strict";
import { availablePresence, chartFactionPresence, factionPresence, rollRelationship } from "./tpv-factions.mjs";

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

test("chart presence combines homeworlds, claims and active bases without duplicating a faction", () => {
  const sector = {
    societies: [{ id: "society", name: "Union", homeSystemId: "home", frontierSystems: ["frontier"] }],
    factionManager: { factions: [
      { id: "union", sourceId: "society", name: "Union", home: "a", colour: "red",
        assets: [{ name: "Base of Influence", hp: 4, location: "a" }] },
      { id: "guild", name: "Guild", colour: "blue", assets: [
        { name: "Base of Influence", hp: 1, location: "b" },
        { name: "Base of Influence", hp: 0, location: "c" },
        { name: "Other asset", hp: 1, location: "c" },
      ] },
    ] },
  };
  const presence = chartFactionPresence(sector, [
    { id: "a", systemId: "home" }, { id: "b", systemId: "home" }, { id: "c", systemId: "empty" },
  ]);
  assert.deepEqual([...presence.get("home").values()], [
    { name: "Union", colour: "red" }, { name: "Guild", colour: "blue" },
  ]);
  assert.deepEqual([...presence.get("frontier").keys()], ["union"]);
  assert.equal(presence.has("empty"), false);
});
