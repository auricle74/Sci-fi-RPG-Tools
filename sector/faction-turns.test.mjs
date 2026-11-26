import assert from "node:assert/strict";
import test from "node:test";
import { income, maxHp, simulateRound, syncFactions } from "./faction-turns.mjs";

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
