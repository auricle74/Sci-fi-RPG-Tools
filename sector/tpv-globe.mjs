const radius = 131;
const hexSize = 12;
const originX = [151, 447];
const originY = 151;

export function svg(tag, attributes) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function project(x, y, hemisphere) {
  const distance = Math.hypot(x, y);
  const scale = distance ? radius * Math.sin(Math.min(distance / radius, 1) * Math.PI / 2) / distance : Math.PI / 2;
  return [originX[hemisphere] + x * scale, originY + y * scale];
}

const cells = [];
for (let hemisphere = 0; hemisphere < originX.length; hemisphere += 1) {
  for (let row = -8; row <= 8; row += 1) {
    for (let column = -8; column <= 8; column += 1) {
      const x = Math.sqrt(3) * hexSize * (column + (row % 2 !== 0 ? .5 : 0));
      const y = 1.5 * hexSize * row;
      if (Math.hypot(x, y) > radius + hexSize) continue;
      const points = Array.from({ length: 6 }, (_, corner) => {
        const angle = (corner * 60 + 30) * Math.PI / 180;
        return project(x + hexSize * Math.cos(angle), y + hexSize * Math.sin(angle), hemisphere).join(",");
      }).join(" ");
      cells.push({ points, centre: project(x, y, hemisphere), markable: Math.hypot(x, y) < radius * .68 });
    }
  }
}

function hash(text) {
  let value = 2166136261;
  for (const character of text) value = Math.imul(value ^ character.codePointAt(0), 16777619);
  return value >>> 0;
}

export function worldGlobe(worldKey, sites, colour, openSite) {
  const figure = document.createElement("figure");
  figure.className = "tpv-world-globe";
  const map = svg("svg", { viewBox: "0 0 598 302", role: "group", "aria-label": "Two hemispheres of the world, with numbered surface locations" });
  if (colour) map.style.setProperty("--globe-colour", colour);
  for (const cx of originX) map.append(svg("circle", { cx, cy: originY, r: radius }));
  const available = [];
  for (const cell of cells) {
    const polygon = svg("polygon", { points: cell.points });
    map.append(polygon);
    if (cell.markable) available.push({ ...cell, polygon });
  }
  figure.append(map);
  if (!sites.length) return figure;

  const legend = document.createElement("figcaption");
  const list = document.createElement("ol");
  sites.forEach((site, index) => {
    const cell = available[hash(JSON.stringify([worldKey, site, index])) % available.length];
    if (!cell) return;
    available.splice(available.indexOf(cell), 1);
    cell.polygon.classList.add("tpv-globe-site");
    const [x, y] = cell.centre;
    const marker = svg("text", { x, y, "aria-hidden": "true" });
    marker.textContent = index + 1;
    const target = svg("g", { role: "button", tabindex: "0", "aria-label": `Open Site Profile for ${site}`, class: "tpv-globe-target" });
    target.append(cell.polygon, marker);
    target.addEventListener("click", openSite);
    target.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSite(event);
      }
    });
    map.append(target);
    const item = document.createElement("li");
    const link = document.createElement("button");
    link.type = "button";
    link.textContent = site;
    link.addEventListener("click", openSite);
    item.append(link);
    list.append(item);
  });
  legend.append(list);
  figure.append(legend);
  return figure;
}
