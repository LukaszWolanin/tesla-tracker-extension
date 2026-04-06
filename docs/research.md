# Rozszerzenie przeglądarki Tesla Delivery Tracker — kompletny plan

**Repozytorium GewoonJaap/tesla-delivery-status-web to aplikacja React + TypeScript + Vite, która korzysta z nieudokumentowanych endpointów API Tesli do śledzenia statusu dostawy pojazdu w czasie rzeczywistym.** Kluczowym odkryciem autora jest reverse-engineering endpointu `akamai-apigateway-vfx.tesla.com/tasks`, który zwraca szczegółowe dane o dostawie niedostępne w oficjalnym Fleet API. Poniżej znajduje się pełna analiza techniczna repozytorium, kompletny plan konwersji na rozszerzenie cross-browser (Chrome/Edge, Firefox, Safari) oraz realistyczna strategia monetyzacji open-source.

---

## Analiza techniczna oryginalnej aplikacji

Aplikacja działa jako klient webowy śledzący status zamówienia Tesli. Stos technologiczny to **React 18+ z TypeScript** (96,6% kodu), budowany przez **Vite**, wygenerowany z szablonu Google AI Studio (stąd wymóg `GEMINI_API_KEY` w `.env.local` — prawdopodobnie do AI-owych podsumowań statusu). Kod źródłowy nie używa katalogu `src/` — pliki `.tsx` leżą w korzeniu projektu.

**Przepływ autoryzacji** opiera się na **OAuth 2.0 Authorization Code + PKCE** przez `auth.tesla.com`. Użytkownik jest przekierowywany na stronę logowania Tesli z parametrami: `client_id=ownerapi`, `response_type=code`, `scope=openid email offline_access`, `redirect_uri=https://auth.tesla.com/void/callback` oraz `code_challenge` (SHA-256 z losowego `code_verifier`). Po zalogowaniu Tesla zwraca authorization code, który aplikacja wymienia na tokeny przez POST do `https://auth.tesla.com/oauth2/v3/token`. Odpowiedź zawiera **access_token** (JWT, ważność ~300 sekund), **refresh_token** (ważność ~3 miesiące) oraz `id_token`. Tokeny są przechowywane po stronie klienta (prawdopodobnie `localStorage`) i automatycznie odświeżane.

**Dwa kluczowe endpointy API** obsługują pobieranie danych. Pierwszy — `GET https://owner-api.teslamotors.com/api/1/users/orders` z nagłówkiem `Authorization: Bearer {token}` — zwraca listę zamówień z polem `referenceNumber`, `orderStatus`, `modelCode` i opcjonalnie `vin`. Drugi, nieudokumentowany endpoint — `GET https://akamai-apigateway-vfx.tesla.com/tasks?deviceLanguage=en&deviceCountry=DE&referenceNumber={order_id}&appVersion=4.36.1-2823` — zwraca szczegółowe dane o dostawie: okno czasowe dostawy, status transportu, lokalizację centrum odbioru, przebieg pojazdu, informację o wyjściu z fabryki i oczekujące akcje (podpisanie umów, finalna płatność). Plik `data/market-options.ts` (803 linii) mapuje kody opcji Tesli (np. `APBS`, `WY21A`, `MTY70`) na czytelne nazwy konfiguracji.

**Mechanizm wykrywania zmian** porównuje aktualny stan z poprzednio zapisanym i wyróżnia różnice — przypisanie VIN, zmianę okna dostawy, aktualizację statusu transportu czy zmianę przebiegu. Dashboard (`Dashboard.tsx`) renderuje te dane z wizualnym podkreśleniem zmian od ostatniego sprawdzenia.

---

## Architektura rozszerzenia Manifest V3

Rozszerzenie powinno używać **Manifest V3**, który jest wymagany przez Chrome/Edge od 2024 roku i wspierany przez Firefoksa (od v109) oraz Safari. Kluczowe komponenty architektury:

