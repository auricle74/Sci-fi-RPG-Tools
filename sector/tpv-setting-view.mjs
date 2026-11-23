import { generateSociety } from "./tpv-societies.mjs";
import { availablePresence, relationships, rollRelationship } from "./tpv-factions.mjs";

function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(text, action) {
  const element = node("button", text);
  element.type = "button";
  element.addEventListener("click", action);
  return element;
}

function picker(text, options) {
  const label = node("label", text);
  const select = node("select");
  for (const [id, name] of options) select.add(new Option(name, id));
  label.append(select);
  return { label, select };
}

export function renderSetting(container, sector, coordinate, roll, save, openSystem, back) {
  const societies = sector.societies ?? [];
  const systems = new Map(sector.systems.filter(system => system.stars).map(system => [system.id, system]));
  const systemName = system => `${system.name} · ${coordinate(system.column, system.row)}`;
  const refresh = () => {
    save();
    renderSetting(container, sector, coordinate, roll, save, openSystem, back);
  };
  const heading = node("h2", "Setting Overview");
  heading.tabIndex = -1;
  const content = [button("Back to Sector Chart", back), heading];

  const create = node("form");
  const nameLabel = node("label", "New interstellar society name");
  const name = node("input");
  name.required = true;
  nameLabel.append(name);
  const submit = node("button", "Develop Interstellar Society");
  submit.type = "submit";
  create.append(nameLabel, submit);
  create.addEventListener("submit", event => {
    event.preventDefault();
    if (!name.value.trim()) return;
    (sector.societies ??= []).push(generateSociety({
      id: crypto.randomUUID(), name: name.value.trim(), status: "Core", minimumTech: 3, roll,
    }));
    refresh();
  });
  content.push(create);
  for (const society of societies) {
    const section = node("section");
    section.className = "tpv-setting-society";
    section.append(node("h3", society.name), node("p", `TL${society.tech} · ${society.condition} · ${society.politics}`));
    const home = picker("Home system", [["", "Unassigned"], ...Array.from(systems.values(), system => [system.id, systemName(system)])]);
    home.select.value = society.homeSystemId ?? "";
    home.select.addEventListener("change", () => {
      if (home.select.value) {
        society.homeSystemId = home.select.value;
        for (const key of ["coreSystems", "frontierSystems"]) {
          if (society[key]) society[key] = society[key].filter(id => id !== home.select.value);
        }
      } else delete society.homeSystemId;
      refresh();
    });
    section.append(home.label);
    if (society.homeSystemId) section.append(button("Show home on chart", () => openSystem(systems.get(society.homeSystemId))));
    for (const [role, key] of [["Core", "coreSystems"], ["Frontier", "frontierSystems"]]) {
      section.append(node("h4", `${role} systems`));
      const list = node("ul");
      for (const id of society[key] ?? []) {
        const row = node("li");
        const system = systems.get(id);
        row.append(button(systemName(system), () => openSystem(system)), button("Remove", () => {
          society[key] = society[key].filter(value => value !== id);
          refresh();
        }));
        list.append(row);
      }
      if (list.children.length) section.append(list);
      const options = availablePresence(sector, society, role);
      if (options.length) {
        const next = picker(`Available ${role.toLowerCase()} systems`, options.map(system => [system.id, systemName(system)]));
        section.append(next.label, button(`Add ${role.toLowerCase()} system`, () => {
          (society[key] ??= []).push(next.select.value);
          refresh();
        }));
      } else section.append(node("p", "No unclaimed systems qualify over the current jump routes."));
    }
    content.push(section);
  }

  const relations = node("section");
  relations.append(node("h3", "Society Relationships"));
  for (const relation of sector.societyRelationships ?? []) {
    const first = societies.find(society => society.id === relation.first);
    const second = societies.find(society => society.id === relation.second);
    const row = node("div");
    row.append(node("span", `${first.name} · ${relation.kind} · ${second.name}`), button("Remove", () => {
      sector.societyRelationships = sector.societyRelationships.filter(item => item !== relation);
      refresh();
    }));
    relations.append(row);
  }
  if (societies.length > 1) {
    const options = societies.map(society => [society.id, society.name]);
    const first = picker("First society", options);
    const second = picker("Second society", options);
    second.select.selectedIndex = 1;
    const kind = picker("Relationship", relationships.map(value => [value, value]));
    const error = node("p");
    error.setAttribute("role", "status");
    relations.append(first.label, second.label, kind.label, button("Roll Relationship", () => {
      kind.select.value = rollRelationship(roll);
    }), button("Save Relationship", () => {
      const a = first.select.value;
      const b = second.select.value;
      if (a === b) {
        error.textContent = "Choose two different societies.";
        return;
      }
      const entries = sector.societyRelationships ??= [];
      const existing = entries.findIndex(relation =>
        (relation.first === a && relation.second === b) || (relation.first === b && relation.second === a));
      entries.splice(existing < 0 ? entries.length : existing, existing < 0 ? 0 : 1,
        { first: a, second: b, kind: kind.select.value });
      refresh();
    }), error);
  } else relations.append(node("p", "Add two societies to record a relationship."));
  container.replaceChildren(...content, relations);
  heading.focus();
}
