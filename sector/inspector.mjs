import { systemPointTypes } from "./system-points.mjs";
import { profileFields, validHex } from "./sector-data.mjs";
import { rerollTag, rollName, rollWorld } from "./swn.mjs";
import { planetTagDetails, catalogueTagDetails, systemTagNames, tagsByType, tagTypes, catalogueTags } from "./tag-catalogue.mjs";

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

let nextFieldId = 0;

function field(label, value, update, reroll, actionLabel = "Reroll") {
  const wrapper = node("div");
  wrapper.className = "edit-field";
  const caption = node("label", label);
  const input = node(label === "Description" ? "textarea" : "input");
  input.value = value;
  input.addEventListener("input", () => update(input.value));
  if (reroll) {
    wrapper.classList.add("has-reroll");
    input.id = `inspector-field-${++nextFieldId}`;
    caption.htmlFor = input.id;
    const button = action(actionLabel, () => {
      input.value = reroll();
      update(input.value);
    });
    button.className = "reroll-action";
    button.setAttribute("aria-label", actionLabel === "Reroll" ? `Reroll ${label.toLowerCase()}` : `New name for ${label.toLowerCase()}`);
    wrapper.append(caption, button, input);
  } else {
    caption.append(input);
    wrapper.append(caption);
  }
  return wrapper;
}

