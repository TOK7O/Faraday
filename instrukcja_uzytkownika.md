# Instrukcja Użytkownika — Faraday WMS

## Spis treści

1. [Pierwsze kroki](#1-pierwsze-kroki)
2. [Logowanie do systemu](#2-logowanie-do-systemu)
3. [Panel główny (Dashboard)](#3-panel-główny-dashboard)
4. [Przegląd magazynu](#4-przegląd-magazynu)
5. [Inwentarz](#5-inwentarz)
6. [Personel](#6-personel)
7. [Historia operacji](#7-historia-operacji)
8. [Raporty](#8-raporty)
9. [Kopie zapasowe](#9-kopie-zapasowe)
10. [Terminal logów](#10-terminal-logów)
11. [Preferencje](#11-preferencje)
12. [Sterowanie głosowe](#12-sterowanie-głosowe)
13. [Powiadomienia i alerty](#13-powiadomienia-i-alerty)
14. [Sesja i bezpieczeństwo](#14-sesja-i-bezpieczeństwo)

---

## 1. Pierwsze kroki

Faraday WMS to system zarządzania magazynem dostępny przez przeglądarkę internetową. Po uruchomieniu aplikacji zobaczysz stronę startową, z której możesz przejść do logowania.

System rozróżnia dwie role użytkowników:

| Rola | Dostępne funkcje |
|---|---|
| **Administrator** | Pełny dostęp — zarządzanie personelem, logi systemowe, kopie zapasowe, konfiguracja użytkowników |
| **Pracownik magazynu** | Operacje magazynowe, inwentarz, raporty, historia operacji, preferencje, kopie zapasowe |

Funkcje oznaczone w tej instrukcji jako **(tylko Administrator)** nie są widoczne dla pracowników magazynu.

---

## 2. Logowanie do systemu

1. Wejdź na stronę aplikacji i kliknij przycisk logowania.
2. Podaj swoją **nazwę użytkownika** oraz **hasło**.
3. Jeśli masz włączone uwierzytelnianie dwuskładnikowe (2FA), system poprosi o kod z aplikacji uwierzytelniającej (np. Google Authenticator).
4. Po poprawnym logowaniu zostaniesz przekierowany do panelu głównego.

Jeśli nie pamiętasz hasła, użyj opcji **„Zapomniałem hasła"** na stronie logowania. Na podany adres e-mail otrzymasz link do ustawienia nowego hasła. Link jest ważny przez jedną godzinę.

---

## 3. Panel główny (Dashboard)

Po zalogowaniu widzisz panel główny podzielony na dwie części:

- **Pasek boczny (sidebar)** po lewej stronie — nawigacja po sekcjach systemu.
- **Obszar główny** po prawej — treść aktualnie wybranej sekcji.

Nawigacja w pasku bocznym jest podzielona na grupy:

| Grupa | Pozycje |
|---|---|
| **Terminal** | Przegląd, Inwentarz |
| **Bezpieczeństwo i logi** | Personel*, Historia operacji, Raporty, Kopie zapasowe, Logi systemowe* |
| **Ustawienia** | Preferencje |

\* *widoczne tylko dla Administratorów*

Na dole paska bocznego znajduje się przycisk **Wyloguj** oraz — gdy zbliża się koniec sesji — ostrzeżenie z przyciskiem **Przedłuż sesję**.

Na urządzeniach mobilnych nawigacja jest dostępna z górnego paska.

---

## 4. Przegląd magazynu

Pierwsza sekcja, którą widzisz po zalogowaniu. Zawiera **interaktywną wizualizację 3D** całego magazynu — wszystkie regały wraz z aktualnie składowanymi na nich produktami.

**Jak korzystać z widoku 3D:**

- **Obracanie** — przeciągnij myszą, aby obracać widok magazynu.
- **Przybliżanie/oddalanie** — użyj scrolla myszy.
- **Podgląd regału** — kliknij na regał, aby powiększyć go i zobaczyć szczegóły. Po najechaniu na regał wyświetlane są nazwy przechowywanych produktów.

Dane w wizualizacji są pobierane bezpośrednio z bazy danych, więc widok zawsze odzwierciedla aktualny stan magazynu.

---

## 5. Inwentarz

Główna sekcja operacyjna systemu. Składa się z dwóch elementów: **siatki regałów** i **katalogu produktów**.

### 5.1. Siatka regałów

Wyświetla wszystkie aktywne regały w formie wizualnych kart. Każda karta regału pokazuje:

- Kod regału (np. R-001)
- Siatkę slotów — kolorowe komórki wskazujące zajęte i wolne miejsca
- Parametry regału (pojemność, zakres temperatur, nośność)

Po kliknięciu na zajęty slot możesz zobaczyć szczegóły przechowywaneg produktu (nazwa, kod, data przyjęcia, termin ważności).

### 5.2. Katalog produktów

Lista wszystkich zdefiniowanych produktów z ich parametrami: kod kreskowy, nazwa, wymiary, waga, wymagania temperaturowe, klasyfikacja zagrożeń.

### 5.3. Operacje magazynowe

Z poziomu sekcji inwentarza możesz wykonywać trzy kluczowe operacje:

#### Przyjęcie towaru (Inbound)

1. Wpisz lub zeskanuj kod kreskowy produktu.
2. System automatycznie znajdzie najlepsze miejsce składowania — uwzględnia wymiary produktu, wymagania temperaturowe i nośność regału.
3. Po zatwierdzeniu towar zostaje zarejestrowany w wyznaczonym slocie.

Jeśli system nie znajdzie odpowiedniego miejsca, poinformuje Cię o powodzie (np. brak wolnych slotów spełniających wymagania temperaturowe).

#### Wydanie towaru (Outbound)

1. Wpisz lub zeskanuj kod kreskowy produktu do wydania.
2. System automatycznie wybierze najstarszą sztukę tego produktu w magazynie (zasada FIFO — „pierwsze weszło, pierwsze wyszło").
3. Po zatwierdzeniu towar zostaje usunięty z ewidencji i slot jest zwalniany.

#### Przemieszczenie towaru (Move)

1. Wybierz towar do przemieszczenia, klikając na zajęty slot.
2. Wskaż docelowy regał i slot.
3. System sprawdzi, czy docelowe miejsce jest kompatybilne z produktem (wymiary, temperatura, nośność).
4. Po zatwierdzeniu towar zostaje przeniesiony.

### 5.4. Skaner kodów kreskowych

System obsługuje skanowanie kodów kreskowych przez kamerę urządzenia. Po zeskanowaniu kodu system automatycznie rozpoznaje produkt i umożliwia wykonanie operacji przyjęcia lub wydania.

### 5.5. Dodawanie regałów i produktów

- **Nowy regał** — kliknij przycisk dodawania i wypełnij formularz: kod regału, wymiary siatki (wiersze × kolumny), ograniczenia wymiarowe, zakres temperatur, nośność. System automatycznie wygeneruje siatkę slotów.
- **Nowy produkt** — wypełnij formularz: kod kreskowy, nazwa, wymiary, waga, wymagania temperaturowe, klasyfikacja zagrożeń, okres ważności.
- **Edycja** — kliknij na istniejący regał lub produkt, aby zmodyfikować jego parametry.
- **Usuwanie** — regały i produkty są ukrywane (nie usuwane fizycznie), więc dane historyczne pozostają nienaruszone.

### 5.6. Import masowy z CSV

Możesz jednorazowo zaimportować wiele regałów lub produktów z pliku CSV. Po wybraniu pliku system wyświetli podgląd danych do zaimportowania, pozwalając zweryfikować ich poprawność przed zatwierdzeniem. System automatycznie wykryje duplikaty i poinformuje o ewentualnych błędach.

---

## 6. Personel

**(tylko Administrator)**

Sekcja do zarządzania użytkownikami systemu.

### Co możesz zrobić:

- **Dodać nowego użytkownika** — kliknij przycisk dodawania, wypełnij dane (login, e-mail, hasło) i przypisz rolę (Administrator lub Pracownik magazynu).
- **Edytować użytkownika** — zmiana nazwy, e-maila lub roli. Menu kontekstowe (trzy kropki) przy każdym użytkowniku.
- **Dezaktywować/aktywować konto** — tymczasowe zablokowanie dostępu bez usuwania konta.
- **Usunąć użytkownika** — trwale dezaktywuje konto. System nie pozwoli usunąć ostatniego administratora.
- **Zresetować hasło** — ustaw nowe hasło dla użytkownika bezpośrednio z panelu.
- **Zresetować 2FA** — wyłącz uwierzytelnianie dwuskładnikowe dla użytkownika, który np. stracił dostęp do aplikacji uwierzytelniającej.

Lista użytkowników zawiera przeszukiwarkę oraz informacje o: roli, statusie aktywności, dacie ostatniego logowania i statusie 2FA.

---

## 7. Historia operacji

Chronologiczny dziennik wszystkich operacji magazynowych. Każdy wpis zawiera:

| Kolumna | Opis |
|---|---|
| Data i godzina | Kiedy operacja została wykonana |
| Typ operacji | Przyjęcie, Wydanie lub Przemieszczenie (oznaczone kolorami) |
| Szczegóły | Opis operacji |
| Produkt / Regał | Których zasobów dotyczyła operacja |
| Operator | Kto wykonał operację |

**Funkcje:**

- **Wyszukiwanie** — filtruj operacje po opisie, nazwie użytkownika lub produkcie.
- **Limit wyników** — wybierz ile ostatnich operacji chcesz wyświetlić (20, 50 lub 100).
- **Odświeżenie** — przycisk synchronizacji pobiera najnowsze dane.

---

## 8. Raporty

Sekcja analityczna podzielona na cztery zakładki:

### 8.1. Inwentarz

- **Statystyki ogólne** — procent zajętości magazynu, liczba zajętych/wolnych slotów, łączna waga, liczba operacji dziennych.
- **Podsumowanie inwentaryzacji** — tabela produktów pogrupowanych z ilościami i lokalizacjami.
- **Elementy z kończącą się ważnością** — lista towarów, którym wkrótce mija termin ważności, z informacją o lokalizacji i dniach do wygaśnięcia.
- **Pełna inwentaryzacja** — kompletny spis zawartości magazynu z wszystkimi szczegółami (produkt, kod, lokalizacja, data przyjęcia, temperatura bieżąca vs. wymagana).

### 8.2. Utylizacja

Raport wykorzystania każdego regału:

- Procentowe obłożenie slotów (pasek wizualny)
- Obłożenie nośności — ile wagi aktualnie niesie regał w porównaniu do maksimum
- Łączna liczba slotów zajętych i wolnych

Pozwala szybko zidentyfikować regały przeciążone lub mało wykorzystane.

### 8.3. Czujniki

Historia odczytów z sensorów dla każdego regału:

- **Temperatura** — historia odczytów temperatury z datami.
- **Waga** — historia pomiarów wagi z informacją o rozbieżności między wagą zmierzoną a oczekiwaną.
- **Naruszenia temperaturowe regałów** — przypadki, gdy zarejestrowana temperatura wykroczyła poza dopuszczalny zakres regału.
- **Naruszenia temperaturowe produktów** — przypadki, gdy produkty były przechowywane w temperaturze poza ich wymaganiami.

### 8.4. Alarmy

- **Aktywne alerty** — lista nierozwiązanych alertów wymagających uwagi.
- **Historia alertów** — pełna historia wszystkich alertów (rozwiązanych i aktywnych) z informacją o typie, regale, treści i czasie trwania.

---

## 9. Kopie zapasowe

Sekcja zarządzania kopiami zapasowymi bazy danych.

### Dostępne akcje:

- **Utwórz kopię zapasową** — kliknij przycisk, aby natychmiast utworzyć zaszyfrowaną kopię zapasową całej bazy danych. Operacja może potrwać kilka sekund.
- **Pobierz kopię** — pobierz wcześniej utworzoną kopię na swój komputer. Plik jest zaszyfrowany i bez odpowiednich kluczy nie można go odczytać.
- **Przywróć kopię** — przywróć stan bazy danych z wybranej kopii. **Uwaga: ta operacja nadpisuje aktualne dane!** System poprosi o potwierdzenie przed wykonaniem.

### Historia kopii

Tabela wszystkich kopii zapasowych z informacjami:

- Nazwa pliku
- Rozmiar
- Data utworzenia

System automatycznie tworzy kopie zapasowe co 24 godziny, więc nawet bez ręcznej interwencji dane są chronione.

---

## 10. Terminal logów

**(tylko Administrator)**

Konsola logów systemowych działająca w czasie rzeczywistym. Wyświetla zdarzenia zachodzące w systemie na bieżąco — bez konieczności odświeżania strony.

### Funkcje terminala:

- **Transmisja na żywo** — nowe wpisy pojawiają się automatycznie (konieczne jest aktywne połączenie WebSocket, wskaźnik statusu w górnym rogu).
- **Pauza/Wznowienie** — możesz zatrzymać strumień logów, aby spokojnie przeanalizować interesujący wpis, a następnie go wznowić.
- **Filtrowanie po poziomie** — wyświetl tylko interesujące Cię poziomy logów (Information, Warning, Error itp.).
- **Wyszukiwanie** — szukane frazy w treści logów.
- **Paginacja** — nawigacja między stronami logów.
- **Czyszczenie bufora** — usuń wszystkie logi z pamięci podręcznej.

Każdy wpis logu wyświetla: czas, poziom (oznaczony kolorem), kategorię i treść komunikatu.

---

## 11. Preferencje

Sekcja ustawień osobistych, dostępna dla wszystkich użytkowników.

### 11.1. Motyw

Przełączanie między trybem jasnym (**Light**) a ciemnym (**Dark**). Zmiana jest natychmiastowa.

### 11.2. Język

Wybierz język interfejsu:

- **Polski (PL)**
- **Angielski (EN)**

### 11.3. Zmiana hasła

Formularz do zmiany własnego hasła. Wymaga podania aktualnego hasła oraz dwukrotnego wpisania nowego. Hasło musi spełniać wymogi bezpieczeństwa (min. 8 znaków, cyfra i znak specjalny).

### 11.4. Uwierzytelnianie dwuskładnikowe (2FA)

Dodatkowa warstwa bezpieczeństwa. Po włączeniu, przy każdym logowaniu oprócz hasła wymagany jest jednorazowy kod z aplikacji uwierzytelniającej.

**Jak włączyć 2FA:**

1. Kliknij przycisk konfiguracji 2FA.
2. System wygeneruje kod QR.
3. Zeskanuj go za pomocą aplikacji uwierzytelniającej (np. Google Authenticator, Microsoft Authenticator).
4. Wpisz wyświetlony kod weryfikacyjny, aby potwierdzić konfigurację.

**Jak wyłączyć 2FA:**

Użyj opcji wyłączenia w sekcji 2FA. Będziesz musiał potwierdzić operację kodem z aplikacji.

---

## 12. Sterowanie głosowe

W prawym dolnym rogu ekranu znajduje się **pływający przycisk sterowania głosowego**. Umożliwia on wydawanie poleceń systemowi w języku naturalnym.

### Jak używać:

1. Kliknij przycisk mikrofonu.
2. Wpisz polecenie tekstem (np. „pokaż wszystkie produkty", „przyjmij produkt o kodzie ABC-123", „ile mamy wolnych slotów").
3. System przetworzy polecenie i wykona odpowiednią operację lub wyświetli żądane informacje.

Sterowanie głosowe rozumie polecenia dotyczące: operacji magazynowych (przyjęcie, wydanie), przeglądania produktów i regałów oraz generowania raportów.

---

## 13. Powiadomienia i alerty

System automatycznie monitoruje warunki magazynowe i generuje alerty w następujących sytuacjach:

| Typ alertu | Kiedy się pojawia |
|---|---|
| **Temperatura** | Odczyt temperatury regału wykracza poza dopuszczalny zakres |
| **Waga** | Zmierzona waga regału jest znacząco niższa od oczekiwanej (możliwa kradzież lub uszkodzenie) |
| **Termin ważności** | Produkt zbliża się do końca terminu ważności lub go przekroczył |

Alerty pojawiają się jako **powiadomienia w czasie rzeczywistym** na górnym pasku nawigacji (ikona dzwonka). Po kliknięciu ikony rozwijana jest lista aktywnych alertów z opisem problemu i lokalizacją.

Alerty, które dotyczą temperatury lub wagi, są automatycznie zamykane przez system, gdy warunki wrócą do normy.

---

## 14. Sesja i bezpieczeństwo

- **Automatyczne wylogowanie** — sesja wygasa po określonym czasie nieaktywności. Na 5 minut przed wygaśnięciem system wyświetla ostrzeżenie z odliczaniem i przyciskiem **Przedłuż sesję**.
- **Kontrola sesji** — system regularnie sprawdza ważność Twojej sesji. Jeśli wygaśnie, zostaniesz automatycznie przekierowany na stronę logowania.
- **Hasło** — powinno mieć minimum 8 znaków, zawierać cyfrę i znak specjalny.
- **2FA** — zalecamy włączenie uwierzytelniania dwuskładnikowego dla wszystkich kont, szczególnie administracyjnych.
