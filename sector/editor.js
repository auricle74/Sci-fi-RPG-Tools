import { createBackup, readBackup, restoreBackupStorage } from "./backup.mjs";
import { bookChecklist, developmentLog, sectorBooks } from "../development/view.mjs";
import { renderFactionManager, sectorLocations } from "./faction-manager.mjs";
import { chartFactionPresence, factionPresence } from "./tpv-factions.mjs";
import { generateTpvSector, tpvDistance, tpvRules } from "./tpv.mjs";
import { inspectTpv, renderChart, renderXenobestiary } from "./tpv-view.mjs";
import { bookTags, catalogueTags } from "./tag-catalogue.mjs";
import { findTradeRoutes, validTradeRoutes } from "./trade-routes.mjs";
import { generateSystems, rollName, starCount } from "./swn.mjs";
import { presets, readSector, validDimension } from "./sector-data.mjs";
import { showInspector } from "./inspector.mjs";

const schemaVersion = 1;
const storageKey = "scifi-rpg-tools.sector";
const rulesets = { [tpvRules.id]: tpvRules, "swn-revised": { id: "swn-revised", version: "revised" } };
const svgNamespace = "http://www.w3.org/2000/svg";
const element = (id) => document.getElementById(id);
const setup = element("setup");
const rules = element("rules");
const size = element("size");
const widthInput = element("width");
const heightInput = element("height");
const map = element("map");
const mapWindow = map.parentElement;
const showTradeRoutes = element("show-trade-routes");
const showSystemNames = element("show-system-names");
const routeKey = element("trade-route-key");

function syncVisibility() {
  map.classList.toggle("hide-trade-routes", !showTradeRoutes.checked);
  map.classList.toggle("hide-system-names", !showSystemNames.checked);
  routeKey.hidden = !sector.tradeRoutes.length || !showTradeRoutes.checked;
  element("route-visibility-label").textContent = isTpv() ? "Jump Routes" : "Trade Routes";
}

for (const control of [showTradeRoutes, showSystemNames]) {
  const key = `${storageKey}.${control.id}`;
  try {
    control.checked = localStorage.getItem(key) !== "false";
  } catch {
    // Use the default when storage is unavailable.
  }
  control.addEventListener("change", () => {
    syncVisibility();
    try {
      localStorage.setItem(key, String(control.checked));
    } catch {
      // Visibility still applies until the page is reloaded.
    }
  });
}
const zoomIn = element("zoom-in");
const zoomOut = element("zoom-out");
const minZoom = 0.5;
const maxZoom = 3;
const zoomStep = 1.2;
let zoom = 1;
let mapWidth;
let mapHeight;
const density = element("density");
const replaceSector = element("replace-sector");
const generationStatus = element("generation-status");
const roll = (sides) => 1 + Math.floor(Math.random() * sides);
const tpvSelected = () => rules.value === tpvRules.id;
const isTpv = () => sector.ruleset.id === tpvRules.id;
const dimensions = () => presets[size.value] ?? [widthInput.valueAsNumber, heightInput.valueAsNumber];

function createSector(rulesetId, preset, width, height) {
  return {
    schemaVersion,
    name: "Untitled sector",
    id: crypto.randomUUID(),
    ruleset: { ...rulesets[rulesetId] },
    grid: { preset, width, height },
    systems: [],
    selectedHex: { column: 1, row: 1 },
  };
}

function loadSector() {
  try {
    return readSector(localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

let sector = loadSector() ?? createSector("swn-revised", "swn", 8, 10);
const hexes = new Map();
const hexCentres = new Map();
let systems = new Map();
const nebulaHexes = new Map();

function saveSector() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(sector));
  } catch {
    element("storage-message").hidden = false;
  }
}

function syncCustomInputs() {
  const tpv = tpvSelected();
  element("tpv-start-control").hidden = !tpv;
  element("tpv-swn-tags-control").hidden = !tpv;
  for (const input of setup.querySelectorAll("[data-swn-only]")) input.closest("label").hidden = tpv;
  const custom = size.value === "custom";
  element("custom").hidden = !custom;
  widthInput.disabled = !custom;
  heightInput.disabled = !custom;
  syncDensity();
}

function closeReplacement() {
  replaceSector.hidden = true;
  element("generate-sector").hidden = false;
}

