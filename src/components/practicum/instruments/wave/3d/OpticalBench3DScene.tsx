"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  DEFAULT_SCREEN_DISTANCE_L,
  calculateAdaptiveScreenSpanMm,
  fraunhoferIntensity,
  screenDistanceToRailCm,
  wavelengthToHex,
  wavelengthToRgb,
} from "@/physics/waveOptics";

export type CameraPreset = "oblique" | "side" | "top";

export interface OpticalBench3DTelemetry {
  unmaskedRenderer: string;
  unmaskedVendor: string;
  intensityCalcMs: number;
  textureUpdateMs: number;
  renderMs: number;
}

export interface OpticalBench3DSceneProps {
  lambdaNm?: number;
  N?: number;
  aMm?: number;
  dMm?: number;
  distanceL?: number;
  isLaserOn?: boolean;
  dimmer?: number;
  exposure?: number;
  spanMm?: number;
  cameraPreset?: CameraPreset;
  onCameraPresetChange?: (preset: CameraPreset) => void;
  onFrameRendered?: () => void;
  onTelemetryUpdate?: (telemetry: OpticalBench3DTelemetry) => void;
  onContextLost?: () => void;
  className?: string;
}

const SCREEN_TEXTURE_WIDTH = 1024;
const BENCH_CENTER_X = 1.3;

function parseRgbTuple(rgbStr: string): [number, number, number] {
  const parts = rgbStr.split(",").map((s) => parseInt(s.trim(), 10));
  return [parts[0] || 239, parts[1] || 68, parts[2] || 68];
}

/**
 * Camera controller managing smooth transitions between 3 presets under frameloop="demand".
 */
function CameraController({
  preset,
  onFrameRendered,
}: {
  preset: CameraPreset;
  onFrameRendered?: () => void;
}) {
  const { camera, invalidate } = useThree();

  const onFrameRenderedRef = useRef(onFrameRendered);
  onFrameRenderedRef.current = onFrameRendered;

  // Target camera positions for each preset (centered on the optical bench)
  const targetPos = useMemo(() => {
    switch (preset) {
      case "side":
        return new THREE.Vector3(BENCH_CENTER_X, 0.24, 2.35);
      case "top":
        return new THREE.Vector3(BENCH_CENTER_X, 2.65, 0.01);
      case "oblique":
      default:
        return new THREE.Vector3(BENCH_CENTER_X - 0.95, 0.78, 1.65);
    }
  }, [preset]);

  const lookAtPos = useMemo(() => new THREE.Vector3(BENCH_CENTER_X, 0.18, 0), []);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      camera.position.copy(targetPos);
      camera.lookAt(lookAtPos);
      camera.updateProjectionMatrix();
      invalidate();
      return;
    }

    let animId: number;
    const startTime = performance.now();
    const duration = 350; // 350 ms smooth transition
    const startPos = camera.position.clone();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPos, targetPos, ease);
      camera.lookAt(lookAtPos);
      camera.updateProjectionMatrix();

      invalidate();
      onFrameRenderedRef.current?.();

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [targetPos, lookAtPos, camera, invalidate]);

  return null;
}

/**
 * Internal 3D scene elements.
 */
