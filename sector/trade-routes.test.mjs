import assert from "node:assert/strict";
import test from "node:test";
import { findTradeRoutes, hexDistance } from "./trade-routes.mjs";

test("trade distance follows the staggered columns used on the map", () => {
  const evenColumn = { column: 2, row: 3 };
  assert.equal(hexDistance(evenColumn, { column: 3, row: 4 }), 1);
  assert.equal(hexDistance(evenColumn, { column: 3, row: 2 }), 2);
  assert.equal(hexDistance(evenColumn, { column: 6, row: 3 }), 4);
});

test("trade routes use inhabited stations and economic tags, with a three-hex limit", () => {
  const world = (column, population) => ({
    column, row: 1, mainWorld: { profile: { Population: population, "Tech level": "TL2" }, tags: [] },
  });
  const inhabited = world(1, "Several million");
  const station = world(4, "Failed colony");
  station.locations = [{ type: "Deep-space station", description: "Occupants: An independent crew.", tags: ["Exchange"] }];
  const distant = world(8, "Billions");
  const empty = world(2, "Failed colony");
  empty.locations = [{ type: "Deep-space station", description: "Occupants: Ancient preserved bodies.", tags: ["Exchange"] }];
  const systems = [inhabited, station, distant, empty];
  assert.deepEqual(findTradeRoutes(systems, []), []);
  assert.deepEqual(findTradeRoutes(systems, [
    { type: "Deep-space station", name: "Exchange", description: "An established market for visiting traders." },
  ]), [[inhabited, station]]);
});

test("industrial and raw-material tags can link two small outposts", () => {
  const outpost = (column, tag) => ({
    column, row: 1, mainWorld: { profile: { Population: "Outpost", "Tech level": "TL2" }, tags: [tag] },
  });
  const first = outpost(1, "Heavy Industry");
  const second = outpost(4, "Rare Minerals");
  assert.deepEqual(findTradeRoutes([first, second], []), [[first, second]]);
});
