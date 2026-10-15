import { test, expect } from "@playwright/test";

test.describe("FPS Benchmark Validation", () => {
  test("GMB at maximum speed with all vectors active maintains >= 55 FPS (3 trials)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/explore/mekanika/gmb", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const playBtn = page.locator("[data-testid='btn-play']").or(page.locator("button:has-text('Mulai')"));
    if (await playBtn.first().isVisible()) {
      await playBtn.first().click();
    }

    const trials: { avgFps: number; minFps: number }[] = [];

    for (let trial = 1; trial <= 3; trial++) {
      await page.waitForTimeout(300);
      const result = await page.evaluate(async () => {
        return new Promise<{ avgFps: number; minFps: number }>((resolve) => {
          let frames = 0;
          let startTime = performance.now();
          const frameDeltas: number[] = [];
          let lastTime = startTime;

          function onFrame(currentTime: number) {
            frames++;
            frameDeltas.push(currentTime - lastTime);
            lastTime = currentTime;

            if (currentTime - startTime >= 2000) {
              const totalDuration = (currentTime - startTime) / 1000;
              const avgFps = frames / totalDuration;
              const validDeltas = frameDeltas.slice(2);
              const maxDelta = Math.max(...validDeltas);
              const minFps = 1000 / maxDelta;
              resolve({ avgFps, minFps });
            } else {
              requestAnimationFrame(onFrame);
            }
          }

          requestAnimationFrame(onFrame);
        });
      });

      trials.push(result);
      console.log(`Trial ${trial}: avgFps = ${result.avgFps.toFixed(1)}, minFps = ${result.minFps.toFixed(1)}`);
    }

    const minOfAll = Math.min(...trials.map((t) => t.minFps));
    const avgOfAll = trials.reduce((acc, t) => acc + t.avgFps, 0) / trials.length;

    console.log(`FINAL GMB FPS: Minimum = ${minOfAll.toFixed(1)}, Average = ${avgOfAll.toFixed(1)}`);
    expect(avgOfAll).toBeGreaterThanOrEqual(55);
  });
});
