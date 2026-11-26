import { assets } from "./faction-assets.mjs";
import { catalogue, income, maxHp, newAsset, ratings, simulateRound, syncFactions } from "./faction-turns.mjs";

function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(text, action) {
  const result = node("button", text);
  result.type = "button";
  result.onclick = action;
  return result;
}

function field(parent, label, value, update, limits) {
  const input = node(label === "Sector news" ? "textarea" : "input");
  if (limits) {
    input.type = "number";
    [input.min, input.max] = limits;
    input.step = "1";
  }
  input.value = value ?? "";
  input.onchange = () => {
    if (!input.reportValidity()) return;
    update(limits ? (input.value === "" ? undefined : input.valueAsNumber) : input.value);
  };
  const wrapper = node("label", label);
  wrapper.append(input);
  parent.append(wrapper);
  return input;
}

function select(parent, label, options, current, update) {
  const input = node("select");
  for (const [value, text] of options) input.add(new Option(text, value));
  input.value = current;
  input.onchange = () => update(input.value);
  const wrapper = node("label", label);
  wrapper.append(input);
  parent.append(wrapper);
  return input;
}

const locationOptions = locations => [["", "Choose a location"], ...locations.map(location => [location.id, location.name])];

function sectorLocations(sector) {
  const societies = new Map((sector.societies ?? []).map(society => [society.id, society]));
  return sector.systems.flatMap(system => {
    const hex = String(system.column).padStart(2, "0") + String(system.row).padStart(2, "0");
    if (system.mainWorld) {
      const world = system.mainWorld;
      return [{ id: world.id, systemId: system.id, name: `${world.name} · ${hex}`,
        tech: Number(world.profile?.["Tech level"]?.match(/\d+/)?.[0] ?? NaN) || (world.profile?.["Tech level"] === "TL0" ? 0 : undefined),
        population: /several million|hundreds of millions|billions/i.test(world.profile?.Population) ? 1000000 : undefined }];
    }
    return (system.satellites ?? []).flatMap((body, index) => {
      const data = body.development;
      if (!data?.worlds?.length && !data?.centre) return [];
      const societyIds = [data.centre?.societyId, ...(data.worlds ?? []).map(world => world.societyId)].filter(Boolean);
      const societyId = data.centre?.societyId ?? data.worlds?.find(world => world.societyId)?.societyId;
      return [{ id: body.id ?? `${system.id}:${body.band}:${body.name}:${index}`, systemId: system.id,
        name: `${body.name} · ${system.name} ${hex}`, societyId, societyIds, tech: societies.get(societyId)?.tech,
        population: data.centre?.population }];
    });
  });
}

function seeded(seed) {
  let state = seed;
  return sides => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return 1 + Math.floor(state / 4294967296 * sides);
  };
}

