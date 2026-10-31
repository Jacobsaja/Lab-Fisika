"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  showGeometry?: boolean;
  pointPYMm?: number;
  cameraPreset?: CameraPreset;
  onCameraPresetChange?: (preset: CameraPreset) => void;
  onFrameRendered?: () => void;
  onTelemetryUpdate?: (telemetry: OpticalBench3DTelemetry) => void;
  onContextLost?: () => void;
  className?: string;
}

const SCREEN_TEXTURE_WIDTH = 1024;
const Y_OPT = 0.2;
const X_LASER = -0.35;
const X_LASER_NOZZLE = -0.27;
const X_SLIT = 0.0;
const RAIL_SCALE_CMS = [0, 50, 100, 150, 200, 250, 300] as const;

function parseRgbTuple(rgbStr: string): [number, number, number] {
  const parts = rgbStr.split(",").map((s) => parseInt(s.trim(), 10));
  return [parts[0] || 239, parts[1] || 68, parts[2] || 68];
}

function getPresetCameraPose(preset: CameraPreset, distanceL: number) {
  const focusX = distanceL / 2;
  const lookAt = new THREE.Vector3(focusX, Y_OPT, 0);
  let pos: THREE.Vector3;
  switch (preset) {
    case "side":
      pos = new THREE.Vector3(focusX, Y_OPT + 0.02, 2.25);
      break;
    case "top":
      pos = new THREE.Vector3(focusX, 2.65, 0.01);
      break;
    case "oblique":
    default:
      pos = new THREE.Vector3(focusX - 0.85, Y_OPT + 0.52, 1.55);
      break;
  }
  return { pos, lookAt };
}

interface ProjectedOverlayPositions {
  laserLeftPct: number;
  slitLeftPct: number;
  screenLeftPct: number;
  dimLLeftPct: number;
  pointPLeftPct: number;
  railTicks: { cm: number; leftPct: number; isEvenRow: boolean }[];
}

/**
 * Pure 3D -> 2D perspective projection using THREE.PerspectiveCamera
 * so that HTML labels track the exact 3D world coordinates of each component
 * across all 3 camera presets while guaranteeing zero bounding-box collisions.
 */
function computeProjectedOverlays(
  cameraPos: THREE.Vector3,
  lookAtPos: THREE.Vector3,
  aspect: number,
  distanceL: number,
  pointPZ: number
): ProjectedOverlayPositions {
  const cam = new THREE.PerspectiveCamera(42, Math.max(1.2, aspect), 0.1, 100);
  cam.position.copy(cameraPos);
  cam.lookAt(lookAtPos);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();

  const projectX = (x: number, y: number, z: number, minPct = 6, maxPct = 94) => {
    const v = new THREE.Vector3(x, y, z).project(cam);
    const rawPct = (v.x * 0.5 + 0.5) * 100;
    if (!Number.isFinite(rawPct)) return 50;
    return Math.max(minPct, Math.min(maxPct, rawPct));
  };

  const xScreen = screenDistanceToRailCm(distanceL) / 100;

  const rawLaser = projectX(X_LASER, Y_OPT + 0.12, 0, 8, 32);
  const rawSlit = projectX(X_SLIT, Y_OPT + 0.14, 0, 34, 62);
  const rawScreen = projectX(xScreen, Y_OPT + 0.12, 0, 52, 90);
  const rawDimL = projectX(xScreen / 2, Y_OPT + 0.22, 0, 38, 86);
  const rawPointP = projectX(xScreen, Y_OPT, pointPZ, 50, 90);

  // Ensure horizontal separation between Laser and Screen on the same vertical row
  const safeLaser = Math.min(rawLaser, 30);
  const safeScreen = Math.max(rawScreen, safeLaser + 28);

  const railTicks = RAIL_SCALE_CMS.map((cm, idx) => {
    const xPos = cm / 100;
    const rawTick = projectX(xPos, -0.02, 0.06, 6 + idx * 12, 94 - (6 - idx) * 10);
    return {
      cm,
      leftPct: rawTick,
      isEvenRow: idx % 2 === 0,
    };
  });

  return {
    laserLeftPct: safeLaser,
    slitLeftPct: Math.max(36, rawSlit),
    screenLeftPct: safeScreen,
    dimLLeftPct: Math.max(40, rawDimL),
    pointPLeftPct: rawPointP,
    railTicks,
  };
}

