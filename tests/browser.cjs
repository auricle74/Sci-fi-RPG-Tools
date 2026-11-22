const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:8000");
    await page.getByRole("link", { name: /Sector Generator/ }).click();
    const generate = page.getByRole("button", { name: "Generate sector", exact: true });
    await page.locator(".hex").first().waitFor();
    await page.getByLabel("Add System Points of Interest?").selectOption("4");
    await generate.click();
    assert.equal(await page.locator(".hex").count(), 80);
    const count = await page.locator(".hex.occupied").count();
    assert.ok(count >= 21 && count <= 30);
    assert.equal(await page.locator(".hex.occupied[aria-pressed=true]").count(), 1);
    assert.match(await page.locator("#generation-status").innerText(), new RegExp(`Generated ${count} systems`));
    const systemTags = page.locator("#world .planet-tags");
    assert.equal(await systemTags.getByText("System Tags", { exact: true }).count(), 1);
    const names = await systemTags.locator("h4").allTextContents();
    assert.equal(names.length, 2);
    assert.equal(new Set(names).size, 2);
    const panel = page.locator("#world");
    await panel.getByRole("button", { name: "Edit", exact: true }).click();
    await panel.getByRole("button", { name: "Add planet", exact: true }).click();
    await panel.getByRole("textbox", { name: "Name", exact: true }).fill("Outer Reach");
    const mine = panel.locator("details").filter({ has: page.locator("summary", { hasText: /^Gas giant mine$/ }) });
    await mine.getByRole("button", { name: "Add gas giant mine", exact: true }).click();
    await mine.getByRole("button", { name: "Add gas giant mine", exact: true }).click();
    assert.equal(await mine.getByRole("textbox", { name: "Name", exact: true }).count(), 2);
    await panel.getByLabel("System tag 1", { exact: true }).fill("Custom System Hook");
    await panel.getByRole("button", { name: "Add system tag", exact: true }).click();
    await panel.getByLabel("System tag 3", { exact: true }).fill("Third System Hook");
    await panel.getByRole("button", { name: "Save", exact: true }).click();
    assert.equal(await systemTags.locator("h4").count(), 3);
    assert.equal(await panel.getByRole("button", { name: "Outer Reach", exact: true }).count(), 1);
    const mainWorld = page.locator(".inspector-group").filter({ hasText: "Main world" }).getByRole("button");
    assert.equal(await page.getByRole("textbox", { name: "World name", exact: true }).count(), 0);
    await page.locator(".inspector-entry").nth(2).click();
    assert.match(await page.locator(".inspector-description").innerText(), /Occupants:[\s\S]+Situation:/);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await mainWorld.click();
    assert.equal(await page.locator(".planet-tags article").count(), 2);
    assert.equal(await page.getByRole("textbox", { name: "World name", exact: true }).count(), 0);
    const inspector = page.locator("#world");
    const edit = inspector.getByRole("button", { name: "Edit", exact: true });
    await edit.click();
    const worldName = page.getByRole("textbox", { name: "World name", exact: true });
    const originalName = await worldName.inputValue();
    await inspector.getByRole("button", { name: "New name for world name", exact: true }).click();
    assert.notEqual(await worldName.inputValue(), originalName);
    await worldName.fill("Discarded name");
    await inspector.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.notEqual(await inspector.locator("h3").innerText(), "Discarded name");
    await edit.click();
    await page.getByRole("textbox", { name: "World name", exact: true }).fill("New Horizon");
    await page.getByRole("textbox", { name: "Tag 1", exact: true }).fill("Handwritten tag");
    await page.getByRole("button", { name: "Reroll atmosphere" }).click();
    assert.equal(await page.getByRole("textbox", { name: "Tag 1", exact: true }).inputValue(), "Handwritten tag");
    await inspector.getByRole("button", { name: "Save", exact: true }).click();
    await page.reload();
    await mainWorld.click();
    assert.equal(await page.locator(".planet-tags article").count(), 2);
    assert.equal(await inspector.locator("h3").innerText(), "New Horizon");
    assert.equal(await inspector.locator(".planet-tags h4").first().innerText(), "Handwritten tag");

    const downloadReady = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON" }).click();
    const exported = await readFile(await (await downloadReady).path());
    await page.getByLabel("Sector size").selectOption("custom");
    await page.getByLabel("Width").fill("32");
    await page.getByLabel("Height").fill("40");
    await page.getByLabel("Star count").selectOption("scaled");
    await generate.click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(await page.locator(".hex.occupied").count(), count);
    assert.equal(await inspector.locator("h3").innerText(), "New Horizon");
    await generate.click();
    await page.getByRole("button", { name: "Replace and generate" }).click();
    assert.equal(await page.locator(".hex").count(), 1280);
    const largeCount = await page.locator(".hex.occupied").count();
    assert.ok(largeCount >= 336 && largeCount <= 480);
    await page.locator('[data-column="32"][data-row="40"]').click();
    await page.keyboard.press("ArrowUp");
    assert.match(await page.locator("#selection").innerText(), /3239/);
    const overflow = await page.evaluate(() => {
      document.scrollingElement.scrollLeft = 0;
      const width = document.documentElement.scrollWidth;
      const offenders = Array.from(document.querySelectorAll("main *"))
        .filter((el) => !el.closest(".map-window") && el.getBoundingClientRect().right > 390)
        .map((el) => [el.tagName, el.id, el.className, el.getBoundingClientRect().right]);
      return { width, offenders };
    });
    assert.equal(overflow.width, 390, JSON.stringify(overflow.offenders));

    const input = page.getByLabel("Import JSON");
    await input.setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{") });
    await page.getByText(/Could not import/).waitFor();
    assert.equal(await page.locator(".hex").count(), 1280);
    page.once("dialog", (dialog) => dialog.accept());
    await input.setInputFiles({ name: "sector.json", mimeType: "application/json", buffer: exported });
    await page.getByText("Sector imported.").waitFor();
    await mainWorld.click();
    assert.equal(await page.locator(".planet-tags article").count(), 2);
    assert.equal(await page.locator(".hex").count(), 80);
    assert.equal(await inspector.locator("h3").innerText(), "New Horizon");
    assert.equal(await inspector.locator(".planet-tags h4").first().innerText(), "Handwritten tag");
    const popupReady = page.waitForEvent("popup");
    await page.getByRole("link", { name: /Tag editor/ }).click();
    const tags = await popupReady;
    await tags.getByRole("button", { name: "Abandoned Colony · Planet · Book", exact: true }).click();
    assert.equal(await tags.getByRole("textbox", { name: "Name", exact: true }).isEnabled(), false);
    assert.equal(await tags.getByRole("button", { name: "Save tag" }).isVisible(), false);
    await tags.getByRole("combobox", { name: "Filter by tag type" }).selectOption("Moon");
    await tags.getByRole("button", { name: "New tag" }).click();
    assert.equal(await tags.getByRole("combobox", { name: "Tag type", exact: true }).inputValue(), "Moon");
    await tags.getByRole("textbox", { name: "Name", exact: true }).fill("Signal Dunes");
    await tags.getByRole("textbox", { name: "Enemies", exact: true }).fill("A rival survey team");
    await tags.getByRole("button", { name: "Save tag" }).click();
    await tags.getByText("Tag saved.", { exact: true }).waitFor();
    await tags.reload();
    await tags.getByRole("button", { name: "Signal Dunes · Moon", exact: true }).click();
    assert.equal(await tags.getByRole("textbox", { name: "Enemies", exact: true }).inputValue(), "A rival survey team");
    const tagType = tags.getByRole("combobox", { name: "Tag type", exact: true });
    for (const type of ["Deep-space station", "Asteroid base", "Remote moon base", "Ancient orbital ruin", "Research base", "Asteroid belt", "Gas giant mine", "Refuelling station"]) {
      assert.equal(await tagType.getByRole("option", { name: type, exact: true }).count(), 1);
    }
    await tagType.selectOption("");
    await tags.getByRole("textbox", { name: "Custom tag type" }).fill("Anomaly");
    await tags.getByRole("button", { name: "Save tag" }).click();
    await tags.getByRole("button", { name: "Signal Dunes · Anomaly", exact: true }).waitFor();
    tags.once("dialog", dialog => dialog.accept());
    await tags.getByRole("button", { name: "Delete tag" }).click();
    await tags.getByText("Tag deleted.", { exact: true }).waitFor();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
