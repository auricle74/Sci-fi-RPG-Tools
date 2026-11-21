import { generateSystems, starCount } from "./swn.mjs";
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
const density = element("density");
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
  element("selection").textContent = `Hex ${code} · ${system?.name ?? "Empty"}`;
  showInspector(element("world"), sector, system, {
    save() {
      element("selection").textContent = `Hex ${code} · ${system?.name ?? "Empty"}`;
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
      if (system) group.append(svgElement("circle", { cy: -10, r: 4, "aria-hidden": "true" }));
      const label = svgElement("text", { y: system ? 8 : 0, "aria-hidden": "true" });
      label.textContent = code;
      group.append(label);
      fragment.append(group);
      hexes.set(code, group);
    }
  }

  map.setAttribute("width", 2 * radius + 16 + (width - 1) * columnStep);
  map.setAttribute("height", 16 + 2 * height * halfHeight + (width > 1 ? halfHeight : 0));
  map.replaceChildren(fragment);
  element("map-title").textContent = `Sector map · ${width} × ${height}`;
  selectHex(sector.selectedHex.column, sector.selectedHex.row);
}

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
  const [width, height] = dimensions();
  if (!validDimension(width) || !validDimension(height)) return;
  if (!confirm("Replace the current sector with a new one?")) return;
  const next = createSector(rules.value, size.value, width, height);
  next.starCountPolicy = element("density-control").hidden ? "fixed" : density.value;
  next.systems = generateSystems(next, next.starCountPolicy, roll, () => crypto.randomUUID());
  activateSector(next);
});

function activateSector(next) {
  sector = next;
  element("sector-name").value = sector.name ?? "Untitled sector";
  rules.value = sector.ruleset.id;
  size.value = sector.grid.preset;
  widthInput.value = sector.grid.width;
  heightInput.value = sector.grid.height;
  density.value = sector.starCountPolicy ?? "fixed";
  syncCustomInputs();
  renderMap();
}

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
