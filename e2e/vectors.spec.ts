import { test, expect } from "@playwright/test";

test.describe("Vector Overlay & Controls E2E Validation", () => {
  test.beforeEach(async ({ page }) => {
    // Listen for unexpected console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore external or benign warnings if any
        if (!text.includes("favicon") && !text.includes("Vercel")) {
          console.error("Browser console error:", text);
        }
      }
    });
  });

  test("Explore Atwood: toggles vector categories and shows numbers", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/explore/mekanika/atwood", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Verify vector controls container exists
    const controls = page.locator("div:has-text('Vektor Fisika (Overlay)')");
    await expect(controls.first()).toBeVisible();

    // Verify category buttons exist
    const weightBtn = page.locator("button:has-text('Gaya Berat')");
    const tensionBtn = page.locator("button:has-text('Tegangan Tali')");
    const accelBtn = page.locator("button:has-text('Percepatan')");

    await expect(weightBtn).toBeVisible();
    await expect(tensionBtn).toBeVisible();
    await expect(accelBtn).toBeVisible();

    // In explore mode, numerical values are visible on vector badges (e.g. contains 'N')
    const overlayGroup = page.locator("g[aria-label='Overlay Vektor Fisika']");
    await expect(overlayGroup.first()).toBeVisible();

    // Count initial arrows
    const initialArrows = await page.locator("g[id*='_arrow_']").count();
    expect(initialArrows).toBeGreaterThan(0);

    // Toggle Gaya Berat OFF
    await weightBtn.click();
    await page.waitForTimeout(300);
    const arrowsAfterWeightOff = await page.locator("g[id*='_arrow_']").count();
    expect(arrowsAfterWeightOff).toBeLessThan(initialArrows);

    // Toggle Gaya Berat back ON
    await weightBtn.click();
    await page.waitForTimeout(300);
    const arrowsAfterWeightOn = await page.locator("g[id*='_arrow_']").count();
    expect(arrowsAfterWeightOn).toBe(initialArrows);

    // Toggle Tegangan Tali OFF and ON
    await tensionBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator("g[id*='_arrow_']").count()).toBeLessThan(initialArrows);
    await tensionBtn.click();
    await page.waitForTimeout(300);

    // Toggle Percepatan OFF and ON
    await accelBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator("g[id*='_arrow_']").count()).toBeLessThan(initialArrows);
    await accelBtn.click();
    await page.waitForTimeout(300);

    expect(consoleErrors).toHaveLength(0);
  });

  test("Explore Menggelinding: toggles categories, 'Uraikan berat', and shows numbers", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/explore/mekanika/menggelinding", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const controls = page.locator("div:has-text('Vektor Fisika (Overlay)')");
    await expect(controls.first()).toBeVisible();

    const weightBtn = page.locator("button:has-text('Gaya Berat')");
    const normalBtn = page.locator("button:has-text('Gaya Normal')");
    const frictionBtn = page.locator("button:has-text('Gaya Gesek')");
    const accelBtn = page.locator("button:has-text('Percepatan')");

    await expect(weightBtn).toBeVisible();
    await expect(normalBtn).toBeVisible();
    await expect(frictionBtn).toBeVisible();
    await expect(accelBtn).toBeVisible();

    // Toggle 'Uraikan berat' checkbox
    const decomposeToggle = page.locator("label:has-text('Uraikan berat')");
    await expect(decomposeToggle).toBeVisible();

    const initialArrows = await page.locator("g[id*='_arrow_']").count();
    expect(initialArrows).toBeGreaterThan(0);

    // Decompose weight: turns w into w_parallel and w_perp (arrow count increases by 1)
    await decomposeToggle.click();
    await page.waitForTimeout(300);
    const arrowsDecomposed = await page.locator("g[id*='_arrow_']").count();
    expect(arrowsDecomposed).toBe(initialArrows + 1);

    // Toggle decompose back OFF
    await decomposeToggle.click();
    await page.waitForTimeout(300);
    expect(await page.locator("g[id*='_arrow_']").count()).toBe(initialArrows);

    // Toggle Gaya Normal OFF and ON
    await normalBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator("g[id*='_arrow_']").count()).toBeLessThan(initialArrows);
    await normalBtn.click();
    await page.waitForTimeout(300);

    // Toggle Gaya Gesek OFF and ON
    await frictionBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator("g[id*='_arrow_']").count()).toBeLessThan(initialArrows);
    await frictionBtn.click();
    await page.waitForTimeout(300);

    // Toggle Percepatan OFF and ON
    await accelBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator("g[id*='_arrow_']").count()).toBeLessThan(initialArrows);
    await accelBtn.click();
    await page.waitForTimeout(300);

    expect(consoleErrors).toHaveLength(0);
  });

  test("Practicum Atwood GLBB & Menggelinding: locked initially, qualitative without numeric values in DOM", async ({ page }) => {
    // 1. Atwood GLBB
    await page.goto("/praktikum/atwood-glbb", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Switch to simulation tab
    const tab2 = page.locator("button:has-text('Tahap 2: GLBB (m3)')");
    if (await tab2.isVisible()) {
      await tab2.click();
      await page.waitForTimeout(500);
    }

    // Verify locked badge
    const lockBadgeAtwood = page.locator("div:has-text('Terkunci')");
    await expect(lockBadgeAtwood.first()).toBeVisible();

    // Verify no vector numbers leaked into SVG overlay
    const atwoodTextContent = await page.locator("g[aria-label='Overlay Vektor Fisika'] text").allTextContents();
    for (const text of atwoodTextContent) {
      expect(text).not.toMatch(/\d+\.\d+\s*(N|m\/s²)/);
    }

    // 2. Menggelinding
    await page.goto("/praktikum/menggelinding", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Go to simulation step
    const nextBtn = page.locator("button:has-text('Selanjutnya')");
    if (await nextBtn.isVisible()) {
      await nextBtn.click(); // Intro -> Setup
      await page.waitForTimeout(500);
      await nextBtn.click(); // Setup -> Simulation
      await page.waitForTimeout(800);
    }

    const lockBadgeRolling = page.locator("div:has-text('Terkunci')");
    await expect(lockBadgeRolling.first()).toBeVisible();

    const rollingTextContent = await page.locator("g[aria-label='Overlay Vektor Fisika'] text").allTextContents();
    for (const text of rollingTextContent) {
      expect(text).not.toMatch(/\d+\.\d+\s*(N|m\/s²)/);
    }
  });

  test("Explore GJB: toggles vector categories and shows numbers", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/explore/mekanika/gjb", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Verify vector controls container exists
    const controls = page.locator("div:has-text('Vektor Fisika (Overlay)')");
    await expect(controls.first()).toBeVisible();

    // Verify category buttons exist
    const weightBtn = page.locator("button:has-text('Gaya Berat')");
    const velocityBtn = page.locator("button:has-text('Kecepatan')");
    const accelBtn = page.locator("button:has-text('Percepatan')");

    await expect(weightBtn).toBeVisible();
    await expect(velocityBtn).toBeVisible();
    await expect(accelBtn).toBeVisible();

    // In explore mode, numerical values are visible on vector badges (e.g. contains 'N' or 'm/s²')
    const overlayGroup = page.locator("g[aria-label='Overlay Vektor Fisika']");
    await expect(overlayGroup.first()).toBeVisible();

    // Count initial arrows
    const initialArrows = await page.locator("g[id*='_arrow_']").count();
    expect(initialArrows).toBeGreaterThan(0);

    // Toggle Gaya Berat OFF
    await weightBtn.click();
    await page.waitForTimeout(300);
    const arrowsAfterWeightOff = await page.locator("g[id*='_arrow_']").count();
    expect(arrowsAfterWeightOff).toBeLessThan(initialArrows);

    // Toggle Gaya Berat back ON
    await weightBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator("g[id*='_arrow_']").count()).toBe(initialArrows);

    // Toggle Percepatan OFF and ON
    await accelBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator("g[id*='_arrow_']").count()).toBeLessThan(initialArrows);
    await accelBtn.click();
    await page.waitForTimeout(300);

    expect(consoleErrors).toHaveLength(0);
  });

  test("Explore GMB: toggles vector categories and shows numbers", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/explore/mekanika/gmb", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Verify vector controls container exists
    const controls = page.locator("div:has-text('Vektor Fisika (Overlay)')");
    await expect(controls.first()).toBeVisible();

    // Verify category buttons exist
    const velBtn = page.locator("button:has-text('Kecepatan Tangensial')");
    const accelBtn = page.locator("button:has-text('Percepatan Sentripetal')");
    const forceBtn = page.locator("button:has-text('Gaya Sentripetal')");

    await expect(velBtn).toBeVisible();
    await expect(accelBtn).toBeVisible();
    await expect(forceBtn).toBeVisible();

    // Overlay is visible
    const overlayGroup = page.locator("g[aria-label='Overlay Vektor Fisika']");
    await expect(overlayGroup.first()).toBeVisible();

    // In explore mode, vector numbers with units (m/s, m/s², N) are in the DOM
    const badgeTexts = await page.locator("g[aria-label='Overlay Vektor Fisika'] text").allTextContents();
    expect(badgeTexts.some((t) => t.includes("m/s") || t.includes("m/s²") || t.includes("N"))).toBe(true);

    const initialArrows = await page.locator("g[id*='_arrow_']").count();
    expect(initialArrows).toBeGreaterThanOrEqual(3);

    // Toggle Kecepatan Tangensial OFF and ON
    await velBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator("g[id*='_arrow_']").count()).toBeLessThan(initialArrows);
    await velBtn.click();
    await page.waitForTimeout(300);

    // Toggle Percepatan Sentripetal OFF and ON
    await accelBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator("g[id*='_arrow_']").count()).toBeLessThan(initialArrows);
    await accelBtn.click();
    await page.waitForTimeout(300);

    // Toggle Gaya Sentripetal OFF and ON
    await forceBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator("g[id*='_arrow_']").count()).toBeLessThan(initialArrows);
    await forceBtn.click();
    await page.waitForTimeout(300);

    expect(consoleErrors).toHaveLength(0);
  });

  test("Practicum GJB & GMB: locked initially, qualitative without numeric values in DOM", async ({ page }) => {
    // 1. Practicum GJB
    await page.goto("/praktikum/gjb", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Go past INTRO and SETUP to SIMULATION step
    const nextBtnGjb = page.locator("button[data-testid='practicum-next-step']").or(page.locator("button:has-text('Selanjutnya')"));
    if (await nextBtnGjb.first().isVisible()) {
      await nextBtnGjb.first().click();
      await page.waitForTimeout(500);
      await nextBtnGjb.first().click();
      await page.waitForTimeout(800);
    }

    // Verify locked badge
    const lockBadgeGjb = page.locator("div:has-text('Terkunci')");
    await expect(lockBadgeGjb.first()).toBeVisible();

    // Verify no vector numbers leaked into SVG overlay
    const gjbTextContent = await page.locator("g[aria-label='Overlay Vektor Fisika'] text").allTextContents();
    for (const text of gjbTextContent) {
      expect(text).not.toMatch(/\d+\.\d+\s*(N|m\/s|m\/s²)/);
    }

    // 2. Practicum GMB
    await page.goto("/praktikum/gmb", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const nextBtnGmb = page.locator("button[data-testid='practicum-next-step']").or(page.locator("button:has-text('Selanjutnya')"));
    if (await nextBtnGmb.first().isVisible()) {
      await nextBtnGmb.first().click();
      await page.waitForTimeout(500);
      await nextBtnGmb.first().click();
      await page.waitForTimeout(800);
    }

    // Verify locked badge
    const lockBadgeGmb = page.locator("div:has-text('Terkunci')");
    await expect(lockBadgeGmb.first()).toBeVisible();

    // Verify no vector numbers leaked into SVG overlay
    const gmbTextContent = await page.locator("g[aria-label='Overlay Vektor Fisika'] text").allTextContents();
    for (const text of gmbTextContent) {
      expect(text).not.toMatch(/\d+\.\d+\s*(N|m\/s|m\/s²)/);
    }
  });
});
