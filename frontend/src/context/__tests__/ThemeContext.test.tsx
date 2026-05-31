import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../ThemeContext";

const TestComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <button onClick={toggleTheme}>Przełącz motyw</button>
    </div>
  );
};

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.restoreAllMocks();
  });

  it("should initialize with prefers-color-scheme dark if matchMedia is true and localStorage is empty", () => {
    // Mock matchMedia to match dark mode
    const matchMediaSpy = vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(matchMediaSpy).toHaveBeenCalled();
  });

  it("should initialize with prefers-color-scheme light if matchMedia is false and localStorage is empty", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("should initialize with theme from localStorage over prefers-color-scheme", () => {
    localStorage.setItem("app_theme", "light");
    // Nawet gdy system woli ciemny:
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("should toggle theme and update localStorage and document dataset when toggleTheme is called", () => {
    localStorage.setItem("app_theme", "light");

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("light");

    // Kliknięcie przycisku przełączenia motywu
    act(() => {
      screen.getByText("Przełącz motyw").click();
    });

    expect(screen.getByTestId("theme-val").textContent).toBe("dark");
    expect(localStorage.getItem("app_theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");

    // Kolejne kliknięcie
    act(() => {
      screen.getByText("Przełącz motyw").click();
    });

    expect(screen.getByTestId("theme-val").textContent).toBe("light");
    expect(localStorage.getItem("app_theme")).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("should throw error if useTheme is used outside of ThemeProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      "useTheme must be used within ThemeProvider",
    );

    consoleSpy.mockRestore();
  });
});
