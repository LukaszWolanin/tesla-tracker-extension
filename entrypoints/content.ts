export default defineContentScript({
  matches: ['*://*.tesla.com/*', '*://auth.tesla.com/*'],
  runAt: 'document_start',

  main() {
    // Method 1: Check for OAuth redirect with authorization code (runs immediately)
    checkOAuthRedirect();

    // Methods 2 & 3 need DOM — wait for it
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        scanStorageForTokens();
        observeStorage();
      });
    } else {
      scanStorageForTokens();
      observeStorage();
    }
  },
});

function checkOAuthRedirect(): void {
  const url = new URL(window.location.href);

  // Tesla redirects to auth.tesla.com/void/callback?code=...
  if (
    url.hostname === 'auth.tesla.com' &&
    url.pathname.includes('/void/callback')
  ) {
    const code = url.searchParams.get('code');
    if (code) {
      browser.runtime.sendMessage({
        type: 'AUTH_CODE_FOUND',
        code,
        codeVerifier: '', // Will be matched with stored verifier in background
      });
    }
  }
}

function scanStorageForTokens(): void {
  const tokenKeys = [
    'tesla_access_token',
    'auth-token',
    'access_token',
    'token',
  ];

  for (const key of tokenKeys) {
    const value =
      localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (value && looksLikeToken(value)) {
      sendToken(value);
      return;
    }
  }

  // Check for Tesla's ProductF data object (used by existing extensions)
  try {
    const teslaData = (
      window as unknown as { Tesla?: { ProductF?: { Data?: unknown } } }
    ).Tesla?.ProductF?.Data;
    if (teslaData) {
      browser.runtime.sendMessage({
        type: 'TOKEN_FOUND',
        accessToken: '', // ProductF data doesn't contain tokens directly
        // but we can signal that user is logged in on tesla.com
      });
    }
  } catch {
    // Cross-origin or unavailable — expected
  }
}

function observeStorage(): void {
  window.addEventListener('storage', (event) => {
    if (event.newValue && looksLikeToken(event.newValue)) {
      sendToken(event.newValue);
    }
  });
}

function sendToken(token: string): void {
  browser.runtime.sendMessage({
    type: 'TOKEN_FOUND',
    accessToken: token,
  });
}

function looksLikeToken(value: string): boolean {
  // Tesla tokens are JWTs (3 dot-separated base64 segments)
  // or long opaque strings
  return (
    value.length > 20 &&
    (value.split('.').length === 3 || value.length > 100)
  );
}
