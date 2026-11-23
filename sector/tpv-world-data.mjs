// Climate tables, pp. 56–60. Each row gives resources, water, density, composition and life.
export const climateTables = [
  [
    [40, "Barren", [["negligible", "none", "none", "carbon dioxide", "none"], ["poor", "none", "none", "methane", "none"], ["average", "none", "thin", "sulfur dioxide", "none"], ["rich", "minimal", "medium", "exotic gas", "microbial"]]],
    [80, "Frozen", [["negligible", "moderate", "none", "carbon dioxide", "none"], ["poor", "plentiful", "thin", "methane", "none"], ["average", "plentiful", "medium", "sulfur dioxide", "none"], ["rich", "maximal", "dense", "exotic gas", "microbial"]]],
    [95, "Metallic", [["poor", "none", "none", "carbon dioxide", "none"], ["average", "none", "none", "methane", "none"], ["rich", "none", "thin", "hydrogen-helium", "none"], ["ultra-rich", "minimal", "medium", "exotic gas", "microbial"]]],
  ],
  [
    [20, "Barren", [["negligible", "none", "none", "nitrogen-methane", "none"], ["poor", "none", "thin", "carbon dioxide", "none"], ["average", "minimal", "medium", "nitrogen", "none"], ["rich", "moderate", "dense", "exotic gas", "microbial"]]],
    [50, "Frozen", [["negligible", "moderate", "thin", "nitrogen", "none"], ["poor", "plentiful", "medium", "carbon dioxide", "none"], ["average", "plentiful", "dense", "nitrogen-methane", "none"], ["rich", "maximal", "superdense", "exotic gas", "microbial"]]],
    [65, "Arid", [["negligible", "none", "thin", "carbon dioxide", "none"], ["poor", "none", "medium", "methane", "none"], ["average", "minimal", "medium", "sulfur dioxide", "none"], ["rich", "moderate", "dense", "exotic gas", "microbial"]]],
    [80, "Oceanic", [["poor", "plentiful", "medium", "carbon dioxide", "none"], ["average", "maximal", "medium", "nitrogen", "microbial"], ["rich", "maximal", "dense", "oxygen-nitrogen", "simple"], ["ultra-rich", "maximal", "superdense", "exotic gas", "complex"]]],
    [90, "Volcanic", [["poor", "none", "thin", "carbon dioxide", "none"], ["average", "none", "medium", "sulfur dioxide", "none"], ["rich", "minimal", "dense", "nitrogen-methane", "microbial"], ["ultra-rich", "moderate", "superdense", "exotic gas", "simple"]]],
    [95, "Metallic", [["poor", "none", "none", "carbon dioxide", "none"], ["average", "none", "thin", "nitrogen-methane", "none"], ["rich", "minimal", "medium", "methane", "none"], ["ultra-rich", "moderate", "dense", "exotic gas", "none"]]],
  ],
  [
    [10, "Barren", [["negligible", "none", "none", "carbon dioxide", "none"], ["poor", "none", "thin", "nitrogen", "none"], ["average", "none", "medium", "sulfur dioxide", "none"], ["rich", "minimal", "dense", "exotic gas", "microbial"]]],
    [25, "Arid", [["negligible", "none", "thin", "carbon dioxide", "none"], ["poor", "minimal", "medium", "nitrogen", "none"], ["average", "minimal", "medium", "hydrogen", "microbial"], ["rich", "moderate", "dense", "exotic gas", "simple"]]],
    [40, "Oceanic", [["poor", "plentiful", "medium", "nitrogen-oxygen", "microbial"], ["average", "maximal", "medium", "carbon dioxide", "simple"], ["rich", "maximal", "dense", "nitrogen-methane", "complex"], ["ultra-rich", "maximal", "dense", "exotic gas", "complex"]]],
    [60, "Arboreal", [["poor", "moderate", "medium", "nitrogen-oxygen", "simple"], ["average", "moderate", "medium", "nitrogen", "complex"], ["rich", "plentiful", "dense", "carbon dioxide", "complex"], ["ultra-rich", "plentiful", "superdense", "exotic gas", "complex"]]],
    [85, "Earthlike", [["average", "moderate", "medium", "nitrogen-oxygen", "simple"], ["average", "moderate", "medium", "nitrogen-oxygen", "complex"], ["rich", "plentiful", "dense", "nitrogen-oxygen", "complex"], ["ultra-rich", "plentiful", "superdense", "nitrogen", "complex"]]],
    [90, "Volcanic", [["poor", "none", "thin", "carbon dioxide", "none"], ["average", "none", "medium", "sulfur dioxide", "microbial"], ["rich", "minimal", "dense", "nitrogen", "simple"], ["ultra-rich", "moderate", "dense", "exotic gas", "complex"]]],
    [95, "Metallic", [["poor", "none", "none", "carbon dioxide", "none"], ["average", "none", "thin", "nitrogen-methane", "none"], ["rich", "minimal", "medium", "methane", "none"], ["ultra-rich", "moderate", "dense", "exotic gas", "microbial"]]],
  ],
  [
    [20, "Barren", [["negligible", "none", "none", "carbon dioxide", "none"], ["poor", "none", "thin", "nitrogen", "none"], ["average", "none", "medium", "sulfur dioxide", "none"], ["rich", "minimal", "dense", "exotic gas", "microbial"]]],
    [45, "Arid", [["negligible", "none", "thin", "carbon dioxide", "none"], ["poor", "none", "medium", "nitrogen", "none"], ["average", "none", "dense", "sulfur dioxide", "microbial"], ["rich", "minimal", "superdense", "exotic gas", "microbial"]]],
    [60, "Oceanic", [["poor", "plentiful", "thin", "nitrogen", "none"], ["average", "maximal", "medium", "carbon dioxide", "none"], ["rich", "maximal", "medium", "oxygen", "microbial"], ["ultra-rich", "maximal", "dense", "water vapor", "simple"]]],
    [70, "Arboreal", [["average", "moderate", "medium", "nitrogen-oxygen", "simple"], ["average", "moderate", "medium", "oxygen", "complex"], ["rich", "plentiful", "dense", "carbon dioxide", "complex"], ["ultra-rich", "plentiful", "superdense", "methane", "complex"]]],
    [90, "Volcanic", [["poor", "none", "thin", "sulfur dioxide", "none"], ["average", "none", "medium", "carbon dioxide", "none"], ["rich", "none", "dense", "nitrogen-methane", "none"], ["ultra-rich", "minimal", "superdense", "exotic gas", "microbial"]]],
    [95, "Metallic", [["poor", "none", "none", "carbon dioxide", "none"], ["average", "none", "thin", "sulfur dioxide", "none"], ["rich", "none", "medium", "methane", "none"], ["ultra-rich", "minimal", "dense", "exotic gas", "microbial"]]],
  ],
  [
    [40, "Barren", [["negligible", "none", "none", "carbon dioxide", "none"], ["poor", "none", "none", "sulfur dioxide", "none"], ["average", "none", "thin", "nitrogen", "none"], ["rich", "minimal", "medium", "exotic gas", "microbial"]]],
    [65, "Arid", [["negligible", "none", "none", "carbon dioxide", "none"], ["poor", "none", "thin", "sulfur dioxide", "none"], ["average", "none", "thin", "nitrogen-methane", "none"], ["rich", "minimal", "medium", "exotic gas", "microbial"]]],
    [90, "Volcanic", [["poor", "none", "thin", "sulfur dioxide", "none"], ["average", "none", "thin", "carbon dioxide", "none"], ["rich", "none", "thin", "nitrogen-methane", "none"], ["ultra-rich", "minimal", "medium", "exotic gas", "microbial"]]],
    [95, "Metallic", [["poor", "none", "none", "carbon dioxide", "none"], ["average", "none", "none", "sulfur dioxide", "none"], ["rich", "none", "none", "metal vapor", "none"], ["ultra-rich", "minimal", "thin", "exotic gas", "microbial"]]],
  ],
];

