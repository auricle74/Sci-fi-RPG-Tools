import { assets } from "./faction-assets.mjs";

export const ratings = ["force", "cunning", "wealth"];
export const catalogue = new Map(assets.map(asset => [asset.name, asset]));
export const xpCosts = [0, 1, 2, 4, 6, 9, 12, 16, 20];
export const maxHp = faction => 4 + ratings.reduce((total, rating) => total + xpCosts[faction[rating]], 0);
export const income = faction => Math.ceil(faction.wealth / 2) + Math.floor((faction.force + faction.cunning) / 4);

export function newAsset(template, location, id) {
  return { id, name: template.name, location, hp: template.hp, maxHp: template.hp, stealth: false, missed: 0 };
}

export function syncFactions(sector, locations) {
  const manager = sector.factionManager ??= { factions: [], history: [] };
  const known = new Set(manager.factions.map(faction => faction.sourceId));
  for (const society of sector.societies ?? []) {
    if (known.has(society.id)) {
      manager.factions.find(faction => faction.sourceId === society.id).name = society.name;
      continue;
    }
    const profile = society.faction ?? {};
    const scale = /sector|interstellar/i.test(profile.reach) ? 4 : /system|planet|global|nation/i.test(profile.reach) ? 3 : 2;
    const character = [...(profile.type ?? []), society.politics ?? ""].join(" ");
    const focus = /military|security|war|mercenar/i.test(character) ? "force" :
      /commercial|industrial|corporate|trade|wealth/i.test(character) ? "wealth" : "cunning";
    const homes = locations.filter(place => place.systemId === society.homeSystemId);
    const linked = locations.filter(place => place.societyIds?.includes(society.id) || place.societyId === society.id);
    const home = homes.find(place => linked.includes(place)) ??
      (homes.length === 1 ? homes[0] : linked.length === 1 ? linked[0] : undefined);
    const faction = { id: society.id, sourceId: society.id, name: society.name, force: scale - 1,
      cunning: scale - 1, wealth: scale - 1, credits: scale, xp: 0, home: home?.id ?? "",
      tags: focus === "force" ? "Warlike" : focus === "wealth" ? "Plutocratic" : "Secretive",
      goal: profile.goal ?? "", assets: [] };
    faction[focus] = scale;
    faction.hp = maxHp(faction);
    if (home) {
      faction.assets.push(newAsset({ name: "Base of Influence", hp: faction.hp }, home.id, `${faction.id}-base`));
      const starters = assets.filter(asset => asset.rating === focus && asset.hp && asset.tier <= scale &&
        asset.tech <= (home.tech ?? 0) && !asset.notes.includes("P") && !/starship|spaceship/i.test(asset.type));
      const starter = starters.sort((a, b) => b.tier - a.tier)[0];
      if (starter) faction.assets.push(newAsset(starter, home.id, `${faction.id}-starter`));
    }
    manager.factions.push(faction);
    known.add(society.id);
  }
  return manager;
}

function active(asset, round) {
  return asset.hp > 0 && !asset.missed && !(asset.ready > round);
}

function damage(expression, roll) {
  const match = expression?.match(/(\d+)d(\d+)([+-]\d+)?/i);
  if (!match) return 0;
  const [, count, sides, bonus = "0"] = match;
  return Math.max(0, Array.from({ length: Number(count) }, () => roll(Number(sides)))
    .reduce((sum, value) => sum + value, Number(bonus)));
}

