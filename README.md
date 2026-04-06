# Delivery Tracker for Tesla

Rozszerzenie przeglądarki do sledzenia statusu dostawy pojazdu Tesla w czasie rzeczywistym. Powiadomienia o zmianach, timeline dostawy, dekodowanie konfiguracji — wszystko z paska przegladarki.

## Funkcje

- **Status dostawy** — aktualny etap zamowienia z timeline'm
- **Okno dostawy** — daty z Akamai Tasks API
- **Konfiguracja pojazdu** — dekodowanie 803 kodow opcji Tesla
- **Obraz pojazdu** — render z Tesla Compositor API
- **Powiadomienia desktop** — przy zmianie statusu, przypisaniu VIN, aktualizacji okna dostawy
- **Auto-refresh** — polling w tle co 10 min (konfigurowalne)
- **Auto-login** — zaszyfrowany refresh token, bez ponownego logowania
- **Historia zmian** — deep-diff calej odpowiedzi API
- **Cross-browser** — Chrome, Edge, Firefox

## Instalacja (development)

```bash
git clone https://github.com/user/tesla-tracker-browser.git
cd tesla-tracker-browser
npm install
npx wxt dev              # Chrome z HMR
npx wxt dev -b firefox   # Firefox
```

Zaladuj rozszerzenie z `.output/chrome-mv3-dev/` w `chrome://extensions` (Developer mode ON).

## Build

```bash
npm run build            # Chrome/Edge (MV3)
npm run build:firefox    # Firefox (MV2)
npm run build:all        # Oba
npx wxt zip              # ZIP do publikacji
```

## Architektura

```
entrypoints/
  background.ts          # Service worker: alarmy, polling, powiadomienia
  content.ts             # Token interception na tesla.com
  popup/                 # Preact UI: status, timeline, konfiguracja
  options/               # Ustawienia: interwal, region, powiadomienia
lib/
  auth.ts                # OAuth 2.0 PKCE
  crypto.ts              # AES-256-GCM szyfrowanie refresh tokenu
  storage.ts             # chrome.storage wrapper
  tesla-api.ts           # Owner API + Akamai Tasks API
  diff.ts                # Rekursywny deep-diff zmian
  decode.ts              # Dekodowanie kodow opcji i VIN
  market-options.ts      # 803 kodow opcji Tesla
  i18n.ts                # Tlumaczenia (PL)
```

## Bezpieczenstwo

- Access token: `chrome.storage.session` (RAM, czyszczony przy zamknieciu przegladarki)
- Refresh token: AES-256-GCM encrypted w `chrome.storage.local`
- Brak zewnetrznych serwerow — wszystko lokalne
- Kod open-source do audytu

## API

Rozszerzenie korzysta z trzech zrodel danych:
1. **Owner API** (`owner-api.teslamotors.com`) — lista zamowien
2. **Akamai Tasks API** (`akamai-apigateway-vfx.tesla.com`) — szczegoly dostawy, kamienie milowe
3. **Tesla Compositor** (`static-assets.tesla.com`) — obraz pojazdu

## Wsparcie

Rozszerzenie jest w 100% darmowe i open-source. Jesli Ci pomaga, mozesz wsprzec rozwoj:

- [GitHub Sponsors](https://github.com/sponsors/wolanin)
- [Buy Me a Coffee](https://buymeacoffee.com/wolanin)

## Licencja

MIT
