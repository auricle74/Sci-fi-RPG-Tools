import { starterTags } from "./starter-tags.mjs";
import { systemPointTypes } from "./system-points.mjs";
import { worldTagDetails } from "./world-tags.mjs";

export const hookNames = ["Enemies", "Friends", "Complications", "Things", "Places"];
export const tagTypes = ["Planet", "System", "Moon", "Station", ...systemPointTypes];
const storageKey = "sci-fi-rpg-tools.custom-tags";
export const bookTags = Array.from(worldTagDetails, ([name, details]) => ({
  ...details, name, type: "Planet", readOnly: true,
}));
const normalise = value => value.trim().toLowerCase();

function readTagChanges() {
  const stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  return Array.isArray(stored) ? { tags: stored, deleted: [] } : stored;
}

const tagKey = tag => JSON.stringify([normalise(tag.type), normalise(tag.name)]);

function catalogue({ tags, deleted }) {
  const replacedIds = new Set([...deleted, ...tags.map(tag => tag.id)]);
  const occupiedNames = new Set(tags.map(tagKey));
  return [
    ...starterTags.filter(tag => !replacedIds.has(tag.id) && !occupiedNames.has(tagKey(tag))),
    ...tags,
  ];
}

export function readCustomTags() {
  return catalogue(readTagChanges());
}

export function catalogueTags() {
  try { return readCustomTags(); } catch { return starterTags; }
}

export function tagsByType(tags = catalogueTags()) {
  const groups = new Map();
  for (const {type, name} of tags) {
    const key = normalise(type);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(name);
  }
  return groups;
}

export function systemTagNames() {
  return tagsByType().get("system") ?? [];
}

export function catalogueTagDetails(type, name) {
  try {
    return readCustomTags().find(tag => normalise(tag.type) === normalise(type) &&
      normalise(tag.name) === normalise(name));
  } catch {
    return starterTags.find(tag => normalise(tag.type) === normalise(type) && normalise(tag.name) === normalise(name));
  }
}

export function planetTagDetails(name) {
  const bookTag = worldTagDetails.get(name);
  if (bookTag) return bookTag;
  try {
    return readTagChanges().tags.find(tag => normalise(tag.type) === "planet" &&
      normalise(tag.name) === normalise(name));
  } catch {
    return undefined;
  }
}

export function tagFields(value) {
  if (!value || typeof value.name !== "string" || !value.name.trim() ||
      typeof value.type !== "string" || !value.type.trim() ||
      typeof value.description !== "string" ||
      !hookNames.every(key => Array.isArray(value.hooks?.[key]) &&
        value.hooks[key].every(item => typeof item === "string"))) {
    throw new Error("Enter a name, a type, a description and five hook lists.");
  }
  return {
    name: value.name.trim(),
    type: tagTypes.find(type => normalise(type) === normalise(value.type)) ?? value.type.trim(),
    description: value.description.trim(),
    hooks: Object.fromEntries(hookNames.map(key => [key, value.hooks[key].map(item => item.trim()).filter(Boolean)])),
  };
}

export function saveCustomTag(id, value) {
  const tag = tagFields(value);
  const changes = readTagChanges();
  const tags = catalogue(changes);
  if (id && !tags.some(entry => entry.id === id)) throw new Error("This tag was removed in another tab.");
  const matches = entry => normalise(entry.type) === normalise(tag.type) &&
    normalise(entry.name) === normalise(tag.name);
  if (bookTags.some(matches) || tags.some(entry => entry.id !== id && matches(entry))) {
    throw new Error("A tag with that name and type already exists.");
  }
  const saved = { ...tag, id: id ?? crypto.randomUUID() };
  changes.tags = [...changes.tags.filter(entry => entry.id !== id), saved];
  localStorage.setItem(storageKey, JSON.stringify(changes));
  return saved;
}

export function deleteCustomTag(id) {
  const changes = readTagChanges();
  changes.tags = changes.tags.filter(tag => tag.id !== id);
  if (starterTags.some(tag => tag.id === id) && !changes.deleted.includes(id)) changes.deleted.push(id);
  localStorage.setItem(storageKey, JSON.stringify(changes));
}
