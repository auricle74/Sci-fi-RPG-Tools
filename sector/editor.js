import { generateSystems, starCount } from "./swn.mjs";

const schemaVersion = 1;
const storageKey = "scifi-rpg-tools.sector";
const rulesets = { "swn-revised": { id: "swn-revised", version: "revised" } };
const presets = { swn: [8, 10], traveller: [8, 10], void: [10, 10] };
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

function validDimension(value) {
  return Number.isInteger(value) && value >= 1 && value <= 64;
}

function createSector(rulesetId, preset, width, height) {
  return {
    schemaVersion,
    id: crypto.randomUUID(),
    ruleset: { ...rulesets[rulesetId] },
    grid: { preset, width, height },
    systems: [],
    selectedHex: { column: 1, row: 1 },
  };
}

function loadSector() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.schemaVersion !== schemaVersion || typeof saved.id !== "string") return null;
    const { grid, ruleset, selectedHex } = saved;
    if (!grid || !ruleset || !selectedHex || !Object.hasOwn(rulesets, ruleset.id)) return null;
    const { width, height } = grid;
    // Earlier versions used the Traveller preset for a full sector.
    if (grid.preset === "traveller" && width === 32 && height === 40) grid.preset = "custom";
    const { preset } = grid;
    const { column, row } = selectedHex;
    if (!validDimension(width) || !validDimension(height)) return null;
    if (preset !== "custom" && (!Object.hasOwn(presets, preset) ||
        presets[preset][0] !== width || presets[preset][1] !== height)) return null;
    if (!validDimension(column) || !validDimension(row) || column > width || row > height) return null;
    if (!Array.isArray(saved.systems)) return null;
    return saved;
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

function showWorld(system) {
  const section = element("world");
  section.hidden = !system;
  section.replaceChildren();
  if (!system) return;
  const { mainWorld } = system;
  const heading = document.createElement("h3");
  heading.textContent = `${mainWorld.name} · Main world`;
  const description = document.createElement("p");
  description.textContent = mainWorld.description;
  const details = document.createElement("dl");
  for (const [field, value] of Object.entries({ ...mainWorld.profile, Tags: mainWorld.tags.join(", ") })) {
    const term = document.createElement("dt");
    const definition = document.createElement("dd");
    term.textContent = field;
    definition.textContent = value;
    details.append(term, definition);
  }
  section.append(heading, description, details);
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
  showWorld(system);
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
  if (sector.systems.length && !confirm("Replace the current sector with a new one?")) return;
  const next = createSector(rules.value, size.value, width, height);
  next.starCountPolicy = element("density-control").hidden ? "fixed" : density.value;
  next.systems = generateSystems(next, next.starCountPolicy, roll, () => crypto.randomUUID());
  sector = next;
  renderMap();
});

rules.value = sector.ruleset.id;
size.value = sector.grid.preset;
widthInput.value = sector.grid.width;
heightInput.value = sector.grid.height;
size.addEventListener("change", syncCustomInputs);
density.value = sector.starCountPolicy ?? "fixed";
for (const control of [widthInput, heightInput, density]) control.addEventListener("input", syncDensity);
syncCustomInputs();
renderMap();
