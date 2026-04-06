import { ALARM_NAME } from '@/lib/constants';
import { exchangeCodeForTokens, refreshAccessToken } from '@/lib/auth';
import { fetchOrders, fetchTaskDetails } from '@/lib/tesla-api';
import { diffOrders, diffTaskDetails } from '@/lib/diff';
import {
  getAccessToken,
  getRefreshToken,
  getCodeVerifier,
  clearCodeVerifier,
  saveTokens,
  clearAllTokens,
  getOrders,
  setOrders,
  getTaskDetails,
  setTaskDetails,
  getLastChecked,
  setLastChecked,
  appendChanges,
  clearChangeHistory,
  getSettings,
} from '@/lib/storage';
import type { ExtensionMessage, ChangeRecord, TeslaOrder } from '@/lib/types';

function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    error.name === 'AuthError' ||
    msg.includes('token expired') ||
    msg.includes('401') ||
    msg.includes('unauthorized')
  );
}

export default defineBackground(() => {
  // Strip Origin header from Akamai requests (prevents 403)
  browser.runtime.onInstalled.addListener(async () => {
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
            requestHeaders: [
              {
                header: 'Origin',
                operation: 'remove' as chrome.declarativeNetRequest.HeaderOperation,
              },
              {
                header: 'Referer',
                operation: 'remove' as chrome.declarativeNetRequest.HeaderOperation,
              },
            ],
          },
          condition: {
            urlFilter: 'akamai-apigateway-vfx.tesla.com',
            resourceTypes: ['xmlhttprequest' as chrome.declarativeNetRequest.ResourceType],
          },
        },
      ],
    });
  });

  // Ensure polling alarm exists
  async function ensureAlarm() {
    const existing = await browser.alarms.get(ALARM_NAME);
    if (!existing) {
      const settings = await getSettings();
      browser.alarms.create(ALARM_NAME, {
        periodInMinutes: settings.pollIntervalMinutes,
      });
      console.info('[bg] Alarm created, interval:', settings.pollIntervalMinutes, 'min');
    }
  }

  browser.runtime.onInstalled.addListener(() => ensureAlarm());

  browser.runtime.onStartup.addListener(async () => {
    await ensureAlarm();
    await tryRefreshToken();
  });

  // Lock to prevent concurrent checkDeliveryStatus calls
  let checkInProgress = false;

  // Handle alarm — poll Tesla API
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== ALARM_NAME) return;
    await checkDeliveryStatus();
  });

  // Fallback: catch OAuth callback via webNavigation
  browser.webNavigation.onCompleted.addListener(
    async (details) => {
      try {
        const url = new URL(details.url);
        const code = url.searchParams.get('code');
        if (code) {
          await handleAuthCode(code);
        }
      } catch {
        // ignore
      }
    },
    { url: [{ hostEquals: 'auth.tesla.com', pathContains: '/void/callback' }] },
  );

  // Handle messages from popup and content script
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      handleMessage(message)
        .then(sendResponse)
        .catch((err) => sendResponse({ error: String(err) }));
      return true;
    },
  );

  async function handleMessage(message: ExtensionMessage): Promise<unknown> {
    // Ensure alarm is alive on every popup interaction
    await ensureAlarm();

    switch (message.type) {
      case 'TOKEN_FOUND':
        await handleTokenFound(message.accessToken, message.refreshToken);
        return { success: true };

      case 'AUTH_CODE_FOUND':
        await handleAuthCode(message.code);
        return { success: true };

      case 'GET_STATUS': {
        const orders = await getOrders();
        const taskDetails = await getTaskDetails();
        const lastChecked = await getLastChecked();
        return { orders, taskDetails, lastChecked };
      }

      case 'FORCE_CHECK': {
        const result = await checkDeliveryStatus();
        return result;
      }

      case 'TRY_REFRESH': {
        const hasToken = await getAccessToken();
        if (hasToken) return { success: true, authenticated: true };

        const refreshed = await tryRefreshToken();
        if (refreshed) {
          // Token restored — fetch data immediately
          await checkDeliveryStatus();
          return { success: true, authenticated: true };
        }
        return { success: false, authenticated: false };
      }

      case 'SIGN_OUT':
        await clearAllTokens();
        await setOrders([]);
        await setTaskDetails({});
        await clearChangeHistory();
        return { success: true };

      default:
        return { error: 'Unknown message type' };
    }
  }

  async function handleTokenFound(
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    const expiresAt = Date.now() + 300 * 1000;
    await saveTokens({
      accessToken,
      refreshToken: refreshToken ?? '',
      expiresAt,
    });
    await checkDeliveryStatus();
  }

  async function handleAuthCode(code: string): Promise<void> {
    const codeVerifier = await getCodeVerifier();
    if (!codeVerifier) {
      // Already handled by another caller (content script vs webNavigation race)
      return;
    }

    // Clear immediately to prevent double exchange
    await clearCodeVerifier();

    try {
      const tokens = await exchangeCodeForTokens(code, codeVerifier);

      console.info('[auth] Token exchange successful', {
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        expiresIn: Math.round((tokens.expiresAt - Date.now()) / 1000) + 's',
      });

      await saveTokens(tokens);

      // Immediately fetch data while token is fresh
      const result = await checkDeliveryStatus();
      console.info('[auth] Initial fetch result:', result);

      // Close the callback tab
      const tabs = await browser.tabs.query({
        url: '*://auth.tesla.com/void/callback*',
      });
      for (const tab of tabs) {
        if (tab.id) browser.tabs.remove(tab.id);
      }
    } catch (error) {
      console.error('[auth] Code exchange failed:', error);
    }
  }

  async function tryRefreshToken(): Promise<boolean> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      console.warn('[auth] No refresh token stored');
      return false;
    }

    try {
      const tokens = await refreshAccessToken(refreshToken);
      console.info('[auth] Token refreshed OK', {
        hasRefreshToken: !!tokens.refreshToken,
      });
      await saveTokens(tokens);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[auth] Refresh failed:', msg);
      return false;
    }
  }

  async function checkDeliveryStatus(
    _retried = false,
  ): Promise<{ success: boolean; error?: string; ordersCount?: number; signOut?: boolean }> {
    if (checkInProgress && !_retried) {
      return { success: true, error: undefined };
    }
    checkInProgress = true;

    try {
      return await _doCheck(_retried);
    } finally {
      checkInProgress = false;
    }
  }

  async function _doCheck(
    _retried: boolean,
  ): Promise<{ success: boolean; error?: string; ordersCount?: number; signOut?: boolean }> {
    let accessToken = await getAccessToken();

    if (!accessToken) {
      console.info('[check] No access token, attempting refresh...');
      const refreshed = await tryRefreshToken();
      if (!refreshed) {
        return { success: false, error: 'Not authenticated — please sign in', signOut: true };
      }
      accessToken = await getAccessToken();
      if (!accessToken) {
        return { success: false, error: 'Token refresh failed', signOut: true };
      }
    }

    const settings = await getSettings();
    const allChanges: ChangeRecord[] = [];

    try {
      const previousOrders = await getOrders();
      const currentOrders = await fetchOrders(accessToken, settings.region);
      await setOrders(currentOrders);

      const orderChanges = diffOrders(previousOrders, currentOrders);
      allChanges.push(...orderChanges);

      const previousTaskDetails = await getTaskDetails();
      const currentTaskDetails: Record<string, typeof previousTaskDetails[string]> = {};

      for (const order of currentOrders) {
        // Use order's locale if available, fall back to settings
        const lang = order.locale?.split('_')[0] ?? settings.deviceLanguage;
        const country = order.countryCode ?? settings.deviceCountry;

        try {
          const tasks = await fetchTaskDetails(
            accessToken,
            order.referenceNumber,
            lang,
            country,
          );
          currentTaskDetails[order.referenceNumber] = tasks;

          console.info('[check] Tasks API response for', order.referenceNumber, {
            hasScheduling: !!tasks.tasks?.scheduling,
            deliveryWindow: tasks.tasks?.scheduling?.deliveryWindowDisplay ?? 'none',
            milestones: tasks.activeTaskList?.length ?? 0,
          });

          const taskChanges = diffTaskDetails(
            order.referenceNumber,
            previousTaskDetails[order.referenceNumber],
            tasks,
          );
          allChanges.push(...taskChanges);
        } catch (err) {
          console.warn(
            '[check] Tasks API failed for',
            order.referenceNumber,
            err instanceof Error ? err.message : err,
          );
        }
      }

      await setTaskDetails(currentTaskDetails);
      await setLastChecked(Date.now());

      if (allChanges.length > 0) {
        await appendChanges(allChanges);
        await notifyChanges(allChanges);
      }

      // Update extension badge with current status
      await updateBadge(currentOrders);

      return { success: true, ordersCount: currentOrders.length };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (isAuthError(error) && !_retried) {
        console.warn('[check] Auth error, trying refresh...', msg);
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          return checkDeliveryStatus(true);
        }
        // Refresh failed — clear tokens and force re-login
        await clearAllTokens();
        return {
          success: false,
          error: 'Session expired — please sign in again',
          signOut: true,
        };
      }

      console.error('[check] Failed:', msg);
      return { success: false, error: msg };
    }
  }

  async function notifyChanges(changes: ChangeRecord[]): Promise<void> {
    const settings = await getSettings();

    for (const change of changes) {
      let title = '';
      let message = '';

      switch (change.field) {
        case 'orderStatus':
          if (!settings.notifyOnStatusChange) continue;
          title = 'Zmiana statusu zamówienia';
          message = `${change.referenceNumber}: ${change.oldValue} → ${change.newValue}`;
          break;

        case 'vinAssigned':
          if (!settings.notifyOnVinAssigned) continue;
          title = 'Przypisano VIN!';
          message = `${change.referenceNumber}: ${change.newValue}`;
          break;

        case 'deliveryWindow':
          if (!settings.notifyOnDeliveryWindow) continue;
          title = 'Zaktualizowano okno dostawy';
          message = `${change.referenceNumber}: ${change.newValue}`;
          break;

        default:
          if (change.field.startsWith('milestone:')) {
            if (!settings.notifyOnMilestone) continue;
            const milestoneName = change.field.replace('milestone:', '');
            title = 'Aktualizacja kamienia milowego';
            message = `${milestoneName}: ${change.newValue}`;
          } else {
            continue;
          }
      }

      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('/icons/icon-128.png'),
        title,
        message,
      });
    }
  }

  // ── Badge on extension icon ──

  const STATUS_BADGE: Record<string, { text: string; color: string }> = {
    PENDING: { text: '...', color: '#FBBD23' },
    BOOKED: { text: 'OK', color: '#3ABFF8' },
    IN_PRODUCTION: { text: 'FAB', color: '#3ABFF8' },
    IN_TRANSIT: { text: 'TR', color: '#A78BFA' },
    'READY FOR APPOINTMENT': { text: '!', color: '#36D399' },
    DELIVERED: { text: '\u2713', color: '#36D399' },
  };

  async function updateBadge(orders: TeslaOrder[]): Promise<void> {
    if (orders.length === 0) {
      await browser.action.setBadgeText({ text: '' });
      return;
    }

    // Use the first (most relevant) order
    const order = orders[0];
    const badge = STATUS_BADGE[order.orderStatus] ?? { text: '?', color: '#666' };

    await browser.action.setBadgeText({ text: badge.text });
    await browser.action.setBadgeBackgroundColor({ color: badge.color });
  }
});
