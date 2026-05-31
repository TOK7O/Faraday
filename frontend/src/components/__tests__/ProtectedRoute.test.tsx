import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render children if token exists in localStorage", () => {
    localStorage.setItem("token", "valid-test-token");

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ProtectedRoute>
          <div data-testid="secret-content">Dostęp Autoryzowany</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("secret-content")).toBeInTheDocument();
    expect(screen.getByText("Dostęp Autoryzowany")).toBeInTheDocument();
  });

  it("should redirect to /login and render login content if token does not exist in localStorage", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div data-testid="secret-content">Dostęp Autoryzowany</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={<div data-testid="login-page">Strona Logowania</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Nie powinno pokazywać chronionej zawartości
    expect(screen.queryByTestId("secret-content")).toBeNull();
    // Powinno przekierować i wyrenderować stronę logowania
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.getByText("Strona Logowania")).toBeInTheDocument();
  });
});
