import { initialWorldSites, makeCommunity } from "./tpv-communities.mjs";
import { openCommunity, siteEditor, siteList } from "./tpv-community-view.mjs";
import { assignTpvTags, sameTpvTag, tpvBodyTagType, tpvTagCatalogue, tpvTagChoices, tpvTagReference } from "./tpv-swn-tags.mjs";
import { svg, worldGlobe } from "./tpv-globe.mjs";
import { developSettlement, developSite, layOutSite } from "./tpv-settlement.mjs";
import { factionNotation, factionRows, generateFactionProfile, rollFactionName } from "./tpv-faction-profile.mjs";
import { factionPresence } from "./tpv-factions.mjs";
import { generateSociety } from "./tpv-societies.mjs";
import { bearsLife, generateLifeforms } from "./tpv-lifeforms.mjs";
import { orbitalAppearance } from "./tpv-graphics.mjs";
import { canDevelopBody, developBody, worldNotation } from "./tpv-development.mjs";
import { developTpvSystem, jumpRisk, orbitZone, tpvDistance } from "./tpv.mjs";

function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(text, click) {
  const control = node("button", text);
  control.type = "button";
  control.addEventListener("click", click);
  return control;
}

function profileBreadcrumb(...steps) {
  const nav = node("nav");
  nav.className = "tpv-breadcrumb";
  nav.setAttribute("aria-label", "Profile navigation");
  const list = node("ol");
  steps.forEach(([label, action], index) => {
    const item = node("li");
    const control = button(label, action);
    if (index === steps.length - 1) control.setAttribute("aria-current", "page");
    item.append(control);
    list.append(item);
  });
  nav.append(list);
  return nav;
}


function table(headers) {
  const result = node("table");
  const headings = result.createTHead().insertRow();
  for (const heading of headers) {
    const cell = node("th", heading);
    cell.scope = "col";
    headings.append(cell);
  }
  return result;
}

export function renderChart(container, features, coordinate, select, presence) {
  const chart = table(["Hex, name and type"]);
  const body = chart.createTBody();
  for (const feature of features) {
    const row = body.insertRow();
    row.dataset.hex = coordinate(feature.column, feature.row);
    const details = row.insertCell();
    const link = button(`${row.dataset.hex} · ${feature.name}`, () => select(feature));
    details.append(link, node("div", feature.type));
    for (const entry of presence(feature)) details.append(node("div", `${entry.role} · ${entry.name}`));
  }
  container.replaceChildren(node("h3", "Subsectors of interest"), chart);
}

export function inspectTpv(inspector, profile, sector, feature, coordinate, roll, nameFor, save, back, showSetting) {
  inspector.replaceChildren();
  if (!feature) return;
  inspector.append(node("h3", feature.name), node("p", feature.type));
  if (feature.coverage?.length > 1) {
    inspector.append(node("p", `Spans ${feature.coverage.length} hexes, including this hex.`));
  }
  if (!feature.stars) return;
  const presence = factionPresence(sector, feature.id);
  if (presence.length) inspector.append(detailSection("Society Presence",
    presence.map(entry => [entry.role, entry.name])));
  const status = node("select");
  for (const option of ["Wild", "Frontier", "Core"]) status.add(new Option(option));
  status.value = feature.status ?? "Wild";
  const statusLabel = node("label", "System status");
  status.setAttribute("aria-label", statusLabel.textContent);
  statusLabel.append(status);
  status.addEventListener("change", () => {
    feature.status = status.value;
    save();
  });
  const needsDetails = body => !body.development && canDevelopBody(body);
  const needsLifeforms = world => world.lifeforms === undefined && bearsLife(world.life);
  const complete = feature.satellites && !feature.satellites.some(body =>
    needsDetails(body) || body.development?.worlds.some(needsLifeforms));
  function develop(systemStatus, satellites) {
    const generated = satellites ?? developTpvSystem(feature.stars, systemStatus, roll, nameFor);
    feature.satellites = generated.map(body => {
      const development = body.development ?? (needsDetails(body) ? developBody(body, roll) : undefined);
      if (!development) return body;
      const worlds = development.worlds.map(world =>
        needsLifeforms(world) ? { ...world, lifeforms: generateLifeforms(world.life, roll) } : world);
      return { ...body, development: { ...development, worlds } };
    });
    feature.status = systemStatus;
    status.value = systemStatus;
    open.textContent = "Open System Profile";
    save();
  }

  function showProfile() {
    if (sector.addSwnTags && assignTpvTags(feature, tpvTagCatalogue(), roll)) save();
    renderProfile(profile, inspector, feature, coordinate, back, sector, roll, save, statusLabel, status, showSetting, systemStatus => {
      develop(systemStatus);
      inspector.replaceChildren(node("h3", feature.name), node("p", feature.type));
      showProfile();
    });
  }

  const open = button(complete ? "Open System Profile" : "Develop System", () => {
    if (!feature.satellites || feature.satellites.some(body =>
      needsDetails(body) || body.development?.worlds.some(needsLifeforms))) {
      develop(status.value, feature.satellites);
    }
    showProfile();
  });
  open.className = "tpv-open-profile";
  const routes = node("section");
  routes.className = "tpv-jump-routes";
  function refreshRoutes() {
    routes.replaceChildren(node("h4", "Jump Routes"));
    const available = new Map(sector.systems.filter(target => target !== feature && target.stars &&
      tpvDistance(feature, target) <= 3).map(target => [target.id, target]));
    for (const [index, route] of sector.tradeRoutes.entries()) {
      if (!route.includes(feature.id)) continue;
      const destination = available.get(route.find(id => id !== feature.id));
      available.delete(destination.id);
      const row = node("div");
      row.append(node("span", `${destination.name} · ${jumpRisk(tpvDistance(feature, destination))}`),
        button("Delete jump route", () => {
          sector.tradeRoutes.splice(index, 1);
          save();
          refreshRoutes();
        }));
      routes.append(row);
    }
    const picker = node("select");
    for (const [id, target] of available) picker.add(new Option(
      `${target.name} · ${coordinate(target.column, target.row)} · ${jumpRisk(tpvDistance(feature, target))}`, id));
    const label = node("label", "Jump destination");
    label.append(picker);
    const add = button("Add jump route", () => {
      sector.tradeRoutes.push([feature.id, picker.value]);
      save();
      refreshRoutes();
    });
    if (available.size) routes.append(label, add);
  }
  refreshRoutes();
  inspector.append(statusLabel, open, routes);
}