// Surface feature pairs, pp. 64–71. The two columns are rolled independently.
export const surfaces = {
  Barren: [["Ash", "Basins"], ["Barren", "Canyons"], ["Black", "Caverns"], ["Bright", "Caves"], ["Broken", "Chasms"], ["Chaotic", "Cliffs"], ["Cratered", "Craters"], ["Crystal", "Crevasses"], ["Dune", "Fields"], ["Dust", "Fissures"], ["Eroded", "Flats"], ["Gaseous", "Formations"], ["Geometric", "Fumaroles"], ["Labyrinthine", "Geysers"], ["Magnetic", "Hills"], ["Massive", "Mountains"], ["Ominous", "Patterns"], ["Orderly", "Peaks"], ["Pitted", "Pits"], ["Reflective", "Plains"], ["Rocky", "Plateaus"], ["Sand", "Ridges"], ["Scarred", "Riverbeds"], ["Scorched", "Seas"], ["Sepulchral", "Spires"], ["Sharp", "Storms"], ["Shimmering", "Tubes"], ["Umbral", "Valleys"], ["Vast", "Vents"], ["Volcanic", "Waste"], ["Warped", "Zones"]],
  Frozen: [["Black", "Arches"], ["Blue", "Canals"], ["Bright", "Canyons"], ["Broken", "Caverns"], ["Chaotic", "Caves"], ["Cloudy", "Cliffs"], ["Crystal", "Cracks"], ["Desolate", "Craters"], ["Frost", "Crevasses"], ["Frozen", "Dunes"], ["Gaseous", "Fissures"], ["Geometric", "Floes"], ["Glasslike", "Formations"], ["Ice", "Glaciers"], ["Jagged", "Highlands"], ["Labyrinthine", "Hills"], ["Luminescent", "Lakes"], ["Magnetic", "Mountains"], ["Massive", "Peaks"], ["Polished", "Pits"], ["Reflective", "Plains"], ["Sharp", "Plateaus"], ["Silver", "Plates"], ["Snowy", "Ranges"], ["Tiered", "Ridges"], ["Translucent", "Riverbeds"], ["Transparent", "Seas"], ["Vast", "Shards"], ["Vertical", "Spires"], ["Volcanic", "Valleys"], ["White", "Wasteland"]],
  Arid: [["Bright", "Badlands"], ["Broken", "Barrens"], ["Clouded", "Basins"], ["Cold", "Canals"], ["Colorful", "Canyons"], ["Cracked", "Caverns"], ["Crystal", "Caves"], ["Dark", "Cliffs"], ["Drifting", "Craters"], ["Dry", "Desert"], ["Dusty", "Dunes"], ["Electric", "Fissures"], ["Eroded", "Flats"], ["Gaseous", "Formations"], ["Glassy", "Fumaroles"], ["Magnetic", "Geysers"], ["Massive", "Hills"], ["Petrified", "Hollows"], ["Pitted", "Mesas"], ["Rocky", "Mountains"], ["Salt", "Plains"], ["Sand", "Plateaus"], ["Scarred", "Ridges"], ["Scoured", "Riverbeds"], ["Searing", "Sandstorms"], ["Shifting", "Seas"], ["Subsurface", "Sinkholes"], ["Umbral", "Spires"], ["Vast", "Storms"], ["Volcanic", "Wasteland"], ["Winding", "Zones"]],
  Oceanic: [["Abyssal", "Archipelagos"], ["Algae", "Atolls"], ["Bioluminescent", "Beaches"], ["Bright", "Canyons"], ["Corrosive", "Caverns"], ["Crystal", "Caves"], ["Dark", "Cliffs"], ["Dead", "Crevasses"], ["Deep", "Currents"], ["Deep-sea", "Floes"], ["Floating", "Forests"], ["Gaseous", "Hurricanes"], ["Hidden", "Islands"], ["Ice", "Mats"], ["Iridescent", "Mountains"], ["Living", "Plains"], ["Magnetic", "Pools"], ["Massive", "Reefs"], ["Shifting", "Ridges"], ["Shrouded", "Shallows"], ["Spiral", "Shoals"], ["Stormy", "Storms"], ["Striated", "Tides"], ["Subsurface", "Trenches"], ["Sucking", "Tubes"], ["Swirling", "Tunnels"], ["Toxic", "Vents"], ["Turbulent", "Waterspouts"], ["Underwater", "Wetlands"], ["Vast", "Whirlpools"], ["Volcanic", "Zones"]],
  Arboreal: [["Abundant", "Arches"], ["Bioluminescent", "Bridges"], ["Blossoming", "Carpets"], ["Bright", "Caves"], ["Clouded", "Cliffs"], ["Colorful", "Fields"], ["Crystal", "Flora"], ["Dark", "Forests"], ["Decaying", "Fungi"], ["Dense", "Glades"], ["Distorted", "Growths"], ["Eerie", "Hills"], ["Enormous", "Jungles"], ["Fern", "Marshes"], ["Floating", "Meadows"], ["Flowering", "Mosses"], ["Fruiting", "Mountains"], ["Fungal", "Mushrooms"], ["Gaseous", "Networks"], ["Gigantic", "Nodes"], ["Lush", "Orchards"], ["Majestic", "Rivers"], ["Meandering", "Roots"], ["Poisonous", "Scrublands"], ["Shrouded", "Swamps"], ["Singing", "Thickets"], ["Tangled", "Trees"], ["Towering", "Undergrowth"], ["Twisted", "Waterways"], ["Vast", "Wetlands"], ["Verdant", "Woodlands"]],
  Earthlike: [["Abundant", "Beaches"], ["Arid", "Canyons"], ["Bright", "Cliffs"], ["Cold", "Coastlines"], ["Colorful", "Craters"], ["Crystal", "Deltas"], ["Dark", "Deserts"], ["Deep", "Forests"], ["Dense", "Glaciers"], ["Diverse", "Grasslands"], ["Expansive", "Highlands"], ["Floating", "Hills"], ["Gaseous", "Islands"], ["Geometric", "Jungles"], ["Hot", "Lakes"], ["Lush", "Lowlands"], ["Rocky", "Mountains"], ["Rugged", "Oases"], ["Sandy", "Oceans"], ["Scattered", "Peaks"], ["Serene", "Plains"], ["Shifting", "Reefs"], ["Shrouded", "Ridges"], ["Snowy", "Rivers"], ["Steaming", "Ruins"], ["Tiered", "Seas"], ["Towering", "Swamps"], ["Vast", "Tundra"], ["Verdant", "Valleys"], ["Volcanic", "Wetlands"], ["Winding", "Woodlands"]],
  Volcanic: [["Ash", "Barrens"], ["Black", "Basins"], ["Boiling", "Calderas"], ["Bright", "Canals"], ["Broken", "Canyons"], ["Charred", "Caverns"], ["Cracked", "Cliffs"], ["Crystal", "Cones"], ["Cyclopean", "Craters"], ["Dry", "Crevasses"], ["Dust", "Deserts"], ["Ember", "Domes"], ["Flaming", "Fissures"], ["Gaseous", "Flats"], ["Glassy", "Formations"], ["Hot", "Fumeroles"], ["Infernal", "Geysers"], ["Jagged", "Lakes"], ["Lava", "Mountains"], ["Magnetic", "Networks"], ["Molten", "Peaks"], ["Obsidian", "Pillars"], ["Pumice", "Plains"], ["Pyroclastic", "Plateaus"], ["Sharp", "Ranges"], ["Shimmering", "Rivers"], ["Smoking", "Seas"], ["Smoldering", "Spires"], ["Vast", "Storms"], ["Volatile", "Tunnels"], ["Volcanic", "Wastes"]],
  Metallic: [["Alloyed", "Barrens"], ["Blinding", "Basins"], ["Bright", "Canyons"], ["Broken", "Caverns"], ["Crystal", "Chasms"], ["Dark", "Cliffs"], ["Deep", "Craters"], ["Dust", "Crevasses"], ["Exposed", "Deserts"], ["Ferrous", "Dunes"], ["Ferrous", "Fissures"], ["Gaseous", "Flats"], ["Geometric", "Flats"], ["Gleaming", "Formations"], ["Glinting", "Highlands"], ["Iridescent", "Hills"], ["Lustrous", "Lowlands"], ["Metallic", "Mesas"], ["Polished", "Mountains"], ["Polychromatic", "Networks"], ["Reflective", "Peaks"], ["Resonant", "Plains"], ["Shallow", "Plateaus"], ["Sharp", "Plates"], ["Shimmering", "Ridges"], ["Shining", "Spires"], ["Silvered", "Storms"], ["Silvered", "Terraces"], ["Striated", "Tunnels"], ["Tiered", "Undulations"], ["Vast", "Valleys"]],
};

