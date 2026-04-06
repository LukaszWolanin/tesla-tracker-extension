import type { EncryptedData } from './types';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/**
 * Generate a new AES-256-GCM key for encrypting refresh tokens.
 * The key is stored as a JWK in chrome.storage.local so it persists
 * across service worker restarts.
 */
export async function generateCryptoKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable — needed to export as JWK for storage
    ['encrypt', 'decrypt'],
  );
}

export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key);
}

export async function importKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: ALGORITHM }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encrypt(
  key: CryptoKey,
  plaintext: string,
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded,
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decrypt(
  key: CryptoKey,
  data: EncryptedData,
): Promise<string> {
  const ciphertextBuffer = base64ToBuffer(data.ciphertext);
  const iv = base64ToBuffer(data.iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertextBuffer,
  );

  return new TextDecoder().decode(decrypted);
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
