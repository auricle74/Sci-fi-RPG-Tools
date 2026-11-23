import { test } from "node:test";
import assert from "node:assert/strict";
import { orbitalAppearance } from "./tpv-graphics.mjs";

test("planetary colonies use the developed planet's appearance instead of a station", () => {
  const world = { classification: "planet", size: "Small", atmosphere: "medium",
    composition: "nitrogen-oxygen", notes: ["Ringed"] };
  const colony = { kind: "station", development: { worlds: [world] } };
  const appearance = orbitalAppearance(colony);
  assert.deepEqual(appearance, { kind: "planet", size: "small", colour: "#4d9bd8", rings: 1 });
  assert.notEqual(orbitalAppearance({ ...colony, development: { worlds: [
    { ...world, composition: "methane" },
  ] } }).colour, appearance.colour);
});

test("gas giant rings are shown, and a station's gravity rings remain part of the station", () => {
  assert.equal(orbitalAppearance({ kind: "giant", features: ["4 rings"] }).rings, 4);
  const station = orbitalAppearance({ kind: "station", type: "Deep-space station", development: {
    worlds: [], centre: { features: ["Rotational gravity rings"] },
  } });
  assert.equal(station.kind, "station");
  assert.equal(station.rings, 0);
});

test("an orbital space station uses its host planet's icon, while an orbital outpost uses a station", () => {
  const world = { classification: "planet", size: "Tiny", atmosphere: "medium",
    composition: "oxygen", notes: [] };
  const station = { kind: "station", type: "Orbital space station", development: { worlds: [world] } };
  assert.deepEqual(orbitalAppearance(station), { kind: "planet", size: "tiny", colour: "#518eed", rings: 0 });
  assert.equal(orbitalAppearance({ kind: "station", type: "Orbital outpost" }).kind, "station");
});