function syncDensity() {
  const [width, height] = dimensions();
  const valid = validDimension(width) && validDimension(height);
  element("density-control").hidden = tpvSelected() || !valid || (width === 8 && height === 10);
  if (!valid) return;
  const low = starCount(width, height, density.value, 1);
  const high = starCount(width, height, density.value, 10);
  element("density-help").textContent = low === high ? `${low} stars on this map.` : `${low}–${high} stars on this map.`;
}

function coordinate(column, row) {
  return [column, row].map((value) => String(value).padStart(2, "0")).join("");
}

function selectHex(column, row, focus = false) {
  const previous = hexes.get(coordinate(sector.selectedHex.column, sector.selectedHex.row));
  const code = coordinate(column, row);
  const target = hexes.get(code);
  if (!target) return;
  previous?.setAttribute("tabindex", "-1");
  previous?.setAttribute("aria-pressed", "false");
  target.setAttribute("tabindex", "0");
  target.setAttribute("aria-pressed", "true");
  sector.selectedHex = { column, row };
  const system = systems.get(code);
  tradeRoutes.querySelector(".highlighted-route")?.classList.remove("highlighted-route");
  const nebulae = nebulaHexes.get(code) ?? [];
  element("selection").textContent = system || nebulae.length ? `Hex ${code}` : `Hex ${code} · Empty`;
  showDetailsLocation(system ? [system.name] : [], system);
  let openProfile;
  if (isTpv()) {
    selectChartRow(code);
    const usedNames = new Set([system?.name]);
    openProfile = inspectTpv(element("world"), element("tpv-profile"), sector, system, coordinate, roll,
      () => rollName(roll, usedNames), () => {
        if (system?.stars) target.dataset.systemStatus = system.status ?? "Wild";
        renderTradeRoutes();
        saveSector();
      }, () => {
        setProfileOpen(false);
        selectHex(column, row, true);
      }, showFactionManager, (path, society) => showDetailsLocation(path, system, society), showXenobestiary);
    const coverage = nebulae.filter(nebula => nebula !== system);
    if (coverage.length) {
      const details = document.createElement("section");
      const heading = document.createElement("h4");
      heading.textContent = coverage.length === 1 ? "Nebula" : "Nebulae";
      details.append(heading);
      for (const nebula of coverage) {
        const entry = document.createElement("p");
        entry.textContent = `${nebula.name} · ${nebula.type}`;
        details.append(entry);
      }
      element("world").append(details);
    }
    element("world").querySelector(".tpv-open-profile")?.addEventListener("click", () => {
      setProfileOpen(true);
      element("tpv-profile").querySelector("h2")?.focus();
    });
  } else showInspector(element("world"), sector, system, {
    save() {
      if (system) {
        target.setAttribute("aria-label", `Hex ${code}, ${system.name}`);
        target.querySelector(".hex-system-name div").textContent = system.name;
      }
      renderTradeRoutes();
      saveSector();
    }, render: renderMap, roll,
    updateLocation: path => showDetailsLocation(path, system),
    highlightRoute(index) {
      for (const [position, line] of Array.from(tradeRoutes.children).entries()) {
        line.classList.toggle("highlighted-route", position === index);
      }
    },
  });
  if (focus) target.focus();
  saveSector();
  return openProfile;
}

