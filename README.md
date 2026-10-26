# Lab Fisika Virtual

Laboratorium fisika virtual berbasis web modern untuk simulasi interaktif, eksplorasi parameter bebas, dan praktikum fisika dasar berbasis komputasi numerik presisi tinggi.

Dibangun dengan **Next.js 16** (App Router & Turbopack), **React 19**, **TypeScript**, dan **Tailwind CSS**.

---

## Modul Laboratorium

### 1. Gelombang
- **Sifat-Sifat Gelombang / SSG (`/explore/gelombang/ssg`)**:
  - Simulasi difraksi Fraunhofer dan interferensi celah tunggal serta celah majemuk ($N = 1$ hingga $6$).
  - **Bangku Optik 2.5D**: Pemilihan piringan celah ($N=2, 3, 5$), kontrol jarak celah ke layar $L$ ($0,5\text{--}3,0\text{ m}$), kendali laser semikonduktor ($\lambda = 400\text{--}700\text{ nm}$) dengan dimmer optik.
  - **Layar Proyeksi Milimeter Blok**: Tampilan berkas laser fisik vertikal dengan *optical bloom* dan *filament glow*, grid milimeter ultra-halus, *auto-span* adaptif, slider kontras dinamis, serta *floating hairline readout* kursor ($y$ dan $I/I_0$).
  - **Kaca Pembesar Zoom 5×**: Jendela pembesar presisi tinggi dengan resolusi skala $0,1\text{ mm}$ dan tombol reset zoom.
  - **Profil Intensitas Fraunhofer $I(y)/I_0$**: Grafik profil intensitas kontinu interaktif dilengkapi selubung difraksi $\text{sinc}^2(\beta)$ dan penanda garis gelap minimum.
  - **Analisis Komparatif**: Perbandingan numerik puncak kontinu Fraunhofer sebenarnya vs estimasi rumus modul perkuliahan.

### 2. Mekanika
- **Pesawat Atwood (`/explore/mekanika/atwood` & `/praktikum/atwood-gl*`)**: Simulasi sistem katrol dinamis untuk mengamati gerak lurus beraturan (GLB) dan gerak lurus berubah beraturan (GLBB).
- **Gerak Jatuh Bebas / GJB (`/explore/mekanika/gjb` & `/praktikum/gjb`)**: Eksplorasi hubungan ketinggian, waktu jatuh, dan percepatan gravitasi di berbagai planet.
- **Gerak Melingkar Beraturan / GMB (`/explore/mekanika/gmb` & `/praktikum/gmb`)**: Visualisasi vektor posisi, kecepatan linear, dan percepatan sentripetal.
- **Hukum II Newton / H2N (`/explore/mekanika/h2n` & `/praktikum/h2n`)**: Sistem kereta pada rel udara (air track) dengan beban gantung dan sensor gerak.
- **Hukum Kekekalan Energi Mekanik / HKEM (`/explore/mekanika/hkem` & `/praktikum/hkem`)**: Analisis konversi energi potensial gravitasi menjadi energi kinetik translasi dan rotasi.
- **Hukum Kekekalan Momentum / HKM (`/explore/mekanika/hkm` & `/praktikum/hkm`)**: Tumbukan lenting sempurna, sebagian, dan tidak lenting sama sekali pada rel udara.
- **Gerak Menggelinding (`/explore/mekanika/menggelinding` & `/praktikum/menggelinding`)**: Pengaruh geometri dan momen inersia berbagai benda tegar pada bidang miring.
- **Momen Inersia I & II (`/explore/mekanika/momen-inersia*`)**: Osilasi harmonik rotasional pegas spiral dan momen inersia benda tegar kompleks.
- **Osilasi Torsional (`/explore/mekanika/osilasi-torsional`)**: Eksplorasi periode dan modulus geser kawat puntir.

### 3. Pengukuran
- **Pengukuran dan Angka Penting / PAP (`/explore/pengukuran/pap` & `/praktikum/pap`)**:
  - Simulasi interaktif **Jangka Sorong** (ketelitian $0,05\text{ mm}$).
  - Simulasi interaktif **Mikrometer Sekrup** (ketelitian $0,01\text{ mm}$).
  - Simulasi interaktif **Neraca Ohaus 3 Lengan** (ketelitian $0,1\text{ g}$).
  - Perhitungan ketidakpastian tunggal/berulang dan penegakan kaidah angka penting.

---

## Developer Architecture Guidelines

### 1. Permanent Rule: Callback Props & Animation/Effect Loops
Callback dari parent (`onXxx`, misal `onStateUpdate`, `onTimeChange`, `onPosChange`, `onMarkerChange`, dsb.) yang digunakan di dalam `useEffect`, `useCallback`, atau loop animasi (`requestAnimationFrame`) **wajib disimpan di `useRef`**, atau parent wajib membungkusnya dengan `useCallback`.
- **DILARANG KERAS** memasukkan callback prop ke dalam dependency array efek (`useEffect`) yang menjalankan atau menginisialisasi simulasi.
- **Pola Baku pada Seluruh Apparatus**:
  ```tsx
  const onStateUpdateRef = useRef(onStateUpdate);
  onStateUpdateRef.current = onStateUpdate;

  // Di dalam loop animasi / efek:
  onStateUpdateRef.current?.(t, angle, omega);
  ```
