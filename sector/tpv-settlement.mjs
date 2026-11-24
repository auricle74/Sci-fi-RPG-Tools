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

const arrivals = [
  [
    (person, place) => `An emergency announcement sends arrivals to the ${place}. ${person} is asking for help checking who is still missing.`,
    (person, place) => `You arrive during a pause in the emergency response. At the ${place}, ${person} needs someone to check whether the next shift can safely return.`,
  ],
  [
    (person, place) => `Two groups give you conflicting instructions on arrival. ${person} asks you to hear both accounts at the ${place} before taking sides.`,
    (person, place) => `A routine handover has turned into an argument at the ${place}. ${person} asks you to check what the previous shift reported.`,
  ],
  [
    (person, place) => `The shortage has brought a queue to the ${place}. ${person} asks you to find out why the latest allocation came up short.`,
    (person, place) => `Your arrival coincides with a resupply delay. At the ${place}, ${person} is looking for someone who can verify what actually arrived.`,
  ],
];

export function developSettlement(centre, roll) {
  const category = roll(10);
  const problemType = category <= 2 ? 0 : category <= 5 ? 1 : 2;
  const problem = pick(problems[problemType], roll);
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
  const arrival = pick(arrivals[problemType], roll)(people[1].name, second.toLowerCase());
  return { problem, places, people, arrival };
}

const siteAreas = [
  ["Access point", "A reception alcove", "An outer passage"],
  ["Operations area", "A work bay", "A crew room"],
  ["Service annex", "An equipment store", "A records alcove"],
];
const siteObstacles = [
  "The attendant will admit visitors only if a resident vouches for them.",
  "A temporary closure forces visitors to wait or negotiate another way in.",
  "A crowd is blocking the way and refuses to move until someone hears its complaint.",
];
const siteDiscoveries = [
  "The duty log shows who was on site when the problem was first reported.",
  "A discarded message points to someone who raised concerns before the official report.",
  "A handwritten correction contradicts the timeline in the public notice.",
];

export function developSite(settlement, roll) {
  const [entrance, interior, annex] = siteAreas.map(options => pick(options, roll));
  const contact = settlement.people.length ? pick(settlement.people, roll).name : "A member of the local crew";
  // One middle room creates a connected plan. Some sites also have a shortcut.
  const middle = roll(3);
  const loop = roll(4) === 1;
  const connections = [1, 2, 3].map(room =>
    [1, 2, 3].filter(other => other !== room && (loop || room === middle || other === middle)));
  return [
    { name: entrance, occupant: "An attendant on duty", obstacle: pick(siteObstacles, roll), discovery: "", connects: connections[0] },
    { name: interior, occupant: contact, obstacle: "The crew will talk once someone takes over their immediate duties.",
      discovery: `The crew can explain how the settlement’s problem affects this location. Current problem: ${settlement.problem}.`,
      connects: connections[1] },
    { name: annex, occupant: "A worker finishing their shift", obstacle: "Access depends on persuading the worker to stay.",
      discovery: pick(siteDiscoveries, roll), connects: connections[2] },
  ];
}
