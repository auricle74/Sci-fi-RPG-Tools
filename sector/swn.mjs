const tags = [
  "Abandoned Colony",
  "Alien Ruins",
  "Altered Humanity",
  "Anarchists",
  "Anthropomorphs",
  "Area 51",
  "Badlands World",
  "Battleground",
  "Beastmasters",
  "Bubble Cities",
  "Cheap Life",
  "Civil War",
  "Cold War",
  "Colonized Population",
  "Cultural Power",
  "Cybercommunists",
  "Cyborgs",
  "Cyclical Doom",
  "Desert World",
  "Doomed World",
  "Dying Race",
  "Eugenic Cult",
  "Exchange Consulate",
  "Fallen Hegemon",
  "Feral World",
  "Flying Cities",
  "Forbidden Tech",
  "Former Warriors",
  "Freak Geology",
  "Freak Weather",
  "Friendly Foe",
  "Gold Rush",
  "Great Work",
  "Hatred",
  "Heavy Industry",
  "Heavy Mining",
  "Hivemind",
  "Holy War",
  "Hostile Biosphere",
  "Hostile Space",
  "Immortals",
  "Local Specialty",
  "Local Tech",
  "Major Spaceyard",
  "Mandarinate",
  "Mandate Base",
  "Maneaters",
  "Megacorps",
  "Mercenaries",
  "Minimal Contact",
  "Misandry/Misogyny",
  "Night World",
  "Nomads",
  "Oceanic World",
  "Out of Contact",
  "Outpost World",
  "Perimeter Agency",
  "Pilgrimage Site",
  "Pleasure World",
  "Police State",
  "Post-Scarcity",
  "Preceptor Archive",
  "Pretech Cultists",
  "Primitive Aliens",
  "Prison Planet",
  "Psionics Academy",
  "Psionics Fear",
  "Psionics Worship",
  "Quarantined World",
  "Radioactive World",
  "Refugees",
  "Regional Hegemon",
  "Restrictive Laws",
  "Revanchists",
  "Revolutionaries",
  "Rigid Culture",
  "Rising Hegemon",
  "Ritual Combat",
  "Robots",
  "Seagoing Cities",
  "Sealed Menace",
  "Secret Masters",
  "Sectarians",
  "Seismic Instability",
  "Shackled World",
  "Societal Despair",
  "Sole Supplier",
  "Taboo Treasure",
  "Terraform Failure",
  "Theocracy",
  "Tomb World",
  "Trade Hub",
  "Tyranny",
  "Unbraked AI",
  "Urbanized Surface",
  "Utopia",
  "Warlords",
  "Xenophiles",
  "Xenophobes",
  "Zombies"
];

// Stars Without Number Revised Deluxe, printed pages 160, 162, 164, 166 and 168.
const tables = {
  Atmosphere: [[2, "Corrosive"], [3, "Inert gas"], [4, "Airless or thin"], [9, "Breathable"], [10, "Thick"], [11, "Invasive"], [12, "Corrosive and invasive"]],
  Temperature: [[2, "Frozen"], [3, "Cold"], [5, "Variable cold"], [8, "Temperate"], [10, "Variable warm"], [11, "Warm"], [12, "Burning"]],
  Biosphere: [[2, "Remnant biosphere"], [3, "Microbial life"], [5, "No native biosphere"], [8, "Human-miscible biosphere"], [10, "Immiscible biosphere"], [11, "Hybrid biosphere"], [12, "Engineered biosphere"]],
  Population: [[2, "Failed colony"], [3, "Outpost"], [5, "Fewer than a million"], [8, "Several million"], [10, "Hundreds of millions"], [11, "Billions"], [12, "Alien inhabitants"]],
  "Tech level": [[2, "TL0"], [3, "TL1"], [5, "TL2"], [8, "TL4"], [10, "TL3"], [11, "TL4+"], [12, "TL5"]],
};

export function starCount(width, height, policy, d10) {
  const area = width * height;
  const count = policy === "scaled" ? Math.round((20 + d10) * area / 80) : 20 + d10;
  return Math.min(area, Math.max(1, count));
}

