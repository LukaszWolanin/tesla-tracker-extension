import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

interface CollapsibleCardProps {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ComponentChildren;
}

export function CollapsibleCard({
  title,
  summary,
  defaultOpen = false,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div class="card bg-base-200 shadow-sm">
      <button
        class="flex items-center justify-between w-full p-4 pb-0 text-left cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div class="flex items-center gap-2 min-w-0">
          <h3 class="text-sm font-semibold shrink-0">{title}</h3>
          {!open && summary && (
            <span class="text-xs text-base-content/40 truncate">
              {summary}
            </span>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class={`h-3.5 w-3.5 shrink-0 text-base-content/40 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width={2}
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div class={`card-body p-4 pt-2 ${open ? '' : 'hidden'}`}>
        {children}
      </div>
      {!open && <div class="h-2" />}
    </div>
  );
}