function detailSection(title, rows = []) {
  const group = node("details");
  group.className = "inspector-group";
  group.open = true;
  const summary = node("summary");
  summary.append(node("span", title));
  group.append(summary);
  if (rows.length) {
    const fields = node("dl");
    fields.className = "inspector-attributes";
    for (const [label, value, explanation] of rows) {
      const detail = node("dd", value);
      if (explanation) detail.append(node("small", explanation));
      fields.append(node("dt", label), detail);
    }
    group.append(fields);
  }
  return group;
}

const orbitRanges = { Close: "1–2", Near: "3–5", Far: "6–8", Extreme: "9–10" };
const gravityDetails = {
  zero: "Objects and people drift without a downward pull.",
  low: "Weaker than Earthlike gravity, making objects easier to lift.",
  moderate: "Comparable to Earthlike gravity.",
  heavy: "Stronger than Earthlike gravity, making movement more strenuous.",
  crushing: "Extreme gravity makes ordinary human activity difficult.",
};
const climates = {
  supercold: "Extreme cold requires advanced protection (p. 56).",
  cold: "Low temperatures favour ice and frozen terrain (p. 57).",
  temperate: "Moderate temperatures can support liquid water and a wide range of life (p. 58).",
  hot: "High surface temperatures can make exposed water scarce and travel demanding (p. 59).",
  superhot: "Extreme heat requires advanced protection (p. 60).",
};
const atmosphereDetails = {
  "carbon dioxide": "An intense greenhouse effect may bring higher temperatures and dry windstorms (p. 62).",
  methane: "Methane clouds, rain or storms are possible (p. 63).",
  nitrogen: "Blue skies, clouds and storms are possible (p. 63).",
  "nitrogen-oxygen": "Breathable by human standards, with weather such as rain, snow and storms (p. 63).",
  "nitrogen-methane": "Methane clouds and precipitation are possible (p. 63).",
  "sulfur dioxide": "Sulphurous clouds can give the sky a pale yellow tint (p. 63).",
};
const lifeDetails = {
  none: "No native life indicated.",
  microbial: "Life is microscopic.",
  simple: "Life is multicellular but relatively simple.",
  complex: "More complex organisms have evolved.",
};

function orbitDetails(band) {
  const zone = orbitZone(band);
  return detailSection("Orbit Details", [
    ["Band", String(band)], ["Zone", zone, `${zone} covers bands ${orbitRanges[zone]} (p. 52).`],
  ]);
}

function worldDetails(world) {
  return [
    detailSection(world.classification === "moon" ? "Moon Details" : "Host Planet Details", [
      ["Classification", `${world.type} ${world.classification}`],
      ["Size", world.size], ["Diameter", `${world.diameter.toLocaleString()} km`],
      ["Gravity", world.gravity, gravityDetails[world.gravity.toLowerCase()]],
    ]),
    detailSection("Environment Details", [
      ["Climate", world.climate, climates[world.climate.toLowerCase()]],
      ["Atmosphere", world.composition ? `${world.atmosphere} (${world.composition})` : world.atmosphere,
        atmosphereDetails[world.composition.toLowerCase()] ?? (world.atmosphere === "none" ? "No appreciable atmosphere." : "")],
      ["Water", `${world.water} (${world.waterPercent}%)`,
        world.waterPercent ? `Water covers ${world.waterPercent}% of the surface (p. 47).` : ""],
      ["Life", world.life, lifeDetails[world.life.toLowerCase()]],
      ["Resources", world.resources],
    ]),
    detailSection("World Features", world.notes.length
      ? world.notes.map((note, index) => [String(index + 1), note])
      : [["Features", "None recorded"]]),
  ];
}

