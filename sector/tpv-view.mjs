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

function detailSection(title, explanation, rows = []) {
  const group = node("details");
  group.className = "inspector-group";
  group.open = true;
  const summary = node("summary");
  summary.append(node("span", title));
  group.append(summary);
  if (explanation) group.append(node("small", explanation));
  if (rows.length) {
    const fields = node("dl");
    fields.className = "inspector-attributes";
    for (const [label, value] of rows) fields.append(node("dt", label), node("dd", value));
    group.append(fields);
  }
  return group;
}

const centreExplanations = {
  Outpost: "An isolated, self-contained settlement established for a particular job or service (p. 104).",
  Station: "A largely self-sufficient settlement in space that may serve as a hub for travel and trade (p. 106).",
  Colony: "A settlement established to give a starfaring society a foothold on another world (pp. 40, 108).",
};

function worldDetails(world, hasHost) {
  const title = world.classification === "moon" ? "Moon" : hasHost ? "Host Planet" : "Planet";
  const physical = detailSection(title,
    "Size influences gravity and the number of moons. Gravity outside the moderate range can make human activity harder (p. 46).", [
      ["Classification", `${world.type} ${world.classification}`],
      ["Size", world.size], ["Diameter", `${world.diameter.toLocaleString()} km`], ["Gravity", world.gravity],
    ]);
  const environment = detailSection("Environment",
    "Climate and distance from the star affect the atmosphere. Its gases shape surface conditions and hazards. Water can persist as ice or vapour on worlds without an atmosphere (pp. 46–47).", [
      ["Climate", world.climate],
      ["Atmosphere", world.composition ? `${world.atmosphere} (${world.composition})` : world.atmosphere],
      ["Water", `${world.water} (${world.waterPercent}%)`], ["Life", world.life], ["Resources", world.resources],
    ]);
  const sections = [physical, environment];
  if (world.notes.length) sections.push(detailSection("World Features",
    "Features describe what stands out about a world, including its terrain, hazards and life adaptations (pp. 49, 53, 64–71).",
    world.notes.map((note, index) => [String(index + 1), note])));
  return sections;
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
        fields.append(detailSection("Orbit",
          "TPV groups distances from the host star into four zones. A world’s zone influences its climate and classification (p. 46).",
          [["Band", String(band)], ["Zone", orbitZone(band)]]));
        const data = body.development;
        for (const world of data?.worlds ?? []) fields.append(...worldDetails(world, data.worlds.length > 1));
        if (data?.centre) {
          const centre = data.centre;
          fields.append(detailSection("Population Centre", centreExplanations[centre.type], [
            ["Function", centre.purposes.join(" / ")], ["Population", centre.population.toLocaleString()],
            ...(centre.features.length ? [["Special features", centre.features.join(", ")]] : []),
          ]));
          const labels = ["Theme", "Appearance", "Complication"];
          fields.append(detailSection("Community",
            "Use these three prompts together with the settlement’s circumstances to describe its character (pp. 101–102).",
            centre.prompts.map((text, index) => [labels[index], text])));
        }
        if (body.features?.length) fields.append(detailSection("Features", "",
          body.features.map((text, index) => [String(index + 1), text])));
        if (data?.worlds.length) {
          const notation = detailSection("World Notation", "TPV’s compact reference format (p. 47).");
          notation.append(...descriptions().slice(0, data.worlds.length).map(text => node("p", text)));
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
