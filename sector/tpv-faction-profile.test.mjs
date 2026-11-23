import assert from "node:assert/strict";
import { test } from "node:test";
import { factionNotation, generateFactionProfile, rollFactionName } from "./tpv-faction-profile.mjs";
import { generateSociety } from "./tpv-societies.mjs";
import { readSector } from "./sector-data.mjs";
import { tpvRules } from "./tpv.mjs";

test("faction name templates resolve leaders, places and optional plurals", () => {
  const roll = (...results) => () => results.shift();
  assert.equal(rollFactionName(roll(100, 72, 95, 58, 2), { place: "Timkin" }), "Order of the Timkin Rebels");
  assert.equal(rollFactionName(roll(55, 2, 84, 16), { surname: "Arden" }), "Arden Circle");
});

test("faction reach determines asset count, including under repeated rolls", () => {
  const local = generateFactionProfile(() => 1, { place: "Timkin" });
  assert.equal(local.reach, "Local (community)");
  assert.equal(local.assets.length, 1);
  const broad = generateFactionProfile(die => die, { interstellar: true });
  assert.equal(broad.reach, "Interstellar");
  assert.equal(new Set(broad.assets).size, 10);
  assert.equal(new Set(broad.leader.traits).size, 3);
  assert.equal(broad.type.length, 2);
  assert.equal(broad.complications.length, 2);
  assert.match(factionNotation("The Silver Dawn", local, "Caraxis"), /^THE SILVER DAWN: .* B Caraxis, R Local/);
});

test("saved TPV sectors load with new profiles and older societies", () => {
  const roll = () => 1;
  const old = generateSociety({ id: "old", name: "Old name", status: "Core", roll });
  const developed = { ...old, id: "new", faction: generateFactionProfile(roll) };
  const sector = {
    id: "sector", schemaVersion: 1, ruleset: tpvRules, name: "Test",
    grid: { width: 10, height: 10, preset: "void" }, selectedHex: { column: 1, row: 1 },
    systems: [], societies: [old, developed],
  };
  assert.deepEqual(readSector(JSON.stringify(sector)).societies, sector.societies);
});