// Zero-based odd-column offset coordinates, matching the editor's stagger.
function distance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - (b.x >> 1) - a.y + (a.x >> 1);
  return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dx + dy));
}

export function placeStars(width, height, count, initialCount, roll) {
  const cells = Array.from({ length: width * height }, (_, i) => ({
    x: Math.floor(i / height), y: i % height,
  }));
  const free = new Set(cells);
  const stars = [];
  const parents = new Map();
  const at = (x, y) => x >= 0 && x < width && y >= 0 && y < height ? cells[x * height + y] : undefined;
  const boundary = ({x, y}) => Math.min(x, y, width - 1 - x, height - 1 - y);
  const root = (cell) => {
    while (parents.get(cell) !== cell) cell = parents.get(cell);
    return cell;
  };
  let groups = 0;

  function add(cell) {
    free.delete(cell);
    parents.set(cell, cell);
    groups += 1;
    for (const other of stars) {
      if (distance(cell, other) > 3) continue;
      const group = root(other);
      if (group === cell) continue;
      parents.set(group, cell);
      groups -= 1;
    }
    stars.push(cell);
  }

  function bridge() {
    let best;
    let most = 1;
    for (const candidate of free) {
      const nearby = new Set();
      for (let x = candidate.x - 3; x <= candidate.x + 3; x += 1) {
        for (let y = candidate.y - 3; y <= candidate.y + 3; y += 1) {
          const other = at(x, y);
          if (parents.has(other) && distance(candidate, other) <= 3) nearby.add(root(other));
        }
      }
      if (nearby.size > most) {
        most = nearby.size;
        best = candidate;
      }
      if (most === groups) break;
    }
    return best;
  }

  function randomPlacement() {
    const rolled = at(roll(width) - 1, roll(height) - 1);
    if (free.has(rolled)) return rolled;
    let best;
    let nearest = Infinity;
    for (const candidate of free) {
      const gap = distance(rolled, candidate);
      if (gap < nearest || (gap === nearest && boundary(candidate) < boundary(best))) {
        best = candidate;
        nearest = gap;
      }
    }
    return best;
  }

  while (stars.length < count) {
    const connection = stars.length >= initialCount && groups > 1 ? bridge() : undefined;
    add(connection ?? randomPlacement());
  }
  return stars.map(({x,y}) => ({ column: x + 1, row: y + 1 }));
}

export function rollWorld(roll) {
  const first = roll(100) - 1;
  const second = roll(99) - 1;
  const profile = Object.fromEntries(Object.entries(tables).map(([field, bands]) => {
    const total = roll(6) + roll(6);
    return [field, bands.find(([upper]) => total <= upper)[1]];
  }));
  return { tags: [tags[first], tags[second < first ? second : second + 1]], profile };
}

export function generateSystems(sector, policy, roll, makeId) {
  const { width, height } = sector.grid;
  const count = starCount(width, height, policy, roll(10));
  const initialCount = policy === "scaled" ? Math.max(1, Math.round(width * height / 4)) : 20;
  return placeStars(width, height, count, initialCount, roll).map(({column, row}) => {
    const prefix = ["Aster", "Cinder", "Dawn", "Ember", "Iris", "Lumen", "Meridian", "Vesper"][roll(8) - 1];
    const suffix = ["Reach", "Vale", "Haven", "Spur", "Drift", "Crown", "Gate", "Deep"][roll(8) - 1];
    const code = String(column).padStart(2, "0") + String(row).padStart(2, "0");
    const { tags, profile } = rollWorld(roll);
    return {
      id: makeId(), column, row, name: prefix + " " + suffix + " " + code,
      ruleset: { ...sector.ruleset },
      mainWorld: {
        id: makeId(), name: prefix + suffix.toLowerCase(), ruleset: { ...sector.ruleset },
        tags, profile, description: `A world marked by ${tags[0].toLowerCase()} and ${tags[1].toLowerCase()}.`,
      },
    };
  });
}
