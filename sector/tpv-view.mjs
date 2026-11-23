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

export function renderChart(container, features, coordinate, select) {
  const chart = table(["Hex", "Contents"]);
  const body = chart.createTBody();
  for (const feature of features) {
    const row = body.insertRow();
    row.dataset.hex = coordinate(feature.column, feature.row);
    row.insertCell().append(button(row.dataset.hex, () => select(feature)));
    row.insertCell().textContent = `${feature.name} · ${feature.type}`;
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
  const status = node("select");
  for (const option of ["Wild", "Frontier", "Core"]) status.add(new Option(option));
  status.value = feature.status ?? "Wild";
  const statusLabel = node("label", "System status");
  statusLabel.append(status);
  if (feature.satellites) status.disabled = true;
  const needsDetails = body => !body.development && canDevelopBody(body);
  const complete = feature.satellites && !feature.satellites.some(needsDetails);
  const open = button(complete ? "Open System Profile" : "Develop System", () => {
    if (!complete) {
      const satellites = feature.satellites ?? developTpvSystem(feature.stars, status.value, roll, nameFor);
      feature.satellites = satellites.map(body =>
        needsDetails(body) ? { ...body, development: developBody(body, roll) } : body);
      feature.status = status.value;
      status.disabled = true;
      open.textContent = "Open System Profile";
      save();
    }
    renderProfile(profile, inspector, feature, coordinate, back);
  });
  open.className = "tpv-open-profile";
  const faction = node("input");
  faction.value = feature.faction ?? "";
  faction.addEventListener("change", () => {
    feature.faction = faction.value.trim();
    save();
  });
  const factionLabel = node("label", "Faction presence");
  factionLabel.append(faction);
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
  inspector.append(statusLabel, factionLabel, open, routes);
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

function centreDetails(centre) {
  const labels = ["Theme", "Appearance", "Complication"];
  return detailSection("Population Centres", [
    ["Function", centre.purposes.join(" / ")], ["Population", centre.population.toLocaleString()],
    ...(centre.features.length ? [["Special features", centre.features.join(", ")]] : []),
    ...centre.prompts.map((text, index) => [labels[index], text]),
  ]);
}

function renderProfile(profile, inspector, feature, coordinate, back) {
  const heading = node("h2", `${feature.name} · System Profile`);
  heading.tabIndex = -1;
  const details = node("p", `Hex ${coordinate(feature.column, feature.row)} · ${feature.type} · ${feature.status} · ${feature.satellites.length} satellites${feature.faction ? ` · ${feature.faction}` : ""}`);
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
      function descriptions() {
        const data = body.development;
        if (!data) return [];
        const worlds = data.worlds.map(world => {
          const name = data.worlds.length > 1 && world.classification === "planet" ? `${body.name} (host)` : body.name;
          return worldNotation(name, world);
        });
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
        if (planets.length) {
          fields.append(node("h4", "Planet"), orbitDetails(band));
          for (const planet of planets) fields.append(...worldDetails(planet));
          if (centre && surfaceCentre) fields.append(centreDetails(centre));
        } else fields.append(orbitDetails(band));
        if (moons.length) {
          fields.append(node("h4", "Moon(s)"));
          for (const moon of moons) fields.append(...worldDetails(moon));
          if (centre && lunarCentre) fields.append(centreDetails(centre));
        }
        if (centre && !(lunarCentre && moons.length) && !(surfaceCentre && planets.length)) {
          fields.append(centreDetails(centre));
        }
        if (body.features?.length) fields.append(detailSection("Features",
          body.features.map((text, index) => [String(index + 1), text])));
        if (worlds.length) {
          const notation = detailSection("World Notation");
          notation.append(...descriptions().slice(0, worlds.length).map(text => node("p", text)));
          fields.append(notation);
        }
        inspector.replaceChildren(header, fields);
      }
      const graphic = node("span");
      graphic.className = `tpv-body tpv-${body.kind} tpv-size-${body.size?.toLowerCase() ?? "standard"}`;
      graphic.setAttribute("aria-hidden", "true");
      const marker = button(body.name, show);
      marker.className = "tpv-orbit-marker";
      marker.prepend(graphic);
      lane.append(marker);
      const row = rows.insertRow();
      row.insertCell().append(button(body.name, show));
      row.insertCell().textContent = String(band);
      const details = descriptions();
      row.insertCell().append(...(details.length ? details : [summary]).map(text => node("div", text)));
    }
    orbits.append(lane);
  }
  profile.replaceChildren(button("Back to Sector Chart", back), heading, details, orbits, entries);
  heading.focus();
}
