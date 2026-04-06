import type { UserSettings } from './types';

// ── Tesla OAuth ──

export const TESLA_AUTH_BASE = 'https://auth.tesla.com';
export const TESLA_AUTH_URL = `${TESLA_AUTH_BASE}/oauth2/v3/authorize`;
export const TESLA_TOKEN_URL = `${TESLA_AUTH_BASE}/oauth2/v3/token`;
export const TESLA_REDIRECT_URI = `${TESLA_AUTH_BASE}/void/callback`;

export const TESLA_CLIENT_ID = 'ownerapi';
export const TESLA_SCOPES = 'openid email offline_access';

// ── Tesla API Endpoints ──

export const FLEET_API_BASES: Record<string, string> = {
  na: 'https://fleet-api.prd.na.vn.cloud.tesla.com',
  eu: 'https://fleet-api.prd.eu.vn.cloud.tesla.com',
  cn: 'https://fleet-api.prd.cn.vn.cloud.tesla.cn',
};

export const OWNER_API_BASE = 'https://owner-api.teslamotors.com';
export const AKAMAI_API_BASE = 'https://akamai-apigateway-vfx.tesla.com';

export const TESLA_APP_VERSION = '9.99.9-9999';

// ── Extension Defaults ──

export const DEFAULT_SETTINGS: UserSettings = {
  pollIntervalMinutes: 10,
  notifyOnStatusChange: true,
  notifyOnVinAssigned: true,
  notifyOnDeliveryWindow: true,
  notifyOnMilestone: true,
  region: 'eu',
  deviceLanguage: 'en',
  deviceCountry: 'US',
};

export const ALARM_NAME = 'checkDelivery';
export const MIN_POLL_INTERVAL_MINUTES = 1;
export const MAX_POLL_INTERVAL_MINUTES = 60;

// ── Storage Keys ──

export const STORAGE_KEYS = {
  encryptedRefreshToken: 'encryptedRefreshToken',
  cryptoKey: 'cryptoKey',
  orders: 'orders',
  taskDetails: 'taskDetails',
  lastChecked: 'lastChecked',
  changeHistory: 'changeHistory',
  settings: 'settings',
  codeVerifier: 'codeVerifier',
} as const;

export const SESSION_KEYS = {
  accessToken: 'accessToken',
  expiresAt: 'expiresAt',
} as const;
