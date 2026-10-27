import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop (1280x800)", width: 1280, height: 800 },
  { name: "Tablet (768x1024)", width: 768, height: 1024 },
  { name: "Mobile (375x667)", width: 375, height: 667 },
];

test.describe("Practicum SSG (Wave Optics) - E2E Smoke & Responsiveness", () => {
  for (const vp of VIEWPORTS) {
    test(`[${vp.name}] loads cleanly with zero unhandled console errors`, async ({ page }) => {
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
      await page.goto("/praktikum/ssg");
      await page.waitForLoadState("domcontentloaded");

      // Verify title & core elements are rendered
      await expect(page.getByRole("heading", { name: /Sifat-Sifat Gelombang/i }).first()).toBeVisible();
      await expect(page.getByText(/Ringkasan Teori & Formulasi Celah Majemuk/i)).toBeVisible();
      await expect(page.getByText(/n\(Ts\) = N - 2/i)).toBeVisible();

      // Ensure zero unhandled console errors
      expect(consoleErrors).toHaveLength(0);
    });
  }

  test("Complete 6-Stage Practicum Flow: Intro -> Setup Gating -> 3 Slits Experiment -> Calculation Tables -> Evaluation -> Review", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/praktikum/ssg");
    await page.waitForLoadState("domcontentloaded");

    const nextBtn = page.getByTestId("practicum-next-step");

    // ─── TAHAP 1: INTRO ───
    await expect(page.getByText(/Ringkasan Teori & Formulasi Celah Majemuk/i)).toBeVisible();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // ─── TAHAP 2: SETUP (Rangkai Alat) ───
    await expect(page.getByText(/Tahap 2: Rangkai Alat & Penyelarasan Optis/i)).toBeVisible();
    // Next is gated initially
    await expect(nextBtn).toBeDisabled();

    // Complete all 5 assembly steps
    await page.getByRole("button", { name: /Pasang Komponen/i }).click();
    await page.getByRole("button", { name: /Atur L = 1,6 m/i }).click();
    await page.getByRole("button", { name: /Nyalakan & Dimmer 100%/i }).click();
    await page.getByRole("button", { name: /Sejajarkan Berkas/i }).click();
    await page.getByRole("button", { name: /Jepitkan Kertas/i }).click();

    // Verification banner appears
    await expect(page.getByText(/Seluruh prosedur perakitan 4\.1 terpenuhi!/i)).toBeVisible();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // ─── TAHAP 3: SIMULATION (Eksperimen 3 Celah) ───
    await expect(page.getByText(/Layar Proyeksi Milimeter Blok/i)).toBeVisible();
    // Unlabeled student sketch is present
    await expect(page.getByText(/Sketsa Pola Garis Terang \(Buku Jurnal Praktikan\)/i)).toBeVisible();
    // Labeled intensity graph must NOT be visible here
    await expect(page.getByText(/Profil Intensitas Fraunhofer Berlabel \(Pembanding Analitik\)/i)).toHaveCount(0);

    // 1. Celah II: Auto-assist peaks & copy to table
    const assistAllBtn = page.getByRole("button", { name: /Bantu Semua Puncak/i });
    await assistAllBtn.click();
    const copyTableBtn = page.getByRole("button", { name: /Salin Pengukuran ke Kolom y_praktikum/i });
    await copyTableBtn.click();
    await expect(page.getByText(/Data pengukuran Celah II berhasil disalin/i)).toBeVisible();

    // 2. Celah III: switch tab & copy
    await page.getByRole("button", { name: "Celah III (N=3)" }).click();
    await assistAllBtn.click();
    await copyTableBtn.click();
    await expect(page.getByText(/Data pengukuran Celah III berhasil disalin/i)).toBeVisible();

    // 3. Celah IIIII: switch tab & copy
    await page.getByRole("button", { name: "Celah IIIII (N=5)" }).click();
    await assistAllBtn.click();
    await copyTableBtn.click();
    await expect(page.getByText(/Data pengukuran Celah IIIII berhasil disalin/i)).toBeVisible();

    // Progress counter shows 3 / 3
    await expect(page.getByText("3 / 3 Celah Selesai")).toBeVisible();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // ─── TAHAP 4: ANALYSIS (Perhitungan Mandiri) ───
    await expect(page.getByText(/Tahap 4: Perhitungan Mandiri Siswa/i)).toBeVisible();
    await expect(page.getByText(/Tabel 11\.1: Celah II \(N=2\)/i)).toBeVisible();

    // For T0, KSR is "-"
    const firstRowKsr = page.locator("tr").filter({ hasText: "T0" }).locator("td").filter({ hasText: "-" });
    await expect(firstRowKsr.first()).toBeVisible();

    // Test Bantu Lengkapi button on active table
    const bantuLengkapiBtn = page.getByRole("button", { name: /Bantu Lengkapi/i });
    await bantuLengkapiBtn.click();
    await expect(page.getByText(/Hasil Validasi Perhitungan/i)).toBeVisible();

    // Toggle reference accordion
    const toggleRefBtn = page.getByRole("button", { name: /Kunci Referensi Sistem/i });
    await toggleRefBtn.click();
    await expect(page.getByText(/Kunci Referensi Nilai Teori & KSR/i)).toBeVisible();

    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // ─── TAHAP 5: QUESTIONS (Evaluasi & Kesimpulan) ───
    await expect(page.getByText(/Tahap 5: Evaluasi & Penarikan Kesimpulan Ilmiah/i)).toBeVisible();

    // Fill both questions before submitting
    const q1Textarea = page.locator("textarea").nth(0);
    await q1Textarea.fill("Pola interferensi akan melebar karena jarak terang berbanding lurus dengan L");
    const q2Textarea = page.locator("textarea").nth(1);
    await q2Textarea.fill("Pola pita terang akan menyempit semakin rapat karena sebanding dengan L");

    // Submit Q1
    await page.getByRole("button", { name: /Periksa Jawaban/i }).first().click();
    await expect(page.getByText(/Jawaban Benar!/i)).toHaveCount(1);

    // Submit Q2
    await page.getByRole("button", { name: /Periksa Jawaban/i }).first().click();
    await expect(page.getByText(/Jawaban Benar!/i)).toHaveCount(2);

    // Both questions answered -> Next enabled
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // ─── TAHAP 6: REVIEW (Ringkasan Akhir) ───
    await expect(page.getByText(/Laporan Akhir: Karakteristik Gelombang Cahaya pada Celah Majemuk/i)).toBeVisible();
    await expect(page.getByText("3 / 3 Celah Lengkap")).toBeVisible();

    // Now labeled intensity graph is explicitly visible!
    await expect(page.getByText(/Profil Intensitas Fraunhofer Berlabel \(Pembanding Analitik\)/i)).toBeVisible();

    // Neutral explanation panel on N=5 secondary peak shift
    await expect(page.getByText(/Catatan Fisika: Mengapa KSR Terang Sekunder N = 5 Lebih Besar\?/i)).toBeVisible();
    await expect(page.getByText(/0,5869 mm \(T1\)/i)).toBeVisible();

    // Comparison table
    await expect(page.getByText(/Perbandingan Nilai: Fraunhofer Sebenarnya vs Rumus Modul/i)).toBeVisible();
  });
});
