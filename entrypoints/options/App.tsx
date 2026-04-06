import { useState, useEffect } from 'preact/hooks';
import type { UserSettings, TeslaRegion } from '@/lib/types';
import { getSettings, setSettings, getChangeHistory, getOrders, getTaskDetails } from '@/lib/storage';
import { getPremiumStatus, type PremiumStatus } from '@/lib/premium';
import {
  DEFAULT_SETTINGS,
  MIN_POLL_INTERVAL_MINUTES,
  MAX_POLL_INTERVAL_MINUTES,
  ALARM_NAME,
} from '@/lib/constants';
import { t } from '@/lib/i18n';

export function App() {
  const [settings, setLocalSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [premium, setPremium] = useState<PremiumStatus | null>(null);

  useEffect(() => {
    getSettings().then(setLocalSettings);
    getPremiumStatus().then(setPremium);
  }, []);

  async function handleSave() {
    await setSettings(settings);

    await browser.alarms.clear(ALARM_NAME);
    await browser.alarms.create(ALARM_NAME, {
      periodInMinutes: settings.pollIntervalMinutes,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(partial: Partial<UserSettings>) {
    setLocalSettings((prev) => ({ ...prev, ...partial }));
  }

  async function exportJSON() {
    const [history, orders, tasks] = await Promise.all([
      getChangeHistory(), getOrders(), getTaskDetails(),
    ]);
    const data = { exportDate: new Date().toISOString(), orders, taskDetails: tasks, changeHistory: history };
    downloadFile(JSON.stringify(data, null, 2), 'tesla-tracker-export.json', 'application/json');
  }

  async function exportCSV() {
    const history = await getChangeHistory();
    const header = 'timestamp,referenceNumber,field,oldValue,newValue';
    const rows = history.map((c) =>
      [new Date(c.timestamp).toISOString(), c.referenceNumber, c.field, c.oldValue ?? '', c.newValue ?? '']
        .map((v) => '"' + String(v).replace(/"/g, '""') + '"')
        .join(','),
    );
    downloadFile([header, ...rows].join('\n'), 'tesla-tracker-changes.csv', 'text/csv');
  }

  return (
    <div class="max-w-lg mx-auto p-6 space-y-6">
      <h1 class="text-2xl font-bold">{t.settings}</h1>

      <div class="form-control">
        <label class="label">
          <span class="label-text">{t.checkInterval}</span>
        </label>
        <input
          type="range"
          min={MIN_POLL_INTERVAL_MINUTES}
          max={MAX_POLL_INTERVAL_MINUTES}
          value={settings.pollIntervalMinutes}
          onInput={(e) =>
            update({ pollIntervalMinutes: Number((e.target as HTMLInputElement).value) })
          }
          class="range range-primary range-sm"
        />
        <div class="text-sm text-base-content/60 mt-1">
          {t.everyMinutes(settings.pollIntervalMinutes)}
        </div>
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text">{t.teslaRegion}</span>
        </label>
        <select
          class="select select-bordered select-sm"
          value={settings.region}
          onChange={(e) =>
            update({ region: (e.target as HTMLSelectElement).value as TeslaRegion })
          }
        >
          <option value="na">{t.regionNA}</option>
          <option value="eu">{t.regionEU}</option>
          <option value="cn">{t.regionCN}</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">{t.language}</span>
          </label>
          <input
            type="text"
            class="input input-bordered input-sm"
            value={settings.deviceLanguage}
            onInput={(e) => update({ deviceLanguage: (e.target as HTMLInputElement).value })}
            maxLength={5}
            placeholder="pl"
          />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">{t.country}</span>
          </label>
          <input
            type="text"
            class="input input-bordered input-sm"
            value={settings.deviceCountry}
            onInput={(e) => update({ deviceCountry: (e.target as HTMLInputElement).value })}
            maxLength={5}
            placeholder="PL"
          />
        </div>
      </div>

      <div class="space-y-2">
        <h2 class="text-sm font-semibold">{t.notifications}</h2>
        <Toggle
          label={t.notifyStatusChanges}
          checked={settings.notifyOnStatusChange}
          onChange={(v) => update({ notifyOnStatusChange: v })}
        />
        <Toggle
          label={t.notifyVinAssigned}
          checked={settings.notifyOnVinAssigned}
          onChange={(v) => update({ notifyOnVinAssigned: v })}
        />
        <Toggle
          label={t.notifyDeliveryWindow}
          checked={settings.notifyOnDeliveryWindow}
          onChange={(v) => update({ notifyOnDeliveryWindow: v })}
        />
        <Toggle
          label={t.notifyMilestones}
          checked={settings.notifyOnMilestone}
          onChange={(v) => update({ notifyOnMilestone: v })}
        />
      </div>

      <button class="btn btn-primary btn-sm" onClick={handleSave}>
        {saved ? t.saved : t.saveSettings}
      </button>

      {/* Premium */}
      <div class="divider text-xs text-base-content/30">Delivery Pass</div>
      {premium?.active ? (
        <div class="alert alert-success alert-sm">
          <span class="text-xs">Delivery Pass aktywny od {premium.purchaseDate}</span>
        </div>
      ) : (
        <div class="card bg-base-200 p-4">
          <h3 class="text-sm font-bold mb-2">Delivery Pass — 39,99 PLN</h3>
          <ul class="text-xs text-base-content/60 space-y-1 mb-3">
            <li>Sprawdzanie co 1 minutę (zamiast 10)</li>
            <li>Śledzenie wielu zamówień</li>
            <li>Eksport historii zmian</li>
            <li>Dane pojazdu po dostawie</li>
            <li>Jednorazowa płatność — bez subskrypcji</li>
          </ul>
          <button class="btn btn-primary btn-sm btn-wide" disabled>
            Wkrótce dostępne
          </button>
          <p class="text-[10px] text-base-content/30 mt-1">
            Płatność przez ExtensionPay (Stripe). Pojawi się w kolejnej wersji.
          </p>
        </div>
      )}

      {/* Export */}
      <div class="divider text-xs text-base-content/30">Eksport danych</div>
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm" onClick={exportJSON}>
          Eksport JSON
        </button>
        <button class="btn btn-outline btn-sm" onClick={exportCSV}>
          Eksport CSV
        </button>
      </div>
      <p class="text-xs text-base-content/40 mt-1">
        Eksportuje historię zmian, zamówienia i szczegóły dostawy.
      </p>

      {/* Debug */}
      <div class="divider text-xs text-base-content/30">Debug</div>
      <TestButton />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label class="flex items-center justify-between cursor-pointer">
      <span class="text-sm">{label}</span>
      <input
        type="checkbox"
        class="toggle toggle-primary toggle-sm"
        checked={checked}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
    </label>
  );
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function TestButton() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleTest() {
    setStatus('Wysyłanie...');
    try {
      browser.runtime.sendMessage({ type: 'TEST_CHANGE' });
      setStatus('Wysłano! Sprawdź powiadomienia i popup.');
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setStatus(`Błąd: ${err}`);
    }
  }

  return (
    <div>
      <button class="btn btn-outline btn-sm btn-warning" onClick={handleTest}>
        Testuj powiadomienia
      </button>
      <p class="text-xs text-base-content/40 mt-1">
        Symuluje 3 zmiany: okno dostawy, VIN, status.
      </p>
      {status && (
        <p class="text-xs text-success mt-1">{status}</p>
      )}
    </div>
  );
}
