import { test, expect } from "@playwright/test";

test.describe("HKM & HKEM Slow Motion and Header Timer Validation", () => {
  test("HKEM (Explore & Practicum): PlaybackSpeedControl is present with 4 speeds", async ({ page }) => {
    // 1. Explore HKEM
    await page.goto("/explore/mekanika/hkem", { waitUntil: "domcontentloaded" });
    const speedGroupExplore = page.getByRole("radiogroup", { name: "Kecepatan simulasi" });
    await expect(speedGroupExplore).toBeVisible();

    const speeds = ["1×", "0,75×", "0,5×", "0,25×"];
    for (const s of speeds) {
      await expect(speedGroupExplore.getByRole("radio", { name: new RegExp(s) })).toBeVisible();
    }

    // 2. Practicum HKEM: switch to Tahap 2 (Simulasi Rel & Timer)
    await page.goto("/praktikum/hkem", { waitUntil: "domcontentloaded" });
    const toExpBtn = page.locator("button:has-text('Tahap 2')");
    await expect(toExpBtn).toBeVisible();
    await toExpBtn.click();

    const speedGroupPracticum = page.getByRole("radiogroup", { name: "Kecepatan simulasi" });
    await expect(speedGroupPracticum).toBeVisible();
    for (const s of speeds) {
      await expect(speedGroupPracticum.getByRole("radio", { name: new RegExp(s) })).toBeVisible();
    }
  });

  test("HKM (Explore & Practicum): PlaybackSpeedControl is present with 4 speeds", async ({ page }) => {
    // 1. Explore HKM
    await page.goto("/explore/mekanika/hkm", { waitUntil: "domcontentloaded" });
    const speedGroupExplore = page.getByRole("radiogroup", { name: "Kecepatan simulasi" });
    await expect(speedGroupExplore).toBeVisible();

    const speeds = ["1×", "0,75×", "0,5×", "0,25×"];
    for (const s of speeds) {
      await expect(speedGroupExplore.getByRole("radio", { name: new RegExp(s) })).toBeVisible();
    }

    // 2. Practicum HKM
    await page.goto("/praktikum/hkm", { waitUntil: "domcontentloaded" });
    const speedGroupPracticum = page.getByRole("radiogroup", { name: "Kecepatan simulasi" });
    await expect(speedGroupPracticum).toBeVisible();
    for (const s of speeds) {
      await expect(speedGroupPracticum.getByRole("radio", { name: new RegExp(s) })).toBeVisible();
    }
  });

  test("HKM & HKEM: Animation at 0.25x maintains smooth FPS (>= 50 FPS)", async ({ page }) => {
    await page.goto("/explore/mekanika/hkm", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Switch to 0.25x
    const speedGroup = page.getByRole("radiogroup", { name: "Kecepatan simulasi" });
    await speedGroup.getByRole("radio", { name: /0,25×/ }).click();

    // Start simulation
    const playBtn = page.locator("[data-testid='btn-play']");
    await playBtn.click();

    // Measure FPS over 1.5 seconds
    const fps = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();
        function loop(now: number) {
          frames++;
          if (now - start >= 1500) {
            resolve(frames / ((now - start) / 1000));
          } else {
            requestAnimationFrame(loop);
          }
        }
        requestAnimationFrame(loop);
      });
    });

    console.log(`HKM 0.25x Animation FPS: ${fps.toFixed(1)}`);
    expect(fps).toBeGreaterThanOrEqual(50);
  });

  test("ExperimentTimer continues real-time seconds ticking at 0.25x playback speed", async ({ page }) => {
    await page.goto("/praktikum/hkm", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // 1. Advance from INTRO to SETUP where ExperimentTimer is rendered
    const nextBtn = page.locator("[data-testid='practicum-next-step']");
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // 2. Locate ExperimentTimer and start it
    const timer = page.locator("[aria-label='Timer percobaan']");
    await expect(timer).toBeVisible();

    const startTimerBtn = page.getByLabel("Mulai timer");
    await expect(startTimerBtn).toBeVisible();
    await startTimerBtn.click();

    // 3. Switch simulation playback speed to 0.25x
    const speedGroup = page.getByRole("radiogroup", { name: "Kecepatan simulasi" });
    await expect(speedGroup).toBeVisible();
    await speedGroup.getByRole("radio", { name: /0,25×/ }).click();

    // 4. Read initial timer time
    const timeDisplay = timer.locator("div[aria-live='polite']");
    await expect(timeDisplay).toBeVisible();

    const parseSeconds = (str: string) => {
      const parts = str.match(/(\d{2}):(\d{2})/);
      return parts ? parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10) : 0;
    };

    const initialSec = parseSeconds(await timeDisplay.innerText());

    // 5. Start simulation at 0.25x
    const playBtn = page.locator("[data-testid='btn-play']");
    await playBtn.click();

    // 6. Wait 2.2 real seconds
    await page.waitForTimeout(2200);

    // 7. Verify timer display has incremented in real time (approx 2s)
    const finalSec = parseSeconds(await timeDisplay.innerText());
    expect(finalSec).toBeGreaterThanOrEqual(initialSec + 2);
  });
});
