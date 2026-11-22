import { profileFields, validHex } from "./sector-data.mjs";
import { rerollTag, rollWorld } from "./swn.mjs";

function node(tag, label) {
  const element = document.createElement(tag);
  if (label !== undefined) element.textContent = label;
  return element;
}

function action(label, run) {
  const button = node("button", label);
  button.type = "button";
  button.addEventListener("click", run);
  return button;
}

function field(label, value, update, reroll) {
  const wrapper = node("div");
  wrapper.className = "edit-field";
  const caption = node("label", label);
  const input = node(label === "Description" ? "textarea" : "input");
  input.value = value;
  input.addEventListener("input", () => update(input.value));
  caption.append(input);
  wrapper.append(caption);
  if (reroll) wrapper.append(action(`Reroll ${label.toLowerCase()}`, () => {
    input.value = reroll();
    update(input.value);
  }));
  return wrapper;
}

export function showInspector(section, sector, system, { save, render, roll }) {
  section.replaceChildren();
  const makeId = () => crypto.randomUUID();
  function newWorld() {
    return {
      id: makeId(), name: "New world", description: "", ruleset: { ...sector.ruleset },
      profile: Object.fromEntries(profileFields.map((key) => [key, ""])), tags: ["", ""],
    };
  }
  function edit(label, object, key, reroll) {
    return field(label, object[key] ?? "", (value) => {
      object[key] = value;
      save();
    }, reroll);
  }

  function showDetail(record, kind, back, build) {
    section.replaceChildren();
    const backButton = action(back.label, back.open);
    backButton.className = "inspector-back";
    const heading = node("h3", record.name || kind);
    section.append(backButton, node("small", kind), heading);
    const body = node("div");
    body.className = "inspector-fields";
    body.addEventListener("input", () => { heading.textContent = record.name || kind; });
    section.append(body);
    build(body);
    backButton.focus();
  }

  function entryGroup(container, title, entries) {
    const group = node("details");
    group.className = "inspector-group";
    group.open = true;
    const summary = node("summary");
    const count = node("small", String(entries.length));
    count.setAttribute("aria-label", `${entries.length} entries`);
    summary.append(node("span", title), count);
    const list = node("ul");
    for (const { name, note, open } of entries) {
      const item = node("li");
      const button = action(name, open);
      button.className = "inspector-entry";
      if (note) button.append(node("small", note));
      item.append(button);
      list.append(item);
    }
    group.append(summary, list);
    container.append(group);
  }

  function locationList(container, owner, key, back) {
    const groups = new Map();
    for (const location of owner[key] ?? []) {
      const type = location.type.trim() || "Other locations";
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type).push({
        name: location.name || "Unnamed location",
        open: () => openLocation(location),
      });
    }
    function openLocation(location) {
      const reopen = { label: "Back to location", open: () => openLocation(location) };
      showDetail(location, location.type.trim() || "Location", back, (body) => {
        body.append(edit("Location name", location, "name"), edit("Location type", location, "type"),
          edit("Description", location, "description"));
        locationList(body, location, "children", reopen);
        body.append(action("Remove location", () => {
          if (!confirm("Remove this location and its contents?")) return;
          owner[key].splice(owner[key].indexOf(location), 1);
          save();
          back.open();
        }));
      });
    }
    for (const [type, entries] of groups) entryGroup(container, type, entries);
    container.append(action(key === "children" ? "Add nested location" : "Add location", () => {
      const location = { id: makeId(), name: "New location", type: "", description: "" };
      (owner[key] ??= []).push(location);
      save();
      openLocation(location);
    }));
  }

  const systemBack = { label: "Back to system", open: () => showOverview(true) };

  function openWorld(world, main = false) {
    const kind = main ? "Main world" : "World";
    showDetail(world, kind, systemBack, (body) => {
      body.append(edit("World name", world, "name"), edit("Description", world, "description"));
      for (const key of profileFields) {
        body.append(edit(key, world.profile, key, () => rollWorld(roll).profile[key]));
      }
      for (const index of [0, 1]) {
        body.append(edit(`Tag ${index + 1}`, world.tags, index, () => rerollTag(world.tags[1 - index], roll)));
      }
      locationList(body, world, "locations", { label: "Back to world", open: () => openWorld(world, main) });
      body.append(action("Remove world", () => {
        if (!confirm("Remove this world and its locations?")) return;
        if (main) system.mainWorld = null;
        else system.worlds.splice(system.worlds.indexOf(world), 1);
        save();
        systemBack.open();
      }));
    });
  }

  if (!system) {
    section.append(action("Add system", () => {
      sector.systems.push({
        id: makeId(), ...sector.selectedHex, name: "New system", ruleset: { ...sector.ruleset },
        mainWorld: null,
      });
      render();
    }));
    return;
  }

  function systemControls() {
    const controls = node("details");
    controls.className = "inspector-controls";
    controls.append(node("summary", "Manage system"), edit("System name", system, "name"));
    const move = node("form");
    move.className = "move-system";
    const destination = node("label", "Destination hex");
    const coordinate = node("input");
    coordinate.placeholder = "0405";
    coordinate.inputMode = "numeric";
    coordinate.pattern = "[0-9]{4}";
    coordinate.required = true;
    const message = node("p");
    message.setAttribute("role", "status");
    const moveButton = node("button", "Move system");
    destination.append(coordinate);
    move.append(destination, moveButton, message);
    move.addEventListener("submit", (event) => {
      event.preventDefault();
      const hex = { column: Number(coordinate.value.slice(0, 2)), row: Number(coordinate.value.slice(2)) };
      if (!validHex(hex, sector.grid) ||
          sector.systems.some(({ column, row }) => column === hex.column && row === hex.row)) {
        message.textContent = "Choose an empty hex within the map.";
        return;
      }
      Object.assign(system, hex);
      sector.selectedHex = hex;
      render();
    });
    controls.append(move, action("Remove system", () => {
      if (!confirm("Remove this system and all its worlds and locations?")) return;
      sector.systems.splice(sector.systems.indexOf(system), 1);
      render();
    }));
    return controls;
  }

  function showOverview(focus = false) {
    section.replaceChildren();
    const heading = node("h3", system.name || "Unnamed system");
    heading.tabIndex = -1;
    const meta = node("small", "System");
    section.append(meta, heading);
    const worldEntry = (world, main) => ({
      name: world.name || "Unnamed world",
      note: world.tags.filter(Boolean).join(" · "),
      open: () => openWorld(world, main),
    });
    if (system.mainWorld) entryGroup(section, "Main world", [worldEntry(system.mainWorld, true)]);
    if (system.worlds?.length) entryGroup(section, "Other worlds", system.worlds.map(world => worldEntry(world, false)));
    locationList(section, system, "locations", systemBack);
    if (!system.mainWorld) section.append(action("Add main world", () => {
      system.mainWorld = newWorld();
      save();
      openWorld(system.mainWorld, true);
    }));
    section.append(action("Add world", () => {
      const world = newWorld();
      (system.worlds ??= []).push(world);
      save();
      openWorld(world);
    }));
    const controls = systemControls();
    controls.addEventListener("input", () => { heading.textContent = system.name || "Unnamed system"; });
    section.append(controls);
    if (focus) heading.focus();
  }

  showOverview();
}
