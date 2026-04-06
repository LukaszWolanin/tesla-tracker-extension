# Kompletna mapa API Tesli dla wtyczki śledzenia dostawy

**Tesla udostępnia znacznie więcej danych niż sam status dostawy — od przebiegu pojazdu jeszcze przed odbiorem, przez dekompozycję opcji konfiguracyjnych, po kamienie milowe logistyki fabrica→centrum odbioru.** Kluczowe endpointy to oficjalny `GET /api/1/users/orders` (Fleet API) oraz nieudokumentowany `GET /tasks` na domenie Akamai, który zwraca szczegółowe zadania dostawcze, okno czasowe, przebieg i kody opcji. Dla wtyczki przeglądarkowej najniższe ryzyko daje podejście content-script (odczyt danych z DOM strony tesla.com/teslaaccount), a opcjonalnie Fleet API umożliwia polling w tle. Poniżej pełna analiza techniczna wszystkich dostępnych źródeł danych.

---

## Architektura API Tesli — trzy warstwy dostępu

Tesla operuje na trzech odrębnych warstwach API, z których każda oferuje inne dane i niesie inne ryzyko.

**Warstwa 1: Oficjalne Fleet API** (`fleet-api.prd.{region}.vn.cloud.tesla.com`) — udokumentowane na developer.tesla.com, płatne od stycznia 2025, wymaga rejestracji developera z podmiotem prawnym i hostowanym kluczem publicznym. Endpointy użytkownika (`/api/1/users/*`) działają **bez posiadania pojazdu** i są kluczowe dla śledzenia zamówień. Bazowe URL-e regionalne to `fleet-api.prd.na.vn.cloud.tesla.com` (Ameryka/APAC), `fleet-api.prd.eu.vn.cloud.tesla.com` (Europa/EMEA) i `fleet-api.prd.cn.vn.cloud.tesla.cn` (Chiny).

**Warstwa 2: Legacy Owner API** (`owner-api.teslamotors.com`) — nieoficjalne, ale wciąż działające (stan: kwiecień 2026). Używa prostszej autentykacji OAuth PKCE z `client_id=ownerapi`. Zwraca więcej szczegółów w odpowiedzi `/api/1/users/orders` niż Fleet API. Komendy pojazdu już nie działają na nowszych modelach (wymagają podpisanych komend przez Fleet API), ale endpointy odczytu danych wciąż funkcjonują.

**Warstwa 3: Wewnętrzne API aplikacji mobilnej** — domena `akamai-apigateway-vfx.tesla.com` to proxy Akamai dla wewnętrznych mikroserwisów Tesli. Endpoint `/tasks` jest **najcenniejszym źródłem danych dostawczych**, zwracając kamienie milowe, okno dostawy, przebieg i konfigurację — ale jest całkowicie nieudokumentowany i może zniknąć bez ostrzeżenia.

---

## Endpointy dostępne BEZ pojazdu — fundament wtyczki

Dla użytkownika oczekującego na dostawę (nie ma jeszcze pojazdu) dostępne są wyłącznie endpointy poziomu konta. To właśnie te dane stanowią rdzeń wtyczki.

### `GET /api/1/users/orders` — lista aktywnych zamówień

Oficjalnie udokumentowany w Fleet API, ale Tesla **nie opublikowała schematu odpowiedzi**. Na podstawie reverse-engineeringu projektów open-source i danych z forów TMC, potwierdzone pola odpowiedzi to:

```json
{
  "response": [{
    "referenceNumber": "RN126361089",
    "orderStatus": "READY FOR APPOINTMENT",
    "orderSubstatus": "_Z",
    "modelCode": "MTY70",
    "vin": "7SAYGDET6TA628353",
    "year": 2026,
    "countryCode": "US",
    "imageUrl": "https://static-assets.tesla.com/...",
    "isFoundersSeries": false,
    "isDeliveredOrPostDelivered": false,
    "isPaymentPending": true,
    "isReferralWinner": false,
    "isCoowner": false,
    "esignStatus": "PENDING",
    "isCommercialCaptive": false
  }]
}
```

