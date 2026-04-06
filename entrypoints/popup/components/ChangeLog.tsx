import type { ChangeRecord } from '@/lib/types';
import { decodeChangeField, decodeChangeValue } from '@/lib/decode';
import { CollapsibleCard } from './CollapsibleCard';

interface ChangeLogProps {
  changes: ChangeRecord[];
}

export function ChangeLog({ changes }: ChangeLogProps) {
  // Summary: latest change
  const latest = changes[0];
  const summary = latest
    ? `${decodeChangeField(latest.field)}: ${decodeChangeValue(latest.field, latest.newValue)}`
    : undefined;

  return (
    <CollapsibleCard title="Recent Changes" summary={summary}>
      <div class="space-y-2">
        {changes.map((change, i) => (
          <ChangeItem key={`${change.timestamp}-${i}`} change={change} />
        ))}
      </div>
    </CollapsibleCard>
  );
}

function ChangeItem({ change }: { change: ChangeRecord }) {
  const fieldLabel = decodeChangeField(change.field);
  const oldVal = decodeChangeValue(change.field, change.oldValue);
  const newVal = decodeChangeValue(change.field, change.newValue);
  const timeStr = formatTime(change.timestamp);

  return (
    <div class="flex items-start gap-2 text-xs">
      <span class="text-base-content/30 shrink-0 pt-0.5">{timeStr}</span>
      <div class="min-w-0">
        <span class="font-medium">{fieldLabel}</span>
        {oldVal && newVal ? (
          <span class="text-base-content/60">
            {' '}{oldVal}{' '}
            <span class="text-primary">&rarr;</span>{' '}
            {newVal}
          </span>
        ) : newVal ? (
          <span class="text-success"> {newVal}</span>
        ) : null}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