export function choicesFor(faction, factions, locations, round) {
  const choices = [{ type: "Pass", label: "Pass" }];
  const owned = faction.assets.filter(asset => active(asset, round));
  for (const asset of owned) {
    const template = catalogue.get(asset.name);
    if (template?.attack.match(/(Force|Cunning|Wealth) vs\.? (Force|Cunning|Wealth).*\d+d\d+/i)) {
      for (const rival of factions.filter(candidate => candidate.id !== faction.id && candidate.hp > 0)) {
        for (const target of rival.assets.filter(target => target.location === asset.location && !target.stealth && active(target, round))) {
          choices.push({ type: "Attack", asset: asset.id, rival: rival.id, target: target.id,
            label: `Attack ${rival.name} · ${target.name} with ${asset.name}` });
        }
      }
    }
    if (faction.credits && asset.hp < asset.maxHp && template && faction[template.rating] >= template.tier) {
      choices.push({ type: "Repair Asset", asset: asset.id, label: `Repair ${asset.name}` });
    }
    if (["Harvesters", "Pretech Manufactory", "Postech Industry"].includes(asset.name)) {
      choices.push({ type: "Use Asset Ability", asset: asset.id, label: `Use ${asset.name}` });
    }
    if (template) choices.push({ type: "Sell Asset", asset: asset.id, label: `Sell ${asset.name}` });
  }
  if (faction.credits && faction.hp < maxHp(faction)) choices.push({ type: "Repair Faction", label: "Repair faction" });
  for (const place of locations) {
    const base = faction.assets.find(asset => asset.location === place.id && asset.name === "Base of Influence" && asset.hp > 0);
    if (!base && owned.some(asset => asset.location === place.id) && faction.credits &&
      !factions.some(rival => rival.id !== faction.id && rival.assets.some(asset => asset.location === place.id && active(asset, round)))) {
      choices.push({ type: "Expand Influence", location: place.id, label: `Establish a base · ${place.name}` });
    }
    if (place.id !== faction.home && !(base && active(base, round))) continue;
    if (place.tech === undefined) continue;
    for (const template of assets) {
      if (!template.hp || template.tech > place.tech || template.cost > faction.credits ||
        template.tier > faction[template.rating] || template.notes.includes("P") ||
        (/starship|spaceship/i.test(template.type) && !(place.population >= 300000)) ||
        faction.assets.filter(asset => catalogue.get(asset.name)?.rating === template.rating && asset.hp > 0).length >= faction[template.rating]) continue;
      choices.push({ type: "Buy Asset", name: template.name, location: place.id, label: `Buy ${template.name} · ${place.name}` });
    }
  }
  for (const rating of ratings) {
    const next = faction[rating] + 1;
    if (next <= 8 && xpCosts[next] <= faction.xp) choices.push({ type: "Raise Rating", rating, label: `Raise ${rating}` });
  }
  return choices;
}

function hurt(faction, asset, value) {
  const loss = Math.min(asset.hp, value);
  asset.hp -= loss;
  if (asset.name === "Base of Influence") faction.hp = Math.max(0, faction.hp - loss);
  return loss;
}

const upkeep = new Map([["Mercenaries", 1], ["Pretech Researchers", 1]]);
const priority = (choice, faction) => {
  const goal = faction.goal.toLowerCase();
  if (choice.type === "Attack") return /war|attack|destroy|conquest|enemy/i.test(goal) ? 9 : 5;
  return { "Raise Rating": 10, "Repair Faction": 8, "Repair Asset": 7, "Expand Influence": 5, "Buy Asset": 4, "Use Asset Ability": 3, "Pass": 1 }[choice.type] ?? 0;
};

