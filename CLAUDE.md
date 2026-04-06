# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tesla Delivery Tracker — a cross-browser extension (Chrome/Edge, Firefox, Safari) that tracks Tesla vehicle delivery status in real-time using Tesla's APIs. Built with **WXT framework** (Vite-based), **Preact** for UI, **TypeScript**, and **Tailwind CSS + DaisyUI**.

The extension operates on three API tiers:
1. **Content Script** (zero-risk) — reads `Tesla.ProductF.Data` from tesla.com DOM
2. **Fleet API** (`fleet-api.prd.{region}.vn.cloud.tesla.com`) — official OAuth, polling `/api/1/users/orders`
3. **Akamai Tasks API** (`akamai-apigateway-vfx.tesla.com/tasks`) — undocumented, richest data (delivery milestones, odometer, options), unstable

## Build & Development

```bash
npm install              # Install dependencies
npx wxt dev              # Dev mode with HMR (Chrome)
npx wxt dev -b firefox   # Dev mode for Firefox
npx wxt build            # Production build (Chrome/Edge)
npx wxt build -b firefox # Production build for Firefox
npx wxt build -b safari  # Production build for Safari
npx wxt zip              # Create publishable ZIP
```

Load unpacked extension from `.output/chrome-mv3-dev/` in `chrome://extensions`.

## Architecture

```
entrypoints/
├── background.ts          # Service worker: chrome.alarms polling, notifications, token management
├── content.ts             # Injected on tesla.com — token interception (localStorage, cookies, OAuth redirect)
├── popup/                 # Compact UI: delivery status, timeline, vehicle info
│   ├── App.tsx            # Main Preact component
│   └── components/        # StatusCard, DeliveryTimeline, VehicleInfo, LoginPrompt
└── options/               # Settings page: interval, notification types, region
lib/
├── tesla-api.ts           # API client: fetchOrders(), fetchTaskDetails(rn)
├── auth.ts                # OAuth 2.0 PKCE flow, token refresh
├── crypto.ts              # AES-256-GCM encryption for refresh tokens (Web Crypto API)
├── storage.ts             # chrome.storage wrapper (session for access token, local for encrypted refresh)
├── market-options.ts      # 803 Tesla option code mappings (from GewoonJaap repo)
└── diff.ts                # State comparison, change detection
```

**Key Manifest V3 constraints:**
- Service worker has NO DOM access, terminates after ~30s idle
- Must use `chrome.alarms` (not setTimeout/setInterval), min 1 min interval
- All event listeners must be registered synchronously at top level
- Access token in `chrome.storage.session` (RAM-only), refresh token encrypted in `chrome.storage.local`

## Token Security

- Access token: `chrome.storage.session` only (cleared on browser close)
- Refresh token: AES-256-GCM encrypted via Web Crypto API before storing in `chrome.storage.local`
- Never store tokens in service worker globals (lost on termination)
- Never use `localStorage` (inaccessible from service worker)

## API Notes

- Fleet API rate limit: 60 req/min per device. For order tracking, poll every 10-15 min.
- `/tasks` endpoint requires `appVersion` param mimicking Tesla mobile app (e.g., `4.36.1-2823`)
- Tesla blocks cloud IP ranges — extension runs client-side, so no issue
- Avoid "Tesla" in extension title (trademark risk)
- `webextension-polyfill` normalizes `chrome.*` / `browser.*` differences

## Cross-Browser

- **Chrome/Edge**: identical MV3 builds
- **Firefox**: uses Event Pages instead of service workers, needs `browser_specific_settings.gecko.id`
- **Safari**: requires `xcrun safari-web-extension-converter` + Xcode wrapper

## Research Docs

- `docs/research.md` — full project plan, architecture, monetization strategy
- `docs/analizaAPI.md` — complete Tesla API map with all endpoints, response schemas, and stability ratings