**Znane wartości `orderStatus`**: `PENDING`, `BOOKED`, `IN_PRODUCTION`, `IN_TRANSIT`, `READY FOR APPOINTMENT`, `DELIVERED`. Pole `orderSubstatus` (np. `_Z`) nie jest w pełni zdekodowane przez społeczność.

### `GET /api/1/users/me` — profil użytkownika

Wymaga scope `user_data`. Zwraca: **`email`** (string), **`full_name`** (string), **`profile_image_url`** (URL do zdjęcia profilowego). Minimalistyczna odpowiedź, ale przydatna do personalizacji wtyczki.

### `GET /api/1/users/region` — region i baza API

Wymaga jedynie scope `openid`. Zwraca `region` (np. `"eu"`, `"na"`) oraz `fleet_api_base_url` — kluczowe dla automatycznego kierowania zapytań do właściwego serwera regionalnego.

### `GET /api/1/users/feature_config` — flagi funkcji

Zwraca flagi konfiguracyjne konta, np. `signaling.enabled`, `subscribe_connectivity`. Mało praktyczne dla wtyczki, ale daje wgląd w status konta.

---

## Endpoint `/tasks` — serce śledzenia dostawy

To **najważniejszy endpoint** dla wtyczki dostawczej. Używany przez aplikację mobilną Tesli i wszystkie znane narzędzia śledzenia zamówień.

### Pełny URL i parametry

```
GET https://akamai-apigateway-vfx.tesla.com/tasks
  ?deviceLanguage=en
  &deviceCountry=US
  &referenceNumber=RN126361089
  &appVersion=4.35.1-2745
```

| Parametr | Opis | Przykład |
|----------|------|---------|
| `deviceLanguage` | Kod języka | `en`, `pl`, `de` |
| `deviceCountry` | Kod kraju | `US`, `PL`, `DE`, `NL` |
| `referenceNumber` | Numer RN zamówienia | `RN126361089` |
| `appVersion` | Wersja aplikacji Tesla | `4.35.1-2745` |

### Struktura odpowiedzi (zrekonstruowana z kodu źródłowego projektów)

Odpowiedź zawiera obiekt `tasks` z zagnieżdżonymi kategoriami:

**`tasks.registration.orderDetails`** — dane pojazdu i zamówienia:

| Pole | Typ | Opis | Przykład |
|------|-----|------|---------|
| `reservationDate` | datetime | Data rezerwacji | `2025-11-27T...` |
| `bookedDate` | string | Data potwierdzenia zamówienia | `2025-11-27` |
| `vehicleOdometer` | number | **Przebieg przed dostawą** | `15` |
| `vehicleOdometerType` | string | Jednostka przebiegu | `MI` lub `KM` |
| `vehicleRoutingLocation` | string | Centrum dostawy | `San Diego - Miramar` |
| `routingCode` | string | Kod lokalizacji dostawy | `27805` |
| `mktOptions` | string | **Kody opcji konfiguracyjnych** | `APBS,IPW10,PR01,SC04,MDLY,WY21A,MTY70,STY5S,CPF2,TW01` |
| `vin` | string | VIN pojazdu (jeśli przypisany) | `7SAYGDET6TA628353` |
| `modelYear` | number | Rok modelowy | `2026` |
| `trimCode` | string | Kod wersji wyposażenia | `$MTY70` |

**`tasks.scheduling`** — dane harmonogramu dostawy:

| Pole | Opis | Przykład |
|------|------|---------|
| `deliveryWindowDisplay` | **Okno czasowe dostawy** | `January 13 - January 25` |
| `apptDateTimeAddressStr` | Umówiony termin i adres odbioru | Pełny adres i data |

**`tasks.finalPayment.data`** — dane płatności:

| Pole | Opis |
|------|------|
| `etaToDeliveryCenter` | ETA do centrum odbioru (uwaga: Tesla częściowo wycofała to pole) |
| `totalDue` | Kwota do zapłaty |

**Kamienie milowe dostawy** — każdy ze statusem `PENDING` lub `DONE`:

