import { developSettlement, developSite } from "./tpv-settlement.mjs";
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
  const chart = table(["Hex", "Contents"]);
  const body = chart.createTBody();
  for (const feature of features) {
    const row = body.insertRow();
    row.dataset.hex = coordinate(feature.column, feature.row);
    row.insertCell().append(button(row.dataset.hex, () => select(feature)));
    const details = row.insertCell();
    details.textContent = `${feature.name} · ${feature.type}`;
    for (const entry of presence(feature)) details.append(node("div", `${entry.role} · ${entry.name}`));
  }
  container.replaceChildren(node("h3", "Subsectors of interest"), chart);
}

export function inspectTpv(inspector, profile, sector, feature, coordinate, roll, nameFor, save, back) {
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
    renderProfile(profile, inspector, feature, coordinate, back, sector, roll, save, statusLabel, status, systemStatus => {
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

function centreDetails(centre, roll, save, refresh) {
  const labels = ["Theme", "Appearance", "Complication"];
  const group = detailSection("Population Centres", [
    ["Function", centre.purposes.join(" / ")], ["Population", centre.population.toLocaleString()],
    ...(centre.features.length ? [["Special features", centre.features.join(", ")]] : []),
    ...centre.prompts.map((text, index) => [labels[index], text]),
  ]);
  const settlement = centre.settlement;
  if (settlement) {
    group.append(
      detailSection("Settlement Situation", [["Local problem", settlement.problem], ["On arrival", settlement.arrival]]),
      detailSection("Key People", settlement.people.map(person => [person.name, `${person.role}. ${person.motive}`])),

    );
    const places = detailSection("Places to Visit");
    for (const place of settlement.places) {
      const location = detailSection(place.name);
      location.append(node("p", place.detail));
      if (place.site) {
        location.append(...place.site.map((area, index) =>
          detailSection(`${index + 1}. ${area.name}`, [
            ["Occupant", area.occupant], ["Obstacle", area.obstacle],
            ...(area.discovery ? [["Discovery", area.discovery]] : []),
            ["Connects to areas", area.connects.join(", ")],
          ])));
      } else {
        const develop = button("Develop Site", () => {
          place.site = developSite(settlement, roll);
          save();
          refresh();
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

function renderProfile(profile, inspector, feature, coordinate, back, sector, roll, save, statusLabel, systemStatus, redevelop) {
  const heading = node("h2", `${feature.name} · System Profile`);
  heading.tabIndex = -1;
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
          worlds.push(`${body.type} · ${centre.purposes.join(" / ")} · Population ${centre.population.toLocaleString()}`);
        }
        return worlds;
      }
      function show() {
        const header = node("header");
        header.className = "inspector-header";
        header.append(node("small", body.type), node("h3", body.name));
        const fields = node("div");
        fields.className = "inspector-fields tpv-detail-fields";
        const data = body.development;
        const worlds = data?.worlds ?? [];
        const centre = data?.centre;
        const lunarCentre = /lunar/i.test(body.type);
        const surfaceCentre = /planetary/i.test(body.type);
        const planets = worlds.filter(world => world.classification === "planet");
        const moons = worlds.filter(world => world.classification === "moon");
        const appendWorld = (world, name) => {
          fields.append(...worldDetails(world), ...lifeformDetails(world));
          const indigenous = world.lifeforms?.some(lifeform => lifeform.level === "Advanced") ?? false;
          const populated = body.type.toLowerCase() === `populated ${world.classification}`;
          if (indigenous || populated) fields.append(societyDetails(sector, feature, world, name, indigenous, roll, save, show));
        };
        const appendCentre = () => fields.append(centreDetails(centre, roll, save, show),
          societyDetails(sector, feature, centre, body.name, false, roll, save, show));
        if (planets.length) {
          fields.append(node("h4", "Planet"), orbitDetails(band));
          for (const planet of planets) appendWorld(planet, body.name);
          if (centre && surfaceCentre) appendCentre();
        } else fields.append(orbitDetails(band));
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
        if (body.features?.length) fields.append(detailSection("Features",
          body.features.map((text, index) => [String(index + 1), text])));
        if (namedMoons.length) fields.append(detailSection("Moon(s)", namedMoons));
        if (worlds.length) {
          const notation = detailSection("World Notation");
          notation.append(...descriptions().slice(0, worlds.length).map(text => node("p", text)));
          fields.append(notation);
        }
        inspector.replaceChildren(header, fields);
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
  controls.append(button("Back to Sector Chart", back), statusLabel, openForm, form);
  profile.replaceChildren(controls, heading, details, orbits, entries);
  heading.focus();
}