function svgElement(name, attributes) {
  const node = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

const tradeRoutes = svgElement("g", { class: "trade-routes", "aria-hidden": "true" });

const starColours = {
  O: "#8daaff", B: "#a2bfff", A: "#bedbff", F: "#e1efff",
  G: "#ffe18b", K: "#ffae60", M: "#ff797f",
};

function tpvMarker(feature) {
  const group = svgElement("g", { class: "tpv-feature-mark", "aria-hidden": "true" });
  if (feature.kind === "star") {
    const spectralType = feature.stars[0].type.match(/\(([OBAFGKM])\)$/)?.[1];
    group.append(svgElement("path", {
      d: "M0 -6 Q1 -1 6 0 Q1 1 0 6 Q-1 1 -6 0 Q-1 -1 0 -6Z",
      fill: starColours[spectralType] ?? "#edf4fb",
    }));
  } else if (feature.kind === "nebula") {
    group.append(svgElement("path", {
      d: "M-6 3 A3 3 0 0 1 -6 -3 Q-5 -6 -2 -5 Q1 -8 4 -4 A4 4 0 0 1 5 4 Q2 6 -1 4 Q-4 6 -6 3Z",
      fill: "#b29dec", stroke: "#e5d9ff", "stroke-width": 0.8,
    }));
    group.append(svgElement("circle", { cx: 1, cy: -1, r: 1.1, fill: "#f5efff" }));
  } else {
    group.append(svgElement("path", { d: "M0 -6.5 L6.5 0 L0 6.5 L-6.5 0Z",
      fill: "none", stroke: "#ffc98c", "stroke-width": 1.3 }));
    group.append(svgElement("circle", { r: 1.4, fill: "#ffc98c" }));
  }
  return group;
}

function renderTradeRoutes() {
  const tpv = isTpv();
  sector.tradeRoutes = validTradeRoutes(sector.tradeRoutes, tpv ? sector.systems.filter(system => system.stars) : sector.systems,
    tpv ? tpvDistance : undefined);
  const routes = sector.tradeRoutes;
  const byId = new Map(sector.systems.map(system => [system.id, system]));
  tradeRoutes.replaceChildren(...routes.map(route => {
    const [first, second] = route.map(id => byId.get(id));
    const [x1, y1] = hexCentres.get(coordinate(first.column, first.row));
    const [x2, y2] = hexCentres.get(coordinate(second.column, second.row));
    if (!tpv) return svgElement("line", { x1, y1, x2, y2 });
    const distance = tpvDistance(first, second);
    if (distance !== 1) return svgElement("line", { x1, y1, x2, y2, class: `tpv-jump-${distance}` });
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const x = (x1 + x2) / 2;
    const y = (y1 + y2) / 2;
    const marks = svgElement("g", { class: "tpv-jump-1" });
    for (const offset of [-3, 3]) {
      const cx = x + offset * dx / length;
      const cy = y + offset * dy / length;
      marks.append(svgElement("line", { x1: cx - 6 * dy / length, y1: cy + 6 * dx / length,
        x2: cx + 6 * dy / length, y2: cy - 6 * dx / length }));
    }
    return marks;
  }));
  syncVisibility();
  routeKey.textContent = tpv ? "Jump routes · Safe: double marks · Unsafe: solid · Dangerous: dashed" : `${routes.length} trade ${routes.length === 1 ? "route" : "routes"} · dashed gold lines`;
}

const chartLayout = element("sector-chart-layout");
function showDetailsLocation(path, system, society) {
  const location = element("details-location");
  const names = path.filter((name, index) => name && name !== path[index - 1]);
  location.textContent = names.join(" · ");
  location.hidden = !names.length;

  const factions = element("details-factions");
  const affiliation = new Map();
  if (system) {
    for (const entry of factionPresence(sector, system.id)) {
      affiliation.set(entry.name, entry.role === "Frontier" ? "Faction influence" : "Faction control");
    }
    const presence = chartFactionPresence(sector, sectorLocations(sector)).get(system.id);
    for (const entry of presence?.values() ?? []) {
      if (!affiliation.has(entry.name)) affiliation.set(entry.name, "Faction influence");
    }
  }
  if (society) affiliation.set(society.name, "Faction control");
  factions.replaceChildren();
  for (const label of ["Faction control", "Faction influence"]) {
    const names = [...affiliation].filter(([, role]) => role === label).map(([name]) => name);
    if (!names.length) continue;
    const row = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = label;
    row.append(title, " · " + names.join(", "));
    factions.append(row);
  }
  factions.hidden = !factions.childElementCount;
}

const chartList = element("tpv-chart");
function selectChartRow(code) {
  chartList.querySelector('[aria-current="true"]')?.removeAttribute("aria-current");
  const row = chartList.querySelector(`[data-hex="${code}"]`);
  if (!row) return;
  row.querySelector("button").setAttribute("aria-current", "true");
  const bounds = row.getBoundingClientRect();
  const viewport = chartList.getBoundingClientRect();
  if (bounds.top < viewport.top) chartList.scrollTop += bounds.top - viewport.top;
  if (bounds.bottom > viewport.bottom) chartList.scrollTop += bounds.bottom - viewport.bottom;
}

function setProfileOpen(open) {
  element("tpv-profile").hidden = !open;
  chartList.hidden = open || !isTpv();
  element("tpv-chart-navigation").hidden = chartList.hidden;
  const openProfile = element("world").querySelector(".tpv-open-profile");
  if (openProfile) openProfile.hidden = open;
  chartLayout.hidden = open;
  element("map-title").parentElement.hidden = open;
}

element("faction-manager").addEventListener("click", showFactionManager);

element("xenobestiary").addEventListener("click", () => showXenobestiary());

function showXenobestiary(selected) {
  setProfileOpen(true);
  element("world").replaceChildren();
  renderXenobestiary(element("tpv-profile"), sector, renderMap, (system, destination) => {
    const open = selectHex(system.column, system.row);
    setProfileOpen(true);
    open?.(destination);
  }, selected);
}

function showFactionManager() {
  setProfileOpen(true);
  renderFactionManager(element("tpv-profile"), element("world"), sector, saveSector, renderMap, roll, system => {
    sector.selectedHex = { column: system.column, row: system.row };
    renderMap();
    hexes.get(coordinate(system.column, system.row))?.focus();
  }, coordinate, isTpv());
}

const factionTooltip = document.createElement("div");
factionTooltip.className = "chart-faction-tooltip";
factionTooltip.hidden = true;
factionTooltip.setAttribute("aria-hidden", "true");
mapWindow.after(factionTooltip);

function hideFactionTooltip() {
  factionTooltip.hidden = true;
}
mapWindow.addEventListener("scroll", hideFactionTooltip);

function bindFactionTooltip(group, name, code, factions) {
  group.setAttribute("aria-label", `Hex ${code}, ${name}. Factions: ${factions.map(faction => faction.name).join(", ")}`);
  function show() {
    const heading = document.createElement("strong");
    heading.textContent = `${name} (${code})`;
    const label = document.createElement("div");
    label.textContent = "Factions";
    const list = document.createElement("ul");
    for (const faction of factions) {
      const item = document.createElement("li");
      const swatch = document.createElement("span");
      swatch.style.backgroundColor = faction.colour;
      item.append(swatch, faction.name);
      list.append(item);
    }
    factionTooltip.replaceChildren(heading, label, list);
    factionTooltip.hidden = false;
    const hex = group.getBoundingClientRect();
    const { offsetWidth, offsetHeight } = factionTooltip;
    const left = Math.max(8, Math.min(hex.left, window.innerWidth - offsetWidth - 8));
    const top = hex.top - offsetHeight - 6;
    factionTooltip.style.left = `${left}px`;
    factionTooltip.style.top = `${top >= 8 ? top : Math.max(8, Math.min(hex.bottom + 6, window.innerHeight - offsetHeight - 8))}px`;
  }
  group.addEventListener("mouseenter", show);
  group.addEventListener("mouseleave", hideFactionTooltip);
  group.addEventListener("focus", show);
  group.addEventListener("blur", hideFactionTooltip);
  group.addEventListener("click", hideFactionTooltip);
}

function openDevelopmentSystem(id) {
  const system = sector.systems.find(item => item.id === id && item.stars?.length);
  if (!system) return;
  selectHex(system.column, system.row);
  element("world").querySelector(".tpv-open-profile")?.click();
}

element("open-development-log").addEventListener("click", () => {
  const details = element("world");
  const previous = details.querySelector(":scope > .development-log");
  if (previous) {
    previous.remove();
    return;
  }
  const log = developmentLog(sector.developmentLog ?? [], openDevelopmentSystem);
  details.prepend(log);
  log.querySelector("summary").focus();
});

function renderMap() {
  element("development-settings").replaceChildren(bookChecklist(() => sectorBooks(sector), books => {
    sector.developmentBooks = books;
    saveSector();
  }));
  hideFactionTooltip();
  setProfileOpen(false);
  map.closest(".sector-map").classList.toggle("tpv-map", isTpv());
  if (isTpv()) renderChart(chartList, sector.systems, coordinate, feature => {
    selectHex(feature.column, feature.row, true);
    element("world").querySelector(".tpv-open-profile")?.click();
  }, system => factionPresence(sector, system.id));
  const { width, height } = sector.grid;
  const radius = 32;
  const halfHeight = Math.sqrt(3) * radius / 2;
  const columnStep = radius * 1.5;
  const fragment = document.createDocumentFragment();
  const stripePatterns = svgElement("defs", {});
  const chartPresence = chartFactionPresence(sector, sectorLocations(sector));
  hexes.clear();
  hexCentres.clear();
  nebulaHexes.clear();
  if (isTpv()) {
    for (const nebula of sector.systems.filter(feature => feature.kind === "nebula")) {
      for (const cell of nebula.coverage ?? []) {
        const code = coordinate(cell.column, cell.row);
        if (!nebulaHexes.has(code)) nebulaHexes.set(code, []);
        nebulaHexes.get(code).push(nebula);
      }
    }
  }
  systems = new Map(sector.systems.map((system) => [coordinate(system.column, system.row), system]));

  for (let column = 1; column <= width; column += 1) {
    for (let row = 1; row <= height; row += 1) {
      const x = radius + 8 + (column - 1) * columnStep;
      const y = halfHeight + 8 + (row - 1) * halfHeight * 2 + (column % 2 === (isTpv() ? 1 : 0) ? halfHeight : 0);
      const code = coordinate(column, row);
      const system = systems.get(code);
      hexCentres.set(code, [x, y]);
      const group = svgElement("g", {
        class: system ? "hex occupied" : "hex", role: "button",
        "aria-label": system ? `Hex ${code}, ${system.name}` : `Hex ${code}`,
        "aria-pressed": "false", tabindex: "-1",
        "data-column": column, "data-row": row, transform: `translate(${x} ${y})`,
      });
      if (isTpv() && system?.stars) group.dataset.systemStatus = system.status ?? "Wild";
      if (nebulaHexes.has(code)) group.classList.add("tpv-nebula-coverage");
      const points = `${-radius},0 ${-radius / 2},${-halfHeight} ${radius / 2},${-halfHeight} ${radius},0 ${radius / 2},${halfHeight} ${-radius / 2},${halfHeight}`;
      group.append(svgElement("polygon", { points }));
      const factions = [...(chartPresence.get(system?.id)?.values() ?? [])];
      if (factions.length) {
        const id = `chart-faction-stripes-${code}`;
        const pattern = svgElement("pattern", {
          id, width: factions.length * 7, height: 7,
          patternUnits: "userSpaceOnUse", patternTransform: "rotate(55)",
        });
        factions.forEach(({ colour }, index) => {
          const stripe = svgElement("rect", { x: index * 7, width: 5, height: 7 });
          stripe.style.fill = colour;
          pattern.append(stripe);
        });
        stripePatterns.append(pattern);
        const stripes = svgElement("polygon", { points, class: "chart-faction-stripes", "aria-hidden": "true" });
        stripes.style.fill = `url(#${id})`;
        group.append(stripes);
        bindFactionTooltip(group, system.name, code, factions);
      }
      if (system) {
        const nameBox = svgElement("foreignObject", {
          class: "hex-system-name", x: -22, y: -halfHeight + 8,
          width: 44, height: 11, "aria-hidden": "true",
        });
        const name = document.createElement("div");
        name.textContent = system.name;
        nameBox.append(name);
        group.append(nameBox);
        if (isTpv()) group.append(tpvMarker(system));
        else group.append(svgElement("circle", { r: 4, "aria-hidden": "true" }));
      }
      const label = svgElement("text", { y: halfHeight - 7, "aria-hidden": "true" });
      label.textContent = code;
      group.append(label);
      fragment.append(group);
      hexes.set(code, group);
    }
  }

  mapWidth = 2 * radius + 16 + (width - 1) * columnStep;
  mapHeight = 16 + 2 * height * halfHeight + (width > 1 ? halfHeight : 0);
  map.setAttribute("viewBox", `0 0 ${mapWidth} ${mapHeight}`);
  sizeMap();
  map.replaceChildren(stripePatterns, fragment, tradeRoutes);
  renderTradeRoutes();
  element("map-title").textContent = `${isTpv() ? "Sector Chart" : "Sector map"} · ${width} × ${height}`;
  selectHex(sector.selectedHex.column, sector.selectedHex.row);
}

function sizeMap() {
  map.setAttribute("width", mapWidth * zoom);
  map.setAttribute("height", mapHeight * zoom);
  zoomIn.disabled = zoom >= maxZoom;
  zoomOut.disabled = zoom <= minZoom;
}

function zoomMap(factor, clientX, clientY) {
  const nextZoom = Math.min(maxZoom, Math.max(minZoom, zoom * factor));
  if (nextZoom === zoom) return;
  const before = map.getBoundingClientRect();
  const x = (clientX - before.left) / before.width;
  const y = (clientY - before.top) / before.height;
  zoom = nextZoom;
  sizeMap();
  const after = map.getBoundingClientRect();
  mapWindow.scrollLeft += after.left + x * after.width - clientX;
  mapWindow.scrollTop += after.top + y * after.height - clientY;
}

function zoomAtCentre(factor) {
  const bounds = mapWindow.getBoundingClientRect();
  zoomMap(factor, bounds.left + mapWindow.clientWidth / 2, bounds.top + mapWindow.clientHeight / 2);
}

zoomIn.addEventListener("click", () => zoomAtCentre(zoomStep));
zoomOut.addEventListener("click", () => zoomAtCentre(1 / zoomStep));
mapWindow.addEventListener("wheel", (event) => {
  if (event.ctrlKey || event.deltaY === 0) return;
  event.preventDefault();
  zoomMap(event.deltaY < 0 ? zoomStep : 1 / zoomStep, event.clientX, event.clientY);
}, { passive: false });

const panThreshold = 5;
let panGesture;

mapWindow.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0 || !event.isPrimary) return;
  if (mapWindow.scrollWidth <= mapWindow.clientWidth && mapWindow.scrollHeight <= mapWindow.clientHeight) return;
  const bounds = mapWindow.getBoundingClientRect();
  if (event.clientX >= bounds.left + mapWindow.clientWidth ||
      event.clientY >= bounds.top + mapWindow.clientHeight) return;
  panGesture = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: mapWindow.scrollLeft,
    top: mapWindow.scrollTop,
    dragging: false,
  };
});

