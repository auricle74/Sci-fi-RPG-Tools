// The Perilous Void, pp. 51, 76–80.
const simpleForms = "Buds|Bulbs|Conidia|Coral|Cysts|Floaters|Fronds|Hydras|Jellies|Larvae|Lichens|Mosses|Mycelium|Nematodes|Polyps|Roots|Rotifers|Sponges|Spores|Tendrils|Thalli|Tubers|Vines|Worms|Zooids".split("|");
const simpleTraits = "Aerial|Amoeboid|Amphibious|Bioluminescent|Bipolar|Carnivorous|Chemosynthetic|Chitinous|Crystalline|Ectoparasitic|Endolithic|Exoskeletal|Gelatinous|Hermaphroditic|Hydrothermal|Larval|Mimetic|Mucilaginous|Mutagenic|Mutualistic|Parasitic|Photosynthetic|Protozoan|Sessile|Territorial".split("|");
const microbialForms = "Algae|Amoebas|Archaea|Bacteria|Bacteriophages|Biofilms|Ciliates|Cyanobacteria|Denitrifiers|Flagellates|Fungi|Hyphae|Lichens|Methanogens|Microbial mats|Moulds|Mycorrhizae|Nitrogen fixers|Plankton|Protists|Slime moulds|Sporozoans|Symbionts|Viruses|Yeast".split("|");

const forms = [
  [20, [10, 20, 40, 50, 60, 70, 80, 90, 100], "Ant or termite|Bee or wasp|Beetle or weevil|Butterfly or moth|Centipede or sowbug|Cockroach or silverfish|Cricket or grasshopper|Dragonfly or damselfly|Fly or gnat"],
  [35, [10, 20, 30, 40, 50, 60, 70, 80, 100], "Shrub|Radial flower|Tubular flower|Vine|Lichen or moss|Mushroom|Kelp|Cactus|Tree"],
  [50, [8, 16, 24, 32, 40, 48, 56, 64, 72, 84, 92, 100], "Barnacle|Clam or mussel|Crustacean|Dolphin or seal|Eel-shaped fish|Streamlined fish|Frog or toad|Jellyfish|Snail or slug|Squid or octopus|Turtle or alligator|Whale or orca"],
  [65, [8, 16, 24, 32, 40, 48, 56, 64, 72, 84, 92, 100], "Bat|Fowl|Corvid|Hummingbird|Parrot|Dove|Pterosaur|Raptor|Vulture|Waterfowl|Heron|Songbird"],
  [85, [8, 16, 24, 32, 40, 48, 56, 64, 72, 84, 92, 100], "Annelid|Bear or sloth|Cat|Canid|Lizard|Mustelid|Primate|Large herbivore|Rodent|Snake|Arachnid|Ungulate"],
  [90, [20, 40, 60, 80, 100], "Amorphous|Crystalloid|Gaseous|Lithoid|Plasmoid"],
];
const features = "Acidic or corrosive|Aquatic or amphibious|Bioluminescent|Burrowing|Chameleonic|Claws or talons|Disorienting|Electric or magnetic|Fast-moving|Floating|Mist-like|Hive mind|Horns or spikes|Long-lived|Mandibles or pincers|Metamorphic|Herd behaviour|Parasitic|Pseudopods|Extrasensory|Unusual sensitivity|Exoskeleton|Stinger or barbs|Symbiotic|Tails|Tentacles|Toxic or venomous|Ultrasonic call|Webs or traps|Wings or fins".split("|");
const details = "Antennae|Asymmetrical|Aura|Bulbs or pods|Colourful|Arched|Cybernetic|Elongated|Faceless|Plumage|Shimmering|Furry|Unsettling|Crested|Loud|Many-limbed|Metallic|Multi-headed|Stealthy|Ridges or plates|Bumpy|Segmented|Jagged|Sticky|Pungent|Smooth|Tendrils|Stunted|Translucent|Wet".split("|");
const species = "Amorphous|Amphibious|Aquatic|Arachnoid|Avian|Bovine|Canine|Chameleonic|Chitinous|Crustaceous|Crystal|Cyborg|Diminutive|Electric|Elephantine|Equine|Ethereal|Feline|Fiery|Fungoid|Gaseous|Giant|Icy|Insectoid|Lithoid|Lupine|Marsupioid|Molluscoid|Multicephalous|Multipedal|Nebulous|Necroid|Parasitic|Plantoid|Porcine|Prismatic|Reptilian|Robotic|Rodent-like|Serpentine|Shapeshifting|Silicoid|Synthetic|Tenebrous|Tentacled|Ursine".split("|");
const roles = "Architects|Artisans|Biotechnologists|Chameleons|Colonists|Conservators|Defenders|Diplomats|Engineers|Entertainers|Explorers|Guardians|Harbingers|Harvesters|Healers|Historians|Hunters|Illusionists|Industrialists|Infiltrators|Manipulators|Mercenaries|Merchants|Miners|Mystics|Navigators|Nobles|Nomads|Observers|Outcasts|Peacekeepers|Philosophers|Pilgrims|Psychics|Raiders|Sages|Schemers|Scholars|Scientists|Seers|Stewards|Technologists|Thieves|Traders|Warriors|Zealots".split("|");

