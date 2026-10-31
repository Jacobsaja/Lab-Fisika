import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import HomePage from "@/app/page";

describe("4. Splash Beranda Session & Skip", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows splash on initial visit without session, and allows skipping via Lewati button", () => {
    render(<HomePage />);

    // Shows splash
    expect(screen.getByRole("button", { name: /Lewati animasi splash/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /INISIASI SIMULASI/i })).toBeInTheDocument();

    // Click Lewati
    fireEvent.click(screen.getByRole("button", { name: /Lewati animasi splash/i }));

    // Stores to sessionStorage
    expect(window.sessionStorage.getItem("vlab_splash_seen")).toBe("true");

    // Shows main app (carousel nav and Mulai Praktikum)
    expect(screen.getByText(/Mulai Praktikum/i)).toBeInTheDocument();
  });

  it("bypasses splash immediately if already visited in current session", () => {
    window.sessionStorage.setItem("vlab_splash_seen", "true");

    render(<HomePage />);

    // Does not show splash
    expect(screen.queryByRole("button", { name: /INISIASI SIMULASI/i })).not.toBeInTheDocument();
    // Directly renders main carousel
    expect(screen.getByText(/Mulai Praktikum/i)).toBeInTheDocument();
  });
});
