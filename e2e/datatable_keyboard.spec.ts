import { test, expect } from "@playwright/test";

test.describe("1. DataTable Keyboard Only Data Entry E2E", () => {
  test("fills 10 rows in data table using keyboard navigation only", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/praktikum/gjb");
    await page.waitForLoadState("domcontentloaded");

    // Advance to SIMULATION step
    // 1. INTRO -> SETUP
    await page.getByRole("button", { name: /Selanjutnya/i }).click();
    // 2. SETUP -> SIMULATION
    await page.getByRole("button", { name: /Selanjutnya/i }).click();

    // Ensure data drawer is open
    const drawerOpen = page.getByTestId("data-drawer-open");
    await expect(drawerOpen).toBeVisible();

    // Click "+ Tambah Baris" once to initiate the first row
    await page.getByRole("button", { name: /\+ Tambah Baris/i }).first().click();

    // Focus first editable cell button
    const firstCell = page.getByRole("button", { name: /Edit/i }).first();
    await firstCell.focus();

    // Fill 10 rows using only keyboard:
    // Rows 1-9: type value and press Enter to commit & advance/append next row
    for (let i = 1; i <= 9; i++) {
      await page.keyboard.type((i * 10).toString());
      await page.keyboard.press("Enter");
      await page.waitForTimeout(50);
    }
    // Row 10: type value and press ArrowUp to commit and navigate up
    await page.keyboard.type("100");
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(50);

    // Verify exactly 10 rows exist in the data table
    const tableRows = page.locator("table[role='grid'] tbody tr");
    await expect(tableRows).toHaveCount(10);

    // Verify first row contains "10" and tenth row contains "100"
    await expect(tableRows.first()).toContainText("10");
    await expect(tableRows.nth(9)).toContainText("100");
  });
});