mapWindow.addEventListener("pointermove", (event) => {
  if (panGesture?.pointerId !== event.pointerId) return;
  const dx = event.clientX - panGesture.x;
  const dy = event.clientY - panGesture.y;
  if (!panGesture.dragging) {
    if (Math.hypot(dx, dy) < panThreshold) return;
    panGesture.dragging = true;
    // Capture only after a drag starts. Its release click targets the viewport, outside the SVG.
    mapWindow.setPointerCapture(event.pointerId);
    mapWindow.classList.add("is-panning");
  }
  mapWindow.scrollLeft = panGesture.left - dx;
  mapWindow.scrollTop = panGesture.top - dy;
});

function endPan(event) {
  if (panGesture?.pointerId !== event.pointerId) return;
  panGesture = undefined;
  mapWindow.classList.remove("is-panning");
}

for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
  mapWindow.addEventListener(eventName, endPan);
}
mapWindow.addEventListener("pointerleave", (event) => {
  if (!panGesture?.dragging) endPan(event);
});

map.addEventListener("click", (event) => {
  const hex = event.target.closest(".hex");
  if (hex) selectHex(Number(hex.dataset.column), Number(hex.dataset.row), true);
});

map.addEventListener("keydown", (event) => {
  const hex = event.target.closest(".hex");
  if (!hex) return;
  const offsets = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    hex.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  } else if (Object.hasOwn(offsets, event.key)) {
    event.preventDefault();
    const [dx, dy] = offsets[event.key];
    selectHex(Number(hex.dataset.column) + dx, Number(hex.dataset.row) + dy, true);
  }
});

