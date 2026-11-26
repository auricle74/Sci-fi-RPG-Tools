import { factionNotation, factionRows, generateFactionProfile, rollFactionName } from "./tpv-faction-profile.mjs";
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

function pickerName(name) {
  const label = node("label", "Faction name");
  const input = node("input");
  input.required = true;
  input.value = name;
  label.append(input);
  return { label, input };
}

export function societyCreation(sector, roll, onCreate) {
  const create = node("form");
  const nameLabel = node("label", "New interstellar society name");
  const name = node("input");
  name.required = true;
  name.value = rollFactionName(roll, { place: sector.name });
  nameLabel.append(name);
  const submit = node("button", "Develop Interstellar Society");
  submit.type = "submit";
  create.append(nameLabel, button("New Name", () => {
    name.value = rollFactionName(roll, { place: sector.name });
  }), submit);
  create.addEventListener("submit", event => {
    event.preventDefault();
    if (!name.value.trim()) return;
    const society = generateSociety({
      id: crypto.randomUUID(), name: name.value.trim(), status: "Core", minimumTech: 3, roll,
    });
    society.faction = generateFactionProfile(roll, { interstellar: true });
    (sector.societies ??= []).push(society);
    onCreate(society);
  });
  return create;
}

export function societyEditor(sector, society, coordinate, roll, refresh, openSystem, onHomeChange) {
  const systems = new Map(sector.systems.filter(system => system.stars).map(system => [system.id, system]));
  const systemName = system => `${system.name} · ${coordinate(system.column, system.row)}`;
  const section = node("section");
  section.className = "tpv-setting-society";
  section.append(node("h3", "TPV Society"), node("p", `TL${society.tech} · ${society.condition} · ${society.politics}`));
  if (society.area !== undefined) section.append(node("p", `Populated area: ${society.area}%`));
  const home = picker("Home system", [["", "Unassigned"], ...Array.from(systems.values(), system => [system.id, systemName(system)])]);
  home.select.value = society.homeSystemId ?? "";
  home.select.addEventListener("change", () => {
    if (home.select.value) {
      society.homeSystemId = home.select.value;
      for (const key of ["coreSystems", "frontierSystems"]) {
        if (society[key]) society[key] = society[key].filter(id => id !== home.select.value);
      }
    } else delete society.homeSystemId;
    onHomeChange(society.homeSystemId);
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
  const place = systems.get(society.homeSystemId)?.name;
  const faction = node("details");
  faction.className = "inspector-group";
  faction.open = true;
  faction.append(node("summary", "Faction Profile"));
  if (society.faction) {
    const fields = node("dl");
    fields.className = "inspector-attributes";
    for (const [label, value] of factionRows(society.faction, place)) {
      fields.append(node("dt", label), node("dd", value));
    }
    faction.append(fields, node("h4", "Faction Notation"), node("p", factionNotation(society.name, society.faction, place)));
  } else {
    faction.append(button("Develop Faction Profile", () => {
      const spansSystems = Boolean(society.coreSystems?.length || society.frontierSystems?.length);
      society.faction = generateFactionProfile(roll, {
        interstellar: spansSystems,
        minimumSystem: Boolean(society.homeSystemId),
      });
      refresh();
    }));
  }
  const rename = pickerName(society.name);
  faction.append(rename.label, button("Roll Faction Name", () => {
    rename.input.value = rollFactionName(roll, {
      place: place || society.faction?.base || sector.name,
      surname: society.faction?.leader.surname,
    });
  }), button("Save Name", () => {
    if (!rename.input.value.trim()) {
      rename.input.value = "";
      rename.input.reportValidity();
      return;
    }
    society.name = rename.input.value.trim();
    refresh();
  }));
  section.append(faction);
  return section;

}

export function societyRelationships(sector, society, roll, refresh) {
  const societies = sector.societies ?? [];
  const relations = node("section");
  relations.append(node("h3", "Society Relationships"));
  for (const relation of sector.societyRelationships ?? []) {
    if (![relation.first, relation.second].includes(society.id)) continue;
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
    const second = picker("Other society", options.filter(([id]) => id !== society.id));
    const kind = picker("Relationship", relationships.map(value => [value, value]));
    const error = node("p");
    error.setAttribute("role", "status");
    relations.append(second.label, kind.label, button("Roll Relationship", () => {
      kind.select.value = rollRelationship(roll);
    }), button("Save Relationship", () => {
      const a = society.id;
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
  return relations;
}