| Zadanie | Znaczenie |
|---------|-----------|
| `Sign Agreements` | Podpisanie umowy zakupu/leasingu (MVPA) |
| `Vehicle Exited Factory` | Pojazd opuścił fabrykę |
| `Final Invoice Generation` | Wygenerowano fakturę końcową |
| `Complete Final Payment` | Przetworzono płatność |
| `Vehicle Ready for Transport` | Pojazd przygotowany do transportu |
| `Schedule Delivery` | Można umówić termin odbioru |

**Ważne zastrzeżenie**: statusy kamieni milowych bywają niedokładne. `Vehicle Exited Factory` może pozostać `PENDING` dla pojazdów z zapasu (pre-built). `Vehicle Ready for Transport` może być `PENDING` mimo fizycznej obecności auta w centrum odbioru — przyczyną są pominięte skany kodów kreskowych na placu fabrycznym. System harmonogramowania działa niezależnie od flag logistycznych.

---

## Dekodowanie VIN i opcji konfiguracyjnych

### Struktura VIN Tesli (17 znaków)

| Pozycja | Znaczenie | Kluczowe wartości |
|---------|-----------|-------------------|
| 1-3 | Fabryka (WMI) | `5YJ` Fremont, `7SA` Austin, `LRW` Szanghaj, `XP7` Berlin |
| 4 | Model | `S`, `3`, `X`, `Y` |
| 7 | Typ baterii | `E` = Li-Ion, `F` = LFP |
| 8 | Konfiguracja napędu | Silnik/napęd |
| 10 | Rok modelowy | `T`=2026, `S`=2025, `R`=2024 |
| 11 | Zakład produkcyjny | Kod fabryki |
| 12-17 | Numer seryjny | Litery = prototyp, cyfry = produkcja |

**VIN nie koduje** wersji (Long Range vs Performance) ani pojemności baterii — tylko chemię ogniw. Do pełnej identyfikacji konfiguracji służą **kody opcji z `mktOptions`**.

### Dekodowanie kodów opcji

Projekt GewoonJaap/tesla-delivery-status-web zawiera plik `market-options.ts` z **803 mapowaniami** kodów na czytelne opisy. Najważniejsze kody:

| Kod | Znaczenie |
|-----|-----------|
| `APBS` | Autopilot |
| `APF2` | Full Self-Driving Capability |
| `MTY70` | Model Y Long Range |
| `MTY60` | Model Y Standard Range |
| `BT00` | Bateria 68 kWh (Model Y) 4680 |
| `IPW10` | Biały wnętrze |
| `PR01` | Kolor nadwozia |
| `WY21A` | Felgi 21" |

### Endpoint `specs` (Fleet API, płatny)

`GET /api/1/vehicles/{vin}/specs` zwraca specyfikacje pojazdu na moment sprzedaży. Działa z **Partner Token** (nie wymaga autoryzacji właściciela) i kosztuje **$0.10 za zapytanie**. Może odczytać dane dla dowolnego VIN.

---

## Kompletna tabela endpointów z oceną stabilności