setup.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!replaceSector.hidden) return;
  generationStatus.textContent = "";
  const { preset, width, height } = sector.grid;
  if (sector.systems.length || sector.starCountPolicy || sector.name !== "Untitled sector" ||
      preset !== "swn" || width !== 8 || height !== 10) {
    replaceSector.hidden = false;
    element("generate-sector").hidden = true;
    element("confirm-generate").focus();
    return;
  }
  generateSector();
});

function generateSector() {
  if (!setup.reportValidity()) return;
  const [width, height] = dimensions();
  if (!validDimension(width) || !validDimension(height)) return;
  let next;
  try {
    next = createSector(rules.value, size.value, width, height);
    next.name = rollName(roll, new Set([sector.name?.trim()]));
    if (tpvSelected()) {
      next.addSwnTags = element("tpv-swn-tags").checked;
      const usedNames = new Set();
      next.systems = generateTpvSector(roll, () => crypto.randomUUID(),
        () => rollName(roll, usedNames), element("tpv-start").checked, next.grid);
    } else {
      next.starCountPolicy = element("density-control").hidden ? "fixed" : density.value;
      next.generateTradeRoutes = element("generate-trade-routes").value === "yes";
      next.systemPointDie = Number(element("system-point-die").value);
      next.systems = generateSystems(next, next.starCountPolicy, roll, () => crypto.randomUUID());
    }
  } catch (error) {
    console.error(error);
    generationStatus.textContent = "Could not generate a sector. Please try again.";
    return;
  }
  const firstSystem = next.systems[0];
  next.selectedHex = { column: firstSystem.column, row: firstSystem.row };
  activateSector(next);
  const count = next.systems.length;
  generationStatus.textContent = isTpv() ? `Generated ${count} subsectors of interest.` : `Generated ${count} ${count === 1 ? "system" : "systems"}.`;
  hexes.get(coordinate(firstSystem.column, firstSystem.row)).focus();
}

