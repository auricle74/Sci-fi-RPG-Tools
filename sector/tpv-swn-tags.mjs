import { bookTags, catalogueTags } from "./tag-catalogue.mjs";

const key = value => value.trim().toLowerCase();

const additionalTags = {
  Planet: [
    ["Exposed Strata", "Surface outcrops make the world’s geological history unusually easy to read."],
    ["Survey Blind Spots", "Existing survey coverage leaves gaps where a closer look could reveal unexpected terrain."],
    ["Unmapped Basins", "Several depressions identified from orbit remain unsurveyed at ground level."],
  ],
  Moon: [
    ["Deep Regolith", "Loose surface dust conceals fissures and preserves old tracks."],
    ["Tidal Fractures", "Gravitational stress opens and closes fractures across the surface."],
    ["Permanent Shadow", "Deep craters shelter ice and equipment from direct sunlight."],
  ],
  Colony: [
    ["Supply Window", "Regular deliveries depend on a narrow and unpredictable arrival window."],
    ["Patchwork Habitat", "The settlement has expanded by joining structures built for different purposes."],
    ["Local Materials", "Repairs depend on materials adapted to the local environment."],
  ],
  Outpost: [
    ["Limited Watch", "A small crew rotates between essential duties and observation."],
    ["Redundant Stores", "Emergency reserves are split between caches to survive a local failure."],
    ["Remote Survey", "The installation gathers data from instruments scattered far beyond its perimeter."],
  ],
  "Gas Giant": [
    ["Shearing Bands", "Neighbouring cloud bands move at sharply different speeds."],
    ["Transient Vortex", "A short-lived vortex can expose deeper atmospheric layers."],
    ["Auroral Arcs", "Bright arcs reveal disturbances in the planet’s magnetic field."],
  ],
  Asteroid: [
    ["Loose Rubble", "A cloud of small fragments follows the main mass."],
    ["Exposed Veins", "A recent fracture exposes material from beneath the surface."],
    ["Slow Tumble", "An irregular rotation changes which faces are accessible."],
  ],
  "Orbital Phenomenon": [
    ["Shifting Boundary", "The edge moves between observations, making old readings unreliable."],
    ["Quiet Interval", "The activity falls away briefly at irregular intervals."],
    ["Instrument Echo", "Instruments register a second reading delayed from the first."],
  ],
};

const hookSubjects = {
  "Exposed Strata": "the exposed rock layers",
  "Survey Blind Spots": "a gap in the survey",
  "Unmapped Basins": "an unsurveyed basin",
  "Deep Regolith": "tracks in the loose dust",
  "Tidal Fractures": "a newly opened fracture",
  "Permanent Shadow": "a dark crater",
  "Supply Window": "the next supply run",
  "Patchwork Habitat": "a disused habitat module",
  "Local Materials": "a source of local materials",
  "Limited Watch": "an understaffed watch post",
  "Redundant Stores": "one of the emergency supply caches",
  "Remote Survey": "a remote survey instrument",
  "Shearing Bands": "the boundary between the cloud bands",
  "Transient Vortex": "the short-lived vortex",
  "Auroral Arcs": "the edge of an auroral arc",
  "Loose Rubble": "a drifting rubble cluster",
  "Exposed Veins": "the fresh mineral exposure",
  "Slow Tumble": "the slowly rotating asteroid",
  "Shifting Boundary": "the moving boundary",
  "Quiet Interval": "the lull in activity",
  "Instrument Echo": "the echo's apparent source",
};

function additionalHooks(name) {
  const subject = hookSubjects[name];
  return {
    Enemies: [
      `A salvage captain staking an exclusive claim to ${subject}`,
      "A broker selling misleading coordinates to rival crews",
      "A former contractor trying to erase evidence of a failed expedition",
    ],
    Friends: [
      `A technician who can explain the latest readings from ${subject}`,
      "A pilot who knows a safer approach",
      "A previous visitor willing to share an annotated log",
    ],
    Complications: [
      `A recent shift makes the recorded approach to ${subject} unreliable`,
      "Two independent records disagree about what happened here",
      "A distress signal interrupts the first attempt to investigate",
    ],
    Things: [
      `An instrument record that reveals an unexpected change near ${subject}`,
      "A navigation log with a missing interval",
      "A damaged marker carrying a useful identifier",
    ],
    Places: [
      `A sheltered vantage point overlooking ${subject}`,
      "The last confirmed position of an earlier survey party",
      "A staging area with a clear route back to the ship",
    ],
  };
}

