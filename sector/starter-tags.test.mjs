import assert from "node:assert/strict";
import { test } from "node:test";
import { systemPointTypes } from "./system-points.mjs";
import { starterTags } from "./starter-tags.mjs";
import { bookTags, deleteCustomTag, hookNames, readCustomTags, saveCustomTag } from "./tag-catalogue.mjs";

test("each system and point-of-interest type has 100 complete starter tags", () => {
  assert.equal(starterTags.length, 900);
  assert.equal(new Set(starterTags.map(tag => tag.id)).size, 900);
  for (const type of ["System", ...systemPointTypes]) {
    const tags = starterTags.filter(tag => tag.type === type);
    assert.equal(tags.length, 100, type);
    assert.equal(new Set(tags.map(tag => tag.name)).size, 100, type);
    for (const tag of tags) {
      assert.ok(tag.description);
      assert.deepEqual(Object.keys(tag.hooks), hookNames);
      assert.ok(Object.values(tag.hooks).every(list => list.length && list.every(Boolean)));
    }
  }
});

test("starter tag edits and deletions persist alongside older custom tags", () => {
  const starter = starterTags[0];
  const legacy = { ...starter, id: "legacy", name: "Legacy custom tag" };
  let stored = JSON.stringify([legacy]);
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => stored, setItem: (_key, value) => { stored = value; } },
  });
  try {
    assert.equal(readCustomTags().length, 901);
    const updated = saveCustomTag(starter.id, { ...starter, name: "Revised Wisp Stream" });
    assert.deepEqual(readCustomTags().find(tag => tag.id === starter.id), updated);
    deleteCustomTag(starter.id);
    assert.ok(!readCustomTags().some(tag => tag.id === starter.id));
    assert.deepEqual(readCustomTags().find(tag => tag.id === legacy.id), legacy);
    assert.throws(() => saveCustomTag(undefined, bookTags[0]), /already exists/);
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, "localStorage", previousStorage);
    else delete globalThis.localStorage;
  }
});