// Community profile prompts, p. 102.
export const communityProfile = [
  ["Aggression/war", "Austere/spare", "DISASTER (opposite)"],
  ["Balance/imbalance", "Bleak/stark", "THREAT (opposite)"],
  ["Biology/genetics", "Complex/intricate", "SHORTAGE (opposite)"],
  ["Chaos", "Concealed/obscured", "Black market"],
  ["Death/dissolution", "Domes/spheres", "Cult presence"],
  ["Degradation/collapse", "Elegant/graceful", "Culture clash"],
  ["Despair/pessimism", "Floating/suspended", "Decay/degradation"],
  ["Environmentalism", "Hulking/blocky", "Discovery/revelation"],
  ["Exploration/discovery", "Mobile/transitory", "Environmental decay"],
  ["Foresight/memory", "Modular/extensible", "Faction rivalry/feud"],
  ["Hope/optimism", "Multi-level/tiered", "Gang/criminal activity"],
  ["Invention/innovation", "Nestled/cradled", "Hostility/malice"],
  ["Life/growth", "Organic/living", "Ideological conflict"],
  ["Memory/identity", "Overgrown/lush", "Instability/vulnerability"],
  ["Power/control", "Polluted/contaminated", "Invasive species"],
  ["Reality/perception", "Precarious/unsafe", "Lockdown/quarantine"],
  ["Rebellion/resistance", "Ramshackle/crude", "Misunderstanding"],
  ["Redemption", "Rustic/antiquated", "Mutation/change"],
  ["Secrecy/conspiracy", "Scenic/beautiful", "Political turmoil"],
  ["Strife/struggle", "Sprawling", "Religious tension"],
  ["Success/victory", "Subsurface/deep", "Smuggling/illicit trade"],
  ["Survival/subsistence", "Towering/looming", "Social strife/inequality"],
  ["Technology/machinery", "Tubes/tunnels", "Strike/walkout"],
  ["Time/history", "Unfinished/incomplete", "Systems malfunction"],
];

