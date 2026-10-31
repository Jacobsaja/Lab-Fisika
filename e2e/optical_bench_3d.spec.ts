import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop (1440px)", width: 1440, height: 900 },
  { name: "Tablet (768px)", width: 768, height: 1024 },
  { name: "Mobile (375px)", width: 375, height: 667 },
];

test.describe("Explore SSG: OpticalBench3D Integration (/explore/gelombang/ssg)", () => {
  for (const vp of VIEWPORTS) {
    test(`renders 3D bench cleanly across ${vp.name} with camera presets, projected labels (>=12px), and zero console errors`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/explore/gelombang/ssg");
      await page.waitForLoadState("domcontentloaded");

      // Switch from default 2.5D to 3D
      const btn3D = page.getByRole("button", { name: "Tampilan Bangku Optik 3D" });
      await btn3D.click();
      await expect(btn3D).toHaveAttribute("aria-pressed", "true");

      // Verify 3D canvas container is visible and has dynamic aria-label
      const canvasContainer = page.locator('[data-testid="optical-bench-3d-canvas"]');
      await expect(canvasContainer).toBeVisible();
      await expect(canvasContainer).toHaveAttribute("role", "img");
      await expect(canvasContainer).toHaveAttribute("aria-label", /632 nm.*N = 2.*L = 1\.60 m.*laser Aktif/i);

      const canvasEl = canvasContainer.locator("canvas");
      await expect(canvasEl).toBeVisible();

      const isCanvasNonEmpty = await canvasEl.evaluate((canvas: HTMLCanvasElement) => {
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (!gl) return false;
        return canvas.width > 0 && canvas.height > 0;
      });
      expect(isCanvasNonEmpty).toBe(true);

      // Verify projected HTML labels have font-size >= 12px
      const minFontSize = await page.evaluate(() => {
        const ids = [
          "label-3d-a",
          "label-3d-d",
          "label-3d-L",
          "label-3d-laser",
          "label-3d-slit",
          "label-3d-screen",
          "label-3d-rail-0",
          "label-3d-rail-150",
          "label-3d-rail-300",
        ];
        return Math.min(
          ...ids.map((id) => {
            const el = document.querySelector(`[data-testid="${id}"]`);
            return el ? parseFloat(window.getComputedStyle(el).fontSize) : 0;
          })
        );
      });
      expect(minFontSize).toBeGreaterThanOrEqual(12);

      // Switch through all 3 camera presets without console errors
      const sideBtn = page.getByRole("button", { name: "Preset kamera Samping" });
      await sideBtn.click();
      await expect(sideBtn).toHaveAttribute("aria-pressed", "true");

      const topBtn = page.getByRole("button", { name: "Preset kamera Tampak Atas" });
      await topBtn.click();
      await expect(topBtn).toHaveAttribute("aria-pressed", "true");

      const obliqueBtn = page.getByRole("button", { name: "Preset kamera Serong (3/4)" });
      await obliqueBtn.click();
      await expect(obliqueBtn).toHaveAttribute("aria-pressed", "true");

      expect(consoleErrors).toHaveLength(0);
    });
  }

  test("WebGL beam pixel color follows lambda (400 nm violet-blue vs 700 nm red) and disappears when laser is off", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/explore/gelombang/ssg");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Tampilan Bangku Optik 3D" }).click();
    const canvasEl = page.locator('[data-testid="optical-bench-3d-canvas"] canvas');
    await expect(canvasEl).toBeVisible();

    // Switch to Samping preset so the beam runs horizontally across the exact center of the canvas
    await page.getByRole("button", { name: "Preset kamera Samping" }).click();
    await page.waitForTimeout(450);

    const sampleBeamPixels = async () => {
      return canvasEl.evaluate((canvas: HTMLCanvasElement) => {
        const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
        if (!gl) return { maxR: 0, maxG: 0, maxB: 0, bestR: 0, bestG: 0, bestB: 0 };

        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        // Sample a tight band around (w/2, h/2) strictly on the optical axis (between slit X=0 and screen X=L, above rail Y=0.018)
        const sampleW = Math.min(80, Math.floor(w * 0.15));
        const sampleH = Math.min(28, Math.floor(h * 0.08));
        const startX = Math.floor((w - sampleW) / 2);
        const startY = Math.floor((h - sampleH) / 2);

        const buf = new Uint8Array(sampleW * sampleH * 4);
        gl.readPixels(startX, startY, sampleW, sampleH, gl.RGBA, gl.UNSIGNED_BYTE, buf);

        let maxLum = -1;
        let bestR = 0,
          bestG = 0,
          bestB = 0;
        let maxR = 0,
          maxG = 0,
          maxB = 0;

        for (let i = 0; i < buf.length; i += 4) {
          const r = buf[i];
          const g = buf[i + 1];
          const b = buf[i + 2];
          if (r > maxR) maxR = r;
          if (g > maxG) maxG = g;
          if (b > maxB) maxB = b;
          const lum = r + g + b;
          if (lum > maxLum) {
            maxLum = lum;
            bestR = r;
            bestG = g;
            bestB = b;
          }
        }
        return { maxR, maxG, maxB, bestR, bestG, bestB };
      });
    };

    // 1. Set lambda = 400 nm (Blue-Violet: #8b5cf6 -> R=139, G=92, B=246)
    const lambdaSlider = page.locator("#slider-lambda");
    await lambdaSlider.fill("400");
    await page.waitForTimeout(150);

    const px400 = await sampleBeamPixels();
    expect(px400.bestB).toBeGreaterThan(100);
    expect(px400.bestB).toBeGreaterThan(px400.bestR);
    expect(px400.bestB).toBeGreaterThan(px400.bestG);

    // 2. Set lambda = 700 nm (Red: #ef4444 -> R=239, G=68, B=68)
    await lambdaSlider.fill("700");
    await page.waitForTimeout(150);

    const px700 = await sampleBeamPixels();
    expect(px700.bestR).toBeGreaterThan(120);
    expect(px700.bestR).toBeGreaterThan(px700.bestB * 1.5);
    expect(px700.bestR).toBeGreaterThan(px700.bestG * 1.5);

    // 3. Turn laser off -> no bright beam pixels in the central optical axis region
    const laserSwitch = page.getByRole("switch", { name: /Saklar Laser/i });
    await laserSwitch.click();
    await expect(laserSwitch).toHaveAttribute("aria-checked", "false");
    await page.waitForTimeout(150);

    const pxOff = await sampleBeamPixels();
    expect(pxOff.maxR).toBeLessThan(40);
    expect(pxOff.maxG).toBeLessThan(40);
    expect(pxOff.maxB).toBeLessThan(50);
  });
});
