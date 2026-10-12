<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Rules & Architecture Guidelines

## Permanent Rule: Callback Props in Simulation Apparatuses
Callback dari parent (`onXxx`, misal `onStateUpdate`, `onTimeChange`, `onPosChange`, dll.) yang dipakai di dalam `useEffect`, `useCallback`, atau loop animasi (`requestAnimationFrame`) **wajib disimpan di `useRef`**, atau parent wajib membungkusnya dengan `useCallback`.
- **DILARANG KERAS** memasukkan callback prop ke dalam dependency array efek (`useEffect`) yang menjalankan atau menginisialisasi simulasi.
- **Pola Baku pada Seluruh Apparatus**:
  ```tsx
  const onStateUpdateRef = useRef(onStateUpdate);
  onStateUpdateRef.current = onStateUpdate;

  // Di dalam loop animasi / efek:
  onStateUpdateRef.current?.(t, angle, omega);
  ```
- Wajib diterapkan pada semua apparatus baru dan yang dimodifikasi untuk mencegah loop re-render (`Maximum update depth exceeded`).
