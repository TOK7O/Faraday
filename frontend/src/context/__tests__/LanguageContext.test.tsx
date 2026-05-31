import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  LanguageProvider,
  useTranslation,
} from "../LanguageContext";

// Komponent testowy do konsumowania kontekstu
const TestComponent = () => {
  const { lang, setLang } = useTranslation();
  return (
    <div>
      <span data-testid="lang-val">{lang}</span>
      <button onClick={() => setLang("pl")}>Zmień na PL</button>
      <button onClick={() => setLang("en")}>Zmień na EN</button>
    </div>
  );
};

describe("LanguageContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should default to 'en' when no language is saved in localStorage", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("lang-val").textContent).toBe("en");
  });

  it("should initialize with the language saved in localStorage", () => {
    localStorage.setItem("app_language", "pl");

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("lang-val").textContent).toBe("pl");
  });

  it("should change language and update localStorage when setLang is called", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("lang-val").textContent).toBe("en");

    // Zmiana na PL
    act(() => {
      screen.getByText("Zmień na PL").click();
    });

    expect(screen.getByTestId("lang-val").textContent).toBe("pl");
    expect(localStorage.getItem("app_language")).toBe("pl");

    // Zmiana z powrotem na EN
    act(() => {
      screen.getByText("Zmień na EN").click();
    });

    expect(screen.getByTestId("lang-val").textContent).toBe("en");
    expect(localStorage.getItem("app_language")).toBe("en");
  });

  it("should throw error if useTranslation is used outside of LanguageProvider", () => {
    // Ukrywamy błędy konsoli w trakcie tego specyficznego testu rzucania wyjątków przez Reacta
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      "useTranslation must be used within LanguageProvider",
    );

    consoleSpy.mockRestore();
  });
});
