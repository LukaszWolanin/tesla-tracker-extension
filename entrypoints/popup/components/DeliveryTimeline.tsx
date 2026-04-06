import type { TeslaOrder, TasksResponse, OrderStatus } from '@/lib/types';
import { CollapsibleCard } from './CollapsibleCard';
import { t } from '@/lib/i18n';

interface DeliveryTimelineProps {
  order: TeslaOrder;
  tasks?: TasksResponse;
}

const ORDER_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING', label: t.orderPlaced },
  { status: 'BOOKED', label: t.orderConfirmed },
  { status: 'IN_PRODUCTION', label: t.inProduction },
  { status: 'IN_TRANSIT', label: t.inTransit },
  { status: 'READY FOR APPOINTMENT', label: t.readyForPickup },
  { status: 'DELIVERED', label: t.delivered },
];

const MILESTONE_LABELS: Record<string, string> = {
  'Sign Agreements': t['Sign Agreements'],
  'Vehicle Exited Factory': t['Vehicle Exited Factory'],
  'Final Invoice Generation': t['Final Invoice Generation'],
  'Complete Final Payment': t['Complete Final Payment'],
  'Vehicle Ready for Transport': t['Vehicle Ready for Transport'],
  'Schedule Delivery': t['Schedule Delivery'],
};

export function DeliveryTimeline({ order, tasks }: DeliveryTimelineProps) {
  const deliveryWindow = tasks?.tasks?.scheduling?.deliveryWindowDisplay;
  const appointmentAddr = tasks?.tasks?.scheduling?.apptDateTimeAddressStr;
  const hasMilestones = !!tasks?.activeTaskList?.length;

  const currentStepIdx = ORDER_STEPS.findIndex(
    (s) => s.status === order.orderStatus,
  );
  const currentLabel = ORDER_STEPS[currentStepIdx]?.label ?? order.orderStatus;

  const summary = deliveryWindow
    ? `${currentLabel} \u2022 ${deliveryWindow}`
    : currentLabel;

  return (
    <CollapsibleCard title={t.deliveryProgress} summary={summary} defaultOpen>
      {(deliveryWindow || appointmentAddr) && (
        <div class="mb-3 p-2 bg-primary/10 rounded-lg space-y-1">
          {deliveryWindow && (
            <div>
              <span class="text-xs text-base-content/50">{t.deliveryWindow}</span>
              <p class="text-sm font-medium">{deliveryWindow}</p>
            </div>
          )}
          {appointmentAddr && (
            <div>
              <span class="text-xs text-base-content/50">{t.appointment}</span>
              <p class="text-sm font-medium">{appointmentAddr}</p>
            </div>
          )}
        </div>
      )}

      <ul class="steps steps-vertical text-xs w-full">
        {ORDER_STEPS.map((step, i) => {
          const isDone = i <= currentStepIdx;
          const isCurrent = i === currentStepIdx;
          return (
            <li key={step.status} class={`step ${isDone ? 'step-primary' : ''}`}>
              <span
                class={
                  isCurrent
                    ? 'font-semibold text-primary'
                    : isDone
                      ? 'text-base-content'
                      : 'text-base-content/30'
                }
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>

      {hasMilestones && (
        <div class="mt-3 pt-3 border-t border-base-300">
          <h4 class="text-xs font-semibold text-base-content/60 mb-2">
            {t.milestones}
          </h4>
          <div class="space-y-1">
            {tasks!.activeTaskList!.map((milestone) => {
              const isDone = milestone.status === 'DONE';
              const label =
                MILESTONE_LABELS[milestone.taskName] ??
                milestone.displayName ??
                milestone.taskName;
              return (
                <div key={milestone.taskName} class="flex items-center gap-2 text-xs">
                  <span class={isDone ? 'text-success' : 'text-base-content/30'}>
                    {isDone ? '\u2713' : '\u25CB'}
                  </span>
                  <span class={isDone ? 'text-base-content' : 'text-base-content/40'}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}
