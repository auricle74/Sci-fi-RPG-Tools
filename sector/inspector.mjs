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
  const refresh = () => {
    save();
    showInspector(section, sector, system, { save, render, roll });
  };
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

  function locationEditor(container, owner, key, depth = 0) {
    const entries = owner[key] ?? [];
    for (const [i, location] of entries.entries()) {
      const block = node("details");
      block.open = true;
      block.append(node("summary", location.name || "Unnamed location"),
        edit("Location name", location, "name"), edit("Location type", location, "type"),
        edit("Description", location, "description"),
        action("Remove location", () => {
          if (confirm("Remove this location and its contents?")) {
            entries.splice(i, 1);
            refresh();
          }
        }));
      block.addEventListener("input", () => {
        block.firstElementChild.textContent = location.name || "Unnamed location";
      });
      locationEditor(block, location, "children", depth + 1);
      container.append(block);
    }
    container.append(action(depth ? "Add nested location" : "Add location", () => {
      (owner[key] ??= []).push({ id: makeId(), name: "New location", type: "", description: "" });
      refresh();
    }));
  }

  function worldEditor(world, title, remove) {
    const details = node("details");
    details.open = true;
    const label = () => `${world.name || "Unnamed world"} · ${title}`;
    details.append(node("summary", label()), edit("World name", world, "name"),
      edit("Description", world, "description"));
    details.addEventListener("input", () => { details.firstElementChild.textContent = label(); });
    for (const key of profileFields) {
      details.append(edit(key, world.profile, key, () => rollWorld(roll).profile[key]));
    }
    for (const index of [0, 1]) {
      details.append(edit(`Tag ${index + 1}`, world.tags, index, () => rerollTag(world.tags[1 - index], roll)));
    }
    locationEditor(details, world, "locations");
    details.append(action("Remove world", () => {
      if (confirm("Remove this world and its locations?")) {
        remove();
        refresh();
      }
    }));
    return details;
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

  section.append(field("System name", system.name, (value) => {
    system.name = value;
    save();
  }));
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
  section.append(move);
  if (system.mainWorld) {
    section.append(worldEditor(system.mainWorld, "Main world", () => { system.mainWorld = null; }));
  } else {
    section.append(action("Add main world", () => {
      system.mainWorld = newWorld();
      refresh();
    }));
  }
  for (const [i, world] of (system.worlds ?? []).entries()) {
    section.append(worldEditor(world, "World", () => { system.worlds.splice(i, 1); }));
  }
  section.append(action("Add world", () => {
    (system.worlds ??= []).push(newWorld());
    refresh();
  }));
  locationEditor(section, system, "locations");
  section.append(action("Remove system", () => {
    if (!confirm("Remove this system and all its worlds and locations?")) return;
    sector.systems.splice(sector.systems.indexOf(system), 1);
    render();
  }));
}