**Background Service Worker** (`background.ts`) — serce rozszerzenia. Odpowiada za periodyczne odpytywanie API Tesli przez `chrome.alarms` (minimum co 1 minutę, rekomendowane co **5 minut**), porównywanie danych z poprzednim stanem, wyświetlanie powiadomień przez `chrome.notifications` oraz zarządzanie tokenami (automatyczne odświeżanie przed wygaśnięciem). W MV3 service worker **nie ma dostępu do DOM**, terminuje się po ~30 sekundach bezczynności i nie może używać `setTimeout`/`setInterval` — stąd konieczność `chrome.alarms`. Wszystkie event listenery muszą być rejestrowane synchronicznie na najwyższym poziomie skryptu.

**Content Script** (`content.ts`) — wstrzykiwany na stronach `*://*.tesla.com/*` w celu automatycznego przechwycenia tokenu. Content script ma dostęp do `document.cookie` (dla ciasteczek bez flagi HttpOnly), `localStorage` i `sessionStorage` strony. Po wykryciu tokenu wysyła go do background przez `chrome.runtime.sendMessage`. Dodatkowo `chrome.cookies.onChanged` w background monitoruje zmiany ciasteczek `tesla.com` w tle.

**Popup** (`popup/`) — kompaktowy interfejs wyświetlany po kliknięciu ikony rozszerzenia. Pokazuje aktualny status dostawy, okno czasowe, VIN, postęp zamówienia — **bez konieczności otwierania jakiejkolwiek strony**. Dane pobiera z `chrome.storage.local`, gdzie background worker je cyklicznie aktualizuje.

**Options Page** (`options/`) — strona ustawień dostępna z menu rozszerzenia. Umożliwia: ręczne wpisanie/wklejenie tokenu, ustawienie interwału sprawdzania (5/15/30/60 minut), wybór typów powiadomień, konfigurację języka i regionu.

---

## Bezpieczne przechowywanie tokenu Tesla

Token dostępu to najwrażliwszy element rozszerzenia — daje pełny dostęp do konta Tesla użytkownika. Strategia przechowywania powinna być warstwowa.

**Access token** należy trzymać w `chrome.storage.session` — magazynie wyłącznie w pamięci RAM, który jest automatycznie czyszczony przy zamknięciu przeglądarki i nigdy nie jest zapisywany na dysk. To najbezpieczniejsza opcja w ekosystemie rozszerzeń. Aby content script mógł z niego korzystać, trzeba wywołać `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })`.

**Refresh token** (długoterminowy, ~3 miesiące) powinien być zaszyfrowany przed zapisem w `chrome.storage.local` przy użyciu **Web Crypto API** (natywne, bez zewnętrznych zależności). Schemat: generowanie klucza AES-256-GCM z hasła/klucza przez PBKDF2 (100 000 iteracji), szyfrowanie tokenu z losowym IV, zapis zaszyfrowanego bufora + IV do storage. Przy starcie przeglądarki background worker deszyfruje refresh token, wymienia go na nowy access token i umieszcza go w `chrome.storage.session`.

Kluczowe zasady bezpieczeństwa: **nigdy nie przechowywać tokenów w zmiennych globalnych** service workera (giną przy terminacji), nigdy nie używać `localStorage` (niedostępne z service workera), minimalizować uprawnienia w manifeście, wymuszać HTTPS dla całej komunikacji.

---

## Automatyczne przechwytywanie tokenu z tesla.com

Dla użytkowników, którzy nie chcą ręcznie kopiować tokenów, rozszerzenie powinno automatycznie je wykrywać. Najskuteczniejsza strategia łączy trzy metody:

**Metoda 1 — Content Script monitorujący `localStorage`**: Po załadowaniu strony `tesla.com` content script sprawdza `localStorage` i `sessionStorage` w poszukiwaniu kluczy zawierających tokeny (np. `tesla_access_token`, `auth-token`). Ponieważ content script dzieli storage z witryną, ma pełny dostęp do tych danych. Skrypt wysyła znaleziony token do background workera przez `chrome.runtime.sendMessage({ type: 'TOKEN_FOUND', token })`.