| Endpoint | Domena | Metoda | Scope/Auth | Przed dostawą? | Stabilność | Kluczowe dane |
|----------|--------|--------|------------|----------------|------------|---------------|
| `/api/1/users/orders` | Fleet API | GET | `user_data` | ✅ Tak | 🟢 Wysoka | Status zamówienia, RN, VIN, model, rok |
| `/api/1/users/me` | Fleet API | GET | `user_data` | ✅ Tak | 🟢 Wysoka | Email, imię, zdjęcie profilowe |
| `/api/1/users/region` | Fleet API | GET | `openid` | ✅ Tak | 🟢 Wysoka | Region, URL bazy API |
| `/api/1/users/feature_config` | Fleet API | GET | `user_data` | ✅ Tak | 🟢 Wysoka | Flagi konfiguracyjne |
| `/tasks` | akamai-apigateway-vfx | GET | Bearer SSO | ✅ Tak | 🔴 Niska | Okno dostawy, przebieg, opcje, kamienie milowe, płatności |
| `/api/1/vehicles` | Fleet API | GET | `vehicle_device_data` | ⚠️ Pusta lista | 🟢 Wysoka | Lista pojazdów (po dostawie) |
| `/api/1/vehicles/{vin}/vehicle_data` | Fleet API | GET | `vehicle_device_data` | ❌ Nie | 🟢 Wysoka | Pełne dane pojazdu (ładowanie, klimat, lokalizacja) |
| `/api/1/vehicles/{vin}/specs` | Fleet API | GET | Partner Token | ✅ Dowolny VIN | 🟢 Wysoka | Specyfikacje ($0.10/zapytanie) |
| `/api/1/dx/charging/history` | Fleet API | GET | `vehicle_device_data` | ❌ Nie | 🟢 Wysoka | Historia Supercharger |
| `/api/1/dx/warranty/details` | Fleet API | GET | `vehicle_device_data` | ❌ Nie | 🟢 Wysoka | Dane gwarancyjne |
| `/api/1/vehicles/{vin}/recent_alerts` | Fleet API | GET | `vehicle_device_data` | ❌ Nie | 🟢 Wysoka | Alerty pojazdu |
| `/api/1/vehicles/{vin}/service_data` | Fleet API | GET | `vehicle_device_data` | ❌ Nie | 🟢 Wysoka | Status serwisu |
| `/api/1/vehicles/{vin}/release_notes` | Fleet API | GET | `vehicle_device_data` | ❌ Nie | 🟢 Wysoka | Notatki o firmware |
| `/api/1/dx/vehicles/options` | Fleet API | GET | `vehicle_device_data` | ❌ Nie | 🟢 Wysoka | Opcje pojazdu |
| `/api/1/dx/vehicles/subscriptions/eligibility` | Fleet API | GET | `vehicle_device_data` | ❌ Nie | 🟢 Wysoka | Dostępne subskrypcje |
| `/api/1/dx/vehicles/upgrades/eligibility` | Fleet API | GET | `vehicle_device_data` | ❌ Nie | 🟢 Wysoka | Dostępne ulepszenia |
| `/api/1/products` | Fleet API | GET | `energy_device_data` | ⚠️ Puste bez produktów | 🟢 Wysoka | Pojazdy + energia |
| `/api/1/energy_sites/{id}/live_status` | Fleet API | GET | `energy_device_data` | ❌ Wymaga Powerwall | 🟢 Wysoka | Status energii na żywo |
| `/api/1/energy_sites/{id}/site_info` | Fleet API | GET | `energy_device_data` | ❌ Wymaga Powerwall | 🟢 Wysoka | Info o instalacji |
| `/api/1/users/orders` | owner-api.teslamotors.com | GET | Bearer SSO | ✅ Tak | 🟡 Średnia | Zamówienia (więcej pól niż Fleet API) |
| `/api/1/users/referral_data` | owner-api.teslamotors.com | GET | Bearer SSO | ✅ Tak | 🟡 Średnia | Dane programu referencyjnego |
| `/api/1/users/onboarding_data` | owner-api.teslamotors.com | GET | Bearer SSO | ✅ Tak | 🟡 Średnia | Dane onboardingowe |
| `/safety-rating/daily-metrics` | akamai-apigateway-vfx | GET | Bearer SSO | ❌ Nie | 🔴 Niska | Safety Score dzienny |

---

## Co konkretnie można pokazać w popup wtyczki

Na podstawie analizy API, wtyczka może prezentować znacznie więcej niż sam status dostawy. Oto kompletna lista praktycznych danych podzielona na fazy:

### Faza 1: Zamówienie złożone, brak VIN

- **Numer zamówienia** (RN) i status (`BOOKED`, `PENDING`)
- **Model i wersja** (dekodowany z `modelCode`, np. "Model Y Long Range")
- **Data rezerwacji** i data potwierdzenia zamówienia
- **Okno dostawy** (`deliveryWindowDisplay` — np. "13 stycznia – 25 stycznia")
- **Profil użytkownika** (imię, email, region)
- **Oczekujące zadania** (podpisanie umów, płatność, finansowanie, trade-in, ubezpieczenie)
- Wizualizacja postępu w formie timeline'u

### Faza 2: VIN przypisany, przed dostawą

