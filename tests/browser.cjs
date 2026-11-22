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
    await generate.click();
    assert.equal(await page.locator(".hex").count(), 80);
    const count = await page.locator(".hex.occupied").count();
    assert.ok(count >= 21 && count <= 30);
    assert.equal(await page.locator(".hex.occupied[aria-pressed=true]").count(), 1);
    assert.match(await page.locator("#generation-status").innerText(), new RegExp(`Generated ${count} systems`));
    await page.getByLabel("World name").fill("New Horizon");
    await page.getByLabel("Tag 1").fill("Handwritten tag");
    await page.getByRole("button", { name: "Reroll atmosphere" }).click();
    assert.equal(await page.getByLabel("Tag 1").inputValue(), "Handwritten tag");
    await page.reload();
    assert.equal(await page.getByLabel("World name").inputValue(), "New Horizon");
    assert.equal(await page.getByLabel("Tag 1").inputValue(), "Handwritten tag");

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
    assert.equal(await page.getByLabel("World name").inputValue(), "New Horizon");
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
    assert.equal(await page.locator(".hex").count(), 80);
    assert.equal(await page.getByLabel("World name").inputValue(), "New Horizon");
    assert.equal(await page.getByLabel("Tag 1").inputValue(), "Handwritten tag");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