function complexForm(result, roll) {
  if (result <= 5) return `Giant ${simpleTraits[roll(25) - 1].toLowerCase()} ${simpleForms[roll(25) - 1].toLowerCase()}`;
  if (result > 90) return `${complexForm(roll(90), roll)} / ${complexForm(roll(90), roll)} hybrid`;
  const [, limits, choices] = forms.find(([end]) => result <= end);
  const subtype = roll(100);
  return choices.split("|")[limits.findIndex(end => subtype <= end)];
}

function complexLifeform(result, roll) {
  const form = complexForm(result, roll);
  const feature = roll(100);
  const traits = feature > 90 ? [features[roll(30) - 1], features[roll(30) - 1]] :
    feature > 30 ? [features[Math.floor((feature - 31) / 2)]] : [];
  const detail = roll(100);
  traits.push(...(detail > 90 ? [details[roll(30) - 1], details[roll(30) - 1]] :
    [details[Math.floor((detail - 1) / 3)]]));
  const sizeRoll = roll(100);
  const size = [15, 35, 65, 85, 98, 100].findIndex(end => sizeRoll <= end);
  const quantityRoll = roll(100);
  const thresholds = [[5, 20, 50], [10, 30, 60], [20, 45, 70], [35, 60, 80], [50, 80, 95], [65, 85, 95]][size];
  const quantity = quantityRoll <= thresholds[0] ? 1 :
    roll(10) * (quantityRoll <= thresholds[1] ? 2 : quantityRoll <= thresholds[2] ? 10 : 100);
  return { level: "Complex", form, traits, size: ["Tiny", "Small", "Medium", "Large", "Huge", "Colossal"][size], quantity };
}

export const bearsLife = life => ["microbial", "simple", "complex", "advanced"].includes(life.toLowerCase());

function advancedLifeform(roll) {
  return { level: "Advanced", form: `${species[roll(46) - 1]} ${roles[roll(46) - 1]}`,
    traits: ["Indigenous civilisation capable of tool use and complex social organisation."] };
}

export function generateLifeforms(life, roll) {
  switch (life.toLowerCase()) {
    case "microbial":
      return [{ level: "Microbial", form: microbialForms[roll(25) - 1], traits: [] }];
    case "simple":
      return Array.from({ length: roll(2) }, () => ({
        level: "Simple", form: simpleForms[roll(25) - 1], traits: [simpleTraits[roll(25) - 1]],
      }));
    case "advanced":
    case "complex":
      return Array.from({ length: roll(3) + 2 }, (_, index) => {
        if (index === 0 && life.toLowerCase() === "advanced") return advancedLifeform(roll);
        const result = roll(100);
        return index === 0 && result >= 96 ? advancedLifeform(roll) : complexLifeform(Math.min(95, result), roll);
      });
    default:
      return [];
  }
}
