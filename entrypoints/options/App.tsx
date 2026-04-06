import { useState, useEffect } from 'preact/hooks';
import type { UserSettings, TeslaRegion } from '@/lib/types';
import { getSettings, setSettings, getChangeHistory, getOrders, getTaskDetails } from '@/lib/storage';
import { CONFIG } from '@/lib/config';

import {
  DEFAULT_SETTINGS,
  MIN_POLL_INTERVAL_MINUTES,
  MAX_POLL_INTERVAL_MINUTES,
  ALARM_NAME,
} from '@/lib/constants';
import { t, setLanguage } from '@/lib/i18n';

export function App() {
  const [settings, setLocalSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    getSettings().then(setLocalSettings);
  }, []);

  async function handleSave() {
    await setSettings(settings);
    setLanguage(settings.deviceLanguage);

    await browser.alarms.clear(ALARM_NAME);
    await browser.alarms.create(ALARM_NAME, {
      periodInMinutes: settings.pollIntervalMinutes,
    });

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      // Force re-render with new language
      setLocalSettings({ ...settings });
    }, 500);
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
          <select
            class="select select-bordered select-sm"
            value={settings.deviceLanguage}
            onChange={(e) => update({ deviceLanguage: (e.target as HTMLSelectElement).value })}
          >
            <option value="pl">Polski</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
            <option value="it">Italiano</option>
            <option value="nl">Nederlands</option>
            <option value="sv">Svenska</option>
            <option value="no">Norsk</option>
            <option value="da">Dansk</option>
            <option value="cs">Čeština</option>
            <option value="ro">Română</option>
          </select>
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">{t.country}</span>
          </label>
          <select
            class="select select-bordered select-sm"
            value={settings.deviceCountry}
            onChange={(e) => update({ deviceCountry: (e.target as HTMLSelectElement).value })}
          >
            <option value="PL">Polska</option>
            <option value="US">USA</option>
            <option value="DE">Niemcy</option>
            <option value="GB">Wielka Brytania</option>
            <option value="FR">Francja</option>
            <option value="NL">Holandia</option>
            <option value="SE">Szwecja</option>
            <option value="NO">Norwegia</option>
            <option value="DK">Dania</option>
            <option value="AT">Austria</option>
            <option value="CH">Szwajcaria</option>
            <option value="BE">Belgia</option>
            <option value="ES">Hiszpania</option>
            <option value="IT">Włochy</option>
            <option value="IE">Irlandia</option>
            <option value="CZ">Czechy</option>
            <option value="PT">Portugalia</option>
            <option value="RO">Rumunia</option>
            <option value="AU">Australia</option>
            <option value="CA">Kanada</option>
            <option value="CN">Chiny</option>
          </select>
        </div>
      </div>
      <p class="text-xs text-base-content/40 -mt-4">
        {t.langNote}
      </p>

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

      {/* Support */}
      <div class="divider text-xs text-base-content/30">Wesprzyj projekt</div>
      <div class="flex gap-2">
        <a
          href={CONFIG.githubSponsorsUrl}
          target="_blank"
          rel="noopener"
          class="btn btn-outline btn-sm gap-1"
        >
          <HeartIcon />
          GitHub Sponsors
        </a>
        <a
          href={CONFIG.buyMeCoffeeUrl}
          target="_blank"
          rel="noopener"
          class="btn btn-outline btn-sm gap-1"
        >
          <CoffeeIcon />
          Buy Me a Coffee
        </a>
      </div>
      <p class="text-xs text-base-content/40 mt-1">
        Rozszerzenie jest w 100% darmowe i open-source. Wsparcie pomaga w dalszym rozwoju.
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

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
      <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function CoffeeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
      <path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zm4-4h8" />
    </svg>
  );
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
