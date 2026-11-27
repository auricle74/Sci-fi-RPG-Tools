import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultBooks, developmentTypes, jobCategories, rollDevelopment, rollFollowUp, territories } from "../development/roller.mjs";
import { tpvTables } from "../development/tpv-tables.mjs";

test("TPV tables cover each die with ascending inclusive ranges", () => {
  for (const [table, [, sides, rows]] of Object.entries(tpvTables)) {
    assert.equal(rows.at(-1)[0], sides, table);
    assert.ok(rows.every(([end, text], i) => end > (rows[i - 1]?.[0] ?? 0) && (Array.isArray(text) ? text.length === 4 : text.length)), table);
  }
});

test("TPV random type boundaries and weighted job categories", () => {
  for (const [i, result] of [25, 40, 60, 80, 90, 100].entries()) {
    let first = true;
    const rolled = rollDevelopment({ type: "Random" }, defaultBooks, () => {
      if (first) { first = false; return result; }
      return 1;
    });
    assert.equal(rolled.type, developmentTypes[i]);
    assert.equal(rolled.typeRoll.result, result);
  }
  const categories = [0, 0, 0, 0, 1, 2, 2, 3, 4, 5];
  categories.forEach((category, index) => {
    const job = rollDevelopment({ type: "Job" }, defaultBooks, sides => sides === 10 ? index + 1 : 1);
    assert.equal(job.prompts[0].value, jobCategories[category]);
  });
  assert.equal(rollDevelopment({ type: "Job" }, []), null);
});

test("encounters use the selected environment and territory, and jobs follow nested tables", () => {
  for (const encounter of ["Voidside", "Worldside"]) {
    for (const territory of territories) {
      const { prompts } = rollDevelopment({ type: "Encounter", encounter, territory }, defaultBooks, () => 1);
      assert.equal(prompts[0].table, `${encounter} Encounter · ${territory}`);
      assert.equal(prompts[0].children[0].table, "ANOMALY");
    }
  }
  const { prompts } = rollDevelopment({ type: "Offer" }, defaultBooks, () => 1);
  assert.equal(prompts[0].children[0].children[0].children[0].table, "Bounty");
});

test("all table results generate without a broken cross-reference", () => {
  for (const [table, [, sides]] of Object.entries(tpvTables)) {
    for (let value = 1; value <= sides; value++) {
      let first = true;
      assert.ok(rollFollowUp("tpv", table, {}, () => {
        if (first) { first = false; return value; }
        return 1;
      }), table);
    }
  }
});
