# Delivery Tracker for Tesla

> [Polski / Polish version below](#pl)

A browser extension that tracks your Tesla vehicle delivery status in real time. Get notified about status changes, view your delivery timeline, and decode your vehicle configuration — all from the browser toolbar.

## Features

- **Delivery status** — real-time order progress with visual timeline
- **Delivery window** — dates pulled from Tesla's internal Tasks API
- **Vehicle configuration** — decode 800+ Tesla option codes into human-readable specs
- **Vehicle image** — live render from Tesla's Compositor API
- **Desktop notifications** — status changes, VIN assignment, delivery window updates
- **Background polling** — automatic checks every 10 min (configurable down to 1 min)
- **Auto-login** — AES-256-GCM encrypted refresh token, no repeated sign-ins
- **Change history** — recursive deep-diff of entire API responses
- **Cross-browser** — Chrome, Edge, Firefox

## Installation

### From source (development)

```bash
git clone https://github.com/LukaszWolanin/tesla-tracker-extension.git
cd tesla-tracker-extension
npm install
npx wxt dev              # Chrome with HMR
npx wxt dev -b firefox   # Firefox
```

Load the unpacked extension from `.output/chrome-mv3-dev/` at `chrome://extensions` (Developer mode ON).

### Production build

```bash
npm run build            # Chrome/Edge (MV3)
npm run build:firefox    # Firefox (MV2)
npm run build:all        # Both
npx wxt zip              # Publishable ZIP
```

## Architecture

Built with [WXT](https://wxt.dev) + [Preact](https://preactjs.com) + [Tailwind CSS](https://tailwindcss.com) + [DaisyUI](https://daisyui.com).

```
entrypoints/
  background.ts          # Service worker: alarms, polling, notifications, token refresh
  content.ts             # Injected on tesla.com — token interception
  popup/                 # Preact UI: status, timeline, vehicle config, change log
  options/               # Settings: interval, region, notifications, export, donate
lib/
  auth.ts                # OAuth 2.0 PKCE flow
  crypto.ts              # AES-256-GCM encryption for refresh tokens (Web Crypto API)
  storage.ts             # Typed chrome.storage wrapper (session + local)
  tesla-api.ts           # Owner API + Akamai Tasks API + Fleet API (post-delivery)
  diff.ts                # Recursive deep-diff engine with ignored keys
  decode.ts              # Option code decoder, VIN decoder, vehicle image URL builder
  market-options.ts      # 803 Tesla option code mappings
  i18n.ts                # Polish translations
```

## Security

- **Access token**: `chrome.storage.session` only (RAM, cleared on browser close)
- **Refresh token**: AES-256-GCM encrypted before storing in `chrome.storage.local`
- **No external servers** — all data stays on your device
- **Open-source** — full code available for audit

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Data Sources

| Source | Domain | Data |
|--------|--------|------|
| Owner API | `owner-api.teslamotors.com` | Order list, status, VIN, options |
| Tasks API | `akamai-apigateway-vfx.tesla.com` | Delivery window, milestones, registration |
| Compositor | `static-assets.tesla.com` | Vehicle image render |
| Fleet API | `fleet-api.prd.{region}.vn.cloud.tesla.com` | Post-delivery vehicle data |

## Support

This extension is 100% free and open-source. If it helps you, consider supporting development:

- [GitHub Sponsors](https://github.com/sponsors/LukaszWolanin)
- [Buy Me a Coffee](https://buymeacoffee.com/lukaszwolad)

## License

[MIT](LICENSE)

---

<a id="pl"></a>

## PL — Wersja polska

Rozszerzenie przegladarki do sledzenia statusu dostawy pojazdu Tesla w czasie rzeczywistym.

### Funkcje

- **Status dostawy** z wizualnym timeline
- **Okno dostawy** z wewnetrznego API Tesli
- **Konfiguracja pojazdu** — dekodowanie 800+ kodow opcji
- **Obraz pojazdu** z konfiguratora Tesla
- **Powiadomienia desktop** o zmianach statusu, VIN, terminie dostawy
- **Automatyczne sprawdzanie** w tle co 10 min (konfigurowalne)
- **Auto-logowanie** z zaszyfrowanym refresh tokenem
- **Historia zmian** z rekursywnym deep-diff
- **Cross-browser** — Chrome, Edge, Firefox

### Instalacja

```bash
git clone https://github.com/LukaszWolanin/tesla-tracker-extension.git
cd tesla-tracker-extension
npm install
npx wxt dev              # Chrome z HMR
npx wxt dev -b firefox   # Firefox
```

Zaladuj rozszerzenie z `.output/chrome-mv3-dev/` w `chrome://extensions` (tryb dewelopera ON).

### Bezpieczenstwo

- Access token w pamieci RAM (czyszczony przy zamknieciu przegladarki)
- Refresh token szyfrowany AES-256-GCM
- Brak zewnetrznych serwerow — wszystkie dane lokalne
- Kod open-source do audytu

### Wsparcie

Rozszerzenie jest w 100% darmowe. Jesli Ci pomaga:

- [GitHub Sponsors](https://github.com/sponsors/LukaszWolanin)
- [Buy Me a Coffee](https://buymeacoffee.com/lukaszwolad)