**Metoda 2 — `chrome.cookies` API w background**: Z uprawnieniami `cookies` i `host_permissions` na `https://*.tesla.com/*` background worker może bezpośrednio odczytywać ciasteczka domeny Tesla oraz nasłuchiwać zmian przez `chrome.cookies.onChanged`. Gdy pojawi się ciasteczko autoryzacyjne, token jest natychmiast wyodrębniany i zapisywany.

**Metoda 3 — Przechwycenie odpowiedzi OAuth**: Content script wstrzyknięty na `https://auth.tesla.com/*` może monitorować URL (`window.location`) w poszukiwaniu parametru `code=` w redirect URI. Po wykryciu kodu autoryzacyjnego, background worker dokonuje wymiany na tokeny przez endpoint `/oauth2/v3/token`. To najbardziej niezawodna metoda, bo przechwytuje token u źródła.

Rekomendowany flow UX: przy pierwszym użyciu rozszerzenie wyświetla w popup przycisk „Zaloguj się przez Tesla". Kliknięcie otwiera nową kartę z `auth.tesla.com/oauth2/v3/authorize` (z parametrami PKCE). Content script na stronie auth automatycznie przechwytuje kod i wymienia go na tokeny. Użytkownik wraca do popup — status dostawy jest już widoczny.

---

## System powiadomień o zmianach statusu

**Cykliczne sprawdzanie** odbywa się przez `chrome.alarms.create('checkDelivery', { periodInMinutes: 5 })`. Przy każdym alarmie background worker pobiera dane z API Tesli, porównuje z poprzednim stanem zapisanym w `chrome.storage.local` i generuje powiadomienie `chrome.notifications.create()` jeśli wykryje zmianę. Monitorowane pola to: `orderStatus` (np. zmiana z „In Transit" na „Ready for Appointment"), przypisanie VIN, zmiana okna dostawy, aktualizacja przebiegu i nowe pending actions.

Powiadomienia powinny zawierać: ikonę rozszerzenia (logo Tesla/ikona pojazdu), tytuł „Status dostawy Tesla się zmienił!", treść z konkretną zmianą (np. „Twój Model Y otrzymał VIN: 7SAYGDET6TA628353") oraz akcję po kliknięciu — otwarcie popup z pełnymi szczegółami. Alarm musi być ponownie rejestrowany w listenerze `chrome.runtime.onStartup`, ponieważ w MV3 alarmy mogą nie przetrwać restartu przeglądarki.

Ważne ograniczenie: **minimalny interwał alarmu to 1 minuta**, ale ze względu na rate-limiting API Tesli rekomendowane jest sprawdzanie co **5-15 minut**. Zbyt częste odpytywanie może skutkować blokowaniem przez WAF Tesli.

---

## Strategia kompatybilności cross-browser

Kluczowe różnice między przeglądarkami i jak je obsłużyć:

- **Chrome/Edge** — identyczny format rozszerzenia (oba oparte na Chromium). Manifest V3 z `"background": { "service_worker": "background.js" }`. Publikacja: Chrome Web Store (jednorazowa opłata **5 USD**, recenzja 1-3 dni) pokrywa Chrome; Edge Add-ons (osobne konto developerskie, **darmowe**) wymaga przesłania tego samego ZIP.
- **Firefox** — wspiera MV3, ale z istotnymi różnicami: zamiast service workerów używa Event Pages (tło z dostępem do DOM), zachowuje blocking `webRequest` API, wymaga sekcji `browser_specific_settings.gecko.id` w manifeście. API preferuje namespace `browser.*` zamiast `chrome.*`. Publikacja: Firefox AMO (**darmowa**), wymaga dołączenia kodu źródłowego do recenzji.
- **Safari** — wymaga konwersji przez `xcrun safari-web-extension-converter /ścieżka/do/rozszerzenia/` w Xcode. Generuje projekt Xcode opakowujący rozszerzenie jako natywną aplikację macOS/iOS. Publikacja: Apple App Store (roczna opłata **99 USD** za konto deweloperskie). Safari nie wspiera `webRequest` API — trzeba użyć `webNavigation` jako alternatywy.

