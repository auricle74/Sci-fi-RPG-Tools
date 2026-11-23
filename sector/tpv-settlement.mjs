import { rollName } from "./swn.mjs";

// Adapted from TPV's community problems, settlement locations and inhabitants (pp. 103–109).
const problems = [
  ["Power failure", "Structural collapse", "Contaminated water", "Fire in the habitat", "Solar storm"],
  ["Bribery and extortion", "Rival contractors", "A leadership dispute", "A spreading infestation", "Sabotage"],
  ["Medical supplies running low", "Fuel shortage", "Missing replacement parts", "Food rationing", "Habitation shortage"],
];

const locations = {
  Outpost: ["Supply bay", "Telemetry room", "Emergency shelter", "Field equipment shed"],
  Station: ["Docking ring", "Observation deck", "Trade concourse", "Maintenance level"],
  Colony: ["Transit hub", "Hydroponics sector", "Trading hall", "Medical complex"],
};

const purposeSites = {
  "Resupply Depot": "Fuel processing bay",
  "Mining Outpost": "Excavation control",
  "Communications Relay": "Communications array",
  "Weather Station": "Sensor array",
  "Research Outpost": "Specimen laboratory",
  "Military Outpost": "Watch post",
  Shipyard: "Fabrication bay",
  Prison: "Detention level",
};

const roles = {
  Outpost: ["Quartermaster", "Field technician"],
  Station: ["Dockmaster", "Maintenance engineer"],
  Colony: ["Settlement administrator", "Transit coordinator"],
};

const pick = (entries, roll) => entries[roll(entries.length) - 1];

export function developSettlement(centre, roll) {
  const category = roll(10);
  const problem = pick(problems[category <= 2 ? 0 : category <= 5 ? 1 : 2], roll);
  const type = Object.hasOwn(locations, centre.type) ? centre.type : "Outpost";
  const available = [...new Set([
    ...locations[type], ...centre.purposes.map(purpose => purposeSites[purpose]).filter(Boolean),
  ])];
  const first = available.splice(roll(available.length) - 1, 1)[0];
  const second = available.splice(roll(available.length) - 1, 1)[0];
  const places = [
    { name: first, detail: "Residents are gathering here to demand answers." },
    { name: second, detail: "The last shift left behind a record that contradicts the official account." },
  ];
  const names = new Set();
  const people = roles[type].map((role, index) => ({
    name: rollName(roll, names),
    role,
    motive: index === 0 ? "Keep essential services running and avoid a public panic." :
      "Get an independent witness to check the last shift’s account.",
  }));
  const arrival = `As you arrive, ${people[1].name} asks you to meet at the ${second.toLowerCase()} before the next shift. At the ${first.toLowerCase()}, word of the problem is already spreading.`;
  return { problem, places, people, arrival };
}
