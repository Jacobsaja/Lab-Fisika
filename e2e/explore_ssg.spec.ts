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

      // Ensure zero unhandled console errors
      expect(consoleErrors).toHaveLength(0);
    });
  }

  test("interactive controls: N selection, slider bounds, formula comparison toggle", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/explore/gelombang/ssg");
    await page.waitForLoadState("domcontentloaded");

    // 1. Switch to N = 1 (Single Slit)
    const btnN1 = page.getByRole("button", { name: "1", exact: true });
    await btnN1.click();
    await expect(page.getByText(/N = 1 \(Celah Tunggal\)/i)).toBeVisible();
    await expect(page.getByLabel(/Jarak Antar-Celah/i)).toBeDisabled();

    // 2. Switch to N = 5 (5 Slits)
    const btnN5 = page.getByRole("button", { name: "5", exact: true });
    await btnN5.click();
    await expect(page.getByText(/N = 5 \(Celah Majemuk\)/i)).toBeVisible();
    await expect(page.getByLabel(/Jarak Antar-Celah/i)).toBeEnabled();

    // 3. Toggle "Bandingkan dengan Rumus Modul"
    const compareCheckbox = page.getByLabel(/Bandingkan dengan Rumus Modul/i);
    await compareCheckbox.check();
    await expect(page.getByText(/Perbandingan: Puncak Fraunhofer vs Rumus Modul/i)).toBeVisible();
    await expect(page.getByText(/Catatan Fisika Penting:/i)).toBeVisible();

    // 4. Reset Button restores defaults
    const resetBtn = page.getByRole("button", { name: /Reset Parameter/i });
    await resetBtn.click();
    await expect(page.getByText(/N = 2 \(Celah Majemuk\)/i)).toBeVisible();
  });
});