export function tpvTagCatalogue() {
  const catalogue = [...bookTags, ...catalogueTags()];
  for (const [type, entries] of Object.entries(additionalTags)) {
    for (const [name, description] of entries) {
      if (!catalogue.some(tag => key(tag.type) === key(type) && key(tag.name) === key(name))) {
        catalogue.push({ type, name, description, hooks: additionalHooks(name) });
      }
    }
  }
  return catalogue;
}

export function tpvTagChoices(catalogue, type, body) {
  const types = new Set([key(type)]);
  if (body) {
    types.add(key(body.type));
    if (key(type) === "station") {
      if (/orbital/i.test(body.type)) types.add("orbital station");
      if (catalogue.filter(tag => types.has(key(tag.type))).length < 3) types.add("deep-space station");
    }
    if (key(type) === "outpost" && /^lunar /i.test(body.type)) types.add("remote moon base");
    if (body.development?.centre?.purposes.some(purpose => /resupply|refuelling/i.test(purpose))) {
      types.add("refuelling station");
    }
  }
  return catalogue.filter(tag => types.has(key(tag.type)));
}

export function tpvBodyTagType(body) {
  return { giant: "Gas Giant", asteroid: "Asteroid", phenomenon: "Orbital Phenomenon", station: "Station" }[body.kind] ?? body.type;
}

export const sameTpvTag = (left, right) => left.type === right.type && left.name === right.name;
export const tpvTagReference = ({ type, name }) => ({ type, name });

function worldTagFits(tag, world, inhabited) {
  if (additionalTags.Planet.some(([name]) => name === tag.name)) return !inhabited;
  const notes = world.notes.join(" ");
  switch (tag.name) {
    case "Freak Weather": return /storm|hurricane|tempest|extreme weather|cyclon/i.test(notes);
    case "Hostile Biosphere": return world.life !== "none" && /toxic|aggressive|predator|parasit/i.test(notes);
    case "Dying Race": return inhabited && /dying race|declining species|species facing extinction/i.test(notes);
    case "Urbanized Surface": return inhabited && /urbanized surface|planetwide (?:city|urban)|world-spanning city/i.test(notes);
    case "Oceanic World": return world.waterPercent >= 90;
    case "Desert World": return /arid|desert/i.test(world.type);
    case "Seismic Instability": return /earthquake|seismic|tectonic|volcanic/i.test(notes);
    default: return inhabited;
  }
}

export function assignTpvTags(system, catalogue, roll) {
  let changed = false;
  function assign(target, choices, preferred = () => true) {
    if (target.swnTagsEdited || target.swnTags?.length >= 2 || !choices.length) return;
    const saved = target.swnTags ?? [];
    const available = choices.filter(tag => !saved.some(existing => sameTpvTag(tag, existing)));
    const tags = [...saved];
    while (available.length && tags.length < 2) {
      const fitting = available.filter(preferred);
      const pool = fitting.length ? fitting : available;
      const tag = pool[roll(pool.length) - 1];
      tags.push(tpvTagReference(tag));
      available.splice(available.indexOf(tag), 1);
    }
    if (tags.length !== saved.length) {
      target.swnTags = tags;
      changed = true;
    }
  }
  assign(system, tpvTagChoices(catalogue, "System"));
  for (const body of system.satellites ?? []) {
    const worlds = body.development?.worlds ?? [];
    const centre = body.development?.centre;
    const settledWorld = /^planetary /i.test(body.type) ? "planet" : /^lunar /i.test(body.type) ? "moon" : "";
    for (const world of worlds) {
      const inhabited = Boolean(world.societyId) || world.lifeforms?.some(item => item.level === "Advanced") ||
        key(body.type) === `populated ${world.classification}` ||
        (centre?.population > 0 && world.classification === settledWorld);
      assign(world, tpvTagChoices(catalogue, world.classification), tag => worldTagFits(tag, world, inhabited));
    }
    if (centre) assign(centre, tpvTagChoices(catalogue, centre.type, body));
    else if (!worlds.length) assign(body, tpvTagChoices(catalogue, tpvBodyTagType(body), body));
  }
  return changed;
}
