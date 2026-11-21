# Sci-fi-RPG-Tools

## Specification for review

Build a browser-based collection of sci-fi RPG generators in the `Sci-fi-RPG-Tools` GitHub repository. The home page lists and links to each available generator. The first tool is the Sector Generator, with its own page and room for additional rulesets. The first milestone implements **Stars Without Number Revised**. Add Traveller Mg2e subsector generation, The Perilous Void and GURPS Space individually after the SWN milestone passes review.

### Create a sector

1. Select **Generation rules**. The first release offers SWN Revised.
2. Select **Sector size** independently. Default to SWN's 8 × 10 map. Offer Traveller subsector 8 × 10, The Perilous Void 10 × 10 and Custom. Add a GURPS preset once its source and dimensions are confirmed. Custom shows separate width and height inputs for whole numbers of hexes.
3. Select **Generate Sector**. Show the new sector as a clickable hex map with coordinates. Highlight the selected hex and show its contents or an option to add a system.

The size preset changes the grid dimensions. SWN rules still determine what the hexes mean and how the sector is populated.

### Generate an SWN sector

Use the uploaded *Stars Without Number Revised Deluxe* as the reference. Page numbers below are printed page numbers.

- On the standard grid, roll 20 + 1d10 stars. Randomly place the first 20 or so, resolving collisions by placing the star in an available neighbouring hex towards the nearest edge when possible. Place the remaining stars to bridge clusters where possible within the rolled budget, using three hexes as the standard postech drill distance. Define deterministic fallbacks for ties, blocked neighbours and unbridgeable gaps. Use consistent coordinates and document the book's optional half-hex handling. See p. 130.
- On non-standard maps, choose the star count per sector. **Fixed** defaults to 20 + 1d10 and caps the roll at the number of hexes. **Standard SWN density** multiplies the rolled total and initial placement quota by the map area divided by 80. Round to the nearest integer and keep the total between one and the map capacity. The control previews the resulting range and the saved sector records the choice.
- Generate one primary world per generated system. Roll two distinct percentile tags and roll 2d6 separately for atmosphere, temperature, biosphere, population and tech level. See pp. 130, 132, 160, 162, 164, 166 and 168. Add editable original names and a brief editable description. Leave reconciliation of unusual combinations to the user.
- Additional planets, moons and stations can be added by hand. Campaign development such as factions and adventure preparation is outside this milestone.

### Edit and save

Every generated campaign value must be editable, including sector name, system and world names, world profile fields, each tag and the description. Add systems to empty hexes, move them to empty hexes, remove them, and add or edit locations and notes. Show a clear confirmation for deletion of populated entries. Rerolling an individual field or tag is optional during editing and requires confirmation before any edited value outside the selected field is overwritten. Tags accept custom text. Changing a field must preserve neighbouring records and the rest of the profile.

Save and reload complete sectors through versioned JSON export and import. Keep browser autosave as a convenience, with explicit confirmation before replacing a current map through generation or import. Reject invalid imports with a clear message and retain the active sector.

### Keep future rules selectable

Give sectors, systems and worlds stable IDs. Store hex coordinates separately from generated records, and record the ruleset and version used for each generated record. Keep generation logic independent of the editor. Allow a hex to represent a location container such as a Perilous Void subsector. Future rules can be applied to one system or world, with preview and explicit selection of fields to apply when results overlap.

## Implementation notes

The map uses full hexes in each staggered column. For a collision, the editor takes the nearest open hex, then favours the nearest map edge and uses column and row order to break ties. Reserved placements prefer a hex that joins the most separate groups within spike-3 range. Where a single bridge is unavailable, the editor places a star using the normal roll and tries again on the next reserved placement. World profile labels condense the table results without changing their roll ranges.

Run the rules tests with `node --test sector/swn.test.mjs`.
