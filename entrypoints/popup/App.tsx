import { useState, useEffect, useRef } from 'preact/hooks';
import type { TeslaOrder, TasksResponse, ChangeRecord } from '@/lib/types';
import {
  getAccessToken,
  getOrders,
  getTaskDetails,
  getLastChecked,
  getChangeHistory,
} from '@/lib/storage';
import { t } from '@/lib/i18n';
import { LoginPrompt } from './components/LoginPrompt';
import { OrderCard } from './components/OrderCard';

const AUTO_REFRESH_MS = 30_000;

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<TeslaOrder[]>([]);
  const [taskDetails, setTaskDetails] = useState<Record<string, TasksResponse>>({});
  const [lastChecked, setLastCheckedState] = useState<number | null>(null);
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    initializePopup();

    const onChange = (
      _changes: Record<string, browser.Storage.StorageChange>,
      area: string,
    ) => {
      if (area === 'session' || area === 'local') loadState();
    };
    browser.storage.onChanged.addListener(onChange);
    intervalRef.current = setInterval(loadState, AUTO_REFRESH_MS);

    return () => {
      browser.storage.onChanged.removeListener(onChange);
      clearInterval(intervalRef.current);
    };
  }, []);

  async function initializePopup() {
    const token = await getAccessToken();
    if (token) {
      await loadState();
      return;
    }
    try {
      const response = await browser.runtime.sendMessage({ type: 'TRY_REFRESH' });
      if (response?.authenticated) {
        await loadState();
        return;
      }
    } catch { /* */ }
    setIsLoggedIn(false);
  }

  async function loadState() {
    const token = await getAccessToken();
    setIsLoggedIn(!!token);
    if (token) {
      const [o, td, lc, h] = await Promise.all([
        getOrders(),
        getTaskDetails(),
        getLastChecked(),
        getChangeHistory(),
      ]);
      setOrders(o);
      setTaskDetails(td);
      setLastCheckedState(lc);
      setChanges(h.slice(-20).reverse());
    }
  }

  async function handleForceCheck() {
    setLoading(true);
    setError(null);
    try {
      const response = await browser.runtime.sendMessage({ type: 'FORCE_CHECK' });
      if (response?.signOut) {
        setIsLoggedIn(false);
        setOrders([]);
        setTaskDetails({});
        setError(null);
        return;
      }
      if (response?.error) setError(response.error);
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await browser.runtime.sendMessage({ type: 'SIGN_OUT' });
    setIsLoggedIn(false);
    setOrders([]);
    setTaskDetails({});
    setChanges([]);
    setError(null);
  }

  if (isLoggedIn === null) {
    return (
      <div class="flex items-center justify-center h-full min-h-[500px]">
        <span class="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!isLoggedIn) return <LoginPrompt />;

  return (
    <div class="space-y-0">
      {/* Compact header bar */}
      <div class="flex items-center justify-between px-3 py-2 bg-base-200/50 border-b border-base-300">
        <span class="text-xs font-semibold text-base-content/60">{t.appTitle}</span>
        <div class="flex items-center gap-1">
          {lastChecked && (
            <span class="text-[10px] text-base-content/30">
              {formatTimeAgo(lastChecked)}
            </span>
          )}
          <button
            class="btn btn-ghost btn-xs btn-square"
            onClick={handleForceCheck}
            disabled={loading}
            title={t.checkNow}
          >
            {loading ? (
              <span class="loading loading-spinner loading-xs" />
            ) : (
              <RefreshIcon />
            )}
          </button>
          <a
            href="https://github.com/sponsors/LukaszWolanin"
            target="_blank"
            rel="noopener"
            class="btn btn-ghost btn-xs text-base-content/30 text-[10px]"
            title="Wesprzyj projekt"
          >
            &hearts;
          </a>
          <button
            class="btn btn-ghost btn-xs text-base-content/30 text-[10px]"
            onClick={handleSignOut}
          >
            {t.signOut}
          </button>
        </div>
      </div>

      {error && (
        <div class="alert alert-error alert-sm mx-3 mt-2">
          <span class="text-xs break-all">{error}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div class="text-center py-12 px-4 text-base-content/60">
          <p class="text-base font-medium">{t.noOrders}</p>
          <p class="text-xs mt-1">{t.noOrdersHint}</p>
        </div>
      ) : (
        orders.map((order, idx) => (
          <div key={order.referenceNumber}>
            {idx > 0 && <div class="border-t-4 border-primary/20" />}
            <OrderCard
              order={order}
              tasks={taskDetails[order.referenceNumber]}
              changes={changes.filter(
                (c) => c.referenceNumber === order.referenceNumber,
            )}
            />
          </div>
        ))
      )}
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return t.justNow;
  if (diff < 3_600_000) return t.minutesAgo(Math.floor(diff / 60_000));
  return new Date(timestamp).toLocaleTimeString('pl-PL');
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