const hexCode = ({ column, row }) => [column, row].map(n => String(n).padStart(2, "0")).join("");
const tagNames = (record) => (record.tags ?? []).map(tag => tag.trim()).filter(Boolean);
const tagDetails = (record, name) => record.profile ? planetTagDetails(name) : catalogueTagDetails(record.column ? "System" : record.type, name);
const titleText = (value) => value.replace(/\s+/g, " ").trim().replace(/[\\`*_{}\[\]<>#!|]/g, "\\$&");

function attributes(record) {
  if (record.profile) return profileFields.map(key => [key, record.profile[key]]);
  if (record.column) return [["Hex", hexCode(record)], ["System tags", tagNames(record).join(", ")]];
  return [["Type", record.type]];
}

function objectMarkdown(record, kind, depth = 1) {
  const heading = "#".repeat(Math.min(depth, 6));
  const lines = [`${heading} ${titleText(record.name || kind)}`, "", `**${titleText(kind)}**`];
  for (const [key, value] of attributes(record)) {
    if (value) lines.push("", `- **${key}:** ${titleText(value)}`);
  }
  if (record.description?.trim()) lines.push("", record.description.trim());
  for (const name of tagNames(record)) {
    lines.push("", `${"#".repeat(Math.min(depth + 1, 6))} ${titleText(name)}`);
    const tag = tagDetails(record, name);
    if (!tag) continue;
    lines.push("", tag.description);
    for (const [label, hooks] of Object.entries(tag.hooks)) {
      lines.push("", `**${label}**`, "", ...hooks.map(hook => `- ${hook}`));
    }
  }
  if (record.mainWorld) lines.push("", objectMarkdown(record.mainWorld, "Main world", depth + 1));
  for (const world of record.worlds ?? []) lines.push("", objectMarkdown(world, "World", depth + 1));
  for (const location of record.locations ?? record.children ?? []) {
    lines.push("", objectMarkdown(location, location.type.trim() || "Location", depth + 1));
  }
  return lines.join("\n");
}

function disclosure(title, className = "inspector-group") {
  const group = node("details");
  group.className = className;
  group.open = true;
  const summary = node("summary");
  summary.append(node("span", title));
  group.append(summary);
  return group;
}

export function showInspector(section, sector, system, { save, render, roll }) {
  const makeId = () => crypto.randomUUID();
  function collectNames(record, names) {
    if (record.name) names.add(record.name.trim());
    if (record.mainWorld) collectNames(record.mainWorld, names);
    for (const child of [...(record.worlds ?? []), ...(record.locations ?? []), ...(record.children ?? [])]) {
      collectNames(child, names);
    }
  }
  function generateName(draft) {
    const names = new Set();
    for (const entry of sector.systems) collectNames(entry, names);
    if (draft) collectNames(draft, names);
    return rollName(roll, names);
  }
  const newWorld = () => ({
    id: makeId(), name: "", description: "", ruleset: { ...sector.ruleset },
    profile: Object.fromEntries(profileFields.map(key => [key, ""])), tags: ["", ""],
  });
  const newLocation = () => ({ id: makeId(), name: "", type: "", description: "" });
  section.replaceChildren();
  if (!system) {
    section.append(action("Add system", () => {
      sector.systems.push({
        id: makeId(), ...sector.selectedHex, name: generateName(), ruleset: { ...sector.ruleset },
        mainWorld: null,
      });
      render();
    }));
    return;
  }

  function entries(container, title, records, open) {
    const group = disclosure(title);
    const count = node("small", String(records.length));
    count.setAttribute("aria-label", `${records.length} entries`);
    group.firstElementChild.append(count);
    const list = node("ul");
    for (const record of records) {
      const item = node("li");
      const button = action(record.name || "Unnamed entry", () => open(record));
      button.className = "inspector-entry";
      const tags = tagNames(record);
      if (tags.length) button.append(node("small", tags.join(" · ")));
      item.append(button);
      list.append(item);
    }
    group.append(list);
    container.append(group);
  }

  function readObject(body, record, back) {
    const values = attributes(record).filter(([, value]) => value);
    if (values.length) {
      const group = disclosure("Attributes");
      const list = node("dl");
      list.className = "inspector-attributes";
      for (const [label, value] of values) list.append(node("dt", label), node("dd", value));
      group.append(list);
      body.append(group);
    }
    if (record.description?.trim()) {
      const group = disclosure("Description");
      const description = node("p", record.description);
      description.className = "inspector-description";
      group.append(description);
      body.append(group);
    }
    if (record.mainWorld) entries(body, "Main world", [record.mainWorld], () => {
      openObject(record.mainWorld, "Main world", back, () => { record.mainWorld = null; });
    });
    if (record.worlds?.length) entries(body, "Other worlds", record.worlds, world => {
      openObject(world, "World", back, () => record.worlds.splice(record.worlds.indexOf(world), 1));
    });
    const locations = record.locations ?? record.children ?? [];
    const groups = new Map();
    for (const location of locations) {
      const type = location.type.trim() || "Other locations";
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type).push(location);
    }
    for (const [type, records] of groups) entries(body, type, records, location => {
      openObject(location, location.type.trim() || "Location", back, () =>
        locations.splice(locations.indexOf(location), 1));
    });
    if (record.profile || tagNames(record).length) {
      const group = disclosure(record.profile ? "Planet Tags" : record.column ? "System Tags" : "Location Tags", "planet-tags");
      const names = tagNames(record);
      if (!names.length) group.append(node("p", "No tags assigned."));
      for (const name of names) {
        const article = node("article");
        article.append(node("h4", name));
        const details = tagDetails(record, name);
        if (details) {
          article.append(node("p", details.description));
          for (const [label, hooks] of Object.entries(details.hooks)) {
            const list = node("ul");
            for (const hook of hooks) list.append(node("li", hook));
            article.append(node("h5", label), list);
          }
        }
        group.append(article);
      }
      body.append(group);
    }
  }

  function openObject(record, kind, back, remove, focus = true) {
    section.replaceChildren();
    const header = node("header");
    header.className = "inspector-header";
    const heading = node("h3", record.name || kind);
    heading.tabIndex = -1;
    const commands = node("nav");
    commands.className = "inspector-commands";
    commands.setAttribute("aria-label", `${kind} commands`);
    const status = node("p");
    status.className = "inspector-status";
    status.setAttribute("role", "status");
    const body = node("div");
    body.className = "inspector-fields";
    const reopen = () => openObject(record, record.type?.trim() || kind, back, remove);
    if (back) commands.append(action("Back", back));
    commands.append(action("Edit", () => {
      status.textContent = "";
      commands.hidden = true;
      body.replaceChildren();
      editObject(body, record, kind, reopen);
      body.querySelector("input")?.focus();
    }), action("Delete", () => {
      if (!confirm(`Delete “${record.name || kind}” and its contents?`)) return;
      remove();
      if (back) {
        save();
        back();
      } else render();
    }), action("Share", async () => {
      try {
        await navigator.clipboard.writeText(objectMarkdown(record, kind));
        status.textContent = "Copied as Markdown.";
      } catch {
        status.textContent = "Could not copy to the clipboard.";
      }
    }));
    header.append(node("small", kind), heading, commands, status);
    section.append(header, body);
    readObject(body, record, reopen);
    if (focus) heading.focus();
  }

  function editObject(body, record, kind, reopen) {
    const draft = structuredClone(record);
    const form = node("form");
    const fields = disclosure("Attributes");
    const edit = (label, target, key, reroll) => field(label, target[key] ?? "", value => {
      target[key] = value;
    }, key === "name" ? () => generateName(draft) : reroll, key === "name" ? "New name" : "Reroll");
    fields.append(edit(`${record.profile ? "World" : kind === "System" ? "System" : "Location"} name`, draft, "name"));
    let locationTags;
    if (record.type !== undefined) {
      const availableTags = catalogueTags();
      const catalogue = tagsByType(availableTags);
      const types = new Map(tagTypes.filter(type => !["Planet", "System"].includes(type))
        .map(type => [type.toLowerCase(), type]));
      for (const { type } of availableTags) {
        const key = type.toLowerCase();
        if (!["planet", "system"].includes(key) && !types.has(key)) types.set(key, type);
      }
      const currentType = draft.type.trim();
      if (currentType) types.set(currentType.toLowerCase(), currentType);
      const typeSelect = node("select");
      typeSelect.append(new Option("Unspecified", ""), ...Array.from(types.values()).sort()
        .map(type => new Option(type)));
      typeSelect.value = currentType;
      const typeLabel = node("label", "Location type");
      typeLabel.append(typeSelect);
      fields.append(typeLabel);

      locationTags = disclosure("Location Tags");
      const picks = [1, 2].map(number => {
        const row = node("div");
        row.className = "edit-field has-reroll";
        const label = node("label", `Location tag ${number}`);
        const select = node("select");
        select.id = `inspector-field-${++nextFieldId}`;
        label.htmlFor = select.id;
        const reroll = action("Reroll", () => {
          const pool = rerollPool(number - 1);
          if (!pool.length) return;
          select.value = pool[roll(pool.length) - 1];
          saveTagChoices();
        });
        reroll.className = "reroll-action";
        reroll.setAttribute("aria-label", `Reroll location tag ${number}`);
        row.append(label, reroll, select);
        locationTags.append(row);
        return { select, reroll };
      });
      const assignments = new Map([[currentType.toLowerCase(), [...(draft.tags ?? [])]]]);
      function rerollPool(index) {
        const key = typeSelect.value.toLowerCase();
        const assigned = assignments.get(key) ?? [];
        return (catalogue.get(key) ?? []).filter(name =>
          name !== assigned[index] && name !== assigned[1 - index]);
      }

      function saveTagChoices() {
        const key = typeSelect.value.toLowerCase();
        draft.tags = picks.map(({ select }) => select.value);
        assignments.set(key, draft.tags);
        refreshTagOptions();
      }

      function refreshTagOptions() {
        const key = typeSelect.value.toLowerCase();
        const assigned = assignments.get(key) ?? [];
        const names = catalogue.get(key) ?? [];
        for (const [index, { select, reroll }] of picks.entries()) {
          const current = assigned[index] ?? "";
          const other = assigned[1 - index] ?? "";
          const options = Array.from(new Set([...names, current])).filter(name => name && (name === current || name !== other));
          select.replaceChildren(new Option("No tag", ""), ...options.sort().map(name => new Option(name)));
          select.value = current;
          reroll.disabled = rerollPool(index).length === 0;
        }
      }
      typeSelect.addEventListener("change", () => {
        draft.type = typeSelect.value;
        draft.tags = assignments.get(draft.type.toLowerCase()) ?? [];
        refreshTagOptions();
      });
      for (const { select } of picks) select.addEventListener("change", saveTagChoices);
      refreshTagOptions();
    }
    if (record === system || record.description !== undefined) fields.append(edit("Description", draft, "description"));
    let destination;
    if (record === system) {
      const label = node("label", "Destination hex");
      destination = node("input");
      destination.value = hexCode(record);
      destination.inputMode = "numeric";
      destination.pattern = "[0-9]{4}";
      destination.required = true;
      label.append(destination);
      fields.append(label);
    }
    if (draft.profile) {
      for (const key of profileFields) fields.append(edit(key, draft.profile, key, () => rollWorld(roll).profile[key]));
    }
    form.append(fields);
    if (locationTags) form.append(locationTags);
    if (draft.profile) {
      const tags = disclosure("Planet Tags");
      for (const index of [0, 1]) {
        tags.append(edit(`Tag ${index + 1}`, draft.tags, index, () => rerollTag(draft.tags[1 - index], roll)));
      }
      form.append(tags);
    }
    function addNamedEntry(group, label, create) {
      const button = action(label, () => {
        const entry = create();
        entry.name = generateName(draft);
        const added = edit("Name", entry, "name");
        group.insertBefore(added, button);
        if (entry.type === "") group.insertBefore(edit("Location type", entry, "type"), button);
        if (label === "Add main planet") button.disabled = true;
        added.querySelector("input").focus();
      });
      group.append(button);
    }

    if (record === system) {
      const planets = disclosure("Planets");
      if (draft.mainWorld) planets.append(edit("Main planet name", draft.mainWorld, "name"));
      else addNamedEntry(planets, "Add main planet", () => { return draft.mainWorld = newWorld(); });
      for (const world of draft.worlds ?? []) planets.append(edit("Planet name", world, "name"));
      addNamedEntry(planets, "Add planet", () => {
        const world = newWorld();
        (draft.worlds ??= []).push(world);
        return world;
      });
      form.append(planets);

      const locations = draft.locations ??= [];
      for (const type of [...systemPointTypes, "Other locations"]) {
        const group = disclosure(type);
        const isOther = type === "Other locations";
        const entries = locations.filter(location => isOther
          ? !systemPointTypes.includes(location.type) : location.type === type);
        for (const location of entries) {
          group.append(edit("Location name", location, "name"));
          if (isOther) group.append(edit("Location type", location, "type"));
        }
        addNamedEntry(group, isOther ? "Add custom location" : `Add ${type.toLowerCase()}`, () => {
          const location = { ...newLocation(), type: isOther ? "" : type };
          locations.push(location);
          return location;
        });
        form.append(group);
      }

      const tags = disclosure("System Tags");
      const list = node("datalist");
      list.id = "system-tag-options";
      for (const name of systemTagNames()) list.append(new Option(name));
      const rows = node("div");
      draft.tags = [...tagNames(draft)];
      function renderTags() {
        rows.replaceChildren();
        for (const [index, name] of draft.tags.entries()) {
          const row = field(`System tag ${index + 1}`, name, value => { draft.tags[index] = value; });
          row.querySelector("input").setAttribute("list", list.id);
          row.append(action(`Remove system tag ${index + 1}`, () => {
            draft.tags.splice(index, 1);
            renderTags();
            addTag.focus();
          }));
          rows.append(row);
        }
      }
      const addTag = action("Add system tag", () => {
        draft.tags.push("");
        renderTags();
        rows.lastElementChild.querySelector("input").focus();
      });
      tags.append(list, rows, addTag);
      renderTags();
      form.append(tags);
    } else {
      const additions = disclosure("Contents");
      addNamedEntry(additions, record.type !== undefined ? "Add nested location" : "Add location", () => {
        const location = newLocation();
        const key = record.type !== undefined ? "children" : "locations";
        (draft[key] ??= []).push(location);
        return location;
      });
      form.append(additions);
    }
    const message = node("p");
    message.className = "inspector-status";
    message.setAttribute("role", "status");
    const footer = node("div");
    footer.className = "inspector-commands";
    const submit = node("button", "Save");
    submit.type = "submit";
    footer.append(action("Cancel", reopen), submit);
    form.append(message, footer);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const changes = record === system || locationTags ? { ...draft, tags: tagNames(draft) } : draft;
      if (destination && destination.value !== hexCode(record)) {
        const hex = { column: Number(destination.value.slice(0, 2)), row: Number(destination.value.slice(2)) };
        if (!validHex(hex, sector.grid) || sector.systems.some(other =>
          other.column === hex.column && other.row === hex.row)) {
          message.textContent = "Choose an empty hex within the map.";
          destination.focus();
          return;
        }
        Object.assign(record, changes, hex);
        sector.selectedHex = hex;
        render();
        return;
      }
      Object.assign(record, draft);
      save();
      reopen();
    });
    body.append(form);
  }

  openObject(system, "System", null, () => sector.systems.splice(sector.systems.indexOf(system), 1), false);
}