function SceneContent({
  lambdaNm = 632.8,
  N = 2,
  aMm = 0.04,
  dMm = 0.5,
  distanceL = DEFAULT_SCREEN_DISTANCE_L,
  isLaserOn = true,
  dimmer = 1.0,
  exposure = 1.8,
  spanMm,
  cameraPreset = "oblique",
  onFrameRendered,
  onTelemetryUpdate,
  onContextLost,
}: OpticalBench3DSceneProps) {
  const { gl, scene, camera, invalidate } = useThree();
  const onFrameRenderedRef = useRef(onFrameRendered);
  onFrameRenderedRef.current = onFrameRendered;
  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  onTelemetryUpdateRef.current = onTelemetryUpdate;
  const onContextLostRef = useRef(onContextLost);
  onContextLostRef.current = onContextLost;

  const rendererInfoRef = useRef<{ renderer: string; vendor: string }>({
    renderer: "Unknown",
    vendor: "Unknown",
  });

  // Extract UNMASKED_RENDERER_WEBGL and attach context loss listener once
  useEffect(() => {
    try {
      const ctx = gl.getContext?.();
      if (ctx) {
        const dbg = ctx.getExtension("WEBGL_debug_renderer_info");
        const unmaskedRenderer = dbg
          ? String(ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
          : String(ctx.getParameter(ctx.RENDERER));
        const unmaskedVendor = dbg
          ? String(ctx.getParameter(dbg.UNMASKED_VENDOR_WEBGL))
          : String(ctx.getParameter(ctx.VENDOR));
        rendererInfoRef.current = { renderer: unmaskedRenderer, vendor: unmaskedVendor };
      }
    } catch {
      // Ignore in mocked test environments
    }

    const domElement = gl.domElement;
    if (!domElement || typeof domElement.addEventListener !== "function") return;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      onContextLostRef.current?.();
    };
    domElement.addEventListener("webglcontextlost", handleContextLost, false);
    return () => {
      domElement.removeEventListener("webglcontextlost", handleContextLost, false);
    };
  }, [gl]);

  const laserHex = useMemo(() => wavelengthToHex(lambdaNm), [lambdaNm]);
  const laserRgb = useMemo(() => wavelengthToRgb(lambdaNm), [lambdaNm]);
  const isBeamActive = isLaserOn && dimmer > 0.01;
  const effectiveDimmer = isBeamActive ? Math.min(1, Math.max(0.1, dimmer)) : 0;

  const activeSpanMm = useMemo(() => {
    if (spanMm !== undefined && spanMm > 0) return spanMm;
    return calculateAdaptiveScreenSpanMm(lambdaNm * 1e-9, distanceL, aMm * 1e-3, dMm * 1e-3, N);
  }, [spanMm, lambdaNm, distanceL, aMm, dMm, N]);

  // ─── 1. 1D DataTexture (1024x1, RGBA8) for Projection Screen ──────────────
  const { screenDataBuffer, screenIntensities, screenTexture } = useMemo(() => {
    const data = new Uint8Array(SCREEN_TEXTURE_WIDTH * 4);
    const intensities = new Float32Array(SCREEN_TEXTURE_WIDTH);
    const tex = new THREE.DataTexture(
      data,
      SCREEN_TEXTURE_WIDTH,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return { screenDataBuffer: data, screenIntensities: intensities, screenTexture: tex };
  }, []);

  useEffect(() => {
    const lambdaM = lambdaNm * 1e-9;
    const aM = aMm * 1e-3;
    const dM = dMm * 1e-3;
    const [rLaser, gLaser, bLaser] = parseRgbTuple(laserRgb);

    // Stage 1: Calculate Fraunhofer intensity across 1024 points (shared formula with ScreenPatternView)
    const t0 = performance.now();
    if (isBeamActive) {
      for (let i = 0; i < SCREEN_TEXTURE_WIDTH; i++) {
        const norm = (i / (SCREEN_TEXTURE_WIDTH - 1)) * 2 - 1;
        const yMeters = norm * activeSpanMm * 1e-3;
        const physicalI = fraunhoferIntensity(yMeters, lambdaM, distanceL, aM, dM, N);
        const gammaI = Math.pow(Math.max(0, physicalI), 0.55);
        screenIntensities[i] = Math.min(1.0, gammaI * effectiveDimmer * exposure);
      }
    } else {
      screenIntensities.fill(0);
    }
    const t1 = performance.now();

    // Stage 2: Populate 1024x1 RGBA8 buffer and mark needsUpdate
    const rBg = 9;
    const gBg = 13;
    const bBg = 22;
    for (let i = 0; i < SCREEN_TEXTURE_WIDTH; i++) {
      const visibleI = screenIntensities[i];
      const idx = i * 4;
      if (visibleI > 0.002) {
        const alpha = visibleI * 0.95;
        let r = rBg + (rLaser - rBg) * alpha;
        let g = gBg + (gLaser - gBg) * alpha;
        let b = bBg + (bLaser - bBg) * alpha;

        if (visibleI > 0.35) {
          const coreAlpha = Math.pow((visibleI - 0.35) / 0.65, 1.2) * 0.85;
          r = r + (255 - r) * coreAlpha;
          g = g + (255 - g) * coreAlpha;
          b = b + (255 - b) * coreAlpha;
        }

        screenDataBuffer[idx] = Math.min(255, Math.round(r));
        screenDataBuffer[idx + 1] = Math.min(255, Math.round(g));
        screenDataBuffer[idx + 2] = Math.min(255, Math.round(b));
        screenDataBuffer[idx + 3] = 255;
      } else {
        screenDataBuffer[idx] = rBg;
        screenDataBuffer[idx + 1] = gBg;
        screenDataBuffer[idx + 2] = bBg;
        screenDataBuffer[idx + 3] = 255;
      }
    }
    screenTexture.needsUpdate = true;
    const t2 = performance.now();

    // Stage 3: Render frame & measure GPU draw call time
    invalidate();
    let t3 = t2;
    try {
      if (typeof gl.render === "function") {
        gl.render(scene, camera);
        t3 = performance.now();
      }
    } catch {
      t3 = performance.now();
    }

    const telemetry: OpticalBench3DTelemetry = {
      unmaskedRenderer: rendererInfoRef.current.renderer,
      unmaskedVendor: rendererInfoRef.current.vendor,
      intensityCalcMs: +(t1 - t0).toFixed(4),
      textureUpdateMs: +(t2 - t1).toFixed(4),
      renderMs: +(t3 - t2).toFixed(4),
    };
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__OPTICAL_BENCH_3D_METRICS__ = telemetry;
    }
    onTelemetryUpdateRef.current?.(telemetry);
    onFrameRenderedRef.current?.();
  }, [
    lambdaNm,
    N,
    aMm,
    dMm,
    distanceL,
    isBeamActive,
    effectiveDimmer,
    exposure,
    activeSpanMm,
    laserRgb,
    screenDataBuffer,
    screenIntensities,
    screenTexture,
    gl,
    scene,
    camera,
    invalidate,
  ]);

  // Optical axis height is at Y = 0.20 m
  const yOpt = 0.2;
  const xLaserNozzle = -0.18;
  const xSlit = 0.0;
  // Screen position consistent with rail cm reading via screenDistanceToRailCm
  const railCm = screenDistanceToRailCm(distanceL);
  const xScreen = railCm / 100;

  return (
    <>
      <CameraController
        preset={cameraPreset}
        onFrameRendered={onFrameRendered}
      />

      {/* ── Lighting (Standard Simple Setup without Shadows) ── */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 4, 3]} intensity={1.15} />

      {/* ── 1. Lab Table Surface ── */}
      <mesh position={[1.35, -0.02, 0]}>
        <boxGeometry args={[4.0, 0.04, 1.3]} />
        <meshStandardMaterial color="#090d16" roughness={0.75} metalness={0.2} />
      </mesh>

      {/* ── 2. Extruded Aluminum Optical Rail (0 cm at Slit X=0.0 to 300 cm at X=3.0) ── */}
      <mesh position={[1.35, 0.02, 0]}>
        <boxGeometry args={[3.5, 0.04, 0.09]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Graduation tick marks along the rail every 10 cm (0 to 300 cm) */}
      {Array.from({ length: 31 }).map((_, idx) => {
        const cm = idx * 10;
        const xPos = cm / 100;
        const isMajor50 = cm % 50 === 0;
        return (
          <mesh key={cm} position={[xPos, isMajor50 ? 0.026 : 0.029, 0.046]}>
            <boxGeometry args={[isMajor50 ? 0.008 : 0.004, isMajor50 ? 0.026 : 0.016, 0.002]} />
            <meshBasicMaterial color={isMajor50 ? "#38bdf8" : "#cbd5e1"} />
          </mesh>
        );
      })}

      {/* Rail Endcaps & Leveling Feet */}
      <mesh position={[-0.35, -0.005, 0]}>
        <boxGeometry args={[0.08, 0.03, 0.14]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[3.05, -0.005, 0]}>
        <boxGeometry args={[0.08, 0.03, 0.14]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* ── 3. Component 1: Laser Source Module (at X = -0.25) ── */}
      <group position={[-0.25, 0, 0]}>
        {/* Carrier Base on Rail */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.1, 0.025, 0.11]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Support Post */}
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Laser Main Body Cylinder */}
        <mesh position={[-0.01, yOpt, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.024, 0.024, 0.14, 24]} />
          <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Brass Aperture Collar & Nozzle Cone */}
        <mesh position={[0.065, yOpt, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.018, 0.02, 20]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Status LED */}
        <mesh position={[0.01, yOpt + 0.025, 0]}>
          <sphereGeometry args={[0.004, 12, 12]} />
          <meshBasicMaterial color={isLaserOn ? "#22c55e" : "#475569"} />
        </mesh>
      </group>

      {/* ── 4. Component 2: Slit Wheel Assembly (at X = 0.0 = 0 cm mark) ── */}
      <group position={[xSlit, 0, 0]}>
        {/* Carrier Base on Rail */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.08, 0.025, 0.11]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Support Post */}
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Rotatable Slit Wheel (Perpendicular to Optical Axis X) */}
        <mesh position={[0, yOpt, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.048, 0.048, 0.004, 32]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Knurled Rim Collar */}
        <mesh position={[0, yOpt, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.048, 0.003, 8, 32]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Center Slit Aperture Opening (N Slits) */}
        <mesh position={[0, yOpt, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.022, 0.032, 0.006]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Microscopic Slit Lines inside Aperture (N = 1..6) */}
        {Array.from({ length: N }).map((_, idx) => {
          const sep = N > 1 ? Math.min(0.003, 0.014 / (N - 1)) : 0;
          const zOffset = N === 1 ? 0 : -((N - 1) / 2) * sep + idx * sep;
          return (
            <mesh key={idx} position={[0, yOpt, zOffset]}>
              <boxGeometry args={[0.007, 0.024, N === 1 ? 0.002 : 0.0008]} />
              <meshBasicMaterial color={isBeamActive ? laserHex : "#64748b"} />
            </mesh>
          );
        })}
      </group>

      {/* ── 5. Component 3: Projection Screen Assembly (at X = L) ── */}
      <group position={[xScreen, 0, 0]}>
        {/* Carrier Base on Rail */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.09, 0.025, 0.14]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Support Post */}
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Screen Frame Plate (Facing -X toward Slit & Laser) */}
        <mesh position={[0, yOpt, 0]}>
          <boxGeometry args={[0.008, 0.18, 0.28]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Front Screen Plane with 1D (1024x1) DataTexture -> Vertical Fringes */}
        <mesh position={[-0.005, yOpt, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.26, 0.16]} />
          <meshBasicMaterial map={screenTexture} />
        </mesh>
      </group>

      {/* ── 6. Additive Volumetric Laser Beam ── */}
      {isBeamActive && (
        <group>
          {/* Segment 1: Collimated Ray (Laser Nozzle to Slit) */}
          <mesh position={[(xLaserNozzle + xSlit) / 2, yOpt, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0032, 0.0032, Math.abs(xSlit - xLaserNozzle), 16]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.92 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[(xLaserNozzle + xSlit) / 2, yOpt, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0008, 0.0008, Math.abs(xSlit - xLaserNozzle), 12]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.85 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Segment 2: Central Direct Ray (Slit to Screen) */}
          <mesh position={[(xSlit + xScreen) / 2, yOpt, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0032, 0.0032, Math.abs(xScreen - xSlit), 16]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.9 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[(xSlit + xScreen) / 2, yOpt, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0008, 0.0008, Math.abs(xScreen - xSlit), 12]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.8 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Diffraction Fan Cone (Volumetric Spread toward Screen) */}
          <mesh position={[(xSlit + xScreen) / 2, yOpt, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.055, Math.abs(xScreen - xSlit), 24, 1, true]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.28 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Nozzle Aperture Glow & Screen Impact Point Halo */}
          <mesh position={[xLaserNozzle, yOpt, 0]}>
            <sphereGeometry args={[0.008, 12, 12]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.95 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh position={[xScreen - 0.004, yOpt, 0]}>
            <sphereGeometry args={[0.009, 12, 12]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.9 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}
    </>
  );
}

/**
 * Exported 3D Canvas with frameloop="demand".
 */
export default function OpticalBench3DScene(props: OpticalBench3DSceneProps) {
  const {
    className = "",
    lambdaNm = 632.8,
    N = 2,
    distanceL = DEFAULT_SCREEN_DISTANCE_L,
    isLaserOn = true,
  } = props;

  const ariaLabel = `Kanvas 3D Bangku Optik: panjang gelombang ${Math.round(lambdaNm)} nm, jumlah celah N = ${N}, jarak layar L = ${distanceL.toFixed(2)} m, laser ${isLaserOn ? "Aktif" : "Mati"}`;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`relative w-full h-[380px] bg-gradient-to-b from-[#030712] via-[#050b18] to-[#02050e] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl ${className}`}
      data-testid="optical-bench-3d-canvas"
    >
      <Canvas
        frameloop="demand"
        camera={{ position: [BENCH_CENTER_X - 0.95, 0.78, 1.65], fov: 42 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
          preserveDrawingBuffer: true,
        }}
        className="w-full h-full block"
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