element("confirm-generate").addEventListener("click", generateSector);
element("cancel-generate").addEventListener("click", () => {
  closeReplacement();
  element("generate-sector").focus();
});

function activateSector(next) {
  next.tradeRoutes ??= next.generateTradeRoutes
    ? findTradeRoutes(next.systems, [...catalogueTags(), ...bookTags])
      .map(pair => pair.map(system => system.id))
    : [];
  sector = next;
  closeReplacement();
  generationStatus.textContent = "";
  element("sector-name").value = sector.name ?? "Untitled sector";
  rules.value = sector.ruleset.id;
  size.value = sector.grid.preset;
  widthInput.value = sector.grid.width;
  heightInput.value = sector.grid.height;
  element("tpv-swn-tags").checked = sector.addSwnTags === true;
  density.value = sector.starCountPolicy ?? "fixed";
  element("system-point-die").value = sector.systemPointDie ?? 0;
  element("generate-trade-routes").value = sector.generateTradeRoutes ? "yes" : "no";
  syncCustomInputs();
  renderMap();
}

element("new-sector-name").addEventListener("click", () => {
  sector.name = rollName(roll, new Set([sector.name?.trim()]));
  element("sector-name").value = sector.name;
  saveSector();
});

element("sector-name").addEventListener("input", (event) => {
  sector.name = event.target.value;
  saveSector();
});