/**
 * Camera controller managing smooth transitions between 3 presets under frameloop="demand".
 */
function CameraController({
  preset,
  distanceL,
  onFrameRendered,
}: {
  preset: CameraPreset;
  distanceL: number;
  onFrameRendered?: () => void;
}) {
  const { camera, invalidate } = useThree();

  const onFrameRenderedRef = useRef(onFrameRendered);
  onFrameRenderedRef.current = onFrameRendered;

  const prevPresetRef = useRef<CameraPreset>(preset);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    const { pos: targetPos, lookAt: lookAtPos } = getPresetCameraPose(preset, distanceL);

    // Immediate update on first mount or when only distanceL changes
    if (isFirstMountRef.current || prevPresetRef.current === preset) {
      isFirstMountRef.current = false;
      prevPresetRef.current = preset;
      camera.position.copy(targetPos);
      camera.lookAt(lookAtPos);
      camera.updateProjectionMatrix();
      invalidate();
      return;
    }

    prevPresetRef.current = preset;
    let animId: number;
    const startTime = performance.now();
    const duration = 320;
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
  }, [preset, distanceL, camera, invalidate]);

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
  showGeometry = false,
  pointPYMm = 0,
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
          const coreAlpha = Math.pow((visibleI - 0.35) / 0.65, 1.2) * 0.65;
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
    showGeometry,
    pointPYMm,
    laserRgb,
    screenDataBuffer,
    screenIntensities,
    screenTexture,
    gl,
    scene,
    camera,
    invalidate,
  ]);

  const railCm = screenDistanceToRailCm(distanceL);
  const xScreen = railCm / 100;
  const pointPZ = Math.max(-0.12, Math.min(0.12, (pointPYMm / Math.max(1, activeSpanMm)) * 0.12));

  return (
    <>
      <color attach="background" args={["#040711"]} />

      <CameraController
        preset={cameraPreset}
        distanceL={distanceL}
        onFrameRendered={onFrameRendered}
      />

      {/* ── Lighting (Standard Simple Setup without Shadows) ── */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 4, 3]} intensity={1.15} />

      {/* ── 1. Lab Table Surface ── */}
      <mesh position={[1.35, -0.025, 0]}>
        <boxGeometry args={[4.1, 0.04, 0.42]} />
        <meshStandardMaterial color="#090d16" roughness={0.75} metalness={0.2} />
      </mesh>

      {/* ── 2. Extruded Aluminum Optical Rail (0 cm at Slit X=0.0 to 300 cm at X=3.0) ── */}
      <mesh position={[1.32, 0.018, 0]}>
        <boxGeometry args={[3.55, 0.036, 0.085]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Graduation tick marks along the rail every 10 cm (0 to 300 cm) */}
      {Array.from({ length: 31 }).map((_, idx) => {
        const cm = idx * 10;
        const xPos = cm / 100;
        const isMajor50 = cm % 50 === 0;
        return (
          <mesh key={cm} position={[xPos, isMajor50 ? 0.024 : 0.027, 0.044]}>
            <boxGeometry args={[isMajor50 ? 0.008 : 0.004, isMajor50 ? 0.024 : 0.014, 0.002]} />
            <meshBasicMaterial color={isMajor50 ? "#38bdf8" : "#cbd5e1"} />
          </mesh>
        );
      })}

      {/* Rail Endcaps & Leveling Feet */}
      <mesh position={[-0.42, -0.005, 0]}>
        <boxGeometry args={[0.08, 0.03, 0.14]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[3.06, -0.005, 0]}>
        <boxGeometry args={[0.08, 0.03, 0.14]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* ── 3. Component 1: Laser Source Module (at X = -0.35) ── */}
      <group position={[X_LASER, 0, 0]}>
        {/* Carrier Base on Rail */}
        <mesh position={[0, 0.048, 0]}>
          <boxGeometry args={[0.1, 0.025, 0.11]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Support Post */}
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Laser Main Body Cylinder */}
        <mesh position={[-0.01, Y_OPT, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.024, 0.024, 0.14, 24]} />
          <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Brass Aperture Collar & Nozzle Cone */}
        <mesh position={[0.068, Y_OPT, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.018, 0.022, 20]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Status LED */}
        <mesh position={[0.01, Y_OPT + 0.025, 0]}>
          <sphereGeometry args={[0.004, 12, 12]} />
          <meshBasicMaterial color={isLaserOn ? "#22c55e" : "#475569"} />
        </mesh>
      </group>

      {/* ── 4. Component 2: Slit Wheel Assembly (at X = 0.0 = 0 cm mark) ── */}
      <group position={[X_SLIT, 0, 0]}>
        {/* Carrier Base on Rail */}
        <mesh position={[0, 0.048, 0]}>
          <boxGeometry args={[0.08, 0.025, 0.11]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Support Post */}
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Rotatable Slit Wheel (Perpendicular to Optical Axis X) */}
        <mesh position={[0, Y_OPT, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.048, 0.048, 0.004, 32]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Knurled Rim Collar */}
        <mesh position={[0, Y_OPT, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.048, 0.003, 8, 32]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Center Slit Aperture Opening (N Slits) */}
        <mesh position={[0, Y_OPT, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.022, 0.032, 0.006]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Microscopic Slit Lines inside Aperture (N = 1..6) */}
        {Array.from({ length: N }).map((_, idx) => {
          const sep = N > 1 ? Math.min(0.003, 0.014 / (N - 1)) : 0;
          const zOffset = N === 1 ? 0 : -((N - 1) / 2) * sep + idx * sep;
          return (
            <mesh key={idx} position={[0, Y_OPT, zOffset]}>
              <boxGeometry args={[0.007, 0.024, N === 1 ? 0.002 : 0.0008]} />
              <meshBasicMaterial color={isBeamActive ? laserHex : "#64748b"} />
            </mesh>
          );
        })}
      </group>

      {/* ── 5. Component 3: Projection Screen Assembly (at X = L) ── */}
      <group position={[xScreen, 0, 0]}>
        {/* Carrier Base on Rail */}
        <mesh position={[0, 0.048, 0]}>
          <boxGeometry args={[0.09, 0.025, 0.14]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Support Post */}
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Screen Frame Plate (Facing -X toward Slit & Laser) */}
        <mesh position={[0, Y_OPT, 0]}>
          <boxGeometry args={[0.008, 0.18, 0.28]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Front Screen Plane with 1D (1024x1) DataTexture -> Vertical Fringes */}
        <mesh position={[-0.005, Y_OPT, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.26, 0.16]} />
          <meshBasicMaterial map={screenTexture} />
        </mesh>

        {/* Point P Marker on 3D Screen (when showGeometry is active and N > 1) */}
        {showGeometry && N > 1 && (
          <group position={[-0.007, Y_OPT, pointPZ]}>
            {/* Vertical Hairline on 3D Screen */}
            <mesh>
              <boxGeometry args={[0.002, 0.155, 0.003]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
            {/* Glowing Point P Sphere */}
            <mesh position={[-0.003, 0, 0]}>
              <sphereGeometry args={[0.007, 14, 14]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
          </group>
        )}
      </group>

      {/* ── 6. Additive Volumetric Laser Beam (Strictly Wavelength-Colored) ── */}
      {isBeamActive && (
        <group>
          {/* Segment 1: Collimated Ray (Laser Nozzle to Slit) */}
          <mesh position={[(X_LASER_NOZZLE + X_SLIT) / 2, Y_OPT, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, Math.abs(X_SLIT - X_LASER_NOZZLE), 16]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.95 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[(X_LASER_NOZZLE + X_SLIT) / 2, Y_OPT, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.016, 0.016, Math.abs(X_SLIT - X_LASER_NOZZLE), 16]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.45 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Segment 2: Central Direct Ray (Slit to Screen, centered on Camera lookAt) */}
          <mesh position={[(X_SLIT + xScreen) / 2, Y_OPT, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, Math.abs(xScreen - X_SLIT), 16]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.95 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[(X_SLIT + xScreen) / 2, Y_OPT, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, Math.abs(xScreen - X_SLIT), 16]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.5 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Diffraction Fan Cone (Volumetric Spread toward Screen) */}
          <mesh position={[(X_SLIT + xScreen) / 2, Y_OPT, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.055, Math.abs(xScreen - X_SLIT), 24, 1, true]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.32 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Nozzle Aperture Glow & Screen Impact Point Halo */}
          <mesh position={[X_LASER_NOZZLE, Y_OPT, 0]}>
            <sphereGeometry args={[0.01, 12, 12]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.95 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh position={[xScreen - 0.005, Y_OPT, 0]}>
            <sphereGeometry args={[0.012, 12, 12]} />
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
 * Exported 3D Canvas with frameloop="demand" and projected HTML overlays.
 */
export default function OpticalBench3DScene(props: OpticalBench3DSceneProps) {
  const {
    className = "",
    lambdaNm = 632.8,
    N = 2,
    aMm = 0.04,
    dMm = 0.5,
    distanceL = DEFAULT_SCREEN_DISTANCE_L,
    isLaserOn = true,
    dimmer = 1.0,
    spanMm,
    showGeometry = false,
    pointPYMm = 0,
    cameraPreset = "oblique",
    onContextLost,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const onContextLostRef = useRef(onContextLost);
  onContextLostRef.current = onContextLost;

  // Attach capture-phase webglcontextlost listener on the outer container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      onContextLostRef.current?.();
    };
    el.addEventListener("webglcontextlost", handleContextLost, true);
    return () => {
      el.removeEventListener("webglcontextlost", handleContextLost, true);
    };
  }, []);

  const cameraPose = useMemo(
    () => getPresetCameraPose(cameraPreset, distanceL),
    [cameraPreset, distanceL]
  );

  const activeSpanMm = useMemo(() => {
    if (spanMm !== undefined && spanMm > 0) return spanMm;
    return calculateAdaptiveScreenSpanMm(lambdaNm * 1e-9, distanceL, aMm * 1e-3, dMm * 1e-3, N);
  }, [spanMm, lambdaNm, distanceL, aMm, dMm, N]);

  const pointPZ = Math.max(-0.12, Math.min(0.12, (pointPYMm / Math.max(1, activeSpanMm)) * 0.12));
  const railCm = screenDistanceToRailCm(distanceL);
  const laserHex = useMemo(() => wavelengthToHex(lambdaNm), [lambdaNm]);
  const isBeamActive = isLaserOn && dimmer > 0.01;

  const projected = useMemo(
    () =>
      computeProjectedOverlays(
        cameraPose.pos,
        cameraPose.lookAt,
        2.4,
        distanceL,
        pointPZ
      ),
    [cameraPose, distanceL, pointPZ]
  );

  const ariaLabel = `Kanvas 3D Bangku Optik: panjang gelombang ${Math.round(lambdaNm)} nm, jumlah celah N = ${N}, jarak layar L = ${distanceL.toFixed(2)} m, laser ${isLaserOn ? "Aktif" : "Mati"}`;

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className={`relative w-full h-[380px] bg-gradient-to-b from-[#030712] via-[#050b18] to-[#02050e] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none ${className}`}
      data-testid="optical-bench-3d-canvas"
    >
      <Canvas
        frameloop="demand"
        camera={{
          position: [cameraPose.pos.x, cameraPose.pos.y, cameraPose.pos.z],
          fov: 42,
        }}
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

      {/* ── HTML Overlay Layer: Inset "Perbesar Celah" & Projected 3D Labels (>= 12 px) ── */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        data-testid="optical-bench-3d-overlays"
      >
        {/* 1. HTML Inset "Perbesar Celah" (Top-Left, Zero Collision) */}
        <div
          data-testid="inset-perbesar-celah-3d"
          className="absolute top-2.5 left-2.5 px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-700/90 shadow-lg flex flex-col gap-1.5 text-xs"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-200 text-xs">Perbesar Celah</span>
            <span className="font-mono text-amber-300 font-bold text-xs">N = {N}</span>
          </div>

          {/* Visual Vertical Slits Representation */}
          <div className="h-6 px-2 rounded bg-black/90 border border-slate-800 flex items-center justify-center gap-1.5">
            {Array.from({ length: N }).map((_, i) => (
              <span
                key={i}
                className="w-0.5 h-4 rounded-full"
                style={{
                  backgroundColor: isBeamActive ? laserHex : "#64748b",
                  boxShadow: isBeamActive ? `0 0 6px ${laserHex}` : "none",
                }}
              />
            ))}
          </div>

          {/* Separate non-touching badges for a and d (>= 12 px) */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span
              data-testid="label-3d-a"
              className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800"
            >
              a = {aMm.toFixed(2)} mm
            </span>
            <span
              data-testid="label-3d-d"
              className="px-1.5 py-0.5 rounded bg-slate-900 text-purple-300 border border-slate-800"
            >
              {N > 1 ? `d = ${dMm.toFixed(2)} mm` : "d = — (N=1)"}
            </span>
          </div>
        </div>

        {/* 2. Projected 3D Label: Distance L (Band 1: top = 12px, right of inset) */}
        <div
          data-testid="label-3d-L"
          style={{ left: `${projected.dimLLeftPct}%`, top: "12px" }}
          className="absolute -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-950/90 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs whitespace-nowrap shadow"
        >
          L = {distanceL.toFixed(2)} m ({railCm} cm)
        </div>

        {/* 3. Projected 3D Label: Piringan Celah (Band 2A: top = 52px) */}
        <div
          data-testid="label-3d-slit"
          style={{ left: `${projected.slitLeftPct}%`, top: "52px" }}
          className="absolute -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-100 font-semibold text-xs whitespace-nowrap shadow"
        >
          Piringan Celah (0 cm)
        </div>

        {/* 4. Projected 3D Label: Laser (Band 2B: top = 132px, below inset) */}
        <div
          data-testid="label-3d-laser"
          style={{ left: `${projected.laserLeftPct}%`, top: "132px" }}
          className="absolute -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-100 font-semibold text-xs whitespace-nowrap shadow"
        >
          Laser ({Math.round(lambdaNm)} nm)
        </div>

        {/* 5. Projected 3D Label: Layar (Band 2B: top = 92px) */}
        <div
          data-testid="label-3d-screen"
          style={{ left: `${projected.screenLeftPct}%`, top: "92px" }}
          className="absolute -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-100 font-semibold text-xs whitespace-nowrap shadow"
        >
          Layar ({railCm} cm)
        </div>

        {/* 6. Projected 3D Label: Point P Marker on Screen (Band 3: top = 172px) */}
        {showGeometry && N > 1 && (
          <div
            data-testid="label-3d-point-p"
            style={{ left: `${projected.pointPLeftPct}%`, top: "172px" }}
            className="absolute -translate-x-1/2 px-2 py-0.5 rounded-md bg-amber-950/90 border border-amber-400/70 text-amber-200 font-mono font-bold text-xs whitespace-nowrap shadow"
          >
            Titik P ({pointPYMm >= 0 ? `+${pointPYMm.toFixed(1)}` : pointPYMm.toFixed(1)} mm)
          </div>
        )}

        {/* 7. Projected 3D Rail Scale Labels every 50 cm (Staggered Band 4A & 4B: 312px / 344px) */}
        {projected.railTicks.map(({ cm, leftPct, isEvenRow }) => (
          <div
            key={cm}
            data-testid={`label-3d-rail-${cm}`}
            style={{
              left: `${leftPct}%`,
              top: isEvenRow ? "312px" : "344px",
            }}
            className="absolute -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-950/85 border border-slate-800 text-slate-300 font-mono text-xs whitespace-nowrap"
          >
            {cm} cm
          </div>
        ))}
      </div>
    </div>
  );
}
