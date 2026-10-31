"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  fraunhoferIntensity,
  wavelengthToHex,
  wavelengthToRgb,
} from "@/physics/waveOptics";

export type CameraPreset = "oblique" | "side" | "top";

export interface OpticalBench3DSceneProps {
  lambdaNm?: number;
  N?: number;
  aMm?: number;
  dMm?: number;
  distanceL?: number;
  isLaserOn?: boolean;
  dimmer?: number;
  cameraPreset?: CameraPreset;
  onCameraPresetChange?: (preset: CameraPreset) => void;
  onFrameRendered?: () => void;
  className?: string;
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
  const midX = distanceL / 2;

  const onFrameRenderedRef = useRef(onFrameRendered);
  onFrameRenderedRef.current = onFrameRendered;

  // Target camera positions for each preset
  const targetPos = useMemo(() => {
    switch (preset) {
      case "side":
        return new THREE.Vector3(midX, 0.22, 1.85);
      case "top":
        return new THREE.Vector3(midX, 2.4, 0.01);
      case "oblique":
      default:
        return new THREE.Vector3(midX - 0.75, 0.72, 1.35);
    }
  }, [preset, midX]);

  const lookAtPos = useMemo(() => new THREE.Vector3(midX, 0.2, 0), [midX]);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      camera.position.copy(targetPos);
      camera.lookAt(lookAtPos);
      camera.updateProjectionMatrix();
      invalidate();
      onFrameRenderedRef.current?.();
      return;
    }

    let animId: number;
    const startTime = performance.now();
    const duration = 500; // 500 ms smooth transition
    const startPos = camera.position.clone();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPos, targetPos, ease);
      camera.lookAt(lookAtPos);
      camera.updateProjectionMatrix();

      invalidate(); // request on-demand render
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
  cameraPreset = "oblique",
  onFrameRendered,
}: OpticalBench3DSceneProps) {
  const { invalidate } = useThree();
  const onFrameRenderedRef = useRef(onFrameRendered);
  onFrameRenderedRef.current = onFrameRendered;

  const laserHex = useMemo(() => wavelengthToHex(lambdaNm), [lambdaNm]);
  const laserRgb = useMemo(() => wavelengthToRgb(lambdaNm), [lambdaNm]);
  const isBeamActive = isLaserOn && dimmer > 0.01;
  const effectiveDimmer = isBeamActive ? Math.min(1, Math.max(0.1, dimmer)) : 0;

  // ─── 1. Offscreen Dynamic Texture for Projection Screen ───────────────────
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenTextureRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let canvas = screenCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      screenCanvasRef.current = canvas;
      screenTextureRef.current = new THREE.CanvasTexture(canvas);
      screenTextureRef.current.minFilter = THREE.LinearFilter;
      screenTextureRef.current.magFilter = THREE.LinearFilter;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw clean millimeter block paper background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, 512, 512);

    // Millimeter block grid (teal/cyan)
    ctx.strokeStyle = "rgba(6, 182, 212, 0.25)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= 512; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Major 10-mm grid lines
    ctx.strokeStyle = "rgba(6, 182, 212, 0.55)";
    ctx.lineWidth = 1.5;
    for (let y = 0; y <= 512; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Center crosshair axis
    ctx.strokeStyle = "rgba(6, 182, 212, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();

    // ── Live Fraunhofer Interference Fringes ──
    if (isBeamActive) {
      const lambdaM = lambdaNm * 1e-9;
      const aM = aMm * 1e-3;
      const dM = dMm * 1e-3;
      const maxSpanMm = 12.0; // +/- 12 mm across screen height

      // Render physical interference fringes along vertical axis
      for (let py = 0; py < 512; py += 2) {
        const yMm = ((py - 256) / 256) * maxSpanMm;
        const yM = yMm * 1e-3;
        const I = fraunhoferIntensity(yM, lambdaM, distanceL, aM, dM, N);
        const intensity = Math.min(1.0, I * effectiveDimmer);

        if (intensity > 0.005) {
          ctx.fillStyle = `rgba(${laserRgb}, ${intensity * 0.9})`;
          ctx.fillRect(256 - 45, py, 90, 2);

          // Intense core filament
          if (intensity > 0.4) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(intensity - 0.4) * 1.5})`;
            ctx.fillRect(256 - 15, py, 30, 2);
          }
        }
      }
    }

    if (screenTextureRef.current) {
      screenTextureRef.current.needsUpdate = true;
    }

    invalidate();
    onFrameRenderedRef.current?.();
  }, [lambdaNm, N, aMm, dMm, distanceL, isBeamActive, effectiveDimmer, laserRgb, invalidate]);

  // ─── 2. Offscreen Rail Scale Texture (0 to 300 cm) ─────────────────────────
  const railTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Dark metallic rail face
    ctx.fillStyle = "#334155";
    ctx.fillRect(0, 0, 2048, 128);

    // Centimeter graduation ticks along 3.0 m rail
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";

    for (let cm = 0; cm <= 300; cm += 5) {
      const px = (cm / 300) * 1900 + 74;
      const isMajor = cm % 20 === 0;
      const isMed = cm % 10 === 0;

      ctx.fillStyle = isMajor ? "#ffffff" : "#cbd5e1";
      ctx.fillRect(px - 1, 0, isMajor ? 3 : 1.5, isMajor ? 48 : isMed ? 32 : 18);

      if (isMajor) {
        ctx.fillText(`${cm}`, px, 90);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  // Whenever props change in demand mode, trigger one frame render
  useEffect(() => {
    invalidate();
    onFrameRenderedRef.current?.();
  }, [lambdaNm, N, aMm, dMm, distanceL, isLaserOn, dimmer, cameraPreset, invalidate]);

  // Optical axis height is at Y = 0.20 m
  const yOpt = 0.2;
  const xLaserNozzle = -0.12;
  const xSlit = 0.0;
  const xScreen = distanceL;

  return (
    <>
      <CameraController
        preset={cameraPreset}
        distanceL={distanceL}
        onFrameRendered={onFrameRendered}
      />

      {/* ── Lighting (Standard Simple Setup without Shadows) ── */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 4, 3]} intensity={1.1} />

      {/* ── 1. Lab Table Surface ── */}
      <mesh position={[1.4, -0.02, 0]}>
        <boxGeometry args={[4.2, 0.04, 1.4]} />
        <meshStandardMaterial color="#090d16" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* ── 2. Extruded Aluminum Optical Rail (3.4 m length) ── */}
      {/* Main Extrusion Bar */}
      <mesh position={[1.4, 0.02, 0]}>
        <boxGeometry args={[3.4, 0.04, 0.09]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Front Scale Face with printed cm markings */}
      {railTexture && (
        <mesh position={[1.4, 0.02, 0.046]}>
          <planeGeometry args={[3.4, 0.04]} />
          <meshBasicMaterial map={railTexture} />
        </mesh>
      )}

      {/* Rail Endcaps & Leveling Feet */}
      <mesh position={[-0.2, -0.005, 0]}>
        <boxGeometry args={[0.08, 0.03, 0.14]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[3.0, -0.005, 0]}>
        <boxGeometry args={[0.08, 0.03, 0.14]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* ── 3. Component 1: Laser Source Module (at X = -0.20) ── */}
      <group position={[-0.2, 0, 0]}>
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

      {/* ── 4. Component 2: Slit Wheel Assembly (at X = 0.0) ── */}
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
        {/* Microscopic Slit Lines inside Aperture */}
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
          <boxGeometry args={[0.008, 0.26, 0.18]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Front Millimeter Block Paper with Dynamic Fraunhofer Pattern */}
        {screenTextureRef.current && (
          <mesh position={[-0.005, yOpt, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[0.16, 0.24]} />
            <meshBasicMaterial map={screenTextureRef.current} />
          </mesh>
        )}
      </group>

      {/* ── 6. Additive Volumetric Laser Beam ── */}
      {isBeamActive && (
        <group>
          {/* Segment 1: Collimated Ray (Laser Nozzle to Slit) */}
          {/* Core Beam */}
          <mesh position={[(xLaserNozzle + xSlit) / 2, yOpt, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0016, 0.0016, Math.abs(xSlit - xLaserNozzle), 16]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.88 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* White Center Filament */}
          <mesh position={[(xLaserNozzle + xSlit) / 2, yOpt, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0006, 0.0006, Math.abs(xSlit - xLaserNozzle), 12]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.92 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Segment 2: Central Direct Ray (Slit to Screen) */}
          <mesh position={[(xSlit + xScreen) / 2, yOpt, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0016, 0.0016, Math.abs(xScreen - xSlit), 16]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.82 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[(xSlit + xScreen) / 2, yOpt, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0006, 0.0006, Math.abs(xScreen - xSlit), 12]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.9 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Diffraction Fan Cone (Volumetric Spread toward Screen) */}
          <mesh position={[(xSlit + xScreen) / 2, yOpt, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.045, Math.abs(xScreen - xSlit), 24, 1, true]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.22 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Nozzle Aperture Glow & Screen Impact Point Halo */}
          <mesh position={[xLaserNozzle, yOpt, 0]}>
            <sphereGeometry args={[0.006, 12, 12]} />
            <meshBasicMaterial
              color={laserHex}
              transparent
              opacity={0.95 * effectiveDimmer}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh position={[xScreen - 0.004, yOpt, 0]}>
            <sphereGeometry args={[0.007, 12, 12]} />
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
  const { className = "", distanceL = DEFAULT_SCREEN_DISTANCE_L } = props;

  return (
    <div
      className={`relative w-full h-[420px] bg-gradient-to-b from-[#030712] via-[#050b18] to-[#02050e] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl ${className}`}
      data-testid="optical-bench-3d-canvas"
    >
      <Canvas
        frameloop="demand"
        camera={{ position: [distanceL / 2 - 0.75, 0.72, 1.35], fov: 42 }}
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
