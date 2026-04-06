# Privacy Policy — Delivery Tracker for Tesla

**Last updated:** 2026-04-06

## What data we collect

This extension collects the following data **locally on your device only**:

- **Tesla OAuth tokens** — access token (stored in browser session memory, cleared on browser close) and refresh token (AES-256-GCM encrypted, stored in browser local storage)
- **Order data** — your Tesla order status, delivery details, and vehicle configuration retrieved from Tesla's APIs
- **Change history** — a local log of detected changes to your order status (max 500 entries)
- **User settings** — your preferred polling interval, notification preferences, and region

## How data is stored

- All data is stored **locally in your browser** using `chrome.storage.session` (RAM-only) and `chrome.storage.local` (encrypted)
- **No data is ever sent to external servers** operated by us or third parties
- The extension communicates **only with Tesla's official APIs** (`auth.tesla.com`, `owner-api.teslamotors.com`, `akamai-apigateway-vfx.tesla.com`, `static-assets.tesla.com`)

## What data we do NOT collect

- We do **not** collect analytics or telemetry
- We do **not** track browsing history
- We do **not** share any data with third parties
- We do **not** use cookies for tracking
- We do **not** store any data on external servers

## Permissions explained

| Permission | Why |
|---|---|
| `storage` | Store encrypted tokens, order data, and settings locally |
| `alarms` | Schedule background polling for order status updates |
| `notifications` | Show desktop notifications when order status changes |
| `cookies` | Read Tesla auth cookies for automatic token detection |
| `webNavigation` | Detect OAuth callback redirect after Tesla login |
| `declarativeNetRequest` | Strip browser Origin header from Akamai API requests (required for compatibility) |
| `host_permissions` (tesla.com, etc.) | Communicate with Tesla APIs to fetch order data |

## Data deletion

- **Sign Out** from the extension popup clears all stored tokens, order data, and change history
- Uninstalling the extension removes all locally stored data
- Closing the browser clears the access token (session storage)

## Security

- Refresh tokens are encrypted with **AES-256-GCM** using the Web Crypto API before storage
- The encryption key is generated per-installation and stored alongside the encrypted data
- All API communication uses **HTTPS**
- Source code is open-source and available for audit

## Contact

For privacy concerns, please open an issue on the GitHub repository.
