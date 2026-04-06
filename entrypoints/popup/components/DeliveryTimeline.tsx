import type { TeslaOrder, TasksResponse, OrderStatus } from '@/lib/types';
import { CollapsibleCard } from './CollapsibleCard';

interface DeliveryTimelineProps {
  order: TeslaOrder;
  tasks?: TasksResponse;
}

const ORDER_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING', label: 'Order Placed' },
  { status: 'BOOKED', label: 'Order Confirmed' },
  { status: 'IN_PRODUCTION', label: 'In Production' },
  { status: 'IN_TRANSIT', label: 'In Transit' },
  { status: 'READY FOR APPOINTMENT', label: 'Ready for Pickup' },
  { status: 'DELIVERED', label: 'Delivered' },
];

const MILESTONE_LABELS: Record<string, string> = {
  'Sign Agreements': 'Sign Agreements',
  'Vehicle Exited Factory': 'Left Factory',
  'Final Invoice Generation': 'Invoice Generated',
  'Complete Final Payment': 'Payment Complete',
  'Vehicle Ready for Transport': 'Ready for Transport',
  'Schedule Delivery': 'Schedule Delivery',
};

export function DeliveryTimeline({ order, tasks }: DeliveryTimelineProps) {
  const deliveryWindow = tasks?.tasks?.scheduling?.deliveryWindowDisplay;
  const appointmentAddr = tasks?.tasks?.scheduling?.apptDateTimeAddressStr;
  const hasMilestones = !!tasks?.activeTaskList?.length;

  const currentStepIdx = ORDER_STEPS.findIndex(
    (s) => s.status === order.orderStatus,
  );
  const currentLabel = ORDER_STEPS[currentStepIdx]?.label ?? order.orderStatus;

  // Summary when collapsed: current status + delivery window
  const summary = deliveryWindow
    ? `${currentLabel} \u2022 ${deliveryWindow}`
    : currentLabel;

  return (
    <CollapsibleCard title="Delivery Progress" summary={summary} defaultOpen>
      {/* Delivery window / appointment */}
      {(deliveryWindow || appointmentAddr) && (
        <div class="mb-3 p-2 bg-primary/10 rounded-lg space-y-1">
          {deliveryWindow && (
            <div>
              <span class="text-xs text-base-content/50">Delivery Window</span>
              <p class="text-sm font-medium">{deliveryWindow}</p>
            </div>
          )}
          {appointmentAddr && (
            <div>
              <span class="text-xs text-base-content/50">Appointment</span>
              <p class="text-sm font-medium">{appointmentAddr}</p>
            </div>
          )}
        </div>
      )}

      {/* Steps */}
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

      {/* Milestones from Tasks API */}
      {hasMilestones && (
        <div class="mt-3 pt-3 border-t border-base-300">
          <h4 class="text-xs font-semibold text-base-content/60 mb-2">
            Milestones
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