**Rozwiązanie**: framework **WXT** automatycznie generuje osobne manifesty dla każdej przeglądarki z jednego kodu źródłowego. Polecenie `wxt build -b chrome`, `wxt build -b firefox`, `wxt build -b safari` tworzy odpowiednie buildy. Biblioteka `webextension-polyfill` normalizuje różnice w API (`const browser = globalThis.browser ?? globalThis.chrome`).

---

## Rekomendowany stos technologiczny i struktura projektu

Cel: **lekkość, szybkość i minimalna złożoność** — rozszerzenie powinno mieć popup ładujący się natychmiast.

| Warstwa | Technologia | Uzasadnienie |
|---|---|---|
| Framework budowania | **WXT** (Vite pod spodem) | Autogeneracja manifestu, HMR, multi-browser z jednego kodu |
| UI popup/options | **Preact** (~4 KB) lub **Svelte** (~2 KB runtime) | React-like DX przy 1/10 rozmiaru; natychmiastowy start popup |
| Język | **TypeScript** | Bezpieczeństwo typów, spójność z oryginalnym projektem |
| Stylowanie | **Tailwind CSS** + DaisyUI | Szybki prototyping, ciemny motyw „Tesla-style" |
| Storage tokenów | `chrome.storage.session` + Web Crypto API | RAM-only dla access tokenu, szyfrowanie AES-GCM dla refresh |
| Tło | `chrome.alarms` + `chrome.notifications` | Polling co 5 min, natywne powiadomienia desktop |
| Cross-browser | `webextension-polyfill` + buildy WXT | Automatyczna obsługa różnic API |

**Struktura katalogów** (WXT convention):

```
tesla-delivery-extension/
├── entrypoints/
│   ├── background.ts              # Service worker — alarmy, polling API, powiadomienia
│   ├── content.ts                 # Wstrzykiwany na tesla.com — przechwycenie tokenu
│   ├── popup/
│   │   ├── index.html             # HTML popup
│   │   ├── main.tsx               # Punkt wejścia Preact/Svelte
│   │   ├── App.tsx                # Główny komponent popup
│   │   ├── components/
│   │   │   ├── StatusCard.tsx     # Karta statusu dostawy
│   │   │   ├── DeliveryTimeline.tsx # Wizualizacja postępu
│   │   │   ├── VehicleInfo.tsx    # Informacje o pojeździe
│   │   │   └── LoginPrompt.tsx    # Ekran logowania
│   │   └── style.css
│   └── options/
│       ├── index.html             # HTML strony opcji
│       └── main.tsx               # Ustawienia (interwał, powiadomienia, region)
├── lib/
│   ├── tesla-api.ts               # Klient API Tesli (fetch orders, tasks)
│   ├── auth.ts                    # OAuth PKCE flow, token refresh
│   ├── crypto.ts                  # Szyfrowanie/deszyfrowanie tokenów (Web Crypto)
│   ├── storage.ts                 # Wrapper na chrome.storage (get/set/encrypt)
│   ├── market-options.ts          # Mapowanie kodów opcji (z oryginalnego repo)
│   └── diff.ts                    # Porównywanie stanów, wykrywanie zmian
├── assets/
│   └── icons/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
├── public/                        # Pliki statyczne
├── wxt.config.ts                  # Konfiguracja WXT (uprawnienia, target browsers)
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## Harmonogram rozwoju krok po kroku

Poniższy roadmap zakłada pracę jednego dewelopera, 2-3 godziny dziennie, z zerowym doświadczeniem w budowaniu rozszerzeń. Łączny szacowany czas: **6-8 tygodni**.

**Tydzień 1-2: Fundament i nauka (14h)**
Cel: uruchomienie szkieletu rozszerzenia z działającym popup. Zainstalować Node.js, zainicjować projekt WXT (`npx wxt@latest init`), wybrać Preact jako framework UI. Przestudiować oficjalną dokumentację WXT (wxt.dev) i Chrome Extensions Getting Started (developer.chrome.com). Stworzyć prosty popup wyświetlający statyczny tekst „Tesla Delivery Tracker" z przyciskiem logowania. Skonfigurować Tailwind CSS z ciemnym motywem. Cel tygodnia: rozszerzenie ładuje się w Chrome w trybie deweloperskim.

**Tydzień 3: Autoryzacja Tesla OAuth (10h)**
Cel: pełny flow logowania. Zaimplementować generowanie pary PKCE (`code_verifier` + `code_challenge`) w `lib/auth.ts`. Zbudować flow: kliknięcie „Zaloguj" → otwarcie karty z `auth.tesla.com` → content script na `auth.tesla.com/void/callback` przechwytuje kod → wymiana na tokeny → zapis w `chrome.storage.session`. Zaimplementować szyfrowanie refresh tokenu w `lib/crypto.ts` i zapis do `chrome.storage.local`. Testować z prawdziwym kontem Tesla.

**Tydzień 4: Pobieranie danych i wyświetlanie (10h)**
Cel: popup pokazuje prawdziwy status dostawy. Zaimplementować `lib/tesla-api.ts` z dwoma endpointami: `fetchOrders()` i `fetchTaskDetails(referenceNumber)`. Przenieść mapowanie kodów opcji z oryginalnego `market-options.ts`. Zaprojektować UI popup: `StatusCard` (główny status + badge), `DeliveryTimeline` (krokami: zamówienie → produkcja → transport → gotowe → dostawa), `VehicleInfo` (VIN, model, opcje w czytelnej formie). Dane cacheować w `chrome.storage.local`.

**Tydzień 5: Background polling i powiadomienia (8h)**
Cel: automatyczne wykrywanie zmian i powiadomienia desktop. Skonfigurować `chrome.alarms` w background.ts (co 5 minut). Zaimplementować `lib/diff.ts` — porównywanie nowych danych z zapisanym stanem, wykrywanie zmian w polach: `orderStatus`, `vin`, `deliveryWindow`, `vehicleOdometer`, pending tasks. Przy wykryciu zmiany: aktualizacja badge ikony rozszerzenia (np. czerwona kropka), wyświetlenie `chrome.notifications` z treścią zmiany, zapis historii zmian. Dodać stronę opcji z ustawieniem interwału i typów powiadomień.

**Tydzień 6: Content script i auto-detection tokenu (6h)**
Cel: automatyczne przechwytywanie tokenu przy wizycie na tesla.com. Zarejestrować content script dla `*://*.tesla.com/*` i `*://auth.tesla.com/*`. Monitorować `localStorage`, `sessionStorage` i `document.cookie` w poszukiwaniu tokenów. Wdrożyć `chrome.cookies.onChanged` w background dla ciasteczek tesla.com. Testować flow: użytkownik loguje się normalnie na tesla.com → rozszerzenie automatycznie wykrywa token → popup pokazuje dane bez dodatkowej akcji.

