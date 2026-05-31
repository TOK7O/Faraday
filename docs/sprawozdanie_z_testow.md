# Sprawozdanie z testów jednostkowych frontendu

Niniejszy dokument przedstawia sprawozdanie z wdrożenia i wykonania testów jednostkowych na frontendzie aplikacji Faraday.

---

## 1. Wybrane technologie i konfiguracja

W celu zapewnienia szybkiego uruchamiania testów oraz bezproblemowej integracji z systemem budowania opartym na Vite, wybrano następujący stos technologiczny:

- **Silnik testowy**: [Vitest](https://vitest.dev/) (wersja `^4.1.7`) – szybki i lekki framework testowy, w pełni kompatybilny z konfiguracją Vite.
- **Środowisko DOM**: [jsdom](https://github.com/jsdom/jsdom) – emulacja przeglądarki w środowisku Node.js.
- **Biblioteka testowa**: [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (wersja `^16.x.x`) – oficjalnie rekomendowana biblioteka do testowania komponentów React 19.
- **Rozszerzenie asercji**: [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) – zestaw dodatkowych asercji ułatwiających testowanie elementów DOM (np. `toBeInTheDocument`, `toHaveClass`, `toHaveAttribute`).

### Konfiguracja środowiska

1. **Konfiguracja Vite**: W pliku [vite.config.ts] zdefiniowano blok `test` określający środowisko `jsdom` oraz plik konfiguracyjny środowiska testowego.
2. **Inicjalizacja środowiska testowego**: W pliku [setupTests.ts] zaimportowano rozszerzenia asercji i dodano mock dla `window.matchMedia` (nieobecnego w środowisku jsdom, a wymaganego przez dynamiczne dopasowanie motywu).
3. **Konfiguracja TypeScript**: W pliku [tsconfig.app.json] wykluczono testy jednostkowe z głównego procesu budowania aplikacji produkcyjnej, zapobiegając problemom z typowaniem zależnym od testów podczas kompilacji.

---

## 2. Zakres i wyniki testów

Przetestowano 5 kluczowych komponentów i modułów pomocniczych aplikacji. Łącznie zaimplementowano **24 testy jednostkowe**, które zostały pomyślnie wykonane.

### A. Moduł autoryzacyjny: `auth.utils.ts`

- **Plik testowy**: [auth.utils.test.ts] (9 testów)
- **Zakres**:
  - Poprawność dekodowania tokenów JWT (`decodeTokenPayload`) oraz obsługa uszkodzonych tokenów.
  - Odczyt czasu wygaśnięcia sesji z tokena w milisekundach (`getTokenExpirationTime`).
  - Sprawdzanie wygaśnięcia sesji w odniesieniu do aktualnego czasu (`isSessionExpired`).
  - Czyszczenie danych sesji z `localStorage` przy wylogowywaniu (`clearSession`).

### B. Kontekst językowy: `LanguageContext.tsx`

- **Plik testowy**: [LanguageContext.test.tsx] (4 testy)
- **Zakres**:
  - Domyślne ładowanie języka angielskiego (`en`), gdy brak zapisanego wyboru w `localStorage`.
  - Poprawna inicjalizacja zapisanego języka z `localStorage`.
  - Poprawne działanie zmiany języka (`setLang`) i jego synchronizacja z magazynem lokalnym.
  - Wykrywanie błędnego użycia hooka `useTranslation` poza dedykowanym dostawcą (`LanguageProvider`).

### C. Kontekst motywu wizualnego: `ThemeContext.tsx`

- **Plik testowy**: [ThemeContext.test.tsx] (5 testów)
- **Zakres**:
  - Inicjalizacja motywu na podstawie preferencji systemowych (`prefers-color-scheme`), gdy brak zapisanego wyboru.
  - Nadpisywanie preferencji systemowych poprzez wybór użytkownika zapisany w `localStorage`.
  - Zmiana motywu (`toggleTheme`), synchronizacja z `localStorage` oraz modyfikacja atrybutu `data-theme` na głównym elemencie dokumentu (`document.documentElement`).
  - Wykrywanie błędnego użycia hooka `useTheme` poza dostawcą.

### D. Komponent strażnika tras: `ProtectedRoute.tsx`

- **Plik testowy**: [ProtectedRoute.test.tsx] (2 testy)
- **Zakres**:
  - Renderowanie chronionych dzieci w przypadku obecności tokenu sesji.
  - Poprawne przekierowanie użytkownika na trasę `/login` przy braku autoryzacji.

### E. Komponent ładowania: `Spinner.tsx`

- **Plik testowy**: [Spinner.test.tsx] (4 testy)
- **Zakres**:
  - Prawidłowe renderowanie elementu kontenera i ikony SVG.
  - Domyślne wartości parametrów `size` i `color`.
  - Dynamiczne przekazywanie własnych parametrów rozmiaru, koloru oraz dodatkowych klas CSS.

---

## 3. Podsumowanie uruchomienia testów

Poniżej znajduje się raport z konsoli po uruchomieniu pełnego zestawu testów przy użyciu komendy `npm run test`:

```text
> frontend@0.0.0 test
> vitest run


 RUN  v4.1.7 /Users/Emilia/Documents/GitHub/Faraday/frontend

 ✓ src/utils/__tests__/auth.utils.test.ts (9 tests) 25ms
 ✓ src/components/__tests__/ProtectedRoute.test.tsx (2 tests) 26ms
 ✓ src/context/__tests__/LanguageContext.test.tsx (4 tests) 34ms
 ✓ src/context/__tests__/ThemeContext.test.tsx (5 tests) 42ms
 ✓ src/components/ui/__tests__/Spinner.test.tsx (4 tests) 32ms

 Test Files  5 passed (5)
      Tests  24 passed (24)
   Start at  14:00:24
   Duration  1.24s (transform 373ms, setup 512ms, import 599ms, tests 158ms, environment 3.94s)
```

**Wnioski:**

- Wszystkie pliki testowe zakończyły działanie pomyślnie.
- Średni czas wykonania samych testów to około 1.24s, co gwarantuje natychmiastową informację zwrotną dla deweloperów.
- Konfiguracja środowiska testowego nie zakłóca budowania produkcyjnego aplikacji.

---

## 4. Instrukcja uruchamiania

Aby uruchomić testy w katalogu `frontend` aplikacji Faraday, należy skorzystać z następujących poleceń:

1. **Jednorazowe uruchomienie testów**:
   ```bash
   npm run test
   ```
2. **Uruchomienie testów w trybie ciągłego nasłuchiwania (Watch mode)**:
   ```bash
   npm run test:watch
   ```
