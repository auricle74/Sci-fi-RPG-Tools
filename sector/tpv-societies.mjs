// TPV political structure by tech level, p. 90. Bounds are inclusive.
const governments = [
  [[20, 10, 5, 5, 5, 5], "Eco-Commune"],
  [[45, 20, 10, 10, 10, 8], "Nomadic Confederation"],
  [[70, 30, 20, 15, 15, 11], "Isolationist Enclave"],
  [[90, 45, 25, 20, 20, 16], "Communalism"],
  [[95, 50, 30, 25, 25, 18], "Elder Council"],
  [[0, 65, 35, 30, 30, 21], "Feudalism"],
  [[0, 75, 40, 35, 35, 26], "Gyno/Poly/Andrarchy"],
  [[0, 85, 45, 40, 40, 31], "Meritocracy"],
  [[0, 95, 50, 45, 45, 33], "Theocracy"],
  [[0, 0, 60, 50, 50, 38], "Guildocracy"],
  [[0, 0, 70, 55, 55, 41], "Syndicalist Federation"],
  [[0, 0, 75, 61, 60, 46], "Plutocracy"],
  [[0, 0, 80, 66, 65, 51], "Representative Democracy"],
  [[0, 0, 85, 71, 70, 53], "Totalitarian Regime"],
  [[0, 0, 95, 77, 75, 58], "Corporatocracy"],
  [[0, 0, 0, 83, 80, 66], "Technocracy"],
  [[0, 0, 0, 89, 85, 74], "Genocracy"],
  [[0, 0, 0, 95, 90, 82], "AIgorithmic Autocracy"],
  [[0, 0, 0, 0, 95, 90], "AI Dominion"],
  [[100, 100, 100, 100, 100, 95], "Roll twice and combine"],
  [[0, 0, 0, 0, 0, 100], "Post-Scarcity Utopia"],
];

const conditions = ["Abandoned", "Nascent", "Struggling", "Threatened", "Booming",
  "Stable", "Overtaxed", "Breaking", "Collapsing", "Post-Collapse"];
const bounds = {
  Core: [5, 10, 15, 25, 30, 75, 85, 95, 98, 100],
  Frontier: [10, 20, 35, 50, 65, 80, 85, 90, 95, 100],
  Wild: [20, 30, 55, 85, 95, 100],
};

export function generateSociety({ id, name, status, indigenous = false, minimumTech = 0, roll }) {
  const techBounds = [10, 25, 45, 70, 99, 100];
  const excluded = techBounds[minimumTech - 1] ?? 0;
  const techRoll = excluded + roll(100 - excluded);
  const tech = techBounds.findIndex(limit => techRoll <= limit);
  const conditionRoll = roll(100);
  const condition = (bounds[indigenous ? "Core" : status] ?? bounds.Wild).findIndex(limit => conditionRoll <= limit);
  const die = () => roll(10);
  const area = [() => 0, () => 1, die, () => die() + die(),
    () => die() + die() + die() + die() + die(), () => die() * 2 + 40,
    () => die() * 4 + 40, () => die() * 4 + 40, () => die() * 6 + 40, () => die() + 5][condition]();
  const politicalRoll = roll(100);
  const government = value => governments.find(([limits]) => value <= limits[tech])[1];
  const politics = (government(politicalRoll) === "Roll twice and combine"
    ? [...new Set([government(roll(tech === 5 ? 90 : 95)), government(roll(tech === 5 ? 90 : 95))])]
    : [government(politicalRoll)]).join(" / ");
  return { id, name, tech, condition: conditions[condition], area, politics };
}