export const hazards = {
  Barren: ["Avalanches", "Cosmic radiation", "Extreme temperature swings", "Geomagnetic anomalies", "Labyrinthine landscape", "Radioactive hotspots", "Sandstorms/dust storms", "Seismic activity", "Solar flares", "Toxic/corrosive dust"],
  Frozen: ["Avalanches", "Blizzards/ice storms", "Crevasses", "Frostbite", "Frozen equipment", "Hypothermia", "Navigational interference", "Sinkholes", "Thin/unstable ice", "Whiteouts"],
  Arid: ["Dune collapse", "Dust vortices", "Extreme heat", "Flash floods", "Storms/Sandstorms", "Scorching ground", "Sinkholes", "Sudden temperature drops", "Sunburn/sunstroke", "Thirsty predators"],
  Oceanic: ["Aquatic megafauna", "Entangling vegetation", "Impenetrable fog/mist", "Powerful currents", "Storms/hurricanes", "Sunless deep-sea zones", "Tidal waves", "Toxic algae blooms", "Volcanic activity", "Waterspouts/whirlpools"],
  Arboreal: ["Carnivorous flora", "Entangling flora", "Invisible pathogens", "Parasitic flora", "Parasitic fungus", "Quicksand", "Soporific flora", "Swarming insects", "Toxic flora", "Unstable canopies"],
  Earthlike: ["Storms", "Flooding", "Seismic activity", "Wildfires", "Hazardous terrain", "Disease/infection", "Poisonous flora", "Predatory megafauna", "Predatory carnivores", "Volcanic activity"],
  Volcanic: ["Acidic lakes", "Ashfall", "Boiling mud pits", "Lava flows", "Pyroclastic clouds", "Seismic activity", "Steam vents", "Sulfur dioxide fog", "Toxic gas pockets", "Volcanic activity"],
  Metallic: ["Electromagnetic storms", "Extreme temperature fluctuations", "Geomagnetic anomalies", "Magnetic interference", "Magnetized dust clouds", "Metallic dust storms", "Metallic hail", "Radiation spikes", "Radioactive hotspots", "Sinkholes"],
};

export const adaptations = {
  Barren: ["Aeroplankton/dust", "Camouflage/mimicry", "Cryptobiosis", "Flock/hive/swarm", "Fossorial/burrowing", "Panspermia", "Photosynthesis", "Radiation resistance", "Thermal regulation", "Toxin immunity"],
  Frozen: ["Antifreeze biochemistry", "Camouflage/mimicry", "Cold resistance", "Cryoactive metabolism", "Cryptobiosis/hibernation", "Fossorial/burrowing", "Radiotrophy", "Sledding/sliding locomotion", "Symbiosis", "Temperature sensitvity"],
  Arid: ["Camouflage/mimicry", "Drought resistance", "Fossorial/burrowing", "Heat resistance", "Hibernation", "Hyper-efficient metabolism", "Moisture extraction", "Nocturnal", "Sand-surfing", "Thermoregulation"],
  Oceanic: ["Amphibian respiration", "Antifreeze blood", "Bioluminescence", "Camouflage/mimicry", "Echolocation", "Electric defense/communication", "Pressure resistance", "Regeneration", "Symbiosis", "Transparency"],
  Arboreal: ["Camouflage/mimicry", "Flock/hive/swarm", "Gas sacs", "Grasping appendages/claws", "Infravision", "Lightweight skeleton", "Poison resistance", "Prehensile limbs/tendrils/tail", "Symbiosis", "Wings/patagia"],
  Earthlike: ["Bipedal locomotion", "Camouflage/mimicry", "Cooperation", "Endothermic metabolism", "Flock/hive/swarm", "Hibernation", "Omnivorous", "Opposable digits", "Regeneration", "Symbiosis"],
  Volcanic: ["Chemical communication", "Cryptobiosis/hibernation", "Fossorial/burrowing", "Lithivore", "Heat shield/resistance", "Moisture extraction", "Sulfur metabolism", "Symbiosis", "Thermal vision", "Thermoregulation"],
  Metallic: ["Cryptobiosis/hibernation", "Echolocation/blindsight", "Electrical conductivity", "Electromagnet shield", "Heat shield/resistance", "Magnetic levitation", "Magnetic sensitivity", "Metallic exoskeleton", "Metallivore", "Sledding/sliding locomotion"],
};
