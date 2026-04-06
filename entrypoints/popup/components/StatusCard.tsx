import type { TeslaOrder, OrderStatus } from '@/lib/types';
import { decodeModelCode } from '@/lib/decode';
import { t } from '@/lib/i18n';

interface StatusCardProps {
  order: TeslaOrder;
}

const STATUS_BADGES: Record<OrderStatus, { label: string; class: string }> = {
  PENDING: { label: t.statusPending, class: 'badge-warning' },
  BOOKED: { label: t.statusBooked, class: 'badge-info' },
  IN_PRODUCTION: { label: t.statusInProduction, class: 'badge-info' },
  IN_TRANSIT: { label: t.statusInTransit, class: 'badge-accent' },
  'READY FOR APPOINTMENT': { label: t.statusReady, class: 'badge-success' },
  DELIVERED: { label: t.statusDelivered, class: 'badge-success' },
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

        <div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-base-content/50">
          {order.year && <span>{order.year}</span>}
          {order.countryCode && <span>{order.countryCode}</span>}
          {order.esignStatus && order.esignStatus !== 'NOT_REQUIRED' && (
            <span>
              {t.eSign}: {order.esignStatus === 'COMPLETED' ? t.eSignCompleted : t.eSignPending}
            </span>
          )}
          {order.isPaymentPending && (
            <span class="text-warning">{t.payment}: {t.paymentPending}</span>
          )}
        </div>
      </div>
    </div>
  );
}
