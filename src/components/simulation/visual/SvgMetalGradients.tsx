"use client";

import React, { useId } from "react";
import { SCIENTIFIC_THEME } from "./tokens";

export interface MetalGradientIds {
  prefix: string;
  steel: string;
  steelVertical: string;
  aluminum: string;
  aluminumVertical: string;
  brass: string;
  chassisDark: string;
  pulleyRim: string;
  pulleyHub: string;
  massBlockA: string;
  massBlockB: string;
  slottedDisk: string;
  copper: string;
  ballChrome: string;
  inclineRail: string;
  hollowRim: string;
  torsionDisk: string;
  spiralSpring: string;
  cylinderTop: string;
  cylinderBody: string;
  sphereGloss: string;
}

/**
 * Hook to get unique SVG gradient IDs for an apparatus instance.
 */
export function useMetalGradientIds(customPrefix?: string): MetalGradientIds {
  const reactId = useId().replace(/[:]/g, "_");
  const prefix = customPrefix ? `${customPrefix}_${reactId}` : `sc_${reactId}`;

  return {
    prefix,
    steel: `${prefix}_steel`,
    steelVertical: `${prefix}_steel_v`,
    aluminum: `${prefix}_aluminum`,
    aluminumVertical: `${prefix}_aluminum_v`,
    brass: `${prefix}_brass`,
    chassisDark: `${prefix}_chassis_dark`,
    pulleyRim: `${prefix}_pulley_rim`,
    pulleyHub: `${prefix}_pulley_hub`,
    massBlockA: `${prefix}_mass_block_a`,
    massBlockB: `${prefix}_mass_block_b`,
    slottedDisk: `${prefix}_slotted_disk`,
    copper: `${prefix}_copper`,
    ballChrome: `${prefix}_ball_chrome`,
    inclineRail: `${prefix}_incline_rail`,
    hollowRim: `${prefix}_hollow_rim`,
    torsionDisk: `${prefix}_torsion_disk`,
    spiralSpring: `${prefix}_spiral_spring`,
    cylinderTop: `${prefix}_cyl_top`,
    cylinderBody: `${prefix}_cyl_body`,
    sphereGloss: `${prefix}_sphere_gloss`,
  };
}

export interface SvgMetalGradientsProps {
  ids: MetalGradientIds;
}

/**
 * Reusable SVG `<defs>` block providing metal and chassis gradients.
 * Uses instance-scoped unique IDs to avoid SVG conflicts.
 */
