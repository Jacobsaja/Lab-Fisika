import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop (1440px)", width: 1440, height: 900 },
  { name: "Tablet (768px)", width: 768, height: 1024 },
  { name: "Mobile (375px)", width: 375, height: 667 },
];

test.describe("Spike Evaluation: OpticalBench3D (/dev/optical-bench-3d)", () => {
  for (const vp of VIEWPORTS) {
    test(`renders cleanly across ${vp.name} without console errors and non-empty canvas`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/dev/optical-bench-3d");
      await page.waitForLoadState("domcontentloaded");

      // Verify header & title
      await expect(page.getByText(/Bangku Optik 3D \(React Three Fiber\)/i).first()).toBeVisible();

      // Verify 3D canvas container is attached and non-empty
      const canvasContainer = page.locator('[data-testid="optical-bench-3d-canvas"]');
      await expect(canvasContainer).toBeVisible();

      const box = await canvasContainer.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(300);
      expect(box!.height).toBeGreaterThan(200);

      // Verify canvas element exists inside container
      const canvasEl = canvasContainer.locator("canvas");
      await expect(canvasEl).toBeVisible();

      // Read pixel / dataURL to verify canvas is rendered and not blank
      const isCanvasNonEmpty = await canvasEl.evaluate((canvas: HTMLCanvasElement) => {
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (!gl) return false;
        // Verify buffer has non-zero width & height
        return canvas.width > 0 && canvas.height > 0;
      });
      expect(isCanvasNonEmpty).toBe(true);

      // Check console is completely clean of errors
      expect(consoleErrors).toHaveLength(0);
    });
  }

  test("interactive controls: camera presets and graceful 2.5D fallback toggle", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dev/optical-bench-3d");
    await page.waitForLoadState("domcontentloaded");

    // 1. Switch camera presets
    const sideBtn = page.getByRole("button", { name: "Samping" });
    await sideBtn.click({ force: true });
    await expect(sideBtn).toHaveAttribute("aria-pressed", "true");

    const topBtn = page.getByRole("button", { name: "Tampak Atas" });
    await topBtn.click({ force: true });
    await expect(topBtn).toHaveAttribute("aria-pressed", "true");

    // 2. Toggle WebGL simulation off -> triggers 2.5D fallback
    const fallbackToggleBtn = page.getByRole("button", { name: /Uji Cadangan \(Matikan WebGL\)/i });
    await fallbackToggleBtn.click();

    // Fallback banner and 2.5D apparatus appear
    await expect(page.getByText(/Mode simulasi cadangan aktif/i)).toBeVisible();
    await expect(page.getByText(/^Bangku Optik$/i).first()).toBeVisible();

    // Toggle back to 3D
    await page.getByRole("button", { name: /Mode Cadangan 2\.5D Aktif/i }).click();
    await expect(page.locator('[data-testid="optical-bench-3d-canvas"]')).toBeVisible();
  });
});
