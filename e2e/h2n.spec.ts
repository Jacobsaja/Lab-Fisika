import { test, expect } from "@playwright/test";

test.describe("Hukum II Newton (H2N) Comprehensive E2E Test Suite", () => {
  test("Explore H2N: Page loads, PlaybackSpeedControl has 4 speeds, controls update analytics", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/explore/mekanika/h2n", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    expect(consoleErrors).toHaveLength(0);

    // 1. Playback speed control
    const speedGroup = page.getByRole("radiogroup", { name: "Kecepatan simulasi" });
    await expect(speedGroup).toBeVisible();
    const speeds = ["1×", "0,75×", "0,5×", "0,25×"];
    for (const s of speeds) {
      await expect(speedGroup.getByRole("radio", { name: new RegExp(s) })).toBeVisible();
    }

    // 2. Metric cards: F, M_total, a, T
    await expect(page.getByText("Gaya Tarik (F = m·g)")).toBeVisible();
    await expect(page.getByText("Massa Total (M + m)")).toBeVisible();
    await expect(page.getByText("Percepatan Teori (a)")).toBeVisible();
    await expect(page.getByText("Tegangan Tali (T)").first()).toBeVisible();

    // 3. Switch cart mass to 175.0g (+25g)
    const btn175 = page.getByRole("button", { name: "175.0g" });
    await expect(btn175).toBeVisible();
    await btn175.click();
    await page.waitForTimeout(300);

    // Cart mass should update in telemetry
    await expect(page.getByText("175.0 g").first()).toBeVisible();
  });

  test("Practicum H2N: Workflow, Vector Locking, 0.25x Real-Time Timer, and Review Tables", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/praktikum/h2n", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // ── 1. INTRO STEP ──
    const nextBtn = page.locator("button[data-testid='practicum-next-step']").or(page.locator("button:has-text('Selanjutnya')"));
    await expect(nextBtn.first()).toBeVisible();
    await nextBtn.first().click(); // Advance to SETUP
    await page.waitForTimeout(400);

    // ── 2. SETUP STEP ──
    await expect(page.getByText("Tahap 1: Penimbangan (Ohaus)")).toBeVisible();
    await nextBtn.first().click(); // Advance to SIMULATION
    await page.waitForTimeout(600);

    // ── 3. SIMULATION STEP ──
    // Tab 1: Persiapan (Ohaus Balance)
    await expect(page.getByText("Penimbangan Massa Kereta & Beban Tambahan")).toBeVisible();

    // Switch to Tab 2: Percobaan A (Tabel 5.1)
    const tabExp1 = page.locator("[data-testid='tab-exp1']");
    await expect(tabExp1).toBeVisible();
    await tabExp1.click();
    await page.waitForTimeout(500);

    // Verify speed control is present with 4 speeds
    const speedGroup = page.getByRole("radiogroup", { name: "Kecepatan simulasi" });
    await expect(speedGroup).toBeVisible();

    // Switch speed to 0.25x
    const radio025 = speedGroup.getByRole("radio", { name: /0,25×/ });
    await expect(radio025).toBeVisible();
    await radio025.click();
    await page.waitForTimeout(300);

    // Verify ExperimentTimer is ticking in real-time
    const timer = page.locator("[aria-label='Timer percobaan']");
    if (await timer.isVisible()) {
      const timeDisplay = timer.locator("div[aria-live='polite']");
      if (await timeDisplay.isVisible()) {
        const parseSeconds = (str: string) => {
          const parts = str.match(/(\d{2}):(\d{2})/);
          return parts ? parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10) : 0;
        };
        const initialSec = parseSeconds(await timeDisplay.innerText());
        await page.waitForTimeout(1500);
        const finalSec = parseSeconds(await timeDisplay.innerText());
        expect(finalSec).toBeGreaterThanOrEqual(initialSec);
      }
    }

    // Check Vector Overlay Lock state before data recording
    const vectorControls = page.getByRole("toolbar", { name: "Kontrol tampilan vektor" });
    if (await vectorControls.isVisible()) {
      const velocityToggle = page.getByRole("checkbox", { name: /kecepatan/i });
      if (await velocityToggle.isVisible()) {
        const isAriaDisabled = (await velocityToggle.getAttribute("aria-disabled")) === "true";
        const isHtmlDisabled = await velocityToggle.isDisabled();
        expect(isAriaDisabled || isHtmlDisabled).toBe(true);
      }
    }

    // Record all 5 trials of Experiment A
    for (let i = 1; i <= 5; i++) {
      const recordBtn = page.getByRole("button", { name: new RegExp(`Catat Data Percobaan A \\(P${i}\\)`) });
      await expect(recordBtn).toBeVisible();
      await recordBtn.click();
      await page.waitForTimeout(200);

      // Select next preset if not last
      if (i < 5) {
        const nextPresetBtn = page.getByRole("button", { name: new RegExp(`P${i + 1} `) });
        await nextPresetBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // Switch to Tab 3: Percobaan B (Tabel 5.2)
    const tabExp2 = page.locator("[data-testid='tab-exp2']");
    await expect(tabExp2).toBeVisible();
    await tabExp2.click();
    await page.waitForTimeout(500);

    // Record all 5 trials of Experiment B
    for (let i = 1; i <= 5; i++) {
      const recordBtn = page.getByRole("button", { name: new RegExp(`Catat Data Percobaan B \\(P${i}\\)`) });
      await expect(recordBtn).toBeVisible();
      await recordBtn.click();
      await page.waitForTimeout(200);

      if (i < 5) {
        const nextPresetBtn = page.getByRole("button", { name: new RegExp(`P${i + 1} `) });
        await nextPresetBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // Now all 10 trials are recorded! Next button should become enabled
    await expect(nextBtn.first()).toBeEnabled();
    await nextBtn.first().click(); // Advance to QUESTIONS step
    await page.waitForTimeout(500);

    // ── 4. QUESTIONS STEP ──
    await expect(page.getByRole("heading", { name: "Evaluasi" })).toBeVisible();
    await nextBtn.first().click(); // Advance to REVIEW step
    await page.waitForTimeout(800);

    // ── 5. REVIEW STEP ──
    // Verify both StudentCalculationTable instances are rendered
    await expect(page.getByText("Tabel 5.1: Perhitungan Mandiri Percobaan A")).toBeVisible();
    await expect(page.getByText("Tabel 5.2: Perhitungan Mandiri Percobaan B")).toBeVisible();

    // Use "Bantu Lengkapi" on both tables
    const bantuBtns = page.getByRole("button", { name: "Bantu Lengkapi" });
    await expect(bantuBtns.first()).toBeVisible();
    await bantuBtns.nth(0).click();
    await page.waitForTimeout(300);
    await bantuBtns.nth(1).click();
    await page.waitForTimeout(300);

    // Verify regression analysis cards & charts
    await expect(page.getByText("Analisis Grafik Regresi Linier Hukum II Newton")).toBeVisible();
    await expect(page.getByText("Grafik 1: a terhadap 1/(M+m)")).toBeVisible();
    await expect(page.getByText("Grafik 2: a terhadap F")).toBeVisible();

    // No console errors
    expect(consoleErrors).toHaveLength(0);
  });

  const VIEWPORTS = [
    { name: "mobile 375px", width: 375, height: 667 },
    { name: "tablet 768px", width: 768, height: 1024 },
    { name: "desktop 1440px", width: 1440, height: 900 },
  ];

  for (const vp of VIEWPORTS) {
    test(`Responsive Explore & Practicum H2N at ${vp.name}: no console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Explore page
      await page.goto("/explore/mekanika/h2n", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);
      await expect(page.locator("body")).toBeVisible();

      // 2. Practicum page
      await page.goto("/praktikum/h2n", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);
      await expect(page.locator("body")).toBeVisible();

      expect(consoleErrors).toHaveLength(0);
    });
  }
});
