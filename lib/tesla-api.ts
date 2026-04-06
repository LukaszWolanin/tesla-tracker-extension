import type { TeslaOrder, TasksResponse, TeslaRegion } from './types';
import {
  FLEET_API_BASES,
  OWNER_API_BASE,
  AKAMAI_API_BASE,
  TESLA_APP_VERSION,
} from './constants';

// ── Fleet API / Owner API ──

export async function fetchOrders(
  accessToken: string,
  region: TeslaRegion = 'eu',
): Promise<TeslaOrder[]> {
  // Owner API first (works with ownerapi client_id), then Fleet API
  const fleetBase = FLEET_API_BASES[region];
  const urls = [
    `${OWNER_API_BASE}/api/1/users/orders`,
    `${fleetBase}/api/1/users/orders`,
  ];

  let all401 = true;
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        errors.push(`${url}: 401`);
        continue; // try next endpoint — 401 from one doesn't mean token is bad
      }

      all401 = false;

      if (!response.ok) {
        errors.push(`${url}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      return data.response ?? [];
    } catch (error) {
      all401 = false;
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Only throw AuthError if ALL endpoints returned 401
  if (all401 && errors.length > 0) {
    throw new AuthError('Token expired');
  }

  throw new Error(`Failed to fetch orders: ${errors.join('; ')}`);
}

export async function fetchUserRegion(
  accessToken: string,
): Promise<{ region: string; fleetApiBaseUrl: string }> {
  for (const base of Object.values(FLEET_API_BASES)) {
    try {
      const response = await fetch(`${base}/api/1/users/region`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) continue;

      const data = await response.json();
      return data.response;
    } catch {
      // Try next
    }
  }

  throw new Error('Failed to determine user region');
}

// ── Akamai Tasks API (undocumented, richest data) ──

export async function fetchTaskDetails(
  accessToken: string,
  referenceNumber: string,
  deviceLanguage = 'en',
  deviceCountry = 'US',
): Promise<TasksResponse> {
  const params = new URLSearchParams({
    deviceLanguage,
    deviceCountry,
    referenceNumber,
    appVersion: TESLA_APP_VERSION,
  });

  const response = await fetch(`${AKAMAI_API_BASE}/tasks?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) throw new AuthError('Token expired');
  if (!response.ok) {
    throw new Error(`Tasks API error: ${response.status}`);
  }

  return response.json();
}

// ── Error Types ──

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
