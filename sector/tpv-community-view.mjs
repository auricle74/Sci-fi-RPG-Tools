import { developCommunity, makeCommunity, makeDistrict, siteTypes } from "./tpv-communities.mjs";
import { svg } from "./tpv-globe.mjs";

function element(tag, text) {
  const control = document.createElement(tag);
  if (text !== undefined) control.textContent = text;
  return control;
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
  const childTypes = ["Town", "City", "Region"].includes(site.type)
    ? ["District", "Facility"] : ["Facility"];
  const create = type => type === "District" ? makeDistrict("Mixed", roll) : makeCommunity(type, roll, world);
  const reroll = child => {
    if (child.type === "District") return makeDistrict(child.function, roll);
    if (child.type === "Region") return { type: "Region", name: makeDistrict("Mixed", roll).name };
    if (child.type === "Location") {
      const refreshed = { ...site, children: [] };
      developCommunity(refreshed, roll);
      return refreshed.children.find(place => place.function === child.function) ?? refreshed.children[0];
    }
    return makeCommunity(child.type, roll, world);
  };
  if (site.type !== "Location") {
    if (site.children.length) content.append(routeMap(site.children, open, ["City", "Megacity", "Region"].includes(site.type),
      site.type === "Village" && !site.functions.includes("Mining")));
    content.append(siteEditor(site.children, { roll, world, save, refresh, types: childTypes, create }),
      siteList(site.children, { open, save, refresh, reroll }));
  }
  profile.replaceChildren(breadcrumb(...ancestry, [site.name, () => title.focus()]), title, content);
  title.focus();
}
