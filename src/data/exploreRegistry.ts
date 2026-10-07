export interface ExploreModule {
  id: string;
  title: string;
  route: string;
  available: boolean;
  desc: string;
  category: "pengukuran" | "mekanika" | "gelombang" | "listrik" | "elektromagnetisme";
}

export const EXPLORE_REGISTRY: Record<string, ExploreModule> = {
  "gmb": {
    id: "gmb",
    title: "Gerak Melingkar Beraturan",
    route: "/explore/mekanika/gmb",
    available: true,
    desc: "Simulasi parameter GMB: ubah jari-jari dan kecepatan sudut untuk melihat vektor kecepatan dan percepatan.",
    category: "mekanika"
  },
  "gjb": {
    id: "gjb",
    title: "Gerak Jatuh Bebas",
    route: "/explore/mekanika/gjb",
    available: true,
    desc: "Eksplorasi hubungan antara ketinggian, waktu jatuh, dan percepatan gravitasi di berbagai planet tanpa hambatan udara.",
    category: "mekanika"
  },
  "pap": {
    id: "pap",
    title: "Pengukuran dan Angka Penting",
    route: "/explore/pengukuran/pap",
    available: true,
    desc: "Eksplorasi penggunaan Jangka Sorong dan Neraca O'haus. Pelajari aturan angka penting dan penulisan ketidakpastian tunggal.",
    category: "pengukuran"
  },
  "atwood": {
    id: "atwood",
    title: "Pesawat Atwood (GLB & GLBB)",
    route: "/explore/mekanika/atwood",
    available: true,
    desc: "Simulasi dinamis sistem katrol untuk mengamati GLBB dan GLB sekaligus dalam satu eksperimen.",
    category: "mekanika"
  },
  "menggelinding": {
    id: "menggelinding",
    title: "Gerak Menggelinding",
    route: "/explore/mekanika/menggelinding",
    available: true,
    desc: "Eksplorasi gerak menggelinding pada bidang miring. Amati pengaruh momen inersia dari berbagai bentuk silinder.",
    category: "mekanika"
  },
  "momen-inersia": {
    id: "momen-inersia",
    title: "Momen Inersia I",
    route: "/explore/mekanika/momen-inersia",
    available: true,
    desc: "Eksplorasi gerak osilasi harmonik rotasional. Amati hubungan konstanta pegas dan momen inersia terhadap periode.",
    category: "mekanika"
  },
  "momen-inersia-2": {
    id: "momen-inersia-2",
    title: "Momen Inersia II",
    route: "/explore/mekanika/momen-inersia-2",
    available: true,
    desc: "Eksplorasi momen inersia benda tegar (silinder, bola). Bandingkan periode osilasi saat alat ditambah beban.",
    category: "mekanika"
  }
};