export function SvgMetalGradients({ ids }: SvgMetalGradientsProps) {
  const { metals, accents } = SCIENTIFIC_THEME;

  return (
    <defs>
      {/* 1. Horizontal Steel (Rails, Shafts) */}
      <linearGradient id={ids.steel} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={metals.steel.deep} />
        <stop offset="25%" stopColor={metals.steel.light} />
        <stop offset="50%" stopColor={metals.steel.highlight} />
        <stop offset="75%" stopColor={metals.steel.mid} />
        <stop offset="100%" stopColor={metals.steel.deep} />
      </linearGradient>

      {/* 2. Vertical Steel (Columns, Vertical Beams) */}
      <linearGradient id={ids.steelVertical} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={metals.steel.highlight} />
        <stop offset="30%" stopColor={metals.steel.light} />
        <stop offset="70%" stopColor={metals.steel.mid} />
        <stop offset="100%" stopColor={metals.steel.deep} />
      </linearGradient>

      {/* 3. Horizontal Aluminum (Rulers, Arms) */}
      <linearGradient id={ids.aluminum} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={metals.aluminum.deep} />
        <stop offset="30%" stopColor={metals.aluminum.light} />
        <stop offset="60%" stopColor={metals.aluminum.mid} />
        <stop offset="100%" stopColor={metals.aluminum.deep} />
      </linearGradient>

      {/* 4. Vertical Aluminum */}
      <linearGradient id={ids.aluminumVertical} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={metals.aluminum.highlight} />
        <stop offset="40%" stopColor={metals.aluminum.light} />
        <stop offset="80%" stopColor={metals.aluminum.mid} />
        <stop offset="100%" stopColor={metals.aluminum.deep} />
      </linearGradient>

      {/* 5. Brass / Gold (Weights, Pivot Pins, Contact Pads) */}
      <linearGradient id={ids.brass} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={metals.brass.highlight} />
        <stop offset="35%" stopColor={metals.brass.mid} />
        <stop offset="70%" stopColor={metals.brass.dark} />
        <stop offset="100%" stopColor={metals.brass.deep} />
      </linearGradient>

      {/* 6. Dark Anodized Chassis (Bases, Brackets, Stands) */}
      <linearGradient id={ids.chassisDark} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={metals.chassisDark.light} />
        <stop offset="50%" stopColor={metals.chassisDark.mid} />
        <stop offset="100%" stopColor={metals.chassisDark.deep} />
      </linearGradient>

      {/* 7. Pulley Rim (Radial 3D effect) */}
      <radialGradient id={ids.pulleyRim} cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor={metals.steel.highlight} />
        <stop offset="45%" stopColor={metals.steel.light} />
        <stop offset="80%" stopColor={metals.steel.mid} />
        <stop offset="100%" stopColor={metals.steel.deep} />
      </radialGradient>

      {/* 8. Pulley Hub / Brass Bearing */}
      <radialGradient id={ids.pulleyHub} cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor={metals.brass.highlight} />
        <stop offset="60%" stopColor={metals.brass.mid} />
        <stop offset="100%" stopColor={metals.brass.deep} />
      </radialGradient>

      {/* 9. Mass Block A (Cyan/Blue Theme) */}
      <linearGradient id={ids.massBlockA} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={accents.sky} />
        <stop offset="40%" stopColor={accents.blue} />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>

      {/* 10. Mass Block B (Amber Theme) */}
      <linearGradient id={ids.massBlockB} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="40%" stopColor={accents.amber} />
        <stop offset="100%" stopColor="#92400e" />
      </linearGradient>

      {/* 11. Slotted Add-on Disk (Rose / Red Metallic) */}
      <linearGradient id={ids.slottedDisk} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fecdd3" />
        <stop offset="45%" stopColor={accents.red} />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>

      {/* 12. Electromagnet Copper Coil Winding */}
      <linearGradient id={ids.copper} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fed7aa" />
        <stop offset="35%" stopColor="#ea580c" />
        <stop offset="75%" stopColor="#c2410c" />
        <stop offset="100%" stopColor="#7c2d12" />
      </linearGradient>

      {/* 13. Chrome Bearing Ball (Radial 3D specular highlight, NO FILTER) */}
      <radialGradient id={ids.ballChrome} cx="35%" cy="32%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="25%" stopColor="#e2e8f0" />
        <stop offset="65%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#1e293b" />
      </radialGradient>

      {/* 14. Inclined Track Rail (Silver Extrusion) */}
      <linearGradient id={ids.inclineRail} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="30%" stopColor="#cbd5e1" />
        <stop offset="70%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>

      {/* 15. Hollow Rim Metallic Tube */}
      <radialGradient id={ids.hollowRim} cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="50%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0f172a" />
      </radialGradient>

      {/* 16. Torsion Oscillator Disk (Circular Machined Stainless Steel) */}
      <radialGradient id={ids.torsionDisk} cx="45%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="25%" stopColor="#cbd5e1" />
        <stop offset="55%" stopColor="#94a3b8" />
        <stop offset="85%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1e293b" />
      </radialGradient>

      {/* 17. Spiral Spring Steel Wire */}
      <linearGradient id={ids.spiralSpring} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f1f5f9" />
        <stop offset="35%" stopColor="#94a3b8" />
        <stop offset="70%" stopColor="#475569" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>

      {/* 18. Cylinder Top Bevel (Brass Laboratory Standard) */}
      <radialGradient id={ids.cylinderTop} cx="38%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="35%" stopColor="#f59e0b" />
        <stop offset="75%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </radialGradient>

      {/* 19. Cylinder Curved Body */}
      <linearGradient id={ids.cylinderBody} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#78350f" />
        <stop offset="20%" stopColor="#fef3c7" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="80%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#451a03" />
      </linearGradient>

      {/* 20. Glossy Sphere (Chrome Blue Laboratory Solid Sphere) */}
      <radialGradient id={ids.sphereGloss} cx="32%" cy="28%" r="68%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="15%" stopColor="#93c5fd" />
        <stop offset="45%" stopColor="#3b82f6" />
        <stop offset="80%" stopColor="#1e3a8a" />
        <stop offset="100%" stopColor="#0a1128" />
      </radialGradient>
    </defs>
  );
}
