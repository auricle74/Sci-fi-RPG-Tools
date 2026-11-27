import { collections, defaultBooks, detailTables, developmentTypes, die, jobCategories, optionalSituationPrompts,
  rollDevelopment, rollFollowUp, territories } from "./roller.mjs";

function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

function action(label, handler) {
  const button = node("button", label);
  button.type = "button";
  button.addEventListener("click", handler);
  return button;
}

function field(label, control) {
  const wrapper = node("label", label);
  wrapper.append(control);
  return wrapper;
}

function select(options, value) {
  const control = node("select");
  for (const item of options) {
    const [id, label] = Array.isArray(item) ? item : [item, item];
    control.add(new Option(label, id));
  }
  control.value = value;
  return control;
}

export function bookChecklist(selected, change) {
  const group = node("fieldset");
  group.className = "development-books";
  group.append(node("legend", "Roll from"));
  for (const book of collections) {
    const checkbox = node("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected().includes(book.id);
    checkbox.value = book.id;
    checkbox.addEventListener("change", () => change([...group.querySelectorAll("input:checked")].map(input => input.value)));
    const label = node("label");
    label.append(checkbox, book.name);
    group.append(label);
  }
  return group;
}

function promptLines(prompts, storyOnly, depth = 0) {
  return prompts.flatMap(prompt => [
    `${"  ".repeat(depth)}- ${prompt.table}: ${prompt.value}${storyOnly ? "" : ` (p. ${prompt.page}${prompt.result ? `, d${prompt.sides} → ${prompt.result}` : ""})`}`,
    ...promptLines(prompt.children, storyOnly, depth + 1),
  ]);
}

function recordText(entry, storyOnly = false) {
  return [
    !storyOnly && `## ${entry.type} · ${entry.book}`,
    !storyOnly && (entry.context?.label ?? entry.context),
    !storyOnly && entry.typeRoll && `Development Type (p. ${entry.typeRoll.page}): d100 → ${entry.typeRoll.result}`,
    ...promptLines(entry.prompts, storyOnly),
    entry.connections?.length ? `Connections: ${entry.connections.join(", ")}` : "",
    entry.notes,
  ].filter(Boolean).join("\n");
}

export function developmentLog(entries, openSystem, storyOnly = false) {
  const log = node("details");
  log.className = "development-log";
  log.open = true;
  log.append(node("summary", "Development Log"));
  if (!entries.length) log.append(node("p", "No saved developments yet."));
  for (const entry of [...entries].reverse()) {
    const item = node("details");
    item.append(node("summary", `${entry.type}${entry.context?.label || entry.context ? ` · ${entry.context.label ?? entry.context}` : ""}`));
    const details = node("p", recordText(entry, storyOnly));
    details.className = "development-record";
    item.append(details);
    if (entry.context?.systemId && openSystem) {
      item.append(action("Open System Profile", () => openSystem(entry.context.systemId)));
    }
    log.append(item);
  }
  return log;
}

export function developmentView({ selectedBooks, setBooks, entries, saveEntry, context, suggestions = [],
  initialEnvironment = "Voidside", territory = "Frontier", roll = die, openSystem }) {
  const root = node("section");
  root.className = context ? "development-view" : "development-view development-standalone";
  const controls = node("form");
  controls.className = "development-controls";
  const output = node("section");
  output.className = "development-output";
  const settings = node("section");
  if (setBooks) settings.append(bookChecklist(selectedBooks, setBooks));
  const type = select([["Random", "Random Development"], ...developmentTypes], "Random");
  const space = select(["Voidside", "Worldside"], initialEnvironment);
  const region = select(territories, territories.includes(territory) ? territory : "Frontier");
  const incident = select(["Personal", "Vehicular"], "Personal");
  const job = select([["Random", "Random category"], ...jobCategories], "Random");
  const inputContext = node("input");
  const options = () => ({
    type: type.value, encounter: space.value, territory: region.value,
    incident: incident.value, job: job.value,
  });
  const encounterFields = node("div");
  encounterFields.append(field("Encounter environment", space), field("Territory", region));
  const incidentField = field("Incident type", incident);
  const jobField = field("Job category", job);
  function updateControls() {
    encounterFields.hidden = !["Encounter", "Random"].includes(type.value);
    incidentField.hidden = !["Incident", "Random"].includes(type.value);
    jobField.hidden = type.value !== "Job";
  }
  const status = node("p");
  status.setAttribute("role", "status");
  const preview = node("div");
  const history = node("div");
  history.append(developmentLog(entries(), openSystem, !context));
  controls.append(settings, field("Development type", type), encounterFields, incidentField, jobField);
  if (context) controls.prepend(node("p", context.label));
  else controls.append(field("Context (optional)", inputContext));
  controls.append(action("Roll Development", rollDraft), action("Look for Work", () => {
    type.value = "Job";
    updateControls();
    rollDraft();
  }));
  controls.addEventListener("submit", event => {
    event.preventDefault();
    rollDraft();
  });
  type.addEventListener("change", updateControls);
  updateControls();
  output.append(status, preview, history);
  root.append(controls, output);
  preview.append(node("h2", "Result"), node("p", "Roll a development to see its prompts."));
  let draft;
  let draftOptions;
  const detail = select(detailTables, detailTables[0]);
  const interpretation = node("textarea");
  interpretation.rows = 3;
  const manualConnection = node("input");
  const selectedConnections = new Set();
  function rollDraft() {
    draftOptions = options();
    const next = rollDevelopment(draftOptions, selectedBooks(), roll);
    if (!next) {
      status.textContent = "Select a book that supports this roll in Roll from.";
      return;
    }
    draft = { ...next, context: context ?? inputContext.value.trim() };
    interpretation.value = "";
    manualConnection.value = "";
    selectedConnections.clear();
    status.textContent = `${draft.type} rolled.`;
    renderDraft();
  }
  function renderPrompt(prompt, prompts, index) {
    const row = node("li");
    const description = node("strong", `${prompt.table}: ${prompt.value}`);
    row.append(description, node("small", ` p. ${prompt.page}${prompt.result ? ` · d${prompt.sides} → ${prompt.result}` : ""}`));
    if (!prompt.placeholder) {
      const reroll = action(context ? `Reroll ${prompt.table}` : "Reroll", () => {
        if (prompt.choices) {
          const result = roll(10);
          prompts[index] = { ...prompt, result, value: prompt.choices[result <= 3 ? 0 : result <= 7 ? 1 : 2] };
        } else prompts[index] = rollFollowUp(draft.bookId, prompt.table, draftOptions, roll);
        status.textContent = `${prompt.table} rerolled.`;
        renderDraft();
        preview.querySelectorAll("button")[Number(row.dataset.rerollIndex)]?.focus();
      });
      if (!context) {
        reroll.className = "reroll-action";
        reroll.setAttribute("aria-label", `Reroll ${prompt.table}`);
      }
      row.append(reroll);
    }
    if (prompt.children.length) row.append(promptList(prompt.children));
    return row;
  }
  function promptList(prompts) {
    const list = node("ul");
    list.className = "development-prompts";
    prompts.forEach((prompt, index) => list.append(renderPrompt(prompt, prompts, index)));
    return list;
  }
  function record() {
    return { ...draft, notes: interpretation.value.trim(), connections: [
      ...selectedConnections, ...[manualConnection.value.trim()].filter(Boolean),
    ] };
  }
  function renderDraft() {
    preview.replaceChildren(node("h2", draft.type), node("p", draft.book));
    if (draft.typeRoll) preview.append(node("small", `Development Type, p. 122 · d100 → ${draft.typeRoll.result}`));
    const list = promptList(draft.prompts);
    list.querySelectorAll("button").forEach((button, index) => { button.parentElement.dataset.rerollIndex = index; });
    preview.append(list);
    if (draft.type === "Situation" && draft.bookId === "tpv") {
      const actions = node("div");
      for (const table of optionalSituationPrompts.filter(name => !draft.prompts.some(prompt => prompt.table === name))) {
        actions.append(action(`Add ${table}`, () => {
          draft.prompts.push(rollFollowUp(draft.bookId, table, draftOptions, roll));
          renderDraft();
        }));
      }
      preview.append(actions);
    }
    if (draft.bookId === "tpv") {
      const detailGroup = node("details");
      detailGroup.append(node("summary", "Add a detail"), field("Detail table", detail), action("Roll Detail", () => {
        draft.prompts.push(rollFollowUp(draft.bookId, detail.value, draftOptions, roll));
        renderDraft();
      }));
      preview.append(detailGroup);
    }
    if (suggestions.length) {
      const group = node("details");
      group.append(node("summary", "Link existing factions, NPCs or locations"));
      for (const name of suggestions) {
        const checkbox = node("input");
        checkbox.type = "checkbox";
        checkbox.checked = selectedConnections.has(name);
        checkbox.addEventListener("change", () => checkbox.checked ? selectedConnections.add(name) : selectedConnections.delete(name));
        const label = node("label");
        label.append(checkbox, name);
        group.append(label);
      }
      preview.append(group);
    }
    preview.append(field("NPC, faction or location to note (optional)", manualConnection), field("Interpretation", interpretation),
      action("Copy Result", async () => {
        try {
          await navigator.clipboard.writeText(recordText(record()));
          status.textContent = "Result copied.";
        } catch {
          status.textContent = "Clipboard unavailable. Save the result to keep it in the log.";
        }
      }),
      action("Save to Development Log", () => {
        try {
          saveEntry(structuredClone(record()));
          history.replaceChildren(developmentLog(entries(), openSystem, !context));
          status.textContent = "Saved to Development Log.";
        } catch {
          status.textContent = "Could not save the development.";
        }
      }),
      action("Discard Draft", () => {
        draft = null;
        preview.replaceChildren(node("h2", "Result"), node("p", "Roll a development to see its prompts."));
        status.textContent = "Draft discarded.";
      }));
  }
  return root;
}

export function profileDevelopmentButton(inspector, options) {
  return action("Roll Development", () => {
    const existing = inspector.querySelector(".profile-development");
    if (existing) {
      existing.querySelector("select")?.focus();
      return;
    }
    const panel = node("section");
    panel.className = "profile-development";
    panel.append(node("h3", "Development Generator"), action("Close Development", () => panel.remove()),
      developmentView(options));
    inspector.prepend(panel);
    panel.querySelector("select")?.focus();
  });
}

export function sectorBooks(sector) {
  return Array.isArray(sector.developmentBooks) ? sector.developmentBooks : defaultBooks;
}