export function simulateRound(baseline, locations, round, order, overrides, rollFor) {
  const factions = structuredClone(baseline);
  const entries = [];
  for (const id of order) {
    const faction = factions.find(candidate => candidate.id === id);
    if (!faction || faction.hp <= 0) continue;
    const override = overrides[id] ?? {};
    const roll = rollFor(id);
    const earned = override.income ?? income(faction);
    faction.credits += earned;
    let paid = 0;
    for (const asset of faction.assets) {
      if (!asset.hp) continue;
      const cost = override.upkeep?.[asset.id] ?? upkeep.get(asset.name) ?? 0;
      if (cost > faction.credits) {
        asset.missed += 1;
        if (asset.missed >= 2) asset.hp = 0;
      } else {
        asset.missed = 0;
        faction.credits -= cost;
        paid += cost;
      }
    }
    const choices = choicesFor(faction, factions, locations, round);
    const best = choices.reduce((score, choice) => Math.max(score, priority(choice, faction)), 0);
    const preferred = choices.filter(choice => priority(choice, faction) === best);
    const defaultChoice = preferred[roll(preferred.length) - 1];
    const chosen = choices.find(choice => JSON.stringify(choice) === override.action);
    const action = chosen ?? defaultChoice;
    const asset = faction.assets.find(item => item.id === action.asset);
    const template = catalogue.get(asset?.name ?? action.name);
    const lines = [];
    if (action.type === "Attack") {
      const rival = factions.find(candidate => candidate.id === action.rival);
      const target = rival.assets.find(item => item.id === action.target);
      const [, attack, defend] = template.attack.match(/(Force|Cunning|Wealth) vs\.? (Force|Cunning|Wealth)/i);
      const attackRoll = override.attackRoll ?? roll(10);
      const defenceRoll = override.defenceRoll ?? roll(10);
      const margin = attackRoll + faction[attack.toLowerCase()] - defenceRoll - rival[defend.toLowerCase()];
      lines.push(`Attack roll ${attackRoll}, defence roll ${defenceRoll}.`);
      if (margin >= 0) lines.push(`${target.name} took ${hurt(rival, target, damage(template.attack, roll))} damage.`);
      if (margin <= 0) lines.push(`${asset.name} took ${hurt(faction, asset, damage(catalogue.get(target.name)?.counter, roll))} counterattack damage.`);
    } else if (action.type === "Expand Influence") {
      faction.credits -= 1;
      faction.assets.push({ ...newAsset({ name: "Base of Influence", hp: 1 }, action.location, `${id}-base-${round}`), ready: round + 1 });
    } else if (action.type === "Use Asset Ability") {
      const die = roll(asset.name === "Pretech Manufactory" ? 8 : 6);
      const gained = asset.name === "Harvesters" ? Number(die >= 3) :
        asset.name === "Pretech Manufactory" ? Math.ceil(die / 2) : die === 1 ? -1 : die < 5 ? 1 : 2;
      if (faction.credits + gained < 0) {
        asset.hp = 0;
        lines.push("Postech Industry was lost because its shortfall could not be paid.");
      } else {
        faction.credits += gained;
        lines.push(`Asset roll ${die} · FacCred change ${gained}.`);
      }
    } else if (action.type === "Buy Asset") {
      faction.credits -= template.cost;
      faction.assets.push({ ...newAsset(template, action.location, `${id}-round-${round}`), ready: round + 1 });
    } else if (action.type === "Sell Asset") {
      faction.credits += Math.floor(template.cost / 2);
      faction.assets = faction.assets.filter(item => item !== asset);
    } else if (action.type === "Repair Asset") {
      faction.credits -= 1;
      asset.hp = Math.min(asset.maxHp, asset.hp + faction[template.rating]);
    } else if (action.type === "Repair Faction") {
      faction.credits -= 1;
      const values = ratings.map(rating => faction[rating]);
      faction.hp = Math.min(maxHp(faction), faction.hp + Math.round((Math.max(...values) + Math.min(...values)) / 2));
    } else if (action.type === "Raise Rating") {
      faction.xp -= xpCosts[++faction[action.rating]];
    }
    for (const field of ["credits", "hp", "xp"]) {
      if (override[field] !== undefined) faction[field] = override[field];
    }
    if (override.note) lines.push(override.note);
    entries.push({ id, faction: faction.name, earned, paid, action: action.label, type: action.type, lines, choices, covert: Boolean(asset?.stealth || template?.notes.includes("S")),
      overrides: Object.fromEntries(Object.entries(override).filter(([, value]) => value !== undefined && value !== "")),
      invalidOverride: Boolean(override.action && !chosen) });
  }
  return { factions, entries };
}