export function renderFactionManager(profile, inspector, sector, save, back, roll) {
  const locations = sectorLocations(sector);
  const manager = syncFactions(sector, locations);
  save();
  let selected = manager.factions.find(faction => faction.sourceId)?.id ?? manager.factions[0]?.id;
  let tab = "Faction Editor";
  let draft;
  const heading = node("h2", "Faction Manager");
  heading.tabIndex = -1;

  function render() {
    const nav = node("nav");
    nav.className = "faction-controls";
    nav.append(button("Sector Chart", back));
    for (const name of ["Faction Editor", "Faction Turns"]) {
      const control = button(name, () => { tab = name; render(); });
      control.setAttribute("aria-pressed", tab === name);
      nav.append(control);
    }
    const content = node("section");
    content.className = "faction-manager";
    profile.replaceChildren(heading, nav, content);
    inspector.replaceChildren();
    if (tab === "Faction Editor") editor(content);
    else turns(content);
  }

  function editor(content) {
    content.append(node("h3", "Faction Editor"));
    if (draft) {
      content.append(node("p", "Resolve or discard the draft before editing the roster."));
      return;
    }
    content.append(button("Add Faction", () => {
      const faction = { id: crypto.randomUUID(), name: "New faction", force: 1, cunning: 1, wealth: 1,
        credits: 0, xp: 0, hp: 7, home: "", tags: "", goal: "", assets: [] };
      manager.factions.push(faction);
      selected = faction.id;
      save();
      render();
    }));
    if (!manager.factions.length) {
      content.append(node("p", "No factions in this sector yet."));
      return;
    }
    const roster = node("div");
    roster.className = "faction-controls";
    roster.setAttribute("role", "group");
    roster.setAttribute("aria-label", "Sector factions");
    for (const faction of manager.factions) {
      const control = button(faction.name, () => { selected = faction.id; render(); });
      control.setAttribute("aria-pressed", faction.id === selected);
      roster.append(control);
    }
    content.append(roster);
    select(content, "Faction", manager.factions.map(faction => [faction.id, faction.name]), selected,
      id => { selected = id; render(); });
    const faction = manager.factions.find(item => item.id === selected);
    const form = node("div");
    form.className = "faction-form";
    content.append(form);
    const statistics = node("p");
    const updateStatistics = () => { statistics.textContent = `Maximum HP ${maxHp(faction)} · Income ${income(faction)} FacCreds`; };
    const edit = (label, key, limits) => field(form, label, faction[key], value => {
      if (value === undefined || (key === "name" && !value.trim())) return;
      faction[key] = value;
      if (key === "name" && faction.sourceId) {
        const source = sector.societies?.find(society => society.id === faction.sourceId);
        if (source) source.name = value;
      }
      save();
      updateStatistics();
    }, limits);
    edit("Name", "name");
    for (const rating of ratings) edit(rating[0].toUpperCase() + rating.slice(1), rating, [1, 8]);
    edit("Hit points", "hp", [0, 999]);
    edit("FacCreds", "credits", [0, 999999]);
    edit("Experience", "xp", [0, 999999]);
    edit("Tags", "tags");
    edit("Goal", "goal");
    select(form, "Homeworld", locationOptions(locations), faction.home, id => {
      faction.home = id;
      if (id && !faction.assets.some(asset => asset.name === "Base of Influence" && asset.location === id)) {
        faction.assets.push(newAsset({ name: "Base of Influence", hp: maxHp(faction) }, id, crypto.randomUUID()));
      }
      save();
      render();
    });
    updateStatistics();
    inspector.append(node("h3", faction.name), statistics);
    const source = sector.societies?.find(society => society.id === faction.sourceId)?.faction;
    if (source) inspector.append(node("p", `TPV profile · ${source.reach} · ${source.type.join(" / ")}`),
      node("p", `TPV special assets · ${source.assets.join(", ")}`));
    const home = locations.find(location => location.id === faction.home);
    if (!home) inspector.append(node("p", "Choose a homeworld to complete this faction."));
    if (home && !faction.assets.length) inspector.append(node("p", "Assign starting assets to this faction."));
    content.append(node("h3", "Assets"));
    for (const asset of faction.assets) {
      const template = catalogue.get(asset.name);
      const row = node("details");
      row.append(node("summary", `${asset.name} · ${asset.hp}/${asset.maxHp} HP`));
      if (template) row.append(node("p", `${template.type} · TL ${template.tech} · ${template.cost} FacCreds`),
        node("p", `Attack ${template.attack} · Counter ${template.counter}`));
      select(row, "Asset location", locationOptions(locations), asset.location, value => { asset.location = value; save(); });
      field(row, "Asset HP", asset.hp, value => { if (value !== undefined) { asset.hp = value; save(); render(); } }, [0, asset.maxHp]);
      select(row, "Visibility", [["visible", "Visible"], ["stealth", "Stealthed"]], asset.stealth ? "stealth" : "visible",
        value => { asset.stealth = value === "stealth"; save(); });
      row.append(button("Remove Asset", () => {
        if (!confirm(`Remove ${asset.name}?`)) return;
        faction.assets = faction.assets.filter(item => item !== asset);
        save();
        render();
      }));
      content.append(row);
    }
    const add = node("div");
    add.className = "faction-form";
    const templatePicker = select(add, "Asset type", [["Base of Influence", "Base of Influence"],
      ...assets.filter(asset => asset.hp).map(asset => [asset.name, `${asset.name} · ${asset.rating} ${asset.tier}`])], "Base of Influence", () => {});
    const placePicker = select(add, "Location for new asset", locationOptions(locations), faction.home, () => {});
    const status = node("p");
    add.append(button("Add Asset", () => {
      if (!placePicker.value) { status.textContent = "Choose an asset location."; return; }
      const template = catalogue.get(templatePicker.value) ?? { name: "Base of Influence", hp: maxHp(faction) };
      faction.assets.push(newAsset(template, placePicker.value, crypto.randomUUID()));
      save();
      render();
    }), status);
    content.append(add);
  }

  function turns(content) {
    content.append(node("h3", "Faction Turns"));
    if (!draft) {
      const active = manager.factions.filter(faction => faction.hp > 0);
      const advance = button("Advance Faction Turn", () => {
        const start = roll(active.length) - 1;
        const order = [...active.slice(start), ...active.slice(0, start)].map(faction => faction.id);
        draft = { order, seed: roll(2 ** 32) - 1, overrides: Object.create(null) };
        render();
      });
      advance.disabled = !active.length;
      content.append(advance);
      if (!active.length) content.append(node("p", "Add an active faction in the Faction Editor to begin."));
    } else {
      const round = manager.history.length + 1;
      const result = simulateRound(manager.factions, locations, round, draft.order, draft.overrides,
        id => seeded(draft.seed ^ manager.factions.findIndex(faction => faction.id === id)));
      const generatedNews = result.entries.filter(entry => entry.type === "Attack" && !entry.covert)
        .map(entry => `Reports of tensions involving ${entry.faction} have reached sector news services.`).join("\n");
      const news = draft.news ?? generatedNews;
      content.append(node("h4", `Round ${round} preview`));
      select(content, "First faction", draft.order.map(id => [id, manager.factions.find(faction => faction.id === id).name]),
        draft.order[0], id => {
          const start = draft.order.indexOf(id);
          draft.order = [...draft.order.slice(start), ...draft.order.slice(0, start)];
          render();
        });
      for (const entry of result.entries) {
        const override = draft.overrides[entry.id] ??= {};
        const card = node("details");
        card.append(node("summary", `${entry.faction} · ${entry.action}`),
          node("p", `Income ${entry.earned} · Upkeep ${entry.paid}`));
        for (const line of entry.lines) card.append(node("p", line));
        if (entry.invalidOverride) card.append(node("p", "The overridden action is unavailable. Choose another action or return to automatic selection."));
        const controls = node("div");
        controls.className = "faction-form";
        const overrideField = (label, key, limits) => field(controls, label, override[key], value => {
          override[key] = value;
          if (limits) refreshCard(entry.id);
        }, limits);
        select(controls, "Action override", [["", "Automatic"], ...entry.choices.map(choice => [JSON.stringify(choice), choice.label])],
          override.action ?? "", value => { override.action = value; refreshCard(entry.id); });
        overrideField("Income override", "income", [0, 999999]);
        for (const asset of manager.factions.find(faction => faction.id === entry.id).assets) {
          field(controls, `Upkeep override for ${asset.name}`, override.upkeep?.[asset.id], value => {
            (override.upkeep ??= {})[asset.id] = value;
            refreshCard(entry.id);
          }, [0, 999999]);
        }
        overrideField("Attack d10 override", "attackRoll", [1, 10]);
        overrideField("Defence d10 override", "defenceRoll", [1, 10]);
        overrideField("Ending FacCreds override", "credits", [0, 999999]);
        overrideField("Ending HP override", "hp", [0, 999]);
        overrideField("Ending XP override", "xp", [0, 999999]);
        overrideField("GM note", "note");
        card.dataset.faction = entry.id;
        card.append(controls);
        content.append(card);
      }
      field(content, "Sector news", news, value => { draft.news = value; });
      const commit = button("Resolve and Save", () => {
        const final = simulateRound(manager.factions, locations, round, draft.order, draft.overrides,
          id => seeded(draft.seed ^ manager.factions.findIndex(faction => faction.id === id)));
        manager.factions = final.factions;
        manager.history.push({ round, news: draft.news ?? news, entries: final.entries.map(({ choices, ...entry }) => entry) });
        draft = undefined;
        save();
        render();
      });
      commit.disabled = result.entries.some(entry => entry.invalidOverride);
      content.append(commit, button("Discard draft", () => { draft = undefined; render(); }));
      inspector.append(node("h3", "Draft balances"));
      for (const faction of result.factions) inspector.append(node("p", `${faction.name} · ${faction.credits} FacCreds · ${faction.hp} HP`));
    }
    if (manager.history.length) content.append(node("h3", "Turn history"));
    for (const record of [...manager.history].reverse()) {
      const history = node("details");
      history.append(node("summary", `Round ${record.round}`));
      for (const entry of record.entries) {
        history.append(node("h4", `${entry.faction} · ${entry.action}`),
          node("p", `Income ${entry.earned} · Upkeep ${entry.paid}`), ...entry.lines.map(line => node("p", line)));
        if (Object.keys(entry.overrides ?? {}).length) history.append(node("p", "Manual overrides recorded."));
      }
      field(history, "Sector news", record.news, value => { record.news = value; save(); });
      content.append(history);
    }
  }

  function refreshCard(id) {
    render();
    const card = [...profile.querySelectorAll("[data-faction]")].find(item => item.dataset.faction === id);
    if (card) card.open = true;
  }

  render();
  heading.focus();
}
