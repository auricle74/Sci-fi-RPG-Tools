import { bookTags, deleteCustomTag, hookNames, readCustomTags, saveCustomTag, tagFields, tagTypes } from "./tag-catalogue.mjs";

const element = id => document.getElementById(id);
const filter = element("filter");
const list = element("tag-list");
const form = element("tag-form");
const typeField = element("tag-type");
const customType = element("custom-type");
typeField.replaceChildren(...tagTypes.map(type => new Option(type)), new Option("Custom type…", ""));
const selectedType = () => typeField.value || customType.value.trim();
const status = element("tag-status");
const hookFields = new Map();
let selected;
let dirty = false;

for (const name of hookNames) {
  const label = document.createElement("label");
  label.textContent = name;
  const input = document.createElement("textarea");
  input.rows = 3;
  label.append(input);
  element("tag-hooks").append(label);
  hookFields.set(name, input);
}

function updatePrompt() {
  const type = selectedType() || filter.value || "Planet";
  const example = {
    name: "", type, description: "",
    hooks: Object.fromEntries(hookNames.map(name => [name, ["", "", ""]])),
  };
  element("ai-prompt").value = "Invent one original science-fiction RPG tag for the given type. " +
    "Write a concise description and three concrete prompts in each hook category. " +
    "Return only valid JSON using this structure:\n" + JSON.stringify(example, null, 2);
}

function renderList() {
  const tags = [...bookTags, ...readCustomTags()];
  const types = Array.from(new Map([...tagTypes, ...tags.map(tag => tag.type)]
    .map(type => [type.toLowerCase(), type])).values()).sort();
  const previous = filter.value;
  filter.replaceChildren(new Option("All types", ""), ...types.map(type => new Option(type)));
  filter.value = types.find(type => type.toLowerCase() === previous.toLowerCase()) ?? "";
  list.replaceChildren();
  const visible = tags.filter(tag => !filter.value || tag.type.toLowerCase() === filter.value.toLowerCase());
  for (const tag of visible.sort((a, b) => a.name.localeCompare(b.name))) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${tag.name} · ${tag.type}${tag.readOnly ? " · Book" : ""}`;
    button.setAttribute("aria-pressed", String(tag.readOnly
      ? selected?.readOnly && selected.name === tag.name
      : Boolean(selected?.id && selected.id === tag.id)));
    button.addEventListener("click", () => {
      if (canLeave()) showTag(tag);
    });
    item.append(button);
    list.append(item);
  }
  if (!visible.length) {
    const item = document.createElement("li");
    item.textContent = "No tags of this type yet.";
    list.append(item);
  }
}

function canLeave() {
  return !dirty || confirm("Discard the unsaved tag changes?");
}

function showTag(tag = {}) {
  selected = tag;
  dirty = false;
  form.hidden = false;
  element("tag-fields").disabled = Boolean(tag.readOnly);
  element("tag-actions").hidden = Boolean(tag.readOnly);
  element("delete-tag").hidden = !tag.id;
  element("tag-title").textContent = tag.readOnly ? "Book tag (read-only)" : tag.id ? "Edit custom tag" : "New custom tag";
  element("tag-name").value = tag.name ?? "";
  const type = tag.type ?? (filter.value || "Planet");
  typeField.value = tagTypes.find(entry => entry.toLowerCase() === type.toLowerCase()) ?? "";
  customType.value = typeField.value ? "" : type;
  syncCustomType();
  element("tag-description").value = tag.description ?? "";
  for (const [name, input] of hookFields) input.value = (tag.hooks?.[name] ?? []).join("\n");
  status.textContent = "";
  renderList();
  updatePrompt();
}

filter.addEventListener("change", () => {
  renderList();
  if (form.hidden) updatePrompt();
});
element("new-tag").addEventListener("click", () => {
  if (canLeave()) showTag();
});
form.addEventListener("input", () => { dirty = true; });
function syncCustomType() {
  const isCustom = typeField.value === "";
  element("custom-type-label").hidden = !isCustom;
  customType.disabled = !isCustom;
}

typeField.addEventListener("input", () => {
  syncCustomType();
  updatePrompt();
});
customType.addEventListener("input", updatePrompt);
form.addEventListener("submit", event => {
  event.preventDefault();
  if (selected?.readOnly) return;
  try {
    const tag = saveCustomTag(selected?.id, {
      name: element("tag-name").value,
      type: selectedType(),
      description: element("tag-description").value,
      hooks: Object.fromEntries(Array.from(hookFields, ([name, input]) => [name, input.value.split("\n")])),
    });
    if (filter.value && filter.value !== tag.type) filter.value = "";
    showTag(tag);
    status.textContent = "Tag saved.";
  } catch (error) {
    status.textContent = error.message;
  }
});
element("delete-tag").addEventListener("click", () => {
  if (selected?.readOnly || !selected?.id || !confirm(`Delete “${selected.name}”?`)) return;
  try {
    deleteCustomTag(selected.id);
    selected = undefined;
    dirty = false;
    form.hidden = true;
    element("tag-title").textContent = "Tag details";
    renderList();
    status.textContent = "Tag deleted.";
  } catch (error) {
    status.textContent = error.message;
  }
});
element("copy-prompt").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(element("ai-prompt").value);
    status.textContent = "Prompt copied.";
  } catch {
    element("ai-prompt").select();
    status.textContent = "Copy the selected prompt.";
  }
});
element("load-draft").addEventListener("click", () => {
  if (!canLeave()) return;
  try {
    const json = element("ai-response").value.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/gi, "");
    const draft = tagFields(JSON.parse(json));
    showTag(draft);
    dirty = true;
    status.textContent = "Draft loaded. Review it and save when ready.";
  } catch {
    status.textContent = "Paste a valid JSON response with a name, type, description and all five hook lists.";
  }
});
window.addEventListener("storage", renderList);

try {
  renderList();
  updatePrompt();
} catch {
  status.textContent = "The browser could not load your custom tags.";
}
