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
  const station = orbitalAppearance({ kind: "station", type: "Orbital space station", development: {
    worlds: [{ classification: "planet", notes: ["Ringed"] }], centre: { features: ["Rotational gravity rings"] },
  } });
  assert.equal(station.kind, "station");
  assert.equal(station.rings, 0);
});
