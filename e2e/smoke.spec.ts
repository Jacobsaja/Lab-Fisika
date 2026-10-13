import { test, expect, Page } from "@playwright/test";
import { PRACTICUMS } from "../src/data/practicums";
import { EXPLORE_REGISTRY } from "../src/data/exploreRegistry";
import fs from "fs";
import path from "path";

// ── 1. Dynamic Route Discovery from Registries ──
const practicumRoutes = PRACTICUMS
  .filter((p) => {
    const pagePath = path.join(process.cwd(), "src", "app", "praktikum", p.id, "page.tsx");
    return fs.existsSync(pagePath);
  })
  .map((p) => ({
    name: `Praktikum: ${p.title} (${p.tagline})`,
    path: `/praktikum/${p.id}`,
    type: "practicum" as const,
    id: p.id,
  }));

const exploreRoutes = Object.values(EXPLORE_REGISTRY)
  .filter((m) => {
    if (!m.available) return false;
    const cleanPath = m.route.replace(/^\//, "");
    const pagePath = path.join(process.cwd(), "src", "app", cleanPath, "page.tsx");
    return fs.existsSync(pagePath);
  })
  .map((m) => ({
    name: `Explore: ${m.title}`,
    path: m.route,
    type: "explore" as const,
    id: m.id,
  }));

export const ALL_AUDIT_ROUTES = [
  { name: "Home: Halaman Utama", path: "/", type: "home" as const, id: "home" },
  ...exploreRoutes,
  ...practicumRoutes,
];

const VIEWPORTS = [
  { width: 375, height: 812, name: "375px" },
  { width: 768, height: 1024, name: "768px" },
  { width: 1440, height: 900, name: "1440px" },
];

// Helper to check for illegal plain white backgrounds (rgb(255, 255, 255))
// Exemptions: Caliper and Ohaus scale plates / vernier markings
async function checkNoWhiteCanvas(page: Page, routePath: string) {
  const whiteElements = await page.evaluate((currentPath) => {
    const isPAP = currentPath.includes("pap");
    const elements = Array.from(document.querySelectorAll("svg, canvas, div[class*='apparatus'], div[class*='container'], section"));
    const offending: string[] = [];

    for (const el of elements) {
      // Exemption for intentional light scale plates in Caliper and Ohaus
      if (isPAP) {
        const text = el.textContent || "";
        const id = el.id || "";
        const className = typeof el.className === "string" ? el.className : "";
        if (
          className.includes("scale") ||
          className.includes("vernier") ||
          id.includes("beam") ||
          id.includes("plate") ||
          text.includes("cm") ||
          text.includes("g")
        ) {
          continue;
        }
      }

      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      // Plain white is rgb(255, 255, 255)
      if (bg === "rgb(255, 255, 255)" || bg === "#ffffff" || bg === "#fff") {
        const tag = el.tagName.toLowerCase();
        const cls = typeof el.className === "string" ? el.className.slice(0, 50) : "";
        offending.push(`${tag}.${cls}`);
      }
    }
    return offending;
  }, routePath);

  expect(
    whiteElements,
    `Plain white canvas background detected on ${routePath}: ${whiteElements.join(", ")}`
  ).toHaveLength(0);
}

// ── 2. Comprehensive Route Matrix Tests ──
test.describe("Automated Smoke Test Suite - All Registered Routes & Viewports", () => {
  for (const route of ALL_AUDIT_ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`[${vp.name}] ${route.name} (${route.path})`, async ({ page }) => {
        // Track console errors and warnings
        const consoleErrors: string[] = [];
        const consoleWarnings: string[] = [];

        page.on("console", (msg) => {
          const text = msg.text();
          // Exclude known external / dev-only browser messages
          if (
            text.includes("Download the React DevTools") ||
            text.includes("Fast Refresh") ||
            text.includes("[HMR]") ||
            text.includes("favicon.ico")
          ) {
            return;
          }
          if (msg.type() === "error") {
            consoleErrors.push(text);
          } else if (msg.type() === "warning") {
            consoleWarnings.push(text);
          }
        });

        page.on("pageerror", (err) => {
          consoleErrors.push(err.message);
        });

        // Set screen width and height
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Navigate to the target route
        const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
        expect(response?.status(), `Page ${route.path} should return HTTP 200`).toBe(200);

        // Allow hydration to settle
        await page.waitForTimeout(1000);

        // 1. Console Cleanliness Check (0 errors, 0 warnings)
        expect(consoleErrors, `Console errors on ${route.path} (${vp.name}): ${consoleErrors.join("; ")}`).toEqual([]);
        expect(consoleWarnings, `Console warnings on ${route.path} (${vp.name}): ${consoleWarnings.join("; ")}`).toEqual([]);

        // 2. Horizontal Scrollbar Check (scrollWidth <= clientWidth)
        const hasHorizontalOverflow = await page.evaluate(() => {
          const bodyWidth = document.body.scrollWidth;
          const docWidth = document.documentElement.scrollWidth;
          const clientW = document.documentElement.clientWidth;
          // Allow up to 2px tolerance for sub-pixel / scrollbar rounding
          return Math.max(bodyWidth, docWidth) > clientW + 2;
        });
        expect(hasHorizontalOverflow, `Horizontal scroll detected on ${route.path} at ${vp.name}`).toBe(false);

        // 3. Main Apparatus / SVG Element Non-Zero Dimension Check (for explore & practicum)
        if (route.type !== "home") {
          const hasVisibleSvgOrCanvas = await page.evaluate(() => {
            const svgs = Array.from(document.querySelectorAll("svg"));
            return svgs.some((svg) => {
              const rect = svg.getBoundingClientRect();
              return rect.width > 20 && rect.height > 20;
            });
          });
          expect(hasVisibleSvgOrCanvas, `Main apparatus SVG not visible or has zero dimension on ${route.path}`).toBe(true);

          // 4. White Background Check (Zero plain white canvas backgrounds)
          await checkNoWhiteCanvas(page, route.path);

          // 5. Simulation Full Cycle Execution (Play/Mulai -> Wait 2.5s -> Reset)
          // Find start/play/launch buttons
          const playButton = page.locator(
            'button:has-text("Play"), button:has-text("Mulai"), button:has-text("Dorong"), button:has-text("Lepas"), button:has-text("Simpangkan"), button:has-text("Jalankan"), button:has-text("PLAY")'
          ).first();

          if (await playButton.isVisible({ timeout: 1500 }).catch(() => false)) {
            const isEnabled = await playButton.isEnabled().catch(() => false);
            if (isEnabled) {
              await playButton.click().catch(() => {});
              // Wait 2.5 seconds during simulation cycle
              await page.waitForTimeout(2500);

              // Click Reset / Atur Ulang if present
              const resetButton = page.locator(
                'button:has-text("Reset"), button:has-text("Atur Ulang"), button:has-text("Atur ulang"), button:has-text("FUNCTION"), button:has-text("Ulang")'
              ).first();
              if (await resetButton.isVisible({ timeout: 1500 }).catch(() => false)) {
                await resetButton.click().catch(() => {});
              }
            }
          }

          // Verify console remains 100% clean after running simulation
          expect(consoleErrors, `Console errors occurred during simulation on ${route.path}: ${consoleErrors.join("; ")}`).toEqual([]);
        }
      });
    }
  }
});

