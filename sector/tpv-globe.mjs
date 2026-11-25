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
      cells.push({ x, y, hemisphere, points, centre: project(x, y, hemisphere), markable: Math.hypot(x, y) < radius * .68 });
    }
  }
}

function hash(text) {
  let value = 2166136261;
  for (const character of text) value = Math.imul(value ^ character.codePointAt(0), 16777619);
  return value >>> 0;
}

function neighbours(first, second) {
  if (first.hemisphere === second.hemisphere) {
    return Math.hypot(first.x - second.x, first.y - second.y) < Math.sqrt(3) * hexSize + .01;
  }
  return Math.hypot(first.x, first.y) > radius - hexSize &&
    Math.hypot(second.x, second.y) > radius - hexSize &&
    Math.hypot(first.x + second.x, first.y - second.y) < Math.sqrt(3) * hexSize + .01;
}

export function worldGlobe(worldKey, sites, colour, openSite, save) {
  const figure = document.createElement("figure");
  figure.className = "tpv-world-globe";
  const map = svg("svg", { viewBox: "0 0 598 302", role: "group", "aria-label": "Two hemispheres of the world, with numbered site locations" });
  if (colour) map.style.setProperty("--globe-colour", colour);
  for (const cx of originX) map.append(svg("circle", { cx, cy: originY, r: radius }));
  for (const cell of cells) map.append(svg("polygon", { points: cell.points }));
  figure.append(map);
  if (!sites.length) return figure;

  const available = cells.filter(cell => cell.markable);
  const markers = [];
  let changed = false;
  const reserved = new Set(sites.map(site => cells[site.anchor]).filter(Boolean));
  sites.forEach((site, index) => {
    const seed = hash(JSON.stringify(site.legacy ? [worldKey, site.key, 0] : [worldKey, site.id]));
    const unclaimed = available.filter(cell => !reserved.has(cell));
    const candidates = site.legacy ? cells.filter(cell => cell.markable) :
      unclaimed.length ? unclaimed : available.length ? available : cells;
    const anchor = cells[site.anchor] ?? candidates[seed % candidates.length];
    if (!site.legacy && !cells[site.anchor]) {
      site.anchor = cells.indexOf(anchor);
      changed = true;
    }
    const offset = available.indexOf(anchor);
    if (offset >= 0) available.splice(offset, 1);
    const footprint = [anchor];
    const regions = site.type === "Megacity" ? site.children.filter(child => child.type === "Region") : [];
    const wanted = site.worldSpanning ? cells.length : Math.max(1, regions.length);
    if (site.worldSpanning) footprint.push(...cells.filter(cell => cell !== anchor));
    while (footprint.length < wanted) {
      const frontier = cells.filter(cell => !footprint.includes(cell) && footprint.some(other => neighbours(cell, other)));
      if (!frontier.length) break;
      footprint.push(frontier[seed % frontier.length]);
    }
    footprint.forEach((cell, offset) => {
      const region = regions[Math.min(regions.length - 1, Math.floor(offset * regions.length / footprint.length))];
      const label = region ? `${site.name}, ${region.name}` : site.name;
      const target = svg("g", { role: "button", tabindex: offset ? "-1" : "0",
        "aria-label": `Select site ${index + 1}, ${label}`, class: "tpv-globe-target" });
      const polygon = svg("polygon", { points: cell.points, class: offset ? "tpv-globe-coverage" : "tpv-globe-site" });
      target.append(polygon);
      if (!offset) {
        const [x, y] = cell.centre;
        const marker = svg("text", { x, y, "aria-hidden": "true" });
        marker.textContent = index + 1;
        target.append(marker);
      }
      const open = event => openSite(site, region, event);
      target.addEventListener("click", open);
      target.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(event);
        }
      });
      if (offset) map.append(target);
      else markers.push(target);
    });
  });
  map.append(...markers);
  if (changed) save?.();
  return figure;
}
