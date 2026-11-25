import { developCommunity, makeCommunity, makeDistrict, makeRegion, siteTypes } from "./tpv-communities.mjs";
import { svg } from "./tpv-globe.mjs";

function element(tag, text) {
  const control = document.createElement(tag);
  if (text !== undefined) control.textContent = text;
  return control;
}

const siteTraces = {
  Village: "M2 20h20 M4 20v-7l4-4 4 4v7 M13 20v-5l4-4 4 4v5",
  Town: "M2 20h20 M3 20v-7l4-4 4 4v7 M11 20V8h5v12 M16 20v-6l3-3 3 3v6",
  City: "M2 21h20 M4 21V10h5v11 M9 21V4h6v17 M15 21v-8h5v8 M11 8h2m-2 4h2m-2 4h2",
  Megacity: "M1 22h22 M2 22V13h4v9 M6 22V8h4v14 M10 22V3h5v19 M15 22V6h4v16 M19 22V11h3v11 M7 16h12 M12.5 3V1",
  Facility: "M2 21h20 M3 21v-9l6 3v-4l6 3v-4l6 3v8 M17 10V4h3v8 M6 18h2m3 0h2m3 0h2",
  Outpost: "M2 21h20 M5 21v-8l7-5 7 5v8 M12 8V3m0 0 5 2-5 2 M10 21v-5h4v5",
  Colony: "M2 21h20 M4 21v-4a8 8 0 0 1 16 0v4 M8 21v-4a4 4 0 0 1 8 0v4 M12 9V5",
  District: "M3 3h18v18H3z M3 10h18 M10 3v18 M10 16h11",
  Region: "M3 8l5-5 8 2 5 5-2 8-7 3-8-4z M8 3l2 9 9 6 M4 17l6-5 11-2",
  Station: "M12 3v18 M3 12h18 M8 8h8v8H8z M2 8h4v8H2z M18 8h4v8h-4z",
};

function siteTypeIcon(type) {
  const icon = svg("svg", { viewBox: "0 0 24 24", class: "tpv-site-trace", "aria-hidden": "true", focusable: "false" });
  const trace = siteTraces[type] ?? (/orbital|station/i.test(type) ? siteTraces.Station : "M12 3l9 9-9 9-9-9Z M9 12h6");
  icon.append(svg("path", { d: trace }));
  return icon;
}

export function siteTypeLabel(type) {
  const label = element("span");
  label.className = "tpv-site-type";
  label.append(siteTypeIcon(type), type);
  return label;
}

export function siteProfileVisual(type, map) {
  const layout = element("div");
  layout.className = "tpv-site-visual";
  const illustration = element("div");
  illustration.className = "tpv-site-illustration";
  illustration.append(siteTypeIcon(type));
  layout.append(illustration);
  if (map) layout.append(map);
  return layout;
}

function button(label, action, name = label) {
  const control = element("button", label);
  control.type = "button";
  control.setAttribute("aria-label", name);
  control.addEventListener("click", action);
  return control;
}

export function siteEditor(sites, { roll, world, save, refresh, types = siteTypes, create }) {
  const section = element("section");
  section.className = "tpv-site-editor";
  const picker = element("select");
  picker.setAttribute("aria-label", "Site type");
  picker.add(new Option("Roll site type", ""));
  for (const type of types) picker.add(new Option(type, type));
  const generate = type => create ? create(type) : makeCommunity(type, roll, world);
  section.append(picker, button("Add Site", () => {
    sites.push(generate(picker.value || types[roll(types.length) - 1]));
    save();
    refresh();
  }));
  return section;
}

export function siteActions(site, sites, { save, refresh, reroll }) {
  const actions = element("div");
  actions.className = "tpv-site-actions";
  actions.append(button("Reroll", () => {
    if (!confirm(`Replace the generated details for ${site.name}?`)) return;
    sites.splice(sites.indexOf(site), 1, { ...reroll(), id: site.id });
    save();
    refresh();
  }, `Reroll ${site.name}`), button("Delete", () => {
    if (!confirm(`Delete ${site.name} and its contents?`)) return;
    sites.splice(sites.indexOf(site), 1);
    save();
    refresh();
  }, `Delete ${site.name}`));
  return actions;
}

export function siteList(sites, { open, save, refresh, reroll }) {
  const list = element("ul");
  list.className = "tpv-site-list";
  for (const site of sites) {
    const row = element("li");
    const kind = site.type === "District" ? `${site.function} District` : site.type;
    row.append(button(`${site.name} · ${kind}`, () => open(site)),
      siteActions(site, sites, { save, refresh, reroll: () => reroll(site) }));
    list.append(row);
  }
  return list;
}

