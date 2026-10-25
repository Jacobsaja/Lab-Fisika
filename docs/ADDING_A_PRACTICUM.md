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
- [ ] **Callback Props & Ref Isolation**: Seluruh callback dari parent (`onXxx`) yang digunakan di dalam `useEffect`, `useCallback`, atau loop animasi (seperti `requestAnimationFrame`) disimpan dalam `useRef` (mis. `onStateUpdateRef`), dan TIDAK dimasukkan ke dependency array efek yang menjalankan atau menginisialisasi simulasi. Parent yang memanggil wajib membungkus handler dengan `useCallback`.
- [ ] **Playback Speed & Data Invariance**: Moving apparatuses support playback speed scaling via `usePersistedPlaybackSpeed` and `PlaybackSpeedControl`. All recorded sensor data/stopwatches derive from `simTime` and are 100% identical across all 4 speeds ($1\times, 0.75\times, 0.5\times, 0.25\times$), while `ExperimentTimer` stays real-time.

## Simulation Playback Speed & Time Decoupling Architecture

All animated physics simulations (both in **Explore** and **Practicum** modes) MUST provide a playback speed control allowing users to slow down motion for careful observation.

### 1. Mandatory Hooks & Controls
- **`usePersistedPlaybackSpeed(storageKey, defaultSpeed)`**: Every moving apparatus must persist user playback speed in `localStorage` across page reloads and simulation resets.
- **`PlaybackSpeedControl`**: Render the shared `<PlaybackSpeedControl speed={speed} onSpeedChange={setSpeed} />` beside the Play/Pause/Reset buttons (or inside `<SimulationContainer>`).
- **Standard Speeds**: Speeds must use `DEFAULT_PLAYBACK_SPEEDS = [1, 0.75, 0.5, 0.25]` from `@/components/simulation/PlaybackSpeedControl`. UI buttons display decimal commas (`"0,75×"`, `"0,5×"`).
- **Key Policy**: Use a single shared key per physical module across Explore and Practicum (e.g. `"atwood-speed-cache"`, `"hkm-playback-speed-cache"`, `"gmb"`, `"gjb-speed-cache"`).

### 2. Time Decoupling & Data Integrity
- **Simulation Time (`simTime`) vs. Wall Clock Time**:
  - All physics calculations, photogate triggers, sensor timers ($t_1, t_2$), and stopwatches MUST depend strictly on accumulated simulation time (`simTime += dtWall * speed`), never on wall-clock `performance.now()` or `Date.now()`.
  - **The student header timer (`ExperimentTimer`)**: Must ALWAYS tick in real-world seconds (wall clock) regardless of simulation playback speed.
  - Recorded physical measurements ($t, v, a, p, E_k$) must be **100% IDENTICAL** across all 4 speeds ($1\times, 0.75\times, 0.5\times, 0.25\times$) and across varied display refresh rates (30 Hz, 60 Hz, 120 Hz).

### 3. Default Speeds by Module Type
- High-acceleration or gravity drop simulations (e.g., GJB Free Fall, Rolling Motion): default `0.5×` for immediate visual clarity.
- Standard dynamics (e.g., Atwood, GMB, HKM, HKEM, Torsional Oscillations): default `1.0×`.

### 4. Background Tab Lag & Substep Clamping
- When fixed-step substepping is used (e.g., HKM with $dt = 1\text{ ms}$), clamp `dtWall` per frame (e.g., `Math.min(dtWall, 0.05)`) and cap substeps per frame (e.g., `MAX_SUBSTEPS = 250`).
- If `steps >= MAX_SUBSTEPS`, drop excess accumulated debt (`acc = 0`) to prevent the "spiral of death" when returning from background browser tabs.

### 5. Invariance Unit Testing Pattern
Every moving module must include a unit test verifying that recorded sensor/event data does not diverge across the 4 playback speeds:
```ts
test("recorded sensor data is identical across all 4 playback speeds", () => {
  const speeds = [1, 0.75, 0.5, 0.25];
  const runs = speeds.map((speed) => runSimulationStepper({ speed, ...fixture }));
  const baseline = runs[0];
  runs.forEach((run) => {
    expect(run.t1).toBeCloseTo(baseline.t1, 4);
    expect(run.vFinal).toBeCloseTo(baseline.vFinal, 4);
  });
});
```

## Backlog & Known Issues
- **DataTable Validation**: Saat ini komponen `DataTable` menggunakan `<input type="text">` murni secara internal tanpa validasi inline yang reaktif. Praktikan baru mengetahui ada kesalahan input (misal tipe non-angka atau penggunaan koma) ketika tombol `Selanjutnya` tidak aktif (karena di-filter via logika `hasEnoughData` pada level *page*). **Action Item (Masa Depan)**: Idealnya perbaikan ini dilakukan SECARA TERPUSAT di komponen `DataTable.tsx` itu sendiri (misalnya *highlight* sel berwarna merah + notifikasi *tooltip* saat proses *parsing* ke angka gagal di *onBlur*), alih-alih ditambal di setiap *page* praktikum, sehingga modul baru apa pun yang menggunakan `DataTable` akan mendapatkan validasi secara seragam.

