import { tpvTables } from "./tpv-tables.mjs";

export const developmentTypes = ["Situation", "Incident", "Encounter", "Event", "Offer", "Discovery", "Job"];
export const jobCategories = ["General", "Criminal", "Commercial", "Corporate", "Military", "Scientific"];
export const territories = ["Core", "Frontier", "Wild"];
export const detailTables = ["Detail Action", "Condition", "Design", "Mutation", "Texture", "Sound"];
export const optionalSituationPrompts = ["Complication", "Subject", "Object"];
const tpv = {
  id: "tpv",
  name: "The Perilous Void",
  supports: type => type === "Random" || developmentTypes.includes(type),
  generate: rollTpv,
};
export const collections = [tpv];
export const defaultBooks = [tpv.id];

export function die(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDevelopment(options, selectedBooks, roll = die) {
  const available = collections.filter(book => selectedBooks.includes(book.id) && book.supports(options.type, options));
  if (!available.length) return null;
  const book = available.length === 1 ? available[0] : available[roll(available.length) - 1];
  return { book: book.name, bookId: book.id, ...book.generate(options, roll) };
}

export function rollFollowUp(bookId, table, options, roll = die) {
  return collections.find(book => book.id === bookId)?.prompt(table, options, roll);
}

const references = [
  "SUBJECT", "LOCATION", "TRADE GOOD", "RESOURCE", "CONTRABAND", "ITEM", "FACTION", "JOB",
  ...jobCategories.slice(1).map(category => category.toUpperCase()),
  ...Object.keys(tpvTables).filter(name => name.endsWith(" NPC")).map(name => name.toUpperCase()),
  "COMPLEX LIFEFORM", "LIFEFORM", "NPC", "FACILITY", "DERELICT", "RUIN", "COMMUNITY", "MOON", "PLANET", "ANOMALY", "BOUNTY", "V.I.P.",
];
const placeholderPages = {
  NPC: 139, "COMPLEX LIFEFORM": 78, LIFEFORM: 74, FACILITY: 148, DERELICT: 146, RUIN: 150,
  COMMUNITY: 98, MOON: 48, PLANET: 48, ANOMALY: 37, INTEL: 131, "Prototype Technology": 156,
};
const tableName = text => text.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()).replace(/Npc$/, "NPC");

function followUps(table, value) {
  const isEncounter = table.includes(" Encounter · ");
  if (isEncounter) {
    if (value === "Ship Malfunction") return ["Vehicular Incident"];
    if (value === "Space anomaly" || value === "Mystery/Anomaly") return ["ANOMALY"];
    if (["Derelict vessel", "Space Debris", "Wreckage/Debris", "Sensor Ghost", "Distress Signal",
      "Natural Phenomenon", "Environmental Hazard", "Cultural Encounter"].includes(value)) return [];
    if (value === "Space Station") return ["COMMUNITY"];
    if (/monster|lifeform/i.test(value)) return ["COMPLEX LIFEFORM", "Activity"];
    if (/^faction/i.test(value)) return ["Faction", "Activity"];
    return value.endsWith(" NPC") ? [value, "Activity"] : ["Activity"];
  }
  if (!["Offer", "Discovery", "Subject", "Object", ...jobCategories.map(category => `${category} Job`)].includes(table)) return [];
  if (value.startsWith("Experimental or prototype")) return ["Prototype Technology"];
  if (value.startsWith("INTEL")) return ["INTEL"];
  let text = value;
  return references.flatMap(reference => {
    const pattern = new RegExp(`(^|[^A-Za-z])${reference.replaceAll(".", "\\.")}(?=$|[^A-Za-z])`);
    if (!pattern.test(text)) return [];
    text = text.replace(pattern, "$1");
    return [reference];
  });
}

function tpvPrompt(table, options, roll, retry = false) {
  if (table === "JOB") return tpvPrompt("Job Category", options, roll);
  if (table === "LOCATION") return tpvPrompt("Location Range", options, roll);
  if (table === "Job Category" || table === "Location Range") {
    const result = roll(10);
    const value = table === "Job Category" ? jobCategories[result <= 4 ? 0 : result <= 5 ? 1 : result <= 7 ? 2 : result - 5] :
      result <= 5 ? "Local" : result <= 8 ? "Nearby" : "Distant";
    const subtables = table === "Job Category" ? [`${value} Job`] :
      value === "Distant" ? ["Distant Location", "Nearby Location", "Local Location"] : [`${value} Location`];
    return { table, page: table === "Job Category" ? 132 : 133, sides: 10, result, value,
      children: subtables.map(child => tpvPrompt(child, options, roll)) };
  }
  if (table === "V.I.P.") table = "VIP";
  if (/^(CRIMINAL|COMMERCIAL|CORPORATE|MILITARY|SCIENTIFIC)$/.test(table)) table = `${tableName(table)} Job`;
  if (!Object.hasOwn(tpvTables, table) && !Object.hasOwn(placeholderPages, table)) table = tableName(table);
  if (Object.hasOwn(placeholderPages, table)) {
    return { table, page: placeholderPages[table], value: table === "INTEL" ? "Decide what information is being offered" : `Choose or describe: ${tableName(table)}`, placeholder: true, children: [] };
  }
  const [page, sides, entries] = tpvTables[table];
  const last = entries.at(-1)[1];
  const combines = typeof last === "string" && last.startsWith("Roll twice");
  const result = roll(retry && combines ? entries.at(-2)[0] : sides);
  const index = entries.findIndex(([end]) => result <= end);
  const [, value] = entries[index];
  if (typeof value === "string" && value.startsWith("Roll twice")) {
    return { table, page, sides, result, value: "Combine two results", children: [
      tpvPrompt(table, options, roll, true), tpvPrompt(table, options, roll, true),
    ] };
  }
  const children = Array.isArray(value) ? [eventDetail(value, roll)] :
    followUps(table, value).map(child => tpvPrompt(child, options, roll));
  return { table, page, sides, result, value: Array.isArray(value) ? value[0] : value, children };

  function eventDetail([theme, ...details], roll) {
    const result = roll(10);
    return { table: "Event detail", page: 130, sides: 10, result, value: details[result <= 3 ? 0 : result <= 7 ? 1 : 2], choices: details, children: [] };
  }
}

tpv.prompt = (table, options, roll) => tpvPrompt(table, options, roll);

function rollTpv(options, roll) {
  let { type } = options;
  let typeRoll;
  if (type === "Random") {
    const result = roll(100);
    const ranges = [25, 40, 60, 80, 90, 100];
    type = developmentTypes[ranges.findIndex(end => result <= end)];
    typeRoll = { result, sides: 100, page: 122 };
  }
  const paths = {
    Situation: ["Scope", "Theme", "Action", ...optionalSituationPrompts.filter(name => options.extras?.includes(name))],
    Incident: [`${options.incident ?? "Personal"} Incident`],
    Encounter: [`${options.encounter ?? "Voidside"} Encounter · ${options.territory ?? "Frontier"}`],
    Event: ["Event"], Offer: ["Offer"], Discovery: ["Discovery"],
    Job: [options.job && options.job !== "Random" ? `${options.job} Job` : "Job Category"],
  };
  return { type, typeRoll, prompts: paths[type].map(table => tpvPrompt(table, options, roll)) };
}
