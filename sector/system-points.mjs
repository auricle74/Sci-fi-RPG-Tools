// SWN Revised Deluxe, pp. 170–171. Each entry pairs a type with five
// occupant results and five situation results, each covering two d10 faces.
const points = [
  {
    type: "Deep-space station",
    occupants: ["Unsettling transhumans", "Ancient preserved bodies", "Covert military watchers", "An eccentric magnate and entourage", "A brilliant, unstable researcher"],
    situations: ["Station equipment is failing", "An outside power is trying to sabotage the station", "The wealthy trade illicit goods here", "Hazardous pretech is locked away here", "Pirates replenish their supplies here"],
  },
  {
    type: "Asteroid base",
    occupants: ["Fervent religious devotees", "Defeated insurgents from another planet", "Exploited company miners", "Freelance rock prospectors", "Raiders operating behind a cover story"],
    situations: ["The crew may lose life support", "The outpost must relocate to another rock", "Mining exposed a dangerous discovery", "A nearby asteroid settlement is at war with the base", "Miners found an immensely valuable ore deposit"],
  },
  {
    type: "Remote moon base",
    occupants: ["A corporate science team beset by bad luck", "A gifted researcher living in isolation", "The survivors of an unsuccessful settlement", "A military surveillance crew", "Isolated supervisors and automated miners"],
    situations: ["An ominous presence has stirred", "A criminal group is attempting a takeover", "A disease is spreading across the base", "Essential supplies are running out", "The base is wealthy and lightly defended"],
  },
  {
    type: "Ancient orbital ruin",
    occupants: ["Machines whose self-awareness is uncertain", "Salvagers quick to open fire", "A state-sponsored science team", "Troops enforcing a quarantine", "Descendants of the aliens who built the ruin"],
    situations: ["The occupants are trying to keep the ruin dormant", "Someone is experimenting with unfamiliar devices", "A technological disaster is imminent", "An appalling discovery has come to light", "The occupants are repelling intruders"],
  },
  {
    type: "Research base",
    occupants: ["Runaway experimental subjects", "Researchers from a powerful local company", "Scientists running a covert state programme", "Undercover agents on a foreign payroll", "Alien researchers observing local humans"],
    situations: ["The work poses immediate dangers", "The experiments are appallingly unethical", "Intruders are holding the occupants captive", "Experimental creatures are loose and destructive", "Someone is trading illicit technology"],
  },
  {
    type: "Asteroid belt",
    occupants: ["Veteran miners from the belt", "Old autonomous defence drones", "People who escaped a wrecked asteroid outpost", "Raiding crews concealed among the asteroids", "An isolated military patrol crew"],
    situations: ["A broken asteroid let something dangerous out", "An outside power hides surveillance vessels here", "A mineral discovery has drawn a rush of prospectors", "Several asteroids bear ancient structures", "Rival asteroid settlements are fighting"],
  },
  {
    type: "Gas giant mine",
    occupants: ["Oppressed workers bound to the mine", "Unusual machines and their supervisors", "Researchers investigating native alien organisms", "Salvagers combing a derelict mine", "A separatist movement with few resources"],
    situations: ["Something is rising from deeper in the atmosphere", "The mine urgently needs resupply", "The miners have risen against their masters", "Raiders use the mine as a covert fuel stop", "Someone discovered traces of alien habitation"],
  },
  {
    type: "Refuelling station",
    occupants: ["An unstable caretaker living alone", "Operators selling extravagant indulgences", "Company employees who squeeze visitors for money", "Missionaries preaching to passing crews", "Unthinking automated shopkeepers"],
    situations: ["A vessel needs urgent help", "Raiders have seized the station", "Customs officers are on the take", "Saboteurs from another power are at work", "A signal of alien origin is coming from deep space"],
  },
];

export function rollSystemPoint(name, roll, makeId) {
  const { type, occupants, situations } = points[roll(8) - 1];
  const occupant = occupants[Math.floor((roll(10) - 1) / 2)];
  const situation = situations[Math.floor((roll(10) - 1) / 2)];
  return {
    id: makeId(),
    name,
    type,
    description: `Occupants: ${occupant}.\nSituation: ${situation}.`,
  };
}
