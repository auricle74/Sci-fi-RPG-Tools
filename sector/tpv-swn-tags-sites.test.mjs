import assert from "node:assert/strict";
import { test } from "node:test";
import { assignTpvTags, tpvSiteTagChoices, tpvTagCatalogue } from "./tpv-swn-tags.mjs";

test("community tags cover settlements, districts and facilities without replacing edits", () => {
  const catalogue = tpvTagCatalogue();
  const facility = { type: "Facility" };
  const area = { type: "Location", function: "Storage" };
  const district = { type: "District", function: "Industrial", children: [facility, area] };
  const city = { type: "City", children: [district] };
  const edited = { type: "Facility", swnTagsEdited: true, swnTags: [] };
  const system = { facilities: [edited], satellites: [
    { kind: "planet", type: "Populated planet", development: { worlds: [
      { classification: "planet", type: "Terrestrial", life: "none", notes: [], sites: [city] },
    ] } },
  ] };
  assert.equal(assignTpvTags(system, catalogue, () => 1), true);
  assert.deepEqual(city.swnTags.map(tag => tag.type), ["Settlement", "Settlement"]);
  assert.deepEqual(district.swnTags.map(tag => tag.type), ["Settlement", "Settlement"]);
  assert.deepEqual(facility.swnTags.map(tag => tag.type), ["Facility", "Facility"]);
  assert.equal(area.swnTags, undefined);
  assert.deepEqual(edited.swnTags, []);
  assert.equal(assignTpvTags(system, catalogue, () => 1), false);
  assert.deepEqual(tpvSiteTagChoices([{ type: "Industrial District" }], district), [{ type: "Industrial District" }]);
});