**Tydzień 7: Cross-browser i publikacja (8h)**
Cel: działające buildy dla Firefox i Edge, przygotowanie do publikacji. Uruchomić `wxt build -b firefox` — dodać `browser_specific_settings.gecko.id` do konfiguracji, przetestować w Firefox Developer Edition. Zbudować dla Edge (ten sam build co Chrome). Dla Safari: na macOS uruchomić `xcrun safari-web-extension-converter` i przetestować w Safari. Przygotować materiały do Chrome Web Store: opis, screenshoty, ikony, politykę prywatności. Opłacić $5 za konto deweloperskie Chrome i złożyć rozszerzenie do recenzji.

**Tydzień 8: Polish, testy i launch (6h)**
Cel: wersja 1.0 gotowa do użytku. Testy end-to-end na Chrome, Firefox, Edge. Obsługa błędów: wygasły token, brak internetu, rate-limiting API. Dodanie komunikatów dla użytkownika w przypadku problemów. Stworzenie README z instrukcją instalacji i użycia. Opublikowanie kodu na GitHubie jako open-source (MIT). Ogłoszenie na r/teslamotors, Tesla Motors Club i polskich forach Tesla.

---

## Plan monetyzacji — ranking strategii według realności

Rynek docelowy to **niszowe rozszerzenie** z szacowaną bazą **2 000-20 000 użytkowników**. W dowolnym momencie ok. 300-600 tys. osób czeka na dostawę Tesli globalnie, ale użytkownicy naturalnie odchodzą po odbiorze pojazdu (cykl użycia 2-4 miesiące). Ta tymczasowość fundamentalnie wpływa na strategię monetyzacji.

