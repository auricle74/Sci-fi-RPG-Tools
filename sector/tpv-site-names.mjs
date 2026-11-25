import { rollNpcName, rollNpcSurname } from "./tpv-npc-names.mjs";
import { adjectives, nouns, structures } from "./tpv-faction-tables.mjs";

// TPV settlement and district naming tables, pp. 162–165.
const qualities = [
  "Acceptance", "Air", "Anguish", "Awe", "Balance",
  "Beauty", "Belief", "Belonging", "Birth", "Bliss",
  "Calm", "Chaos", "Comfort", "Courage", "Creation",
  "Darkness", "Dawn", "Death", "Denial", "Desolation",
  "Despair", "Destiny", "Destruction", "Devotion", "Discovery",
  "Dismay", "Dream", "Dusk", "Earth", "Enlightenment",
  "Fate", "Fear", "Fire", "Fortune", "Freedom",
  "Fury", "Grief", "Growth", "Harmony", "Harvest",
  "Heart", "Honor", "Hope", "Isolation", "Joy",
  "Justice", "Knowledge", "Legacy", "Life", "Light",
  "Loss", "Love", "Mercy", "Moon", "Music",
  "Mystery", "Order", "Patience", "Peace", "Power",
  "Promise", "Prophecy", "Prospect", "Protection", "Providence",
  "Rage", "Rain", "Rebirth", "Redemption", "Refusal",
  "Regret", "Renewal", "Restoration", "Resurrection", "Reverence",
  "Reverie", "Sacrifice", "Serenity", "Sight", "Solitude",
  "Sorrow", "Strength", "Sun", "Thunder", "Time",
  "Tranquility", "Transformation", "Triumph", "Truth", "Unity",
  "Victory", "Vision", "War", "Water", "Wind",
  "Wisdom", "Wonder", "Worry", "Wrath", "Zeal",
];

const modifiers = [
  "Amber", "Arisen", "Ascendant", "Ashen", "Azure",
  "Black", "Blessed", "Blossom", "Blue", "Bright",
  "Broken", "Certain", "Clear", "Close", "Clouded",
  "Cold", "Crystal", "Dark", "Deep", "Doubtful",
  "East", "Echo", "Eternal", "Fallen", "False",
  "Far", "Fire", "Flowering", "Forgotten", "Forsaken",
  "Free", "Gas", "Gold", "Great", "Green",
  "Hidden", "High", "Holy", "Ice", "Lone",
  "Lost", "Low", "Loyal", "Lunar", "Mist",
  "Moon", "Moonlit", "Near", "New", "North",
  "Old", "Open", "Peaceful", "Quiet", "Radiant",
  "Reborn", "Red", "Rocky", "Sea", "Serene",
  "Shady", "Shallow", "Sharp", "Shining", "Silver",
  "Sky", "Smoke", "Soft", "Solar", "South",
  "Star", "Starlit", "Stellar", "Strong", "Sun",
  "Sunny", "Tranquil", "True", "United", "West",
  "White", "Yellow", "[NPC Name]", "[NPC Name]", "[NPC Name]",
  "[NPC Name]", "[NPC Name]", "[NPC Name]", "[NPC Name]", "[NPC Name]",
  "[NPC Surname]", "[NPC Surname]", "[NPC Surname]", "[NPC Surname]", "[NPC Surname]",
  "[NPC Surname]", "[NPC Surname]", "[NPC Surname]", "[NPC Surname]", "[NPC Surname]",
];

const forms = [
  "Apex", "Ascent", "Base", "Bastion", "Bed",
  "Bottom", "Branch", "Bridge", "Camp", "Chasm",
  "Circle", "Citadel", "Cloud", "Cluster", "Coast",
  "Colony", "Conclave", "Corner", "Crack", "Cradle",
  "Crater", "Creche", "Crest", "Cross", "Crossing",
  "Dawn", "Depot", "Dig", "Domain", "Echo",
  "Enclave", "End", "Exchange", "Fist", "Forge",
  "Fort", "Fortress", "Fount", "Garden", "Garrison",
  "Haven", "Hole", "Hollow", "Home", "Horizon",
  "Hub", "Junction", "Keep", "Labyrinth", "Market",
  "Mill", "Monument", "Nest", "Nexus", "Oasis",
  "Outland", "Outpost", "Peak", "Perch", "Pit",
  "Platform", "Pocket", "Port", "Post", "Prison",
  "Reach", "Redoubt", "Respite", "Ridge", "Ring",
  "Rise", "River", "Roost", "Root", "Ruin",
  "Sanctuary", "Sanctuary", "Sector", "Settlement", "Shaft",
  "Shield", "Shoal", "Shrine", "Source", "Spire",
  "Springs", "Stage", "Stand", "Station", "Strand",
  "Stronghold", "Summit", "Sword", "Terminal", "Tower",
  "Township", "Valley", "Wall", "Water", "Well",
];

const pick = (values, roll) => values[roll(values.length) - 1];

export function rollSiteName(roll) {
  const template = roll(100);
  const quality = () => pick(qualities, roll);
  const form = () => pick(forms, roll);
  const optionalThe = () => roll(2) === 1 ? "The " : "";
  const modifier = (table = modifiers) => {
    const value = pick(table, roll);
    if (value === "[NPC Name]") return rollNpcName(roll).name;
    if (value.startsWith("[")) return rollNpcSurname(roll);
    return value;
  };

  if (template <= 15) return quality();
  if (template <= 30) return `${modifier()} ${quality()}`;
  if (template <= 45) return `${quality()}’s ${form()}`;
  if (template <= 60) return `${form()} ${roll(10) + roll(10) + roll(10)}`;
  if (template <= 75) return `${optionalThe()}${modifier()} ${form()}`;
  if (template <= 90) return `${form()} of ${roll(2) === 1 ? "the " : ""}${modifier()}`;
  if (template <= 95) return `${optionalThe()}${form()} of ${quality()}`;
  const noun = pick(nouns, roll);
  const resolvedNoun = noun.includes("/") ? pick(noun.split("/"), roll) :
    noun.replace(/\((s|es)\)/, (_, ending) => roll(2) === 1 ? "" : ending);
  return `${pick(structures, roll)} of the ${modifier(adjectives)} ${resolvedNoun}`;
}
