import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop (1280x800)", width: 1280, height: 800 },
  { name: "Tablet (768x1024)", width: 768, height: 1024 },
  { name: "Mobile (375x667)", width: 375, height: 667 },
];

test.describe("Explore Wave Optics (SSG) - E2E Smoke & Responsiveness", () => {
  for (const vp of VIEWPORTS) {
    test(`[${vp.name}] loads cleanly with zero console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on("console", (msg) => {
        const text = msg.text();
        if (
          text.includes("Download the React DevTools") ||
          text.includes("Fast Refresh") ||
          text.includes("[HMR]") ||
          text.includes("favicon.ico") ||
          text.includes("Failed to load resource")
        ) {
          return;
        }
        if (msg.type() === "error") {
          consoleErrors.push(text);
        }
      });

      page.on("pageerror", (err) => {
        consoleErrors.push(err.message);
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/explore/gelombang/ssg");
      await page.waitForLoadState("domcontentloaded");

      // Verify title & core elements are rendered
      await expect(page.getByRole("heading", { name: /Sifat-Sifat Gelombang/i })).toBeVisible();
      await expect(page.getByText("Panel Keluaran Numerik")).toBeVisible();

      // Verify ScreenPatternView has single clean header and NO marker pins/presets in Explore
      await expect(page.getByText("Layar Proyeksi", { exact: true })).toBeVisible();
      await expect(page.getByText(/1 kotak = 1 mm/i)).toBeVisible();
      await expect(page.getByText("1.0× Normal")).toHaveCount(0);
      await expect(page.getByText(/Klik atau seret jarum penanda/i)).toHaveCount(0);

      // Ensure zero unhandled console errors
      expect(consoleErrors).toHaveLength(0);
    });
  }

  test("interactive controls: N selection, slider bounds, formula comparison toggle, hover readout, and zoom", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/explore/gelombang/ssg");
    await page.waitForLoadState("domcontentloaded");

    // 1. Verify hover over screen canvas displays hairline and coordinate readout
    const screenCanvas = page.locator(".cursor-crosshair canvas").first();
    await expect(screenCanvas).toBeVisible();
    await screenCanvas.hover({ position: { x: 500, y: 80 } });
    await expect(page.getByText(/y = /i).first()).toBeVisible();
    await expect(page.getByText(/I\/I0 = /i).first()).toBeVisible();

    // 2. Toggle Kaca Pembesar -> shows "Reset zoom" and "resolusi aktif: 0,1 mm"
    const zoomBtn = page.getByRole("button", { name: /Kaca pembesar/i });
    await zoomBtn.click();
    await expect(page.getByRole("button", { name: /Reset zoom/i })).toBeVisible();
    await expect(page.getByText(/resolusi aktif: 0,1 mm/i)).toBeVisible();

    // Click Reset zoom
    const resetZoomBtn = page.getByRole("button", { name: /Reset zoom/i });
    await resetZoomBtn.click();
    await expect(resetZoomBtn).toBeVisible();

    // Close zoom
    await page.getByRole("button", { name: /Tutup zoom/i }).click();
    await expect(page.getByRole("button", { name: /Reset zoom/i })).toHaveCount(0);

    // 3. Switch to N = 1 (Single Slit)
    const btnN1 = page.getByRole("button", { name: "1", exact: true });
    await btnN1.click();
    await expect(page.getByText(/N = 1 \(Celah Tunggal\)/i)).toBeVisible();
    await expect(page.getByLabel(/Jarak Antar-Celah/i)).toBeDisabled();

    // 4. Switch to N = 5 (5 Slits)
    const btnN5 = page.getByRole("button", { name: "5", exact: true });
    await btnN5.click();
    await expect(page.getByText(/N = 5 \(Celah Majemuk\)/i)).toBeVisible();
    await expect(page.getByLabel(/Jarak Antar-Celah/i)).toBeEnabled();

    // 5. Toggle "Bandingkan dengan Rumus Modul"
    const compareCheckbox = page.getByLabel(/Bandingkan dengan Rumus Modul/i);
    await compareCheckbox.check();
    await expect(page.getByText(/Perbandingan: Puncak Fraunhofer vs Rumus Modul/i)).toBeVisible();
    await expect(page.getByText(/Catatan Fisika Penting:/i)).toBeVisible();

    // 6. Reset Button restores defaults
    const resetBtn = page.getByRole("button", { name: /Reset Parameter/i });
    await resetBtn.click();
    await expect(page.getByText(/N = 2 \(Celah Majemuk\)/i)).toBeVisible();
  });

  test("Interactive Titik P in Explore SSG: toggle, arrow movement, jumping buttons, N=1 disable, and absence in Practicum", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/explore/gelombang/ssg");
    await page.waitForLoadState("domcontentloaded");

    const pointPSlider = page.getByRole("slider", { name: /Titik P/i });
    const monoPanel = page.getByTestId("point-p-mono-panel");
    const geomBtn = page.getByRole("button", { name: /Geometri Sinar/i });

    // 1. Default OFF: initial view is completely clean
    await expect(pointPSlider).toHaveCount(0);
    await expect(monoPanel).toHaveCount(0);
    await expect(geomBtn).toBeVisible();

    // 2. Toggle ON: Point P handle, mono panel, and ray geometry appear
    await geomBtn.click();
    await expect(pointPSlider).toBeVisible();
    await expect(monoPanel).toBeVisible();
    await expect(page.getByTestId("ray-geometry-group")).toBeVisible();

    // Verify mono panel contents (y, theta, delta, delta/lambda, I/I0)
    await expect(monoPanel.getByText(/Δ = d·sin\(θ\):/i)).toBeVisible();
    await expect(monoPanel.getByText(/Δ\/λ:/i)).toBeVisible();

    // 3. Arrow key movement by 0.1 mm
    await pointPSlider.focus();
    const valBefore = parseFloat((await pointPSlider.getAttribute("aria-valuenow")) || "0");
    await page.keyboard.press("ArrowRight");
    const valAfterRight = parseFloat((await pointPSlider.getAttribute("aria-valuenow")) || "0");
    expect(valAfterRight).toBeCloseTo(valBefore + 0.1, 1);

    await page.keyboard.press("ArrowLeft");
    const valAfterLeft = parseFloat((await pointPSlider.getAttribute("aria-valuenow")) || "0");
    expect(valAfterLeft).toBeCloseTo(valBefore, 1);

    // 4. Jumping buttons: jump to next/previous primary peaks
    const jumpNextBtn = page.getByRole("button", { name: /terang.*berikutnya/i });
    const jumpPrevBtn = page.getByRole("button", { name: /terang.*sebelumnya/i });
    await jumpNextBtn.click();
    const valAfterJumpNext = parseFloat((await pointPSlider.getAttribute("aria-valuenow")) || "0");
    expect(valAfterJumpNext).toBeGreaterThan(valBefore);

    await jumpPrevBtn.click();
    const valAfterJumpPrev = parseFloat((await pointPSlider.getAttribute("aria-valuenow")) || "0");
    expect(valAfterJumpPrev).toBeLessThan(valAfterJumpNext);

    // 5. N = 1 disables Point P
    await page.getByRole("button", { name: "1", exact: true }).click();
    await expect(page.getByText(/Celah tunggal \(N = 1\): Fitur Titik P interferensi celah majemuk dinonaktifkan/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /terang.*berikutnya/i })).toHaveCount(0);

    // 6. Practicum SSG check: Point P and Geometri Sinar must NOT appear in Practicum
    await page.goto("/praktikum/ssg");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("slider", { name: /Titik P/i })).toHaveCount(0);
    await expect(page.getByTestId("point-p-mono-panel")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Geometri Sinar/i })).toHaveCount(0);
  });
});
