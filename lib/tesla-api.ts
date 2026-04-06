import type { TeslaOrder, TasksResponse, TeslaRegion } from './types';
import {
  FLEET_API_BASES,
  OWNER_API_BASE,
  AKAMAI_API_BASE,
  TESLA_APP_VERSION,
} from './constants';

// ── Error Types ──

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super(`Rate limited, retry after ${retryAfter}s`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ── Helpers ──

function handleRateLimit(response: Response): never {
  const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10);
  throw new RateLimitError(retryAfter);
}

function wrapNetworkError(error: unknown): never {
  if (error instanceof AuthError || error instanceof RateLimitError) throw error;
  if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network'))) {
    throw new NetworkError('Brak połączenia z internetem');
  }
  if (error instanceof Error) throw new NetworkError(error.message);
  throw new NetworkError(String(error));
}

// ── Fleet API / Owner API ──

export async function fetchOrders(
  accessToken: string,
  region: TeslaRegion = 'eu',
): Promise<TeslaOrder[]> {
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
        errors.push(`401`);
        continue;
      }
      if (response.status === 429) handleRateLimit(response);

      all401 = false;

      if (!response.ok) {
        errors.push(`${response.status}`);
        continue;
      }

      const data = await response.json();
      return data.response ?? [];
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      all401 = false;
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (all401 && errors.length > 0) {
    throw new AuthError('Token expired');
  }

  throw new NetworkError(`Nie udało się pobrać zamówień (${errors.join(', ')})`);
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
  throw new NetworkError('Nie udało się określić regionu');
}

// ── Fleet API: Post-delivery vehicle data ──

export interface VehicleData {
  vin: string;
  display_name?: string;
  state?: string;
  charge_state?: {
    battery_level?: number;
    battery_range?: number;
    charging_state?: string;
    charge_limit_soc?: number;
    est_battery_range?: number;
    minutes_to_full_charge?: number;
  };
  vehicle_state?: {
    odometer?: number;
    car_version?: string;
    locked?: boolean;
    sentry_mode?: boolean;
  };
  drive_state?: {
    latitude?: number;
    longitude?: number;
    speed?: number;
  };
  climate_state?: {
    inside_temp?: number;
    outside_temp?: number;
    is_climate_on?: boolean;
  };
}

export async function fetchVehicles(
  accessToken: string,
  region: TeslaRegion = 'eu',
): Promise<VehicleData[]> {
  const base = FLEET_API_BASES[region];
  try {
    const response = await fetch(`${base}/api/1/vehicles`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 401) throw new AuthError('Token expired');
    if (response.status === 429) handleRateLimit(response);
    if (!response.ok) return [];
    const data = await response.json();
    return data.response ?? [];
  } catch (error) {
    if (error instanceof AuthError || error instanceof RateLimitError) throw error;
    return [];
  }
}

export async function fetchVehicleData(
  accessToken: string,
  vin: string,
  region: TeslaRegion = 'eu',
): Promise<VehicleData | null> {
  const base = FLEET_API_BASES[region];
  try {
    const response = await fetch(
      `${base}/api/1/vehicles/${vin}/vehicle_data?endpoints=charge_state,vehicle_state,drive_state,climate_state`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (response.status === 401) throw new AuthError('Token expired');
    if (response.status === 429) handleRateLimit(response);
    if (!response.ok) return null;
    const data = await response.json();
    return data.response ?? null;
  } catch (error) {
    if (error instanceof AuthError || error instanceof RateLimitError) throw error;
    return null;
  }
}

// ── Akamai Tasks API ──

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

  try {
    const response = await fetch(`${AKAMAI_API_BASE}/tasks?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) throw new AuthError('Token expired');
    if (response.status === 429) handleRateLimit(response);
    if (!response.ok) {
      throw new Error(`Tasks API: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    wrapNetworkError(error);
  }
}
