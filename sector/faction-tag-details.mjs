// Rules reference adapted from Stars Without Number Revised Deluxe, pp. 224–225.
export const factionTagDetails = new Map(Object.entries({
  Colonists: {
    description: "Pioneers are establishing a settlement on a largely untouched world.",
    effect: "On its homeworld the faction has the benefits of Planetary Government and treats local technology as at least TL4. It cannot build Spaceship assets there until the colony has at least 100,000 people.",
  },
  "Deep Rooted": {
    description: "Generations of local influence have made this faction part of its homeworld’s institutions.",
    effect: "Add a d10 when defending assets on the homeworld. The faction loses this tag if it changes homeworld.",
  },
  "Eugenics Cult": {
    description: "The faction uses forbidden genetic engineering to create servants and extend its leaders’ lives.",
    effect: "The cult may purchase Gengineered Slaves at TL4 for 2 FacCreds with Force 1. The asset has 6 HP, attacks Force vs. Force for 1d6 damage, and counters for 1d4. Choose Military Unit or Special Forces when each asset is created. Once per turn, add a d10 to one attack or defence by a Gengineered Slaves asset using any rating.",
  },
  "Exchange Consulate": {
    description: "Bankers and diplomats of the Exchange provide economic expertise to the faction.",
    effect: "After completing Peaceable Kingdom, roll 1d6 for 1 bonus XP on a 4 or higher. Once per turn, add a d10 to a defence against Wealth.",
  },
  Fanatical: {
    description: "Members keep fighting even when the cause appears lost.",
    effect: "Reroll every die result of 1. The faction always loses attack ties.",
  },
  Imperialists: {
    description: "The faction seeks sector-wide rule and specialises in overcoming planetary defences.",
    effect: "Add a d10 to attacks made during a Seize Planet action.",
  },
  Machiavellian: {
    description: "The faction cultivates intrigue and uses it to outmanoeuvre rivals.",
    effect: "Once per turn, add a d10 to a Cunning attack.",
  },
  "Mercenary Group": {
    description: "The faction sells its services and can relocate its personnel and equipment quickly.",
    effect: "Every asset gains an action that moves it to any world within one hex.",
  },
  "Perimeter Agency": {
    description: "The faction has ties to the Mandate’s maltech watchdogs and access to old security overrides.",
    effect: "Once per turn, add a d10 to an attack against an asset whose purchase requires TL5. Add an extra die on tests to detect Stealthed assets.",
  },
  Pirates: {
    description: "The faction preys on shipping and refits captured vessels for its own use.",
    effect: "Moving an asset onto a world with this faction’s Base of Influence costs 1 extra FacCred, paid to the faction.",
  },
  "Planetary Government": {
    description: "The faction controls the institutions of a planetary government, openly or through its influence over the authorities.",
    effect: "Buying or importing assets marked as requiring government approval needs this faction’s permission on that planet. The faction can gain or lose this tag separately for each planet it controls.",
  },
  Plutocratic: {
    description: "The faction’s members use their influence to build and protect private fortunes.",
    effect: "Once per turn, add a d10 to a Wealth attack.",
  },
  "Preceptor Archive": {
    description: "The faction draws on the Great Archive’s teachers, engineers and technical expertise.",
    effect: "Assets requiring TL4 or higher cost 1 FacCred less to buy. The Teach Planetary Population action costs 2 FacCreds and rolls 1d12 for one world. On a 12, that world permanently counts as TL4 for this faction’s purposes, including purchases.",
  },
  "Psychic Academy": {
    description: "The faction trains its own psychics and puts their talents to specialised use.",
    effect: "The faction can provide mentors for eligible psychics. Once per turn it can make a rival reroll one d10, even on a roll the academy is uninvolved in.",
  },
  Savage: {
    description: "The faction is adept at surviving and fighting with minimal technology.",
    effect: "Once per turn, add an extra die to a defence made with an asset whose purchase requires TL0.",
  },
  Scavengers: {
    description: "The faction salvages useful material from wreckage and castoffs.",
    effect: "Gain 1 FacCred each time the faction destroys an asset or loses one of its own assets to destruction.",
  },
  Secretive: {
    description: "Compartmentalised cells and practiced deception conceal the faction’s operations.",
    effect: "All assets the faction purchases start Stealthed. Use the Stealth rules in the Cunning asset list.",
  },
  "Technical Expertise": {
    description: "Scientists and engineers help the faction develop skilled local workforces.",
    effect: "Treat planets with the faction’s Base of Influence as at least TL4. The faction can build Starship assets on any world with at least 10,000 inhabitants.",
  },
  Theocratic: {
    description: "Strong religious allegiance makes the faction difficult to infiltrate or subvert.",
    effect: "Once per turn, add a d10 to a defence against Cunning.",
  },
  Warlike: {
    description: "The faction prizes combat and pursues opportunities to fight.",
    effect: "Once per turn, add a d10 to a Force attack.",
  },
}));
