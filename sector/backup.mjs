import { readSector } from "./sector-data.mjs";
import { tagFields } from "./tag-catalogue.mjs";

const format = "sci-fi-rpg-tools.backup";
const keys = {
  customTags: "sci-fi-rpg-tools.custom-tags",
  standaloneDevelopment: "scifi-rpg-tools.development",
  showTradeRoutes: "scifi-rpg-tools.sector.show-trade-routes",
  showSystemNames: "scifi-rpg-tools.sector.show-system-names",
};
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const strings = value => Array.isArray(value) && value.every(item => typeof item === "string");

export function createBackup(sector, storage, view) {
  const settings = Object.fromEntries(Object.entries(keys).map(([name, key]) => {
    const value = storage.getItem(key);
    return [name, value === null ? null : JSON.parse(value)];
  }));
  return { format, version: 1, sector, settings, view };
}

export function readBackup(json) {
  const value = JSON.parse(json);
  if (value?.format !== format) return { sector: readSector(json) };
  if (value.version !== 1 || !object(value.settings) || !object(value.view)) {
    throw new Error("Unsupported backup format.");
  }

  const { settings, view } = value;
  const { customTags, standaloneDevelopment } = settings;
  if (customTags !== null) {
    const tags = Array.isArray(customTags) ? customTags : customTags?.tags;
    if (!Array.isArray(tags) || (!Array.isArray(customTags) && !strings(customTags.deleted))) {
      throw new Error("Invalid custom tag catalogue.");
    }
    for (const tag of tags) {
      if (typeof tag?.id !== "string") throw new Error("Invalid custom tag ID.");
      tagFields(tag);
    }
  }
  if (standaloneDevelopment !== null && (!object(standaloneDevelopment) ||
    !strings(standaloneDevelopment.books) || !Array.isArray(standaloneDevelopment.log) ||
    !standaloneDevelopment.log.every(entry => object(entry) && typeof entry.type === "string" &&
      Array.isArray(entry.prompts)))) {
    throw new Error("Invalid standalone Development Log.");
  }
  for (const name of ["showTradeRoutes", "showSystemNames"]) {
    if (settings[name] !== null && typeof settings[name] !== "boolean") throw new Error("Invalid visibility setting.");
  }
  if (!Number.isFinite(view.zoom) || view.zoom < 0.5 || view.zoom > 3 ||
    ![view.left, view.top].every(value => Number.isFinite(value) && value >= 0)) {
    throw new Error("Invalid map view.");
  }
  return { sector: readSector(JSON.stringify(value.sector)), settings, view };
}

export function restoreBackupStorage(settings, storage) {
  const previous = Object.values(keys).map(key => [key, storage.getItem(key)]);
  const write = (key, value) => value === null ? storage.removeItem(key) : storage.setItem(key, value);
  let written = 0;
  try {
    for (const [name, key] of Object.entries(keys)) {
      write(key, settings[name] === null ? null : JSON.stringify(settings[name]));
      written++;
    }
  } catch (error) {
    for (const [key, value] of previous.slice(0, written).reverse()) write(key, value);
    throw error;
  }
}
