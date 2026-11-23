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
  const open = button(feature.satellites ? "Open System Profile" : "Develop System", () => {
    if (!feature.satellites) {
      feature.status = status.value;
      feature.satellites = developTpvSystem(feature.stars, feature.status, roll, nameFor);
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
      const show = () => inspector.replaceChildren(node("h3", body.name), node("p", summary),
        node("p", `Orbit ${band} · ${orbitZone(band)}`));
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
      row.insertCell().textContent = summary;
    }
    orbits.append(lane);
  }
  profile.replaceChildren(button("Back to Sector Chart", back), heading, details, orbits, entries);
  heading.focus();
}
