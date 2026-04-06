import { useState, useEffect, useRef } from 'preact/hooks';
import type { TeslaOrder, TasksResponse, ChangeRecord } from '@/lib/types';
import {
  getAccessToken,
  getOrders,
  getTaskDetails,
  getLastChecked,
  getChangeHistory,
} from '@/lib/storage';
import { LoginPrompt } from './components/LoginPrompt';
import { StatusCard } from './components/StatusCard';
import { DeliveryTimeline } from './components/DeliveryTimeline';
import { VehicleInfo } from './components/VehicleInfo';
import { ChangeLog } from './components/ChangeLog';

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

    // Listen for storage changes
    const onChange = (
      _changes: Record<string, browser.Storage.StorageChange>,
      area: string,
    ) => {
      if (area === 'session' || area === 'local') {
        loadState();
      }
    };
    browser.storage.onChanged.addListener(onChange);

    // Auto-refresh while popup is open
    intervalRef.current = setInterval(loadState, AUTO_REFRESH_MS);

    return () => {
      browser.storage.onChanged.removeListener(onChange);
      clearInterval(intervalRef.current);
    };
  }, []);

  async function initializePopup() {
    // First check if we have an access token
    const token = await getAccessToken();
    if (token) {
      await loadState();
      return;
    }

    // No access token — ask background to try refresh from stored refresh token
    try {
      const response = await browser.runtime.sendMessage({ type: 'TRY_REFRESH' });
      if (response?.authenticated) {
        await loadState();
        return;
      }
    } catch {
      // background unavailable
    }

    // No token and refresh failed — show login
    setIsLoggedIn(false);
  }

  async function loadState() {
    const token = await getAccessToken();
    setIsLoggedIn(!!token);

    if (token) {
      const [storedOrders, storedTasks, checked, history] = await Promise.all([
        getOrders(),
        getTaskDetails(),
        getLastChecked(),
        getChangeHistory(),
      ]);
      setOrders(storedOrders);
      setTaskDetails(storedTasks);
      setLastCheckedState(checked);
      setChanges(history.slice(-20).reverse());
    }
  }

  async function handleForceCheck() {
    setLoading(true);
    setError(null);
    try {
      const response = await browser.runtime.sendMessage({
        type: 'FORCE_CHECK',
      });
      if (response?.signOut) {
        setIsLoggedIn(false);
        setOrders([]);
        setTaskDetails({});
        setError(null);
        return;
      }
      if (response?.error) {
        setError(response.error);
      }
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

  if (!isLoggedIn) {
    return <LoginPrompt />;
  }

  return (
    <div class="p-4 space-y-3">
      {/* Header */}
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-bold">Delivery Tracker</h1>
        <div class="flex items-center gap-2">
          <button
            class="btn btn-ghost btn-xs"
            onClick={handleForceCheck}
            disabled={loading}
            title="Check now"
          >
            {loading ? (
              <span class="loading loading-spinner loading-xs" />
            ) : (
              <RefreshIcon />
            )}
          </button>
          <button
            class="btn btn-ghost btn-xs text-base-content/50"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div class="alert alert-error alert-sm">
          <span class="text-xs break-all">{error}</span>
        </div>
      )}

      {/* Last checked */}
      {lastChecked && (
        <p class="text-xs text-base-content/40">
          Last checked: {formatTimeAgo(lastChecked)}
        </p>
      )}

      {/* Orders */}
      {orders.length === 0 ? (
        <div class="text-center py-8 text-base-content/60">
          <p class="text-lg font-medium">No orders found</p>
          <p class="text-sm mt-1">
            Click refresh to check for orders, or make sure you have an active
            Tesla order on your account.
          </p>
        </div>
      ) : (
        orders.map((order) => (
          <div key={order.referenceNumber} class="space-y-3">
            <StatusCard order={order} />
            <DeliveryTimeline
              order={order}
              tasks={taskDetails[order.referenceNumber]}
            />
            <VehicleInfo
              order={order}
              tasks={taskDetails[order.referenceNumber]}
            />
          </div>
        ))
      )}

      {/* Recent changes */}
      {changes.length > 0 && <ChangeLog changes={changes} />}
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return new Date(timestamp).toLocaleTimeString();
}

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width={2}
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