function routeMap(sites, open, dense, hub) {
  const graph = element("div");
  graph.className = "tpv-community-map";
  const columns = Math.min(4, sites.length);
  const rows = Math.ceil(sites.length / columns);
  const width = columns * 180;
  const height = rows * 108;
  const map = svg("svg", { viewBox: `0 0 ${width} ${height}`, role: "group", "aria-label": "Connected site map" });
  const positions = sites.map((_, index) => {
    const row = Math.floor(index / columns);
    return [90 + 180 * (row % 2 ? columns - 1 - index % columns : index % columns), 54 + 108 * row];
  });
  const connect = (first, second) => {
    const [x1, y1] = positions[first];
    const [x2, y2] = positions[second];
    map.append(svg("line", { x1, y1, x2, y2 }));
  };
  sites.forEach((_, index) => {
    if (index) connect(hub ? 0 : index - 1, index);
    if (dense && index >= columns && index % columns !== 0) {
      const previousRow = Math.floor(index / columns) - 1;
      const previousColumn = columns - 1 - index % columns;
      const other = previousRow * columns + previousColumn;
      if (other !== index - 1) connect(other, index);
    }
  });
  sites.forEach((site, index) => {
    const [x, y] = positions[index];
    const tile = svg("foreignObject", { x: x - 76, y: y - 34, width: 152, height: 68 });
    const link = button(site.name, () => open(site), `Open ${site.name}`);
    link.append(element("small", site.function ?? site.type));
    tile.append(link);
    map.append(tile);
  });
  graph.append(map);
  return graph;
}

function detailRows(rows) {
  const table = element("dl");
  table.className = "inspector-attributes";
  for (const [label, value] of rows) table.append(element("dt", label), element("dd", typeof value === "number" ? value.toLocaleString() : value));
  return table;
}

export function openCommunity(site, { roll, world, save, profile, inspector, breadcrumb, ancestry, society, societies, region }) {
  if (region) {
    const parent = () => openCommunity(site, { roll, world, save, profile, inspector, breadcrumb, ancestry, society, societies });
    openCommunity(region, { roll, world, save, profile, inspector, breadcrumb,
      ancestry: [...ancestry, [site.name, parent]], society, societies });
    return;
  }
  if (site.children === undefined || (!site.children.length && !site.developed && ["Village", "Outpost", "Colony", "Facility"].includes(site.type))) {
    if (site.type !== "Location") developCommunity(site, roll);
    site.developed = true;
    save();
  }
  const title = element("h2", `${site.name} · ${site.type}`);
  title.tabIndex = -1;
  const refresh = () => openCommunity(site, { roll, world, save, profile, inspector, breadcrumb, ancestry, society, societies });
  const current = societies.find(candidate => candidate.id === site.societyId) ?? society;
  const open = child => {
    if (child.type === "Location") {
      const heading = element("h3", child.name);
      heading.tabIndex = -1;
      inspector.replaceChildren(heading, detailRows([["Location", child.function], ...child.summary]));
      heading.focus();
      return;
    }
    openCommunity(child, { roll, world, save, profile, inspector, breadcrumb,
      ancestry: [...ancestry, [site.name, refresh]], society: current, societies });
  };
  const info = element("section");
  info.append(detailRows([["Type", site.type], ...(site.function ? [["Function", site.function]] : []), ...(site.summary ?? [])]));
  if (site.type !== "Location") {
    const label = element("label", "Governing society");
    const picker = element("select");
    picker.add(new Option(society ? `Inherit ${society.name}` : "None linked", ""));
    for (const candidate of societies) picker.add(new Option(candidate.name, candidate.id));
    picker.value = site.societyId ?? "";
    picker.addEventListener("change", () => {
      if (picker.value) site.societyId = picker.value;
      else delete site.societyId;
      save();
    });
    label.append(picker);
    info.append(label);
  }
  inspector.replaceChildren(info);
  const content = element("section");
  const isMegacity = site.type === "Megacity";
  const childTypes = isMegacity ? ["Region", "Facility"] :
    ["Town", "City", "Region"].includes(site.type) ? ["District", "Facility"] : ["Facility"];
  const create = type => {
    if (type === "Region") return makeRegion(roll);
    if (type === "District") return makeDistrict("Mixed", roll);
    return makeCommunity(type, roll, world);
  };
  const saveChildren = () => {
    if (isMegacity) {
      const regions = site.children.filter(child => child.type === "Region").length;
      if (world?.regions !== undefined) site.worldSpanning = regions >= world.regions;
      const scope = site.worldSpanning ? "World-spanning" : `${regions} ${regions === 1 ? "region" : "regions"}`;
      site.summary = [...(site.summary ?? []).filter(([label]) => label !== "Scope"), ["Scope", scope]];
    }
    save();
  };
  const reroll = child => {
    if (child.type === "District") return makeDistrict(child.function, roll);
    if (child.type === "Region") return makeRegion(roll);
    if (child.type === "Location") {
      const refreshed = { ...site, children: [] };
      developCommunity(refreshed, roll);
      return refreshed.children.find(place => place.function === child.function) ?? refreshed.children[0];
    }
    return makeCommunity(child.type, roll, world);
  };
  if (site.type !== "Location") {
    const map = site.children.length ? routeMap(site.children, open, ["City", "Megacity", "Region"].includes(site.type),
      site.type === "Village" && !site.functions.includes("Mining")) : undefined;
    content.append(siteProfileVisual(site.type, map));
    content.append(siteEditor(site.children, { roll, world, save: saveChildren, refresh, types: childTypes, create }),
      siteList(site.children, { open, save: saveChildren, refresh, reroll }));
  }
  profile.replaceChildren(breadcrumb(...ancestry, [site.name, () => title.focus()]), title, content);
  title.focus();
}
