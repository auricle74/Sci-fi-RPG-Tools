import { systemPointTypes } from "./system-points.mjs";
import { worldTagDetails } from "./world-tags.mjs";

export const hookNames = ["Enemies", "Friends", "Complications", "Things", "Places"];
export const tagTypes = ["Planet", "System", "Moon", "Station", ...systemPointTypes];
const storageKey = "sci-fi-rpg-tools.custom-tags";
export const bookTags = Array.from(worldTagDetails, ([name, details]) => ({
  ...details, name, type: "Planet", readOnly: true,
}));
const normalise = value => value.trim().toLowerCase();

export function readCustomTags() {
  return JSON.parse(localStorage.getItem(storageKey) ?? "[]");
}

export function planetTagDetails(name) {
  const bookTag = worldTagDetails.get(name);
  if (bookTag) return bookTag;
  try {
    return readCustomTags().find(tag => normalise(tag.type) === "planet" &&
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
  const tags = readCustomTags();
  if (id && !tags.some(entry => entry.id === id)) throw new Error("This tag was removed in another tab.");
  const matches = entry => normalise(entry.type) === normalise(tag.type) &&
    normalise(entry.name) === normalise(tag.name);
  if (bookTags.some(matches) || tags.some(entry => entry.id !== id && matches(entry))) {
    throw new Error("A tag with that name and type already exists.");
  }
  const saved = { ...tag, id: id ?? crypto.randomUUID() };
  localStorage.setItem(storageKey, JSON.stringify([...tags.filter(entry => entry.id !== id), saved]));
  return saved;
}

export function deleteCustomTag(id) {
  const tags = readCustomTags().filter(tag => tag.id !== id);
  localStorage.setItem(storageKey, JSON.stringify(tags));
}
