import { test, expect } from "@playwright/test";

test.describe("A. HALAMAN /praktikum E2E", () => {
  test("direct navigation to /praktikum succeeds and renders module index without 404", async ({ page }) => {
    const response = await page.goto("/praktikum");
    expect(response?.status()).toBe(200);

    await expect(page.locator("h1")).toContainText("Praktikum Virtual Terpandu");
    await expect(page.locator("text=MODE PRAKTIKUM")).toBeVisible();

    // Available cards have links
    const gjbLink = page.locator('a[href="/praktikum/gjb"]');
    await expect(gjbLink).toBeVisible();

    // Segera hadir cards do not have links
    const soonBadge = page.locator("text=Segera Hadir").first();
    await expect(soonBadge).toBeVisible();
  });

  test("clicking PRAKTIKUM link from homepage navbar navigates to /praktikum successfully", async ({ page }) => {
    await page.goto("/");

    // Bypass splash screen if present
    const enterBtn = page.locator("button:has-text('INISIASI SIMULASI')");
    if (await enterBtn.isVisible()) {
      await enterBtn.click();
    }

    const praktikumLink = page.locator("header nav a:has-text('PRAKTIKUM')");
    await expect(praktikumLink).toBeVisible();
    await praktikumLink.click();

    await expect(page).toHaveURL(/\/praktikum$/);
    await expect(page.locator("h1")).toContainText("Praktikum Virtual Terpandu");
  });
});