function lifeformDetails(world) {
  if (!world.lifeforms?.length) return [];
  return [detailSection("Lifeforms", world.lifeforms.map(lifeform => [
    lifeform.level, lifeform.form,
    [lifeform.size, lifeform.quantity === undefined ? "" : `Encounter quantity: ${lifeform.quantity}`,
      ...lifeform.traits].filter(Boolean).join(" · "),
  ]))];
}

function settlementPointcrawl(place, index) {
  const areas = place.site ?? [];
  const entrance = [46, 77];
  const positions = [entrance, ...areas.map((_, index) => [110 + index * 64, 77])];
  if (areas.length === 3) {
    const entranceLinks = areas[0].connects;
    const loop = areas.every(area => area.connects.length === 2);
    if (loop || entranceLinks.length === 2) {
      positions[2] = [192, 39];
      positions[3] = [192, 115];
    } else {
      const middle = entranceLinks[0];
      if (middle === 2 || middle === 3) {
        positions[middle] = [176, 77];
        positions[middle === 2 ? 3 : 2] = [240, middle === 2 ? 115 : 39];
      }
    }
  }
  if (areas.length && areas.every(area => area.position)) {
    positions.splice(0, positions.length, [0, 0], ...areas.map(area =>
      area.position.map(coordinate => coordinate * 64)));
  }
  const xs = positions.map(([x]) => x);
  const ys = positions.map(([, y]) => y);
  const left = Math.min(...xs) - 30;
  const top = Math.min(...ys) - 30;
  const width = Math.max(...xs) - left + 30;
  const height = Math.max(...ys) - top + 30;
  const map = svg("svg", {
    viewBox: `${left} ${top} ${width} ${height}`,
    role: "img", "aria-label": `${place.name} pointcrawl`,
  });
  map.classList.add("tpv-pointcrawl");
  const route = (from, to) => {
    const [x1, y1] = positions[from];
    const [x2, y2] = positions[to];
    map.append(svg("line", { x1, y1, x2, y2 }));
  };
  if (areas.length) route(0, 1);
  const links = new Set();
  areas.forEach((area, offset) => {
    const number = offset + 1;
    for (const connected of area.connects) {
      const key = [Math.min(number, connected), Math.max(number, connected)].join("-");
      if (links.has(key)) continue;
      links.add(key);
      route(number, connected);
    }
  });
  [String(index + 1), ...areas.map((_, offset) => `${index + 1}.${offset + 1}`)].forEach((number, offset) => {
    const [x, y] = positions[offset];
    map.append(svg("rect", { x: x - 18, y: y - 18, width: 36, height: 36 }));
    const label = svg("text", { x, y });
    label.textContent = number;
    map.append(label);
  });
  return map;
}

let nextTagFieldId = 0;

function swnTagDetails(target, choices, catalogue, roll, save) {
  const group = detailSection("SWN Tags");
  group.classList.add("tpv-swn-tags");
  const rows = node("div");
  let draft;
  const edit = button("Edit Tags", event => {
    event.preventDefault();
    group.open = true;
    draft = [...tags()];
    render();
    (rows.querySelector("select") ?? add).focus();
  });
  const commands = node("div");
  commands.className = "inspector-commands";
  commands.append(button("Save", () => {
    target.swnTags = draft;
    target.swnTagsEdited = true;
    save();
    finish();
  }), button("Cancel", finish));
  function finish() {
    draft = undefined;
    render();
    edit.focus();
  }
  const add = button("Add tag", () => {
    const available = alternatives();
    update([...tags(), tpvTagReference(available[roll(available.length) - 1])], tags().length);
  });
  const tags = () => draft ?? target.swnTags ?? [];
  const alternatives = () => choices.filter(tag => !tags().some(saved => sameTpvTag(tag, saved)));
  function update(next, focusIndex) {
    draft = next;
    render();
    (rows.children[focusIndex]?.querySelector("select") ?? add).focus();
  }

  function render() {
    rows.replaceChildren();
    edit.hidden = Boolean(draft);
    commands.hidden = !draft;
    const available = alternatives();
    tags().forEach((saved, index) => {
      const row = node("div");
      row.className = "tpv-swn-tag-row";
      rows.append(row);
      if (!draft) {
        const tag = catalogue.find(entry => sameTpvTag(entry, saved));
        const entry = detailSection(saved.name);
        entry.open = false;
        if (tag) {
          entry.append(node("p", tag.description));
          for (const [label, hooks] of Object.entries(tag.hooks ?? {})) {
            const list = node("ul");
            list.className = "tpv-swn-tag-hooks";
            list.append(...hooks.map(hook => node("li", hook)));
            entry.append(node("strong", label), list);
          }
        }
        row.append(entry);
        return;
      }
      const controls = node("div");
      controls.className = "tpv-swn-tag-controls edit-field has-reroll";
      const select = node("select");
      const label = node("label", `Tag ${index + 1}`);
      select.id = `tpv-tag-field-${++nextTagFieldId}`;
      label.htmlFor = select.id;
      select.append(new Option(saved.name, ""));
      available.forEach((candidate, offset) => select.append(new Option(candidate.name, String(offset + 1))));

      function replace(candidate) {
        update(tags().map((item, offset) => offset === index ? tpvTagReference(candidate) : item), index);
      }
      select.addEventListener("change", () => replace(available[Number(select.value) - 1]));
      const reroll = button("Reroll", () => replace(available[roll(available.length) - 1]));
      reroll.className = "reroll-action";
      reroll.disabled = !available.length;
      reroll.setAttribute("aria-label", `Reroll ${saved.name}`);
      const remove = button("Delete", () => update(tags().filter((_, offset) => offset !== index), index));
      remove.setAttribute("aria-label", `Delete ${saved.name}`);
      controls.append(label, reroll, remove, select);
      row.append(controls);
    });
    add.hidden = !draft || !available.length || tags().length >= 2;
  }
  edit.className = "tpv-inline-tag-edit";
  group.firstElementChild.append(edit);
  group.append(rows, add, commands);
  render();
  return group;
}

