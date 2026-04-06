import { useState, useEffect } from 'preact/hooks';
import type { UserSettings, TeslaRegion } from '@/lib/types';
import { getSettings, setSettings } from '@/lib/storage';
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

  useEffect(() => {
    getSettings().then(setLocalSettings);
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

      {/* Debug */}
      <div class="divider text-xs text-base-content/30">Debug</div>
      <button
        class="btn btn-outline btn-sm btn-warning"
        onClick={async () => {
          await browser.runtime.sendMessage({ type: 'TEST_CHANGE' });
        }}
      >
        Testuj powiadomienia
      </button>
      <p class="text-xs text-base-content/40 mt-1">
        Symuluje 3 zmiany: okno dostawy, przypisanie VIN i zmiana statusu.
      </p>
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