Wszystko z Fazy 1, plus:
- **VIN** z dekodowanymi danymi (fabryka produkcji, rok modelowy, chemia baterii)
- **Przebieg** pojazdu (`vehicleOdometer` — typowo ~15 mil dla nowych)
- **Pełna konfiguracja** pojazdu zdekodowana z `mktOptions` (803 znanych kodów opcji)
- **Centrum dostawy** (nazwa i lokalizacja z `vehicleRoutingLocation`)
- **Kamienie milowe logistyczne**:
  - ✅/⏳ Pojazd opuścił fabrykę
  - ✅/⏳ Pojazd gotowy do transportu
  - ✅/⏳ Faktura wygenerowana
  - ✅/⏳ Możliwość umówienia odbioru
- **Kod wersji** (`trimCode`) i rok modelowy
- **Renderowanie pojazdu** (URL obrazu z konfiguracji z `imageUrl`)

### Faza 3: Dostawa zaplanowana

Wszystko powyżej, plus:
- **Data i adres odbioru** (`apptDateTimeAddressStr`)
- **Kwota do zapłaty** (`totalDue`)
- **Status podpisania dokumentów** (`esignStatus`)
- **ETA do centrum** (jeśli Tesla nadal udostępnia pole `etaToDeliveryCenter`)

### Faza 4: Po dostawie (dodatkowa wartość wtyczki)

Po odebraniu pojazdu wtyczka może przejść w tryb "właściciel" z danymi z Fleet API:
- **Poziom baterii**, zasięg, stan ładowania
- **Lokalizacja** pojazdu (wymaga scope `vehicle_location`)
- **Przebieg** aktualny
- **Wersja firmware** i dostępne aktualizacje
- **Historia ładowania** Supercharger (lokalizacja, kWh, koszt)
- **Dane gwarancyjne**
- **Dostępne ulepszenia i subskrypcje**
- **Dane Powerwall/Solar** (jeśli użytkownik posiada)

---

## Strategia autentykacji dla wtyczki przeglądarkowej

### Podejście rekomendowane: Content Script + opcjonalny Fleet API

**Tier 1 — Content Script (zero-risk)**. Wtyczka wstrzykuje skrypt na stronach `tesla.com/teslaaccount/*` i odczytuje dane z obiektu JavaScript `Tesla.ProductF.Data`, który Tesla renderuje w źródle strony. Dokładnie tak działają istniejące rozszerzenia „Tesla Order Info Extender" i „Tesla — Extended Order Status". Nie wymaga żadnych wywołań API, rejestracji developera ani autentykacji — korzysta z sesji zalogowanego użytkownika. **Główne ograniczenie**: działa tylko gdy użytkownik ma otwartą stronę konta Tesla.

**Tier 2 — Fleet API OAuth (dla powiadomień w tle)**. Rejestracja jako developer Fleet API, implementacja OAuth `authorization_code` z PKCE, scope `user_data` + `openid` + `offline_access`. Refresh token ważny 3 miesiące. Umożliwia **polling w tle** endpointu `/api/1/users/orders` i wysyłanie powiadomień push o zmianach statusu. Wymaga: podmiot prawny, domena z kluczem publicznym na `/.well-known/`, metoda płatności. Koszt: minimalny — kilka zapytań dziennie mieści się w **kredycie $10/miesiąc**.

**Tier 3 — Akamai Tasks API (najcenniejsze dane, najwyższe ryzyko)**. Użycie tokenu SSO do odpytywania `akamai-apigateway-vfx.tesla.com/tasks`. Daje najbogatsze dane (kamienie milowe, przebieg, opcje), ale jest **całkowicie nieudokumentowany** i Tesla może go zmienić w dowolnym momencie.

---

## Limity, ryzyko i rekomendacje bezpieczeństwa

**Rate limiting Fleet API** to 60 zapytań/minutę na urządzenie/konto dla danych czasu rzeczywistego i 3/minutę dla wybudzeń pojazdu. Przekroczenie skutkuje HTTP 429 z nagłówkami `RateLimit-Remaining` i `RateLimit-Reset`. Dla endpointów zamówień (kilka zapytań dziennie) limity **nie stanowią problemu** — ryzyko jest bliskie zeru.