function centreOverview(centre) {
  const labels = ["Theme", "Appearance", "Complication"];
  return detailSection("Population Centres", [
    ...(centre.name ? [["Settlement", centre.name]] : []),
    ["Function", centre.purposes.join(" / ")], ["Population", centre.population.toLocaleString()],
    ...(centre.features.length ? [["Special features", centre.features.join(", ")]] : []),
    ...centre.prompts.map((text, index) => [labels[index], text]),
  ]);
}

function centreDetails(centre, roll, save, refresh, selectPlace) {
  const group = node("section");
  const settlement = centre.settlement;
  if (settlement) {
    group.append(
      detailSection("Settlement Situation", [["Local problem", settlement.problem], ["On arrival", settlement.arrival]]),
      detailSection("Notable NPCs", settlement.people.map(person => [person.name, `${person.role}. ${person.motive}`])),

    );
    const places = detailSection("Places to Visit");
    places.classList.add("tpv-settlement-places");
    for (const [placeIndex, place] of settlement.places.entries()) {
      const location = detailSection(`${placeIndex + 1}. ${place.name}`);
      if (selectPlace) location.firstElementChild.addEventListener("click", () => selectPlace(placeIndex));
      location.append(node("p", place.detail));
      if (place.site) {
        location.append(button("Reroll Layout", () => {
          place.site = layOutSite(place.site, roll);
          save();
          refresh(place);
        }));
        location.append(...place.site.map((area, index) =>
          detailSection(`${placeIndex + 1}.${index + 1}. ${area.name}`, [
            ["Occupant", area.occupant], ["Obstacle", area.obstacle],
            ...(area.discovery ? [["Discovery", area.discovery]] : []),
            ["Connects to areas", area.connects.map(number => `${placeIndex + 1}.${number}`).join(", ")],
          ])));
      } else {
        const develop = button("Develop Site", () => {
          place.site = developSite(settlement, roll);
          save();
          refresh(place);
        });
        develop.setAttribute("aria-label", `Develop Site for ${place.name}`);
        location.append(develop);
      }
      places.append(location);
    }
    group.append(places);
  } else {
    group.append(button("Develop Settlement", () => {
      centre.settlement = developSettlement(centre, roll);
      save();
      refresh();
    }));
  }
  return group;
}

export function moonName(host, index) {
  let letters = "";
  for (let number = index + 1; number > 0; number = Math.floor((number - 1) / 26)) {
    letters = String.fromCharCode(65 + (number - 1) % 26) + letters;
  }
  return `${host} ${letters}`;
}

function developedMoonName(body, index) {
  // Lunar outposts and colonies represent off-world settlers; a populated moon
  // alone does not identify its inhabitants or imply a human settlement.
  if (index === 0 && /^lunar (outpost|colony)$/i.test(body.type)) return body.name;
  return moonName(body.name, index);
}

function giantMoons(body) {
  const counts = body.features?.map(feature =>
    feature.match(/^\d+ moons · Moonlets per moon: (\d+(?:, \d+)*)$/)?.[1]).filter(Boolean) ?? [];
  return counts.flatMap(count => count.split(", ")).map((count, index) => {
    const name = moonName(body.name, index);
    const moonlets = Array.from({ length: Math.min(5, Number(count)) }, (_, n) => `${name}${n + 1}`);
    return [name, moonlets.join(", ") || "No moonlets"];
  });
}

