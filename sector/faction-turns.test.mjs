import assert from "node:assert/strict";
import test from "node:test";
import { sectorLocations } from "./faction-manager.mjs";
import { deleteFaction, income, newAsset, catalogue, maxHp, simulateRound, syncFactions } from "./faction-turns.mjs";

test("TPV faction import is idempotent and preserves manual ratings", () => {
  const sector = { societies: [{ id: "a", name: "Company", homeSystemId: "system",
    faction: { type: ["Commercial"], reach: "Interstellar", goal: "Control shipping" } }] };
  const locations = [{ id: "home", systemId: "system", tech: 4 }];
  const manager = syncFactions(sector, locations);
  const faction = manager.factions[0];
  assert.equal(faction.wealth, 4);
  assert.equal(faction.home, "home");
  assert.equal(faction.assets[0].name, "Base of Influence");
  faction.wealth = 6;
  assert.equal(syncFactions(sector, locations).factions.length, 1);
  assert.equal(faction.wealth, 6);
});

test("draft uses SWN income and applies overrides without mutating the roster", () => {
  const faction = { id: "a", name: "Company", force: 3, cunning: 2, wealth: 2,
    hp: 12, credits: 0, xp: 0, home: "", goal: "", assets: [] };
  assert.equal(maxHp(faction), 12);
  assert.equal(income(faction), 2);
  const result = simulateRound([faction], [], 1, ["a"], { a: { income: 4 } }, () => () => 1);
  assert.equal(result.factions[0].credits, 4);
  assert.equal(result.entries[0].action, "Pass");
  assert.equal(faction.credits, 0);
});


test("a world society in an existing save joins a roster alongside a manual faction", () => {
  const sector = {
    societies: [{ id: "world-society", name: "The Parmark Syndicate", politics: "Algorithmic Autocracy" }],
    factionManager: { factions: [{ id: "manual", name: "New faction" }], history: [] },
  };
  const locations = [{ id: "home", societyIds: ["other", "world-society"], tech: 4 }];
  const manager = syncFactions(sector, locations);
  assert.deepEqual(manager.factions.map(faction => faction.name), ["New faction", "The Parmark Syndicate"]);
  assert.equal(manager.factions[1].home, "home");
  assert.equal(syncFactions(sector, locations).factions.length, 2);
});

test("deleted imported factions stay out of the roster after a reload", () => {
  const sector = { societies: [{ id: "source", name: "Syndicate" }] };
  const manager = syncFactions(sector, []);
  manager.history.push({ round: 1 });
  manager.factions.push({ id: "manual" });
  deleteFaction(manager, "source");
  deleteFaction(manager, "manual");
  const saved = JSON.parse(JSON.stringify(sector));
  assert.deepEqual(syncFactions(saved, []).factions, []);
  assert.equal(saved.societies[0].name, "Syndicate");
  assert.deepEqual(saved.factionManager.history, [{ round: 1 }]);
});


test("a single saved faction tag is supplemented while keeping the existing tag", () => {
  const sector = { factionManager: { factions: [{ id: "manual", tags: "Secretive" }], history: [] } };
  const [faction] = syncFactions(sector, []).factions;
  assert.deepEqual(faction.tags, ["Secretive", "Deep Rooted"]);
  assert.deepEqual(syncFactions(sector, []).factions[0].tags, faction.tags);
});

test("known TPV worlds appear before their profiles are developed", () => {
  const locations = sectorLocations({ systems: [{ id: "home", name: "Erizi", column: 6, row: 6,
    satellites: [{ kind: "planet", band: 4, name: "Erizi II", type: "Planet" }] }] });
  assert.deepEqual(locations.map(({ systemId, name }) => [systemId, name]), [["home", "Erizi II · Erizi 0606"]]);
});

test("automated repairs use one action type and share the faction budget", () => {
  const template = catalogue.get("Security Personnel");
  const assets = ["guard-a", "guard-b"].map(id => ({ ...newAsset(template, "home", id), hp: 1 }));
  const faction = { id: "a", name: "Guards", force: 1, cunning: 1, wealth: 1,
    hp: 7, credits: 3, xp: 0, home: "home", goal: "", assets };
  const result = simulateRound([faction], [], 1, ["a"], {}, () => () => 1);
  assert.equal(result.entries[0].type, "Repair Asset");
  assert.equal(result.entries[0].operations.length, 2);
  assert.deepEqual(result.factions[0].assets.map(asset => asset.hp), [3, 2]);
  assert.equal(result.factions[0].credits, 0);
  assert.equal(faction.credits, 3);
});
