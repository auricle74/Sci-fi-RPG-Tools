import { rollNpcName, rollNpcSurname } from "./tpv-npc-names.mjs";
import { rollName } from "./swn.mjs";
import { adjectives, assets, complications, nouns, structures, traits, types } from "./tpv-faction-tables.mjs";

const pick = (values, roll) => values[roll(values.length) - 1];

export function rollFactionName(roll, { place, surname } = {}) {
  const template = roll(100);
  const structure = () => pick(structures, roll);
  const adjective = () => {
    const value = pick(adjectives, roll);
    if (value === "[NPC Surname]") return surname || rollNpcSurname(roll);
    if (value === "[Place Name]") return place || rollName(roll);
    return value;
  };
  const noun = () => {
    const value = pick(nouns, roll);
    if (value.includes("/")) return pick(value.split("/"), roll);
    return value.replace(/\((s|es)\)/, (_, suffix) => roll(2) === 2 ? suffix : "");
  };
  if (template <= 15) return `The ${structure()}`;
  if (template <= 30) return `The ${adjective()}`;
  if (template <= 45) return `The ${noun()}`;
  if (template <= 60) return `${roll(2) === 1 ? "The " : ""}${adjective()} ${structure()}`;
  if (template <= 75) return `${roll(2) === 1 ? "The " : ""}${adjective()} ${noun()}`;
  if (template <= 90) return `The ${noun()} ${structure()}`;
  if (template <= 95) return `${roll(2) === 1 ? "The " : ""}${structure()} of ${noun()}`;
  return `${structure()} of the ${adjective()} ${noun()}`;
}

const reachTable = [
  [5, "Local (community)", 1], [15, "Local (settlement)", 2],
  [30, "Local (province)", 3], [45, "Local (nation)", 4],
  [60, "Local (region)", 5], [80, "Global", 6],
  [95, "System", 8], [100, "Interstellar", 10],
];
const motivations = [
  ["Justice", "Harmony", "Peace", "Redemption", "Wisdom"],
  ["Wealth", "Freedom", "Knowledge", "Pleasure", "Survival"],
  ["Power", "Control", "Destruction", "Greed", "Revenge"],
];

// TPV leaves the goal to the referee. These are starting points based on the leader's motivation.
const goals = {
  Justice: "bring a protected rival to trial",
  Harmony: "give rival communities a shared stake in a disputed resource",
  Peace: "broker a lasting ceasefire between neighbouring powers",
  Redemption: "restore a community damaged by the faction's past actions",
  Wisdom: "recover a lost archive and teach what it contains",
  Wealth: "secure exclusive access to a lucrative market",
  Freedom: "free its members from an outside power's jurisdiction",
  Knowledge: "fund an expedition to verify a disputed discovery",
  Pleasure: "turn its base into a destination for patrons across its territory",
  Survival: "secure an independent supply of essential resources",
  Power: "demand a seat on the governing council",
  Control: "take over the communications its rivals depend on",
  Destruction: "dismantle the institutions that uphold the current order",
  Greed: "acquire a rival's most valuable holdings through intermediaries",
  Revenge: "expose the patron who ordered an attack on its members",
};

const assetCategories = {
  AI: "scientific", Corporate: "corporate", Covert: "covert", Criminal: "criminal",
  Cult: "religious", Cyborg: "scientific", Guild: "commercial", Mercantile: "commercial",
  Mercenary: "military", Military: "military", Political: "political",
  Religious: "religious", Scientific: "scientific",
};

function rollPair(table, roll) {
  const result = roll(100);
  if (result <= 96) return [table[Math.floor((result - 1) / 3)]];
  const first = pick(table, roll);
  return [first, pick(table.filter(value => value !== first), roll)];
}

function rollAsset(category, taken, roll, visited = []) {
  const options = assets[category].filter(value => {
    if (!value.startsWith("Roll on ")) return !taken.includes(value);
    return ![category, ...visited].includes(value.slice(8).toLowerCase());
  });
  if (!options.length) return undefined;
  const value = pick(options, roll);
  if (!value.startsWith("Roll on ")) return value;
  return rollAsset(value.slice(8).toLowerCase(), taken, roll, [...visited, category]);
}

export function generateFactionProfile(roll, { place = "", interstellar = false, minimumSystem = false } = {}) {
  const type = rollPair(types, roll);
  const reachRoll = interstellar ? 100 : minimumSystem ? 80 + roll(15) : roll(95);
  const [, reach, assetCount] = reachTable.find(([end]) => reachRoll <= end);
  const temperamentRoll = roll(10);
  const temperament = temperamentRoll <= 2 ? 0 : temperamentRoll <= 8 ? 1 : 2;
  const motivation = pick(motivations[temperament], roll);
  const personality = [pick(traits[temperament], roll)];
  for (let index = 0; index < 2; index++) {
    const category = roll(10);
    const options = traits[category <= 3 ? 0 : category <= 7 ? 1 : 2];
    personality.push(pick(options.filter(value => !personality.includes(value)), roll));
  }
  const { name, surname } = rollNpcName(roll);
  const pronounRoll = roll(10);
  const pronouns = pronounRoll <= 3 ? "she/her" : pronounRoll <= 6 ? "he/him" : "they/them";
  const categories = [...new Set([...type.map(value => assetCategories[value.split("/")[0]] ?? "general"), "general"])];
  const specialAssets = [];
  for (let index = 0; index < assetCount; index++) {
    const value = rollAsset(pick(categories, roll), specialAssets, roll)
      ?? pick(Object.values(assets).flat().filter(item => !item.startsWith("Roll on ") && !specialAssets.includes(item)), roll);
    specialAssets.push(value);
  }
  return {
    type, reach, base: place, leader: { name, surname, pronouns, motivation, traits: personality },
    goal: `To ${goals[motivation]}`, assets: specialAssets, complications: rollPair(complications, roll),
  };
}

export function factionRows(profile, home) {
  const { type, reach, base, leader, goal, assets: specialAssets, complications } = profile;
  const location = home || base || "Unassigned";
  const leadership = `${leader.name} (${leader.pronouns}, ${leader.motivation}, ${leader.traits.join(", ")})`;
  return [
    ["Type", type.join(" / ")], ["Base", location], ["Reach", reach], ["Goal", goal],
    ["Leader", leadership], ["Special assets", specialAssets.join(" · ")], ["Complications", complications.join(" · ")],
  ];
}

export function factionNotation(name, profile, home) {
  const [, base, reach, goal, leader, specialAssets, complications] = factionRows(profile, home).map(([, value]) => value);
  return `${name.toUpperCase()}: ${profile.type.join(" / ")}, B ${base}, R ${reach}, G ${goal}, L ${leader}, A ${specialAssets}. ${complications}.`;
}
