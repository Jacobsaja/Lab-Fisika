import React from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import { CircularMotionApparatus } from "@/components/practicum/instruments/CircularMotionApparatus";

export default function GMBExplorePage() {
  return (
    <ExploreShell
      title="Gerak Melingkar Beraturan (GMB)"
      category="Mekanika"
      description="Eksplorasi bebas gerak melingkar beraturan. Coba ubah kecepatan sudut (ω) atau jari-jari (r) lalu amati bagaimana perubahan tersebut memengaruhi kecepatan tangensial (v) dan percepatan sentripetal (a_c)."
    >
      <div className="w-full h-full flex flex-col">
        <CircularMotionApparatus mode="explore" />
      </div>
    </ExploreShell>
  );
}
