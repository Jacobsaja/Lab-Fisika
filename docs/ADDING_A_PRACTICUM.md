# Adding a New Practicum Module

This guide details the process of adding a new physics practicum simulation to the Virtual Physics Lab.

## Scope and Responsiveness
**CRITICAL**: Simulasi dan instrumen praktikum dirancang HANYA untuk desktop/laptop (viewport >= 1024px). Tidak dioptimalkan untuk mobile.
- Hal ini karena interaksi alat ukur presisi (seperti skala vernier) membutuhkan ruang layar yang stabil dan luas.
- Halaman non-simulasi (seperti halaman utama, navigasi, dan pemilihan modul praktikum) MASIH HARUS bersifat responsive agar dapat diakses dari mobile untuk proses *browsing*. Namun saat masuk ke `/praktikum/[id]`, scope-nya adalah murni desktop-only.

## Definition of Done (DoD)
Setiap penambahan instrumen/modul baru wajib memenuhi checklist berikut sebelum dianggap selesai:

- [ ] Logika fisika murni dipisahkan ke dalam `src/physics/`.
- [ ] Unit test (`__tests__`) mencakup *edge case* nilai minimum, maksimum, dan pembulatan.
- [ ] Animasi SVG atau Canvas merepresentasikan mekanisme mekanis yang logis (tidak sekadar angka ajaib).
- [ ] UI instrumen telah disimulasikan sesuai dengan aslinya (berikut limitasi jangkauan alatnya).
- [ ] Responsive at 1024/1280/1440 (desktop-only scope; mobile not required for simulation/instrument components).
- [ ] Tidak ada atribut HTML/DOM (seperti `data-value`, `title`) yang membocorkan kunci jawaban/ground truth ke user.

## Backlog & Known Issues
- **DataTable Validation**: Saat ini komponen `DataTable` menggunakan `<input type="text">` murni secara internal tanpa validasi inline yang reaktif. Praktikan baru mengetahui ada kesalahan input (misal tipe non-angka atau penggunaan koma) ketika tombol `Selanjutnya` tidak aktif (karena di-filter via logika `hasEnoughData` pada level *page*). **Action Item (Masa Depan)**: Idealnya perbaikan ini dilakukan SECARA TERPUSAT di komponen `DataTable.tsx` itu sendiri (misalnya *highlight* sel berwarna merah + notifikasi *tooltip* saat proses *parsing* ke angka gagal di *onBlur*), alih-alih ditambal di setiap *page* praktikum, sehingga modul baru apa pun yang menggunakan `DataTable` akan mendapatkan validasi secara seragam.