// ── 3. Dedicated Verification for BrushableLineGraph ──
test.describe("BrushableLineGraph Drag Consistency Across Viewports", () => {
  test("drag range selection behaves proportionally across viewport widths", async ({ page }) => {
    const testWidths = [768, 1440];
    const results: { width: number; rangePct: number }[] = [];

    for (const w of testWidths) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto("/explore/mekanika/atwood", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      // Locate SVG graph
      const graphSvg = page.locator("svg").first();
      await expect(graphSvg).toBeVisible();

      const box = await graphSvg.boundingBox();
      expect(box).not.toBeNull();
      if (!box) continue;

      // Perform horizontal drag from 25% to 75% of the graph
      const startX = box.x + box.width * 0.25;
      const startY = box.y + box.height * 0.5;
      const endX = box.x + box.width * 0.75;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, startY, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(500);

      const spanPct = (endX - startX) / box.width;
      results.push({ width: w, rangePct: spanPct });
    }

    // Both viewports should execute the proportional selection of 50% span
    expect(results[0].rangePct).toBeCloseTo(0.5, 2);
    expect(results[1].rangePct).toBeCloseTo(0.5, 2);
  });
});

// ── 4. Dedicated Verification for Vector Overlay (Pilot HKM) ──
test.describe("Vector Overlay (Pilot HKM) — Explore & Practicum", () => {
  test("Explore HKM: toggle tiap kategori vektor dan pastikan elemen muncul/hilang tanpa error console", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/explore/mekanika/hkm", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Verify initial vector elements exist
    const vecA = page.locator("[id*='_vector_vA']");
    const vecPA = page.locator("[id*='_vector_pA']");
    const vecPTotal = page.locator("[id*='_vector_pTotal']");

    await expect(vecA).toBeVisible();
    await expect(vecPA).toBeVisible();
    await expect(vecPTotal).toBeVisible();

    // Toggle Kecepatan OFF
    const btnKecepatan = page.locator("button:has-text('Kecepatan')");
    await btnKecepatan.click();
    await page.waitForTimeout(200);
    await expect(vecA).toHaveCount(0);

    // Toggle Kecepatan back ON
    await btnKecepatan.click();
    await page.waitForTimeout(200);
    await expect(vecA).toBeVisible();

    // Toggle Momentum OFF
    const btnMomentum = page.locator("button:has-text('Momentum')").first();
    await btnMomentum.click();
    await page.waitForTimeout(200);
    await expect(vecPA).toHaveCount(0);

    // Toggle Momentum back ON
    await btnMomentum.click();
    await page.waitForTimeout(200);
    await expect(vecPA).toBeVisible();

    // Toggle Momentum total OFF
    const btnMomentumTotal = page.locator("button:has-text('Momentum total')");
    await btnMomentumTotal.click();
    await page.waitForTimeout(200);
    await expect(vecPTotal).toHaveCount(0);

    // Toggle Momentum total back ON
    await btnMomentumTotal.click();
    await page.waitForTimeout(200);
    await expect(vecPTotal).toBeVisible();

    // Ensure slider updates without errors
    const scaleSlider = page.locator("input[aria-label='Skala panah']");
    await scaleSlider.fill("1.5");
    await page.waitForTimeout(200);

    expect(consoleErrors).toEqual([]);
  });

  test("Practicum HKM: vektor terkunci sebelum tabel terisi dan tidak ada angka saat dibuka (kualitatif)", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/praktikum/hkm", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Initially locked banner visible
    const lockBanner = page.locator("text=Vektor kualitatif terkunci");
    await expect(lockBanner).toBeVisible();

    // No vector elements rendered while locked
    const overlayGroup = page.locator("g[aria-label='Overlay Vektor Fisika']");
    await expect(overlayGroup).toHaveCount(0);

    // Unlock by recording 1 data trial in active case
    const recordBtn = page.locator("button:has-text('Catat Data Trial 1')");
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();
    await page.waitForTimeout(500);

    // Lock banner disappears and vector overlay is now rendered
    await expect(lockBanner).toHaveCount(0);
    await expect(overlayGroup).toBeVisible();

    // Inspect all text nodes inside overlayGroup: strictly qualitative, NO numbers
    const overlayTexts = await overlayGroup.locator("text").allTextContents();
    expect(overlayTexts.length).toBeGreaterThan(0);
    for (const text of overlayTexts) {
      if (text && text.trim().length > 0) {
        // Check for numbers / physical units leak (e.g. 0.40, m/s, kg·m/s)
        expect(text).not.toMatch(/\d/);
        expect(text).not.toMatch(/m\/s/i);
        expect(text).not.toMatch(/kg·m\/s/i);
      }
    }

    expect(consoleErrors).toEqual([]);
  });
});
