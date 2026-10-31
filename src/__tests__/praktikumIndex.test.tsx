import React from "react";
import { render, screen } from "@testing-library/react";
import PraktikumIndexPage from "@/app/praktikum/page";

describe("A. HALAMAN /praktikum INDEX", () => {
  test("renders header, categories, available links, and Segera Hadir items without links", () => {
    render(<PraktikumIndexPage />);

    // Header & Title
    expect(screen.getByText("MODE PRAKTIKUM")).toBeInTheDocument();
    expect(screen.getByText("Praktikum Virtual Terpandu")).toBeInTheDocument();

    // Check Categories
    expect(screen.getByText("Pengukuran & Ketelitian")).toBeInTheDocument();
    expect(screen.getByText("Mekanika Klasik")).toBeInTheDocument();
    expect(screen.getByText("Gelombang & Optika")).toBeInTheDocument();
    expect(screen.getByText("Listrik & Magnet")).toBeInTheDocument();

    // Check available links
    const gjbLink = screen.getByRole("link", { name: /Gerak Jatuh Bebas/i });
    expect(gjbLink).toHaveAttribute("href", "/praktikum/gjb");

    const ssgLink = screen.getByRole("link", { name: /Sifat-Sifat Gelombang/i });
    expect(ssgLink).toHaveAttribute("href", "/praktikum/ssg");

    // Check unimplemented module: Resonansi Gelombang Bunyi
    expect(screen.getByText("Resonansi Gelombang Bunyi")).toBeInTheDocument();
    const rgbElement = screen.getByText("Resonansi Gelombang Bunyi").closest("a");
    // Should NOT be an anchor link
    expect(rgbElement).toBeNull();

    // Check Segera Hadir badges are present
    const badges = screen.getAllByText("Segera Hadir");
    expect(badges.length).toBeGreaterThan(0);
  });
});
