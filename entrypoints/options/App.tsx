import { useState, useEffect } from 'preact/hooks';
import type { UserSettings, TeslaRegion } from '@/lib/types';
import { getSettings, setSettings } from '@/lib/storage';
import {
  DEFAULT_SETTINGS,
  MIN_POLL_INTERVAL_MINUTES,
  MAX_POLL_INTERVAL_MINUTES,
  ALARM_NAME,
} from '@/lib/constants';

export function App() {
  const [settings, setLocalSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setLocalSettings);
  }, []);

  async function handleSave() {
    await setSettings(settings);

    // Update alarm interval
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
      <h1 class="text-2xl font-bold">Settings</h1>

      {/* Polling Interval */}
      <div class="form-control">
        <label class="label">
          <span class="label-text">Check interval (minutes)</span>
        </label>
        <input
          type="range"
          min={MIN_POLL_INTERVAL_MINUTES}
          max={MAX_POLL_INTERVAL_MINUTES}
          value={settings.pollIntervalMinutes}
          onInput={(e) =>
            update({
              pollIntervalMinutes: Number(
                (e.target as HTMLInputElement).value,
              ),
            })
          }
          class="range range-primary range-sm"
        />
        <div class="text-sm text-base-content/60 mt-1">
          Every {settings.pollIntervalMinutes} minute
          {settings.pollIntervalMinutes !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Region */}
      <div class="form-control">
        <label class="label">
          <span class="label-text">Tesla Region</span>
        </label>
        <select
          class="select select-bordered select-sm"
          value={settings.region}
          onChange={(e) =>
            update({
              region: (e.target as HTMLSelectElement).value as TeslaRegion,
            })
          }
        >
          <option value="na">North America / APAC</option>
          <option value="eu">Europe / EMEA</option>
          <option value="cn">China</option>
        </select>
      </div>

      {/* Language & Country */}
      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Language</span>
          </label>
          <input
            type="text"
            class="input input-bordered input-sm"
            value={settings.deviceLanguage}
            onInput={(e) =>
              update({
                deviceLanguage: (e.target as HTMLInputElement).value,
              })
            }
            maxLength={5}
            placeholder="en"
          />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Country</span>
          </label>
          <input
            type="text"
            class="input input-bordered input-sm"
            value={settings.deviceCountry}
            onInput={(e) =>
              update({
                deviceCountry: (e.target as HTMLInputElement).value,
              })
            }
            maxLength={5}
            placeholder="US"
          />
        </div>
      </div>

      {/* Notifications */}
      <div class="space-y-2">
        <h2 class="text-sm font-semibold">Notifications</h2>
        <Toggle
          label="Status changes"
          checked={settings.notifyOnStatusChange}
          onChange={(v) => update({ notifyOnStatusChange: v })}
        />
        <Toggle
          label="VIN assigned"
          checked={settings.notifyOnVinAssigned}
          onChange={(v) => update({ notifyOnVinAssigned: v })}
        />
        <Toggle
          label="Delivery window updates"
          checked={settings.notifyOnDeliveryWindow}
          onChange={(v) => update({ notifyOnDeliveryWindow: v })}
        />
        <Toggle
          label="Milestone updates"
          checked={settings.notifyOnMilestone}
          onChange={(v) => update({ notifyOnMilestone: v })}
        />
      </div>

      {/* Save Button */}
      <button class="btn btn-primary btn-sm" onClick={handleSave}>
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
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
