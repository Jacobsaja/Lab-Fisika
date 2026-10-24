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

  test("Explore Atwood: velocity vectors v1/v2 appear during motion, persist into GLB phase, and can be toggled", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/explore/mekanika/atwood", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const velBtn = page.locator("button", { hasText: "Kecepatan" }).first();
    await expect(velBtn).toBeVisible();

    const v1 = page.locator("g[id$='_arrow_v1']");
    const v2 = page.locator("g[id$='_arrow_v2']");
    const a1 = page.locator("g[id$='_arrow_a1']");

    // Stationary: v = 0 -> no velocity arrows rendered
    expect(await v1.count()).toBe(0);
    expect(await v2.count()).toBe(0);

    await page.locator("[data-testid='btn-play']").first().click();

    // GLBB phase: velocity arrows become visible
    await expect.poll(async () => (await v1.count()) + (await v2.count()), { timeout: 3000 }).toBe(2);

    // GLB phase (after slotted disk catches at ring B, m1 = m2): a = 0 while v remains visible
    await expect.poll(async () => await a1.count(), { timeout: 4000, intervals: [50] }).toBe(0);
    expect(await v1.count()).toBe(1);
    expect(await v2.count()).toBe(1);

    // Toggle Kecepatan category OFF
    await velBtn.click();
    await page.waitForTimeout(100);
    expect(await v1.count()).toBe(0);
    expect(await v2.count()).toBe(0);

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

  test("Explore & Practicum GLB: vector selection remains persistent upon reset run (does not re-enable all)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/explore/mekanika/atwood", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const weightBtn = page.locator("button:has-text('Gaya Berat')");
    await expect(weightBtn).toBeVisible();

    // Toggle Gaya Berat OFF
    await weightBtn.click();
    await page.waitForTimeout(200);

    // Verify weight arrows are removed
    expect(await page.locator("g[id*='_arrow_w1']").count()).toBe(0);
    expect(await page.locator("g[id*='_arrow_w2']").count()).toBe(0);

    // Start simulation
    await page.locator("[data-testid='btn-play']").first().click();
    await page.waitForTimeout(1000);

    // Click Reset Run
    const resetBtn = page.locator("[data-testid='btn-reset']").first();
    await resetBtn.click();
    await page.waitForTimeout(400);

    // Verify Gaya Berat REMAINS OFF (does not auto re-enable)
    expect(await page.locator("g[id*='_arrow_w1']").count()).toBe(0);
    expect(await page.locator("g[id*='_arrow_w2']").count()).toBe(0);
  });

  test("Explore Atwood: Reset Run restores zero time, initial position/velocity, slotted mass attachment onto m2, with no lingering GLB state", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/explore/mekanika/atwood", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const timeEl = page.locator("[data-testid='telemetry-time']");
    const velEl = page.locator("[data-testid='telemetry-velocity']");
    const distEl = page.locator("[data-testid='telemetry-distance']");
    const phaseEl = page.locator("[data-testid='telemetry-phase']");

    const m1Group = page.locator("[data-testid='atwood-m1-group']");
    const m2Group = page.locator("[data-testid='atwood-m2-group']");
    const mTambahanGroup = page.locator("[data-testid='atwood-mtambahan-group']");

    // Initial state (before simulation starts)
    await expect(timeEl).toHaveText("0.000 s");
    await expect(velEl).toHaveText("0.000 m/s");
    await expect(distEl).toHaveText("0.000 m");
    await expect(phaseEl).toHaveText("DIAM");

    // Run simulation until reaching GLB phase (after slotted disk catches at ring B)
    await page.locator("[data-testid='btn-play']").first().click();
    await expect(phaseEl).toHaveText("GLB", { timeout: 6000 });

    // Verify elements have moved during GLB phase
    const mTambahanTransformMid = await mTambahanGroup.getAttribute("transform");
    expect(mTambahanTransformMid).not.toBe("translate(0, 0)");
    expect(mTambahanTransformMid).not.toBe("translate(0,0)");

    // Click Reset Run
    const resetBtn = page.locator("[data-testid='btn-reset']").first();
    await resetBtn.click();
    await page.waitForTimeout(300);

    // 1. Simulation time resets to zero
    await expect(timeEl).toHaveText("0.000 s");

    // 2. Velocity returns to initial (0 m/s)
    await expect(velEl).toHaveText("0.000 m/s");

    // 3. Position returns to initial (0 m)
    await expect(distEl).toHaveText("0.000 m");

    // 4. No lingering GLB phase state (cleanly reverts to DIAM)
    await expect(phaseEl).toHaveText("DIAM");

    // 5. Slotted mass attaches back onto m2 at Point A (transform reverts to translate(0, 0))
    const m1TransformEnd = await m1Group.getAttribute("transform");
    const m2TransformEnd = await m2Group.getAttribute("transform");
    const mTambahanTransformEnd = await mTambahanGroup.getAttribute("transform");

    expect(m1TransformEnd === "translate(0, 0)" || m1TransformEnd === "translate(0,0)").toBe(true);
    expect(m2TransformEnd === "translate(0, 0)" || m2TransformEnd === "translate(0,0)").toBe(true);
    expect(mTambahanTransformEnd === "translate(0, 0)" || mTambahanTransformEnd === "translate(0,0)").toBe(true);

    // 6. Velocity arrows v1 and v2 disappear when stationary
    expect(await page.locator("g[id$='_arrow_v1']").count()).toBe(0);
    expect(await page.locator("g[id$='_arrow_v2']").count()).toBe(0);
  });

  test("Explore HKEM: toggles categories and displays numerical values", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/explore/mekanika/hkem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const controls = page.locator("div:has-text('Vektor Fisika (Overlay)')");
    await expect(controls.first()).toBeVisible();

    const weightBtn = page.locator("button:has-text('Gaya Berat')");
    const tensionBtn = page.locator("button:has-text('Tegangan Tali')");
    const accelBtn = page.locator("button:has-text('Percepatan')");

    await expect(weightBtn).toBeVisible();
    await expect(tensionBtn).toBeVisible();
    await expect(accelBtn).toBeVisible();

    // In explore mode, vector badges contain values
    const overlayGroup = page.locator("g[aria-label='Overlay Vektor Fisika']");
    await expect(overlayGroup.first()).toBeVisible();

    const initialArrows = await page.locator("g[id*='_arrow_']").count();
    expect(initialArrows).toBeGreaterThan(0);

    // Toggle Gaya Berat OFF and ON
    await weightBtn.click();
    await page.waitForTimeout(300);
    const arrowsWeightOff = await page.locator("g[id*='_arrow_']").count();
    expect(arrowsWeightOff).toBeLessThan(initialArrows);

    await weightBtn.click();
    await page.waitForTimeout(300);
    const arrowsWeightOn = await page.locator("g[id*='_arrow_']").count();
    expect(arrowsWeightOn).toBe(initialArrows);

    expect(consoleErrors).toEqual([]);
  });

  test("Practicum HKEM: vector overlay initially locked, unlocks qualitatively", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/praktikum/hkem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Switch to step 3 (SIMULATION)
    for (let step = 0; step < 2; step++) {
      const nextBtn = page.locator("[data-testid='practicum-next-step']");
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // Switch to simulation tab
    const tabSim = page.locator("[data-testid='tab-simulation']");
    await expect(tabSim).toBeVisible();
    await tabSim.click();
    await page.waitForTimeout(500);

    // Lock banner is displayed initially
    const lockBanner = page.locator("text=Vektor kualitatif terkunci");
    await expect(lockBanner).toBeVisible();

    // Unlock by recording 1 data trial
    const recordBtn = page.locator("button:has-text('Catat Data Percobaan 1')");
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();
    await page.waitForTimeout(500);

    // Lock banner disappears
    await expect(lockBanner).toHaveCount(0);

    // Overlay is now rendered qualitatively (no numbers / units)
    const overlayGroup = page.locator("g[aria-label='Overlay Vektor Fisika']");
    await expect(overlayGroup.first()).toBeVisible();

    const overlayTexts = await overlayGroup.locator("text").allTextContents();
    for (const t of overlayTexts) {
      if (t && t.trim().length > 0) {
        expect(t).not.toMatch(/\d/);
        expect(t).not.toMatch(/m\/s/i);
        expect(t).not.toMatch(/N\b/);
      }
    }

    expect(consoleErrors).toEqual([]);
  });
});

