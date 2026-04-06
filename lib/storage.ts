import { storage } from 'wxt/utils/storage';
import {
  generateCryptoKey,
  exportKey,
  importKey,
  encrypt,
  decrypt,
} from './crypto';
import { DEFAULT_SETTINGS, STORAGE_KEYS, SESSION_KEYS } from './constants';
import type {
  AuthTokens,
  EncryptedData,
  TeslaOrder,
  TasksResponse,
  ChangeRecord,
  UserSettings,
} from './types';

// ── Access Token (session-only, RAM) ──

export async function getAccessToken(): Promise<string | null> {
  const token = await storage.getItem<string>(
    `session:${SESSION_KEYS.accessToken}`,
  );
  if (!token) return null;

  const expiresAt = await storage.getItem<number>(
    `session:${SESSION_KEYS.expiresAt}`,
  );
  if (expiresAt && Date.now() >= expiresAt) return null;

  return token;
}

export async function setAccessToken(
  token: string,
  expiresAt: number,
): Promise<void> {
  await storage.setItem(`session:${SESSION_KEYS.accessToken}`, token);
  await storage.setItem(`session:${SESSION_KEYS.expiresAt}`, expiresAt);
}

export async function clearAccessToken(): Promise<void> {
  await storage.removeItem(`session:${SESSION_KEYS.accessToken}`);
  await storage.removeItem(`session:${SESSION_KEYS.expiresAt}`);
}

// ── Refresh Token (encrypted, persistent) ──

async function getOrCreateCryptoKey(): Promise<CryptoKey> {
  const storedJwk = await storage.getItem<JsonWebKey>(
    `local:${STORAGE_KEYS.cryptoKey}`,
  );
  if (storedJwk) {
    return importKey(storedJwk);
  }

  const key = await generateCryptoKey();
  const jwk = await exportKey(key);
  await storage.setItem(`local:${STORAGE_KEYS.cryptoKey}`, jwk);
  return key;
}

export async function getRefreshToken(): Promise<string | null> {
  const encrypted = await storage.getItem<EncryptedData>(
    `local:${STORAGE_KEYS.encryptedRefreshToken}`,
  );
  if (!encrypted) return null;

  const key = await getOrCreateCryptoKey();
  return decrypt(key, encrypted);
}

export async function setRefreshToken(token: string): Promise<void> {
  if (!token) return; // don't store empty/undefined refresh tokens
  const key = await getOrCreateCryptoKey();
  const encrypted = await encrypt(key, token);
  await storage.setItem(
    `local:${STORAGE_KEYS.encryptedRefreshToken}`,
    encrypted,
  );
}

export async function clearRefreshToken(): Promise<void> {
  await storage.removeItem(`local:${STORAGE_KEYS.encryptedRefreshToken}`);
}

// ── Tokens convenience ──

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await setAccessToken(tokens.accessToken, tokens.expiresAt);
  await setRefreshToken(tokens.refreshToken);
}

export async function clearAllTokens(): Promise<void> {
  await clearAccessToken();
  await clearRefreshToken();
}

// ── Orders & Task Details ──

export async function getOrders(): Promise<TeslaOrder[]> {
  return (
    (await storage.getItem<TeslaOrder[]>(
      `local:${STORAGE_KEYS.orders}`,
    )) ?? []
  );
}

export async function setOrders(orders: TeslaOrder[]): Promise<void> {
  await storage.setItem(`local:${STORAGE_KEYS.orders}`, orders);
}

export async function getTaskDetails(): Promise<
  Record<string, TasksResponse>
> {
  return (
    (await storage.getItem<Record<string, TasksResponse>>(
      `local:${STORAGE_KEYS.taskDetails}`,
    )) ?? {}
  );
}

export async function setTaskDetails(
  details: Record<string, TasksResponse>,
): Promise<void> {
  await storage.setItem(`local:${STORAGE_KEYS.taskDetails}`, details);
}

export async function getLastChecked(): Promise<number | null> {
  return storage.getItem<number>(`local:${STORAGE_KEYS.lastChecked}`);
}

export async function setLastChecked(timestamp: number): Promise<void> {
  await storage.setItem(`local:${STORAGE_KEYS.lastChecked}`, timestamp);
}

// ── Change History ──

export async function getChangeHistory(): Promise<ChangeRecord[]> {
  return (
    (await storage.getItem<ChangeRecord[]>(
      `local:${STORAGE_KEYS.changeHistory}`,
    )) ?? []
  );
}

export async function clearChangeHistory(): Promise<void> {
  await storage.setItem(`local:${STORAGE_KEYS.changeHistory}`, []);
}

export async function appendChanges(
  changes: ChangeRecord[],
): Promise<void> {
  const history = await getChangeHistory();

  // Deduplicate: skip if same RN + field + value already exists in history
  const newChanges = changes.filter((c) =>
    !history.some(
      (h) =>
        h.referenceNumber === c.referenceNumber &&
        h.field === c.field &&
        String(h.newValue) === String(c.newValue),
    ),
  );

  if (newChanges.length === 0) return;

  history.push(...newChanges);
  // Keep last 500 records
  const trimmed = history.slice(-500);
  await storage.setItem(`local:${STORAGE_KEYS.changeHistory}`, trimmed);
}

// ── Settings ──

export async function getSettings(): Promise<UserSettings> {
  const stored = await storage.getItem<UserSettings>(
    `local:${STORAGE_KEYS.settings}`,
  );
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function setSettings(
  settings: Partial<UserSettings>,
): Promise<void> {
  const current = await getSettings();
  await storage.setItem(`local:${STORAGE_KEYS.settings}`, {
    ...current,
    ...settings,
  });
}

// ── PKCE Code Verifier (temporary) ──

export async function getCodeVerifier(): Promise<string | null> {
  return storage.getItem<string>(
    `session:${STORAGE_KEYS.codeVerifier}`,
  );
}

export async function setCodeVerifier(verifier: string): Promise<void> {
  await storage.setItem(
    `session:${STORAGE_KEYS.codeVerifier}`,
    verifier,
  );
}

export async function clearCodeVerifier(): Promise<void> {
  await storage.removeItem(`session:${STORAGE_KEYS.codeVerifier}`);
}