### 1. Model freemium — najwyższa realność ⭐⭐⭐⭐⭐

**Szacowany przychód: 800-6 000 PLN/miesiąc**

To najlepsza strategia dla niszowego rozszerzenia z wyraźną wartością premium. Darmowa wersja oferuje: ręczne sprawdzanie statusu w popup, podstawowe informacje o zamówieniu i dekodowanie VIN. Wersja **Premium** (19,99 PLN/miesiąc lub 39,99 PLN jednorazowo jako „Delivery Pass") odblokowuje: automatyczne powiadomienia push przy zmianach statusu, wizualną oś czasu dostawy z prognozą, śledzenie wielu zamówień jednocześnie, szczegółowy dekoder opcji z wyjaśnieniami, eksport historii zmian, **priorytetową częstotliwość sprawdzania** (co 1 minutę zamiast 15).

Tymczasowy charakter użycia (2-4 miesiące oczekiwania na dostawę) jest tu **zaletą** — użytkownicy w fazie ekscytacji chętnie płacą za spokój ducha i informacje. Jednorazowy „Delivery Pass" może być atrakcyjniejszy niż subskrypcja. Przy **5 000 użytkowników i 4% konwersji** na premium po 39,99 PLN jednorazowo, to ok. **8 000 PLN/kwartał** (nowi użytkownicy stale dochodzą wraz z nowymi zamówieniami Tesli).

Implementacja techniczna: użyć **ExtensionPay** (extensionpay.com) — biblioteki stworzonej specjalnie do płatności w rozszerzeniach, integrującej się ze Stripe. Alternatywnie Paddle lub LemonSqueezy dla obsługi VAT w UE.

### 2. Partnerstwa afiliacyjne z akcesoriami Tesla ⭐⭐⭐⭐

**Szacowany przychód: 400-2 000 PLN/miesiąc**

Idealnie dopasowane do user journey — osoba czekająca na dostawę Tesli **aktywnie kupuje akcesoria**: dywaniki, folie PPF, ładowarki domowe, uchwyty na telefon, osłony ekranu. Rozszerzenie może wyświetlać kontekstową sekcję „Przygotuj się na dostawę" w popup, gdy status zamówienia zbliża się do finalizacji.

Dostępne programy afiliacyjne: **EVANNEX** (przez Rakuten, 30-dniowe cookie), **EVBASE** (5% prowizji), **Yeslak** (do 12% w promocjach), **TAPTES** (prowizja za akcesoria Tesla), **Tesevo** (negocjowalna prowizja + darmowe produkty dla twórców), **EVACA** (10% prowizji, Kanada). Średnia prowizja wynosi **5-10%** przy średniej wartości zamówienia ~200-400 PLN.

**Ważne**: od czerwca 2025 Chrome Web Store wymaga pełnego ujawnienia programu afiliacyjnego w opisie rozszerzenia, wymogu akcji użytkownika przed zastosowaniem linku afiliacyjnego i zapewnienia bezpośredniej korzyści dla użytkownika (np. kod rabatowy). Linki afiliacyjne nie mogą być wstrzykiwane automatycznie.

### 3. GitHub Sponsors i darowizny ⭐⭐⭐

**Szacowany przychód: 200-1 200 PLN/miesiąc**

Społeczność Tesli jest technicznie świadoma i docenia narzędzia open-source. **GitHub Sponsors** (0% prowizji, 100% trafia do dewelopera) z programem matchingu do $5 000 w pierwszym roku to najlepsza platforma. Dodatkowe kanały: **Buy Me A Coffee** i **Ko-fi** dla jednorazowych drobnych wpłat, **Open Collective** (5% prowizji) dla transparentnego zarządzania funduszami projektu.

Realne benchmarki: małe projekty OSS z dedykowaną społecznością generują **200-1 000 PLN/miesiąc**. Kluczowe jest regularne komunikowanie postępów i wartości projektu. Przycisk „Wesprzyj projekt" w popup i na stronie opcji rozszerzenia, link do Sponsors w README na GitHubie.

### 4. Sponsoring od firm z ekosystemu Tesla ⭐⭐⭐

**Szacowany przychód: 400-2 000 PLN/miesiąc**

Firmy produkujące akcesoria Tesla (EVANNEX, TAPTES, Yeslak, EVBASE, Tesevo) aktywnie sponsorują narzędzia i twórców w społeczności Tesla. Model: sekcja „Powered by [Marka]" lub „Rekomendowane akcesoria od [Marka]" w interfejsie rozszerzenia. Cybertruck Owners Club ma dedykowaną sekcję „Sponsors Marketplace", a regionalne Tesla Owners Clubs oferują formalne tiers sponsoringowe.

Wymaga osiągnięcia krytycznej masy **~2 000+ aktywnych użytkowników** aby być atrakcyjnym dla sponsorów. Jeden sponsor płacący **500-2 000 PLN/miesiąc** za wyłączność w sekcji rekomendacji to realistyczny scenariusz po osiągnięciu tej bazy.

### 5. Reklamy display ⭐⭐

**Szacowany przychód: 40-400 PLN/miesiąc**

Matematyka nie działa dla niszowego rozszerzenia. Przy CPM ~$1 i 5 000 DAU to ok. **600 PLN/miesiąc** — a użytkownicy Tesli to segment tech-savvy, wybitnie wrażliwy na reklamy. Uszkodzenie reputacji w zwartej społeczności Tesla byłoby nieproporcjonalnie kosztowne. Chrome Web Store wymaga, aby reklamy były „w kontekście", łatwe do usunięcia i nie mogą być łączone z główną funkcjonalnością (zasada single-purpose). Jedyna opcja to **FairShare** (osobne ko-instalowane rozszerzenie reklamowe), co jest nieintuicyjne dla użytkowników.

Reklamy mają sens dopiero przy **50 000+ użytkowników** — a dla niszowego trackera dostawy Tesla to scenariusz graniczny.

### 6. Open Collective i granty ⭐⭐

**Szacowany przychód: 0-400 PLN/miesiąc (sporadycznie)**

Open Collective (10% prowizji) i granty technologiczne lepiej sprawdzają się dla projektów infrastrukturalnych i frameworków, nie dla niszowych narzędzi konsumenckich. Warto założyć konto jako dodatkowy kanał transparentności, ale nie jako główne źródło przychodu.

---

## Rekomendowana strategia łączona

Realistyczny cel: **2 000-8 000 PLN/miesiąc** z połączenia strategii.

Optymalna kombinacja to **freemium jako główne źródło** (jednorazowy „Delivery Pass" za 39,99 PLN + opcjonalna subskrypcja 9,99 PLN/miesiąc dla power userów), **kontekstowe linki afiliacyjne** do akcesoriów Tesla w sekcji „Przygotuj się na dostawę" (zgodne z polityką Chrome z 2025), **GitHub Sponsors** z przyciskiem w popup i README, oraz **sponsoring marki akcesoriów** po osiągnięciu 2 000 użytkowników.

Kluczowe czynniki sukcesu: bycie **open-source buduje zaufanie** (użytkownicy powierzają rozszerzeniu dostęp do konta Tesla — transparentność kodu jest krytyczna), **aktywność w społeczności** (posty na r/teslamotors, TMC, polskich grupach Tesla na Facebooku) jest głównym kanałem akwizycji, a **tymczasowość użycia** wymaga stałego napływu nowych użytkowników — warto rozważyć rozszerzenie funkcjonalności po dostawie (monitoring pojazdu, statystyki ładowania) aby wydłużyć cykl życia użytkownika.

**Żadne z istniejących narzędzi do śledzenia dostawy Tesla nie funkcjonuje jako rozszerzenie przeglądarki** — to luka rynkowa i przewaga pierwszego gracza. Desktop appy (TOST), mobilne (Tesla Order Tracking na Android) i web appy (tesla-status.mrproper.dev) istnieją, ale żaden z nich nie oferuje natychmiastowego dostępu z paska przeglądarki z automatycznymi powiadomieniami, co jest unikalną propozycją wartości rozszerzenia.