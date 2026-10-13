This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Scope & Responsiveness
**CATATAN PENTING**: Simulasi dan instrumen praktikum dirancang untuk desktop/laptop (viewport ≥1024px). Tidak dioptimalkan untuk mobile. 
- Halaman-halaman umum seperti Home atau daftar praktikum tetap responsive untuk diakses melalui mobile.
- Komponen simulasi instrumen (mis. Jangka Sorong) bersifat *desktop-only* agar tidak mengorbankan fungsionalitas dan detail presisi bacaan skala demi ukuran layar kecil.

## Developer Architecture Guidelines

### Aturan Permanen: Callback Props & Animation/Effect Loops
Callback dari parent (`onXxx`) yang dipakai di dalam `useEffect`, `useCallback`, atau loop animasi (seperti `requestAnimationFrame`) **wajib disimpan di `useRef`**, atau parent wajib membungkusnya dengan `useCallback`.
- **DILARANG KERAS** memasukkan callback prop (`onStateUpdate`, `onTimeChange`, `onPosChange`, dsb.) ke dalam dependency array `useEffect` yang menjalankan atau menginisialisasi simulasi.
- **Pola Baku pada Seluruh Apparatus**:
  ```tsx
  const onStateUpdateRef = useRef(onStateUpdate);
  onStateUpdateRef.current = onStateUpdate;

  // Di dalam loop animasi / efek:
  onStateUpdateRef.current?.(t, angle, omega);
  ```
- Terapkan pola ini secara konsisten pada semua apparatus instrumen baru untuk mencegah loop render tak hingga (*infinite re-render* / `Maximum update depth exceeded`).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Pengujian (Testing)

### 1. Unit Tests (Jest)
Menjalankan pengujian logika fisika murni, regresi linier, kalkulasi ketidakpastian, dan pemetaan grafis:
```bash
npm test
```

### 2. End-to-End Smoke Tests (Playwright)
Menjalankan pengujian otomatis permanen di seluruh rute Explore, Practicum, dan Home pada tiga ukuran viewport (375px, 768px, 1440px):
- Memeriksa konsol bersih tanpa error/warning.
- Memastikan tidak ada overflow horizontal pada layout.
- Memvalidasi elemen apparatus/SVG utama terlihat dengan dimensi non-nol.
- Menjalankan 1 siklus simulasi penuh (Play, tunggu 2-3 detik, Reset).
- Memastikan tidak ada background putih polos (kecuali pelat skala Caliper/Ohaus).
- Memverifikasi konsistensi pemetaan proporsional drag pada BrushableLineGraph.

Jalankan test e2e dengan:
```bash
npm run test:e2e
```
Untuk menjalankan dengan UI interaktif:
```bash
npx playwright test --ui
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Lab-Fisika