**Polityka Tesli** jest restrykcyjna: Fleet API Agreement pozwala na banowanie kont „bez ostrzeżenia" za naruszenia. Sekcja 4.5.10 zabrania budowania „konkurencyjnych produktów". Tesla historycznie blokowała zakresy IP chmurowych (AWS, GCP) i masowo unieważniała tokeny (styczeń 2022). Jednak wtyczka do śledzenia dostawy jest **niskokonfliktowa** — odczytuje jedynie dane zamówień, nie wysyła komend do pojazdów.

**Kluczowe środki ostrożności**:
- Nigdy nie przechowywać tokenów na zewnętrznych serwerach — wyłącznie lokalnie
- Unikać nazwy „Tesla" w tytule rozszerzenia (ryzyko trademark claim)
- Open-source kodu źródłowego buduje zaufanie użytkowników
- Polling nie częściej niż co 10-15 minut (wystarczające dla zmian statusu dostawy)
- Implementacja graceful degradation — jeśli Akamai endpoint przestanie działać, fallback na Fleet API `/users/orders`

**Stabilność endpointów**: oficjalne Fleet API jest stabilne i wersjonowane. Owner API działa, ale Tesla aktywnie go wycofuje. Endpoint `/tasks` na Akamai jest najbardziej ryzykowny — społeczność raportuje już wycofywanie niektórych pól (np. `etaToDeliveryCenter`, dane przebiegu w niektórych kontekstach). Tesla modyfikowała auth.tesla.com w sierpniu 2025, wymuszając migrację na `fleet-auth.prd.vn.cloud.tesla.com`.

---

## Projekty open-source do wykorzystania

| Projekt | Język | Kluczowa wartość dla wtyczki |
|---------|-------|------------------------------|
| **GewoonJaap/tesla-delivery-status-web** | TypeScript/Next.js | 803 mapowań kodów opcji w `market-options.ts`, wzorcowa implementacja obu endpointów |
| **niklaswa/tesla-order-status** | Python | Śledzenie zmian między snapshotami JSON, detekcja zmiany statusu |
| **WesSec/teslaorderchecker** | Python | Polling co 10 min + powiadomienia Apprise (wzorzec dla background polling) |
| **tdorssers/TeslaPy** | Python | Kompletna biblioteka Owner API + odkrycie endpointu safety-rating |
| **timdorr/tesla-api** | Dokumentacja | Najobszerniejsza community-wiki API (tesla-api.timdorr.com) |
| **alixrezax/Testatus** | Swift (iOS) | Dekodowanie VIN + dynamiczne jednostki na podstawie regionu dostawy |

---

## Wnioski i architektura rekomendowana

Analiza ujawnia, że **Tesla nieświadomie udostępnia bogate dane dostawcze** przez endpoint `/tasks`, który zasila aplikację mobilną. Te dane — kamienie milowe logistyczne, przebieg, konfiguracja pojazdu, okno dostawy — są niedostępne przez żadne oficjalne API. Oficjalny `GET /api/1/users/orders` zwraca jedynie podstawowy status i VIN.

Optymalna architektura wtyczki to **trójwarstwowy system**: content script jako bezpieczna baza odczytująca `Tesla.ProductF.Data` ze strony konta, opcjonalny Fleet API OAuth dla powiadomień w tle o zmianach statusu, oraz Akamai `/tasks` API jako źródło najbogatszych danych z fallbackiem na prostsze endpointy. Kluczowe jest to, że **historia zmian nie jest przechowywana po stronie API** — wtyczka musi samodzielnie zapisywać snapshoty odpowiedzi i porównywać je, aby pokazać użytkownikowi timeline zmian. Projekt niklaswa/tesla-order-status implementuje dokładnie ten wzorzec i stanowi gotowy szablon do adaptacji. Biorąc pod uwagę niską częstotliwość zmian statusu dostawy (kilka razy w ciągu tygodni), nawet agresywny polling co 10 minut generuje znikome koszty i ryzyko.