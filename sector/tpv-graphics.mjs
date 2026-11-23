// Illustrative colours for the diagram, including a neutral palette for airless worlds.
const atmospheres = {
  "carbon dioxide": "#d99864", "methane": "#a65e46", "nitrogen": "#719bd4",
  "nitrogen-methane": "#63b8ab", "nitrogen-oxygen": "#4d9bd8", "oxygen-nitrogen": "#4d9bd8",
  "oxygen": "#518eed", "sulfur dioxide": "#d8c765", "hydrogen": "#98b8e8",
  "hydrogen-helium": "#aec0e7", "water vapor": "#a5cecf", "metal vapor": "#a8a7c3",
  "ammonia": "#d5b785", "chlorine-rich": "#a5b95a", "fluorine": "#9cceea",
  "hydrogen-sulfide": "#bec66d", "krypton-methane": "#748ac1", "neon-nitrogen": "#ba89c8",
  "nitrous oxide": "#9b83d4", "silane-rich": "#e4ac7d", "xenon-helium": "#9c95c4",
};

export function orbitalAppearance(body) {
  // A populated surface still belongs to a world, even in saves where its kind is "station".
  const worlds = body.development?.worlds ?? [];
  const world = /space station|orbital outpost/i.test(body.type ?? "")
    ? undefined
    : worlds.find(world => world.classification === "planet") ?? worlds[0];
  const kind = world?.classification ?? body.kind;
  const size = (world?.size ?? body.size)?.toLowerCase() ?? "standard";
  const colour = world && (world.atmosphere === "none" ? "#9b9790" : atmospheres[world.composition.toLowerCase()]);
  const features = world ? world.notes : body.features ?? [];
  const rings = features.reduce((count, feature) => {
    const number = feature.match(/^(\d+) rings$/i);
    return Math.max(count, number ? Number(number[1]) : /^ringed$/i.test(feature) ? 1 : 0);
  }, 0);
  return { kind, size, colour, rings };
}