- Wajib diterapkan pada semua apparatus baru dan yang dimodifikasi untuk mencegah loop re-render tak hingga (*infinite loop* / `Maximum update depth exceeded`).

### 2. Permanent Rule: Simulation Playback Speed & Pure Simulation Clock
- Moving simulation apparatuses **wajib** mendukung pengaturan kecepatan putar ulang (*playback speed scaling*) melalui `usePersistedPlaybackSpeed` dan `PlaybackSpeedControl` (atau `SimulationContainer`).
- **Integritas Data Fisika**: Pembacaan sensor gerak, *photogate*, *stopwatch*, dan tabel data eksperimen **harus** menggunakan akumulasi waktu simulasi fisik (`simTime`), **BUKAN** wall-clock `performance.now()` atau `Date.now()`. Hasil besaran fisik (posisi, kecepatan, percepatan) harus 100% invarian di seluruh kecepatan ($1\times, 0.75\times, 0.5\times, 0.25\times$).
- Timer eksperimen praktikan (`ExperimentTimer`) tetap berjalan pada *wall-clock real-time* (tidak diskalakan).
- Loop fixed-step wajib membatasi delta waktu maksimum (*clamped delta time*) dan membatasi substep per frame untuk mencegah lonjakan lag saat tab aktif kembali dari background.

### 3. Presentation Separation: Explore vs Practicum Modes
Pada komponen instrumen eksperimen (seperti `ScreenPatternView`), pisahkan tampilan berdasarkan prop `mode: "explore" | "practicum"`:
- **Mode `"explore"`**: Tampilan tenang dan minimalis (*calm visual hierarchy*), tanpa marker pin yang mengganggu, header satu baris terpadu, floating hairline koordinat kursor kontinu ($0,01\text{ mm}$), dan kontrol kontras esensial.
- **Mode `"practicum"`**: Menyediakan penanda terarah $T_0\text{--}T_4$, preset kontras, tombol reset marker, serta petunjuk instruksi pengukuran modul.

---

## Memulai Pengembangan (Getting Started)

Jalankan dev server secara lokal:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

### Akses Jaringan Lokal (Cross-Origin HMR)
Bila mengakses dev server dari perangkat lain di jaringan lokal (LAN / Wi-Fi), daftarkan IP atau hostname yang diizinkan melalui environment variable `DEV_ALLOWED_ORIGINS` di file `.env.local` (dipisahkan koma), misalnya:
```bash
DEV_ALLOWED_ORIGINS=10.16.117.69,192.168.0.102
```

---

## Pengujian & Kualitas Kode (Testing & QA)

### 1. Unit Tests (Jest)
Menjalankan seluruh pengujian unit logika fisika murni, regresi linier, kalkulasi toleransi KSR, pembacaan instrumen, dan invariansi rendering:
```bash
npm test
```
*Status saat ini: 34 test suites, 423 unit tests (100% Passed).*

### 2. End-to-End Tests (Playwright)
Menjalankan pengujian fungsional dan verifikasi antarmuka di tiga ukuran viewport standar:
- **Desktop** ($1280 \times 800\text{ px}$)
- **Tablet** ($768 \times 1024\text{ px}$)
- **Mobile** ($375 \times 667\text{ px}$)

Jalankan pengujian E2E:
```bash
npm run test:e2e
```
Untuk menjalankan pengujian modul gelombang secara spesifik:
```bash
npx playwright test e2e/explore_ssg.spec.ts
```
Untuk mode antarmuka interaktif:
```bash
npx playwright test --ui
```

### 3. Production Build
Memvalidasi kompilasi kode, optimasi halaman statis, dan typecheck TypeScript ketat:
```bash
npm run build
```

---

## Struktur Repositori

```text
├── e2e/                     # Pengujian end-to-end multi-viewport (Playwright)
├── src/
│   ├── app/                 # Halaman App Router Next.js
│   │   ├── explore/         # Laboratorium eksplorasi parameter bebas
│   │   │   ├── gelombang/   # Modul Wave Optics (SSG)
│   │   │   ├── mekanika/    # Modul Mekanika Klasik
│   │   │   └── pengukuran/  # Modul Pengukuran & Angka Penting
│   │   └── praktikum/       # Modul praktikum terstruktur mahasiswa
│   ├── components/
│   │   ├── practicum/       # Instrumen alat ukur & apparatus praktikum
│   │   │   └── instruments/wave/  # ScreenPatternView, OpticalBenchApparatus, dsb.
│   │   ├── simulation/      # Kontainer simulasi, playback speed, grafik interaktif
│   │   └── ui/              # Komponen antarmuka atomik (Tabs, Modal, Sliders)
│   ├── physics/             # Mesin fisika murni, optik gelombang, regresi, & metrologi
│   └── __tests__/           # Suite pengujian unit Jest komprehensif
├── public/                  # Aset statis & ikon
└── README.md
```
