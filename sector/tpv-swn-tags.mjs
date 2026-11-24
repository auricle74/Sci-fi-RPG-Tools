import { bookTags, catalogueTags } from "./tag-catalogue.mjs";

const key = value => value.trim().toLowerCase();

export function tpvTagCatalogue() {
  return [...bookTags, ...catalogueTags()];
}

function worldTagFits(tag, world, inhabited) {
  const notes = world.notes.join(" ");
  switch (tag.name) {
    case "Freak Weather": return /storm|hurricane|tempest|extreme weather|cyclon/i.test(notes);
    case "Hostile Biosphere": return world.life !== "none" && /toxic|aggressive|predator|parasit/i.test(notes);
    case "Oceanic World": return inhabited && world.waterPercent >= 90;
    case "Desert World": return inhabited && /arid|desert/i.test(world.type);
    case "Seismic Instability": return inhabited && /earthquake|seismic|tectonic|volcanic/i.test(notes);
    default: return inhabited;
  }
}

export function assignTpvTags(system, catalogue, roll) {
  let changed = false;
  function assign(target, eligible) {
    if (target.swnTags !== undefined) return;
    const candidates = catalogue.filter(eligible);
    target.swnTags = [];
    while (candidates.length && target.swnTags.length < 2) {
      const [tag] = candidates.splice(roll(candidates.length) - 1, 1);
      target.swnTags.push({ type: tag.type, name: tag.name });
    }
    changed = true;
  }
  assign(system, tag => key(tag.type) === "system");
  for (const body of system.satellites ?? []) {
    const development = body.development;
    const worlds = development?.worlds ?? [];
    const centre = development?.centre;
    const surface = /^planetary /i.test(body.type);
    const lunar = /^lunar /i.test(body.type);
    for (const world of worlds) {
      const inhabited = Boolean(world.societyId) || world.lifeforms?.some(item => item.level === "Advanced") ||
        key(body.type) === `populated ${world.classification}` ||
        Boolean(centre && (surface && world === worlds.find(item => item.classification === "planet") ||
          lunar && world === worlds.find(item => item.classification === "moon")));
      assign(world, tag => key(tag.type) === world.classification && worldTagFits(tag, world, inhabited));
    }
    if (centre) {
      const types = [key(body.type)];
      if (key(centre.type) === "station") types.push("station");
      if (key(body.type) === "orbital space station") {
        types.push("orbital station");
        if (!catalogue.some(tag => types.includes(key(tag.type)))) types.push("deep-space station");
      }
      if (lunar && centre.type === "Outpost") types.push("remote moon base");
      if (centre.purposes.some(purpose => /resupply|refuelling/i.test(purpose))) types.push("refuelling station");
      assign(centre, tag => types.includes(key(tag.type)));
    } else if (!worlds.length && body.kind !== "station") {
      assign(body, tag => key(tag.type) === key(body.type));
    }
  }
  return changed;
}
