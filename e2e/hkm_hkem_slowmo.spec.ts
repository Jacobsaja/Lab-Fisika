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

  test("Atwood Manual Stopwatch: at 0.25x speed, stopwatch advances according to simulation time, not wall-clock time", async ({ page }) => {
    await page.goto("/praktikum/atwood-glbb", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // 1. Advance to Tab 2: GLBB (m3) where AtwoodApparatus controls and digital counter are mounted
    const tabM3 = page.locator("button[data-testid='tab-glbb-m3']");
    await expect(tabM3).toBeVisible();
    await tabM3.click();
    await page.waitForTimeout(500);

    // 2. Select 0.25x playback speed
    const speedGroup = page.getByRole("radiogroup", { name: "Kecepatan simulasi" });
    await expect(speedGroup).toBeVisible();
    await speedGroup.getByRole("radio", { name: /0,25×/ }).click();

    // 3. Locate digital counter readout and manual START button
    const startBtn = page.getByRole("button", { name: /^START$/ });
    await expect(startBtn).toBeVisible();

    // 4. Start manual stopwatch
    await startBtn.click();

    // 5. Wait 1600ms wall-clock time
    await page.waitForTimeout(1600);

    // 6. Stop manual stopwatch
    const stopBtn = page.getByRole("button", { name: /^STOP$/ });
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();

    // 7. Read counter value: at 0.25x, 1.6s wall time should be ~0.40s simulation time (NOT ~1.60s)
    const counterReadout = page.locator("span.font-mono.text-4xl, span.font-mono.text-5xl").first();
    await expect(counterReadout).toBeVisible();
    const recordedText = (await counterReadout.innerText()).trim();
    const recordedVal = parseFloat(recordedText);

    console.log(`Atwood manual stopwatch at 0.25x for 1.6s wall time: recorded = ${recordedVal}s`);

    // In simulation time: ~0.40s. If wall-clock were used, it would be ~1.60s.
    expect(recordedVal).toBeGreaterThanOrEqual(0.25);
    expect(recordedVal).toBeLessThan(0.70);
  });
});