function societyDetails(sector, feature, target, homeName, indigenous, roll, save, refresh) {
  const societies = sector.societies ?? [];
  const society = societies.find(item => item.id === target.societyId);
  const minimumTech = ["Station", "Outpost"].includes(target.type) ? 3 : 0;
  const eligible = societies.filter(item => item.tech >= minimumTech);
  const group = detailSection("Society", society ? [
    ["Name", society.name], ["Tech level", `TL${society.tech}`],
    ["Condition", society.condition], ["Political system", society.politics],
    ...(target.classification ? [["Populated area", `${society.area}% of habitable territory`]] : []),
  ] : []);
  if (society && society.tech < minimumTech) {
    group.append(node("p", "This society is below TL3. Unlink it to develop or choose a spacefaring society."));
  }
  const link = id => {
    target.societyId = id;
    save();
    refresh();
  };
  const input = node("input");
  const create = button("Develop Society", () => {
    const name = input.value.trim();
    if (!name) { input.reportValidity(); return; }
    const generated = generateSociety({ id: crypto.randomUUID(), name, status: feature.status, indigenous, minimumTech, roll });
    generated.faction = generateFactionProfile(roll, { place: homeName });
    (sector.societies ??= []).push(generated);
    link(generated.id);
  });
  if (!society) {
    const inputLabel = node("label", "New society name");
    input.required = true;
    input.value = rollFactionName(roll, { place: homeName });
    inputLabel.append(input);
    group.append(inputLabel, button("New Name", () => {
      input.value = rollFactionName(roll, { place: homeName });
    }), create);
  } else group.append(button("Unlink society", () => {
    delete target.societyId;
    save();
    refresh();
  }));
  if (!society && eligible.length) {
    const picker = node("select");
    for (const candidate of eligible) picker.add(new Option(candidate.name, candidate.id));
    const label = node("label", "Existing society");
    label.append(picker);
    group.append(label, button("Link Society", () => link(picker.value)));
  }
  if (society?.faction) {
    const home = sector.systems.find(system => system.id === society.homeSystemId)?.name;
    const faction = detailSection("Faction Profile", factionRows(society.faction, home));
    faction.append(node("h4", "Faction Notation"), node("p", factionNotation(society.name, society.faction, home)));
    group.append(faction);
  }
  return group;
}

