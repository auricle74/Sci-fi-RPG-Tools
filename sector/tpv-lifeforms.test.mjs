import { test } from "node:test";
import assert from "node:assert/strict";
import { generateLifeforms } from "./tpv-lifeforms.mjs";

test("lifeform results follow the world's life level", () => {
  const low = () => 1;
  assert.deepEqual(generateLifeforms("none", low), []);
  assert.equal(generateLifeforms("microbial", low)[0].level, "Microbial");
  assert.equal(generateLifeforms("simple", low)[0].level, "Simple");
  assert.ok(generateLifeforms("complex", low).every(entry => entry.level === "Complex"));
  assert.equal(generateLifeforms("advanced", low)[0].level, "Advanced");
});

test("only the first complex roll can establish an indigenous civilisation", () => {
  const results = generateLifeforms("complex", sides => sides);
  assert.equal(results.length, 5);
  assert.equal(results[0].level, "Advanced");
  assert.ok(results.slice(1).every(entry => entry.level === "Complex" &&
    entry.size === "Colossal" && entry.quantity === 1000));
});
