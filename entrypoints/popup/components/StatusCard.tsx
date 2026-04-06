import type { TeslaOrder, OrderStatus } from '@/lib/types';
import { decodeModelCode } from '@/lib/decode';

interface StatusCardProps {
  order: TeslaOrder;
}

const STATUS_BADGES: Record<OrderStatus, { label: string; class: string }> = {
  PENDING: { label: 'Pending', class: 'badge-warning' },
  BOOKED: { label: 'Booked', class: 'badge-info' },
  IN_PRODUCTION: { label: 'In Production', class: 'badge-info' },
  IN_TRANSIT: { label: 'In Transit', class: 'badge-accent' },
  'READY FOR APPOINTMENT': { label: 'Ready', class: 'badge-success' },
  DELIVERED: { label: 'Delivered', class: 'badge-success' },
};

export function StatusCard({ order }: StatusCardProps) {
  const badge = STATUS_BADGES[order.orderStatus] ?? {
    label: order.orderStatus,
    class: 'badge-ghost',
  };

  const modelName = decodeModelCode(order.modelCode);

  return (
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="card-title text-base">{modelName}</h2>
            <p class="text-xs text-base-content/50 font-mono">
              {order.referenceNumber}
            </p>
          </div>
          <span class={`badge ${badge.class} badge-sm`}>{badge.label}</span>
        </div>

        {order.vin && (
          <div class="mt-2">
            <span class="text-xs text-base-content/50">VIN</span>
            <p class="font-mono text-sm">{order.vin}</p>
          </div>
        )}

        {/* Show whatever order-level info we have */}
        <div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-base-content/50">
          {order.year && <span>{order.year}</span>}
          {order.countryCode && <span>{order.countryCode}</span>}
          {order.esignStatus && order.esignStatus !== 'NOT_REQUIRED' && (
            <span>
              E-Sign: {order.esignStatus === 'COMPLETED' ? 'Done' : 'Pending'}
            </span>
          )}
          {order.isPaymentPending && (
            <span class="text-warning">Payment pending</span>
          )}
        </div>
      </div>
    </div>
  );
}