function renderProfile(profile, inspector, feature, coordinate, back, sector, roll, save, statusLabel, systemStatus, showSetting, redevelop) {
  const heading = node("h2", `${feature.name} · System Profile`);
  heading.tabIndex = -1;
  const settingStep = ["Setting Overview", showSetting];
  const chartStep = ["Sector Chart", back];
  const catalogue = sector.addSwnTags ? tpvTagCatalogue() : null;
  function appendSwnTags(target, container, type, body) {
    if (!catalogue) return;
    const choices = tpvTagChoices(catalogue, type, body);
    if (choices.length || target.swnTags?.length) {
      container.append(swnTagDetails(target, choices, catalogue, roll, save));
    }
  }
  const systemTagPanel = node("section");
  systemTagPanel.className = "tpv-world-locations tpv-detail-fields tpv-system-tags";
  appendSwnTags(feature, systemTagPanel, "System");
  const systemTrail = profileBreadcrumb(settingStep, chartStep, ["System Profile", () => heading.focus()]);
  const installationPanel = node("section");
  const systemFacilities = feature.facilities ?? [];
  function renderInstallations() {
    installationPanel.replaceChildren(node("h3", "Orbital Facilities"));
    const options = {
      roll, types: ["Facility"], refresh: renderInstallations,
      save: () => { feature.facilities = systemFacilities; save(); },
    };
    const backToProfile = () => {
      profile.replaceChildren(systemTrail, controls, heading, details, orbits, entries, installationPanel, systemTagPanel);
      heading.focus();
    };
    installationPanel.append(siteEditor(systemFacilities, options), siteList(systemFacilities, {
      ...options,
      reroll: () => makeCommunity("Facility", roll),
      open: site => {
        const previous = [...inspector.childNodes];
        openCommunity(site, { roll, save, profile, inspector, breadcrumb: profileBreadcrumb,
          ancestry: [settingStep, chartStep, ["System Profile", () => {
            inspector.replaceChildren(...previous);
            backToProfile();
          }]], societies: sector.societies ?? [] });
      },
    }));
  }
  renderInstallations();
  const details = node("p");
  const updateDetails = () => {
    details.textContent = `Hex ${coordinate(feature.column, feature.row)} · ${feature.type} · ${feature.status} · ${feature.satellites.length} satellites`;
  };
  updateDetails();
  systemStatus.onchange = updateDetails;
  const orbits = node("div");
  orbits.className = "tpv-orbits";
  const star = node("section");
  star.className = "tpv-orbit-star";
  star.append(node("h3", feature.stars.length === 1 ? "Star" : "Stars"),
    ...feature.stars.map(star => node("p", star.type)));
  orbits.append(star);
  const entries = table(["Satellite or feature", "Orbit", "Details"]);
  const rows = entries.createTBody();
  for (let band = 1; band <= 10; band += 1) {
    const lane = node("section");
    lane.append(node("h3", `${band} · ${orbitZone(band)}`));
    for (const body of feature.satellites.filter(satellite => satellite.band === band)) {
      const summary = [body.type, body.size, ...(body.features ?? [])].filter(Boolean).join(" · ");
      const namedMoons = giantMoons(body);
      function descriptions() {
        const data = body.development;
        if (!data) return [];
        let moonIndex = 0;
        const worlds = data.worlds.map(world => worldNotation(
          world.classification === "moon" ? developedMoonName(body, moonIndex++) :
            /^lunar (outpost|colony)$/i.test(body.type) ? `${body.name} (host)` : body.name, world));
        if (data.centre) {
          const centre = data.centre;
          worlds.push(`${centre.name ? `${centre.name} · ` : ""}${body.type} · ${centre.purposes.join(" / ")} · Population ${centre.population.toLocaleString()}`);
        }
        return worlds;
      }
      let worldTrigger;
      let systemInspector;
      let selectedSurface;
      function show(event, restoreSettlementFocus = false) {
        if (catalogue && assignTpvTags(feature, catalogue, roll)) save();
        if (event) {
          worldTrigger = event.currentTarget;
          systemInspector = [...inspector.childNodes];
        }
        const header = node("header");
        header.className = "inspector-header";
        header.append(node("small", body.type), node("h3", body.name));
        const fields = node("div");
        fields.className = "inspector-fields tpv-detail-fields";
        const data = body.development;
        const worlds = data?.worlds ?? [];
        const centre = data?.centre;
        const siteName = centre?.name ?? body.type;
        const lunarCentre = /lunar/i.test(body.type);
        const surfaceCentre = /planetary/i.test(body.type);
        const planets = worlds.filter(world => world.classification === "planet");
        const moons = worlds.filter(world => world.classification === "moon");
        const worldProfile = planets.length > 0 || body.kind === "planet" || body.kind === "giant";
        const activeSurface = selectedSurface ?? (lunarCentre ? planets.length : 0);
        const surfaceCentreVisible = !worldProfile || !centre || /orbital/i.test(body.type) ||
          (lunarCentre ? worlds[activeSurface]?.classification === "moon" : worlds[activeSurface]?.classification === "planet");
        const locationFields = worldProfile ? node("section") : fields;
        if (worldProfile) {
          locationFields.className = "inspector-fields tpv-detail-fields tpv-world-locations";
          locationFields.append(node("h3", "Sites and Locations"));
        }
        const appendWorld = (world, name) => {
          fields.append(...worldDetails(world), ...lifeformDetails(world));
          appendSwnTags(world, fields, world.classification);
          const indigenous = world.lifeforms?.some(lifeform => lifeform.level === "Advanced") ?? false;
          const populated = body.type.toLowerCase() === `populated ${world.classification}`;
          if (indigenous || populated) fields.append(societyDetails(sector, feature, world, name, indigenous, roll, save, show));
        };
        let settlementAction;
        const appendCentre = () => {
          if (!surfaceCentreVisible) return;
          if (worldProfile) {
            const overview = centreOverview(centre);
            settlementAction = centre.settlement
              ? button("Open Site Profile", openSettlement)
              : button("Develop Settlement", () => {
                centre.settlement = developSettlement(centre, roll);
                save();
                openSettlement();
              });
            overview.append(settlementAction);
            locationFields.append(node("h4", siteName), overview);
          } else {
            locationFields.append(centreOverview(centre));
          }
          appendSwnTags(centre, locationFields, centre.type, body);
          locationFields.append(societyDetails(sector, feature, centre, body.name, false, roll, save, show));
        };
        if (planets.length) {
          fields.append(node("h4", "Planet"), orbitDetails(band));
          for (const planet of planets) appendWorld(planet, body.name);
          if (centre && surfaceCentre) appendCentre();
        } else {
          fields.append(orbitDetails(band));
          if (worldProfile && body.size) fields.append(detailSection("Physical Profile", [["Size", body.size]]));
        }
        if (moons.length) {
          fields.append(node("h4", "Moon(s)"));
          for (const [index, moon] of moons.entries()) {
            const name = developedMoonName(body, index);
            fields.append(node("h5", name));
            appendWorld(moon, name);
          }
          if (centre && lunarCentre) appendCentre();
        }
        if (centre && !(lunarCentre && moons.length) && !(surfaceCentre && planets.length)) {
          appendCentre();
        }
        if (!worlds.length && !centre) appendSwnTags(body, fields, tpvBodyTagType(body), body);
        if (body.features?.length) fields.append(detailSection("Features",
          body.features.map((text, index) => [String(index + 1), text])));
        if (namedMoons.length) fields.append(detailSection("Moon(s)", namedMoons));
        if (worlds.length) {
          const notation = detailSection("World Notation");
          notation.append(...descriptions().slice(0, worlds.length).map(text => node("p", text)));
          fields.append(notation);
        }
        function returnToSystem() {
          profile.replaceChildren(systemTrail, controls, heading, details, orbits, entries, installationPanel, systemTagPanel);
          inspector.replaceChildren(...systemInspector);
          (worldTrigger ?? heading).focus();
        }
        const worldSettingStep = ["Setting Overview", () => {
          inspector.replaceChildren(...systemInspector);
          showSetting();
        }];
        const systemStep = ["System Profile", returnToSystem];
        function openSettlement(event) {
          const trigger = event?.currentTarget;
          function renderSettlement(developedPlace) {
            const title = node("h2", `${siteName} · Site Profile`);
            title.tabIndex = -1;
            const content = node("section");
            content.className = "inspector-fields tpv-detail-fields tpv-world-locations";
            const settlement = centre?.settlement;
            let selectPlace;
            if (settlement?.places.length) {
              const layout = node("div");
              layout.className = "tpv-pointcrawl-layout";
              const choices = node("div");
              choices.className = "tpv-pointcrawl-choices";
              choices.setAttribute("role", "group");
              choices.setAttribute("aria-label", "Select pointcrawl location");
              const diagram = node("div");
              const buttons = settlement.places.map((place, index) =>
                button(place.name, () => selectPlace(index)));
              selectPlace = index => {
                buttons.forEach((control, offset) => control.setAttribute("aria-pressed", offset === index));
                diagram.replaceChildren(settlementPointcrawl(settlement.places[index], index));
              };
              choices.append(...buttons);
              layout.append(choices, diagram);
              content.append(layout);
              selectPlace(Math.max(0, settlement.places.indexOf(developedPlace)));
            }
            if (centre) {
              content.append(centreDetails(centre, roll, save, renderSettlement, selectPlace));
              if (worldProfile) appendSwnTags(centre, content, centre.type, body);
            } else {
              content.append(node("p", body.type));
            }
            const worldStep = ["World Profile", () => {
              show(undefined, true);
              if (trigger?.classList.contains("tpv-globe-target")) profile.querySelector(".tpv-globe-target")?.focus();
            }];
            const trail = profileBreadcrumb(worldSettingStep, chartStep, systemStep, ...(worldProfile ? [worldStep] : []), ["Site Profile", () => title.focus()]);
            const facilities = body.facilities ??= [];
            const refresh = () => renderSettlement(developedPlace);
            const siteStep = ["Site Profile", refresh];
            const options = { roll, save, refresh, types: ["Facility"] };
            if (!centre && body.kind === "station" && !body.facilityInterior) {
              body.facilityInterior = { ...makeCommunity("Facility", roll), name: body.name };
              save();
            }
            if (body.facilityInterior) content.append(button("Open Facility Interior", () =>
              openCommunity(body.facilityInterior, { roll, save, profile, inspector, breadcrumb: profileBreadcrumb,
                ancestry: [worldSettingStep, chartStep, systemStep, siteStep], societies: sector.societies ?? [] })));
            content.append(siteEditor(facilities, options), siteList(facilities, {
              ...options,
              reroll: () => makeCommunity("Facility", roll),
              open: site => openCommunity(site, { roll, save, profile, inspector, breadcrumb: profileBreadcrumb,
                ancestry: [worldSettingStep, chartStep, systemStep, ...(worldProfile ? [worldStep] : []), siteStep],
                societies: sector.societies ?? [] }),
            }));
            if (body.kind === "station" && !worldProfile) {
              const redraw = () => {
                inspector.replaceChildren(...systemInspector);
                renderProfile(profile, inspector, feature, coordinate, back, sector, roll, save,
                  statusLabel, systemStatus, showSetting, redevelop);
              };
              content.append(button("Reroll Installation", () => {
                if (!confirm(`Replace the generated details for ${body.name}?`)) return;
                if (centre) body.development = developBody(body, roll);
                delete body.facilityInterior;
                delete body.facilities;
                save();
                redraw();
              }), button("Delete Installation", () => {
                if (!confirm(`Delete ${body.name} and its contents?`)) return;
                feature.satellites.splice(feature.satellites.indexOf(body), 1);
                save();
                redraw();
              }));
            }
            profile.replaceChildren(trail, title, node("p", `Host: ${worldProfile ? body.name : feature.name}`), content);
            title.focus();
          }
          renderSettlement();
        }
        if (!worldProfile) {
          inspector.replaceChildren(header, fields);
          if (centre || body.kind === "station") openSettlement();
          return;
        }
        const worldHeading = node("h2", `${body.name} · World Profile`);
        worldHeading.tabIndex = -1;
        fields.prepend(node("h3", "World Details"));
        const surface = worlds[selectedSurface ?? (lunarCentre ? planets.length : 0)];
        const legacy = centre && surface && (lunarCentre ? surface.classification === "moon" :
          !/orbital|deep-space/i.test(body.type) && surface.classification === "planet");
        const worldStep = ["World Profile", () => show(undefined, true)];
        const ancestry = [worldSettingStep, chartStep, systemStep, worldStep];
        const refresh = () => show();
        const society = (sector.societies ?? []).find(candidate => candidate.id === (surface?.societyId ?? (legacy ? centre.societyId : undefined)));
        const populated = legacy || body.type.toLowerCase() === `populated ${surface?.classification}` ||
          surface?.lifeforms?.some(lifeform => lifeform.level === "Advanced") || Boolean(society);
        if (surface && surface.sites === undefined) {
          surface.sites = initialWorldSites(surface, populated, society, roll);
          save();
        }
        const sites = surface?.sites ?? [];
        const open = (site, region, event) => {
          if (site.legacy) return openSettlement(event);
          openCommunity(site, { roll, world: surface, save, profile, inspector, breadcrumb: profileBreadcrumb,
            ancestry, society, societies: sector.societies ?? [], region });
        };
        const globeSites = legacy ? [{ legacy: true, name: siteName, key: body.type }, ...sites] : sites;
        const globe = worldGlobe([feature.id, body.name, band, feature.satellites.indexOf(body), ...(surface?.classification === "moon" ? ["moon"] : [])],
          globeSites, appearance.colour, open, save);
        if (surface) {
          const options = { roll, save, refresh, world: surface };
          locationFields.append(siteEditor(sites, options), siteList(sites, {
            ...options, open, reroll: site => ({ ...makeCommunity(site.type, roll, surface), anchor: site.anchor }),
          }));
          if (legacy) {
            const legacyActions = node("div");
            legacyActions.className = "tpv-site-actions";
            legacyActions.append(button(`Reroll ${siteName}`, () => {
              if (!confirm(`Replace the generated details for ${siteName}?`)) return;
              const replacement = developBody(body, roll).centre;
              if (!replacement) return;
              body.development.centre = { ...replacement, societyId: centre.societyId };
              save();
              refresh();
            }), button(`Delete ${siteName}`, () => {
              if (!confirm(`Delete ${siteName} and its contents?`)) return;
              delete body.development.centre;
              save();
              refresh();
            }));
            locationFields.append(legacyActions);
          }
        }
        const context = node("p", `${feature.name} · ${body.type}`);
        if (worlds.length > 1) {
          const label = node("label", "Surface");
          const picker = node("select");
          worlds.forEach((world, index) => picker.add(new Option(
            world.classification === "planet" ? "Host planet" : developedMoonName(body, index - planets.length), index)));
          picker.value = selectedSurface ?? (lunarCentre ? planets.length : 0);
          picker.addEventListener("change", () => {
            selectedSurface = Number(picker.value);
            refresh();
          });
          label.append(picker);
          context.append(label);
        }
        const trail = profileBreadcrumb(worldSettingStep, chartStep, systemStep, ["World Profile", () => worldHeading.focus()]);
        profile.replaceChildren(trail, worldHeading, context, globe, locationFields);
        inspector.replaceChildren(fields);
        (restoreSettlementFocus ? settlementAction ?? worldHeading : worldHeading).focus();
      }
      const graphic = node("span");
      const appearance = orbitalAppearance(body);
      graphic.className = `tpv-body tpv-${appearance.kind} tpv-size-${appearance.size}`;
      if (appearance.colour) graphic.style.setProperty("--world-colour", appearance.colour);
      if (appearance.rings) {
        graphic.classList.add("tpv-ringed");
        graphic.classList.toggle("tpv-multiple-rings", appearance.rings > 1);
      }
      graphic.setAttribute("aria-hidden", "true");
      const marker = button(body.name, show);
      marker.className = "tpv-orbit-marker";
      if (appearance.kind === "planet" && /^orbital space station$/i.test(body.type)) {
        const pair = node("span");
        pair.className = "tpv-planet-station";
        pair.setAttribute("aria-hidden", "true");
        const station = node("span");
        station.className = "tpv-body tpv-station";
        pair.append(graphic, station);
        marker.setAttribute("aria-label", `${body.name} (planet with orbital space station)`);
        marker.prepend(pair);
      } else {
        marker.prepend(graphic);
      }
      lane.append(marker);
      const row = rows.insertRow();
      row.insertCell().append(button(body.name, show));
      row.insertCell().textContent = String(band);
      const details = descriptions();
      if (namedMoons.length) details.push(summary, ...namedMoons.map(([name, moonlets]) => `${name} · ${moonlets}`));
      row.insertCell().append(...(details.length ? details : [summary]).map(text => node("div", text)));
    }
    orbits.append(lane);
  }
  const controls = node("div");
  const form = node("form");
  form.hidden = true;
  const status = node("select");
  for (const option of ["Wild", "Frontier", "Core"]) status.add(new Option(option));
  status.value = feature.status;
  const label = node("label", "New system status");
  label.append(status);
  const openForm = button("Redevelop System", () => {
    status.value = feature.status;
    form.hidden = false;
    openForm.hidden = true;
    status.focus();
  });
  const confirm = node("button", "Confirm Redevelopment");
  confirm.type = "submit";
  form.append(label, node("p", "This replaces the current satellites and their details."),
    confirm, button("Cancel", () => {
      form.reset();
      status.value = feature.status;
      form.hidden = true;
      openForm.hidden = false;
      openForm.focus();
    }));
  form.addEventListener("submit", event => {
    event.preventDefault();
    redevelop(status.value);
  });
  controls.append(statusLabel, openForm, form);
  profile.replaceChildren(systemTrail, controls, heading, details, orbits, entries, installationPanel, systemTagPanel);
  heading.focus();
}