element("export-sector").addEventListener("click", () => {
  let backup;
  try {
    backup = createBackup(sector, localStorage, {
      zoom, left: Math.max(0, mapWindow.scrollLeft), top: Math.max(0, mapWindow.scrollTop),
    });
  } catch {
    element("file-status").textContent = "Could not read browser data for the backup.";
    return;
  }
  const json = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(json);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sci-fi-rpg-tools-backup.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

element("import-sector").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  const status = element("file-status");
  let backup;
  try {
    backup = readBackup(await file.text());
  } catch {
    status.textContent = "Could not import that file. Choose a valid app backup or sector JSON export.";
    return;
  }
  const message = backup.settings
    ? "Replace the current sector, custom tags, standalone Development Log and visibility settings with this backup?"
    : "Replace the current sector with the imported sector?";
  if (!confirm(message)) {
    status.textContent = "Import cancelled.";
    return;
  }
  if (backup.settings) {
    try {
      restoreBackupStorage(backup.settings, localStorage);
    } catch {
      status.textContent = "Could not restore the backup to browser storage.";
      return;
    }
    showTradeRoutes.checked = backup.settings.showTradeRoutes !== false;
    showSystemNames.checked = backup.settings.showSystemNames !== false;
    zoom = backup.view.zoom;
  }
  activateSector(backup.sector);
  if (backup.view) {
    mapWindow.scrollLeft = backup.view.left;
    mapWindow.scrollTop = backup.view.top;
  }
  status.textContent = backup.settings ? "Backup restored." : "Sector imported.";
});

element("tpv-swn-tags").checked = sector.addSwnTags === true;
element("tpv-swn-tags").addEventListener("change", event => {
  if (!isTpv()) return;
  sector.addSwnTags = event.target.checked;
  saveSector();
  renderMap();
});
rules.addEventListener("change", () => {
  size.value = tpvSelected() ? "void" : "swn";
  syncCustomInputs();
});
size.addEventListener("change", syncCustomInputs);
for (const control of [widthInput, heightInput, density]) control.addEventListener("input", syncDensity);
activateSector(sector);
