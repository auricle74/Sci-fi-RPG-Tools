import { generateSystems, rollName, starCount } from "./swn.mjs";
import { presets, readSector, validDimension } from "./sector-data.mjs";
import { showInspector } from "./inspector.mjs";

const schemaVersion = 1;
const storageKey = "scifi-rpg-tools.sector";
const rulesets = { "swn-revised": { id: "swn-revised", version: "revised" } };
const svgNamespace = "http://www.w3.org/2000/svg";
const element = (id) => document.getElementById(id);
const setup = element("setup");
const rules = element("rules");
const size = element("size");
const widthInput = element("width");
const heightInput = element("height");
const map = element("map");
const mapWindow = map.parentElement;
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
let systems = new Map();

function saveSector() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(sector));
  } catch {
    element("storage-message").hidden = false;
  }
}

function syncCustomInputs() {
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
  element("density-control").hidden = !valid || (width === 8 && height === 10);
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
  element("selection").textContent = system ? `Hex ${code}` : `Hex ${code} · Empty`;
  showInspector(element("world"), sector, system, {
    save() {
      if (system) target.setAttribute("aria-label", `Hex ${code}, ${system.name}`);
      saveSector();
    }, render: renderMap, roll,
  });
  if (focus) target.focus();
  saveSector();
}

function svgElement(name, attributes) {
  const node = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function renderMap() {
  const { width, height } = sector.grid;
  const radius = 32;
  const halfHeight = Math.sqrt(3) * radius / 2;
  const columnStep = radius * 1.5;
  const fragment = document.createDocumentFragment();
  hexes.clear();
  systems = new Map(sector.systems.map((system) => [coordinate(system.column, system.row), system]));

  for (let column = 1; column <= width; column += 1) {
    for (let row = 1; row <= height; row += 1) {
      const x = radius + 8 + (column - 1) * columnStep;
      const y = halfHeight + 8 + (row - 1) * halfHeight * 2 + (column % 2 === 0 ? halfHeight : 0);
      const code = coordinate(column, row);
      const system = systems.get(code);
      const group = svgElement("g", {
        class: system ? "hex occupied" : "hex", role: "button",
        "aria-label": system ? `Hex ${code}, ${system.name}` : `Hex ${code}`,
        "aria-pressed": "false", tabindex: "-1",
        "data-column": column, "data-row": row, transform: `translate(${x} ${y})`,
      });
      group.append(svgElement("polygon", {
        points: `${-radius},0 ${-radius / 2},${-halfHeight} ${radius / 2},${-halfHeight} ${radius},0 ${radius / 2},${halfHeight} ${-radius / 2},${halfHeight}`,
      }));
      if (system) group.append(svgElement("circle", { r: 4, "aria-hidden": "true" }));
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
  map.replaceChildren(fragment);
  element("map-title").textContent = `Sector map · ${width} × ${height}`;
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
    next.starCountPolicy = element("density-control").hidden ? "fixed" : density.value;
    next.systemPointDie = Number(element("system-point-die").value);
    next.systems = generateSystems(next, next.starCountPolicy, roll, () => crypto.randomUUID());
  } catch (error) {
    console.error(error);
    generationStatus.textContent = "Could not generate a sector. Please try again.";
    return;
  }
  const firstSystem = next.systems[0];
  next.selectedHex = { column: firstSystem.column, row: firstSystem.row };
  activateSector(next);
  const count = next.systems.length;
  generationStatus.textContent = `Generated ${count} ${count === 1 ? "system" : "systems"}.`;
  hexes.get(coordinate(firstSystem.column, firstSystem.row)).focus();
}

element("confirm-generate").addEventListener("click", generateSector);
element("cancel-generate").addEventListener("click", () => {
  closeReplacement();
  element("generate-sector").focus();
});

function activateSector(next) {
  sector = next;
  closeReplacement();
  generationStatus.textContent = "";
  element("sector-name").value = sector.name ?? "Untitled sector";
  rules.value = sector.ruleset.id;
  size.value = sector.grid.preset;
  widthInput.value = sector.grid.width;
  heightInput.value = sector.grid.height;
  density.value = sector.starCountPolicy ?? "fixed";
  element("system-point-die").value = sector.systemPointDie ?? 0;
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
  const json = new Blob([JSON.stringify(sector, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(json);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sector.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

element("import-sector").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  const status = element("file-status");
  let next;
  try {
    next = readSector(await file.text());
  } catch {
    status.textContent = "Could not import that file. Choose a valid sector JSON export.";
    return;
  }
  if (!confirm("Replace the current sector with the imported sector?")) {
    status.textContent = "Import cancelled.";
    return;
  }
  activateSector(next);
  status.textContent = "Sector imported.";
});

size.addEventListener("change", syncCustomInputs);
for (const control of [widthInput, heightInput, density]) control.addEventListener("input", syncDensity);
activateSector(sector);
