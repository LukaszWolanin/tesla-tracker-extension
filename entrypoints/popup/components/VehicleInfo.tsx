import type { TeslaOrder, TasksResponse } from '@/lib/types';
import { decodeOptions, extractKeySpecs, OPTION_CODES } from '@/lib/decode';
import { CollapsibleCard } from './CollapsibleCard';

interface VehicleInfoProps {
  order: TeslaOrder;
  tasks?: TasksResponse;
}

export function VehicleInfo({ order, tasks }: VehicleInfoProps) {
  const details = tasks?.tasks?.registration?.orderDetails;
  const payment = tasks?.tasks?.finalPayment?.data;
  const vinInfo = order.vin ? decodeVin(order.vin) : null;

  // mktOptions from order or tasks
  const mktOptions =
    order.mktOptions ?? details?.mktOptions;

  // Key specs for collapsed summary
  const keySpecs = mktOptions ? extractKeySpecs(mktOptions) : [];
  const summary = keySpecs.length > 0 ? keySpecs.join(' \u2022 ') : undefined;

  // Decoded options grouped by category
  const decodedOpts = mktOptions ? decodeOptions(mktOptions) : [];

  // Group by category
  const grouped = new Map<string, typeof decodedOpts>();
  for (const opt of decodedOpts) {
    const list = grouped.get(opt.category) ?? [];
    list.push(opt);
    grouped.set(opt.category, list);
  }

  // Category display order
  const categoryOrder = [
    'Drivetrain', 'Color', 'Interior', 'Wheels', 'Seating',
    'Autopilot', 'Charging', 'Towing', 'Package', 'Model', 'Drive', 'Other',
  ];

  return (
    <CollapsibleCard title="Vehicle Details" summary={summary}>
      {/* Grid of info rows */}
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {order.vin && <InfoRow label="VIN" value={order.vin} mono />}
        {vinInfo?.factory && <InfoRow label="Factory" value={vinInfo.factory} />}
        {vinInfo?.battery && <InfoRow label="Battery" value={vinInfo.battery} />}
        {(details?.modelYear || order.year) && (
          <InfoRow label="Model Year" value={String(details?.modelYear ?? order.year)} />
        )}
        {order.countryCode && <InfoRow label="Market" value={order.countryCode} />}
        {order.locale && <InfoRow label="Locale" value={order.locale} />}
        {details?.vehicleRoutingLocation && (
          <InfoRow label="Delivery Center" value={details.vehicleRoutingLocation} />
        )}
        {details?.vehicleOdometer !== undefined && (
          <InfoRow
            label="Odometer"
            value={`${details.vehicleOdometer} ${details.vehicleOdometerType ?? 'MI'}`}
          />
        )}
        {details?.bookedDate && <InfoRow label="Booked" value={details.bookedDate} />}
        {details?.reservationDate && (
          <InfoRow
            label="Reserved"
            value={new Date(details.reservationDate).toLocaleDateString()}
          />
        )}
        {payment?.totalDue !== undefined && (
          <InfoRow label="Amount Due" value={formatCurrency(payment.totalDue)} />
        )}
        {order.esignStatus && order.esignStatus !== 'NOT_REQUIRED' && (
          <InfoRow label="E-Sign" value={formatEsign(order.esignStatus)} />
        )}
        {order.isPaymentPending && <InfoRow label="Payment" value="Pending" />}
        {order.orderSubstatus && (
          <InfoRow label="Sub-status" value={order.orderSubstatus} />
        )}
      </div>

      {/* Configuration — decoded options grouped */}
      {decodedOpts.length > 0 && (
        <div class="mt-3 pt-3 border-t border-base-300">
          <span class="text-xs font-semibold text-base-content/60">
            Configuration
          </span>
          <div class="mt-2 space-y-2">
            {categoryOrder
              .filter((cat) => grouped.has(cat))
              .map((cat) => (
                <div key={cat}>
                  <span class="text-[10px] uppercase tracking-wider text-base-content/30">
                    {cat}
                  </span>
                  <div class="flex flex-wrap gap-1 mt-0.5">
                    {grouped.get(cat)!.map((opt) => {
                      const isKnown = !!OPTION_CODES[opt.code];
                      return (
                        <span
                          key={opt.code}
                          class={`badge badge-xs ${isKnown ? 'badge-primary badge-outline' : 'badge-ghost'}`}
                          title={`${opt.code}: ${opt.label}`}
                        >
                          {opt.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div class="min-w-0">
      <span class="text-base-content/50">{label}</span>
      <p class={`font-medium truncate ${mono ? 'font-mono text-[11px]' : ''}`}>
        {value}
      </p>
    </div>
  );
}

interface VinInfo {
  factory: string;
  battery: string;
}

function decodeVin(vin: string): VinInfo {
  const wmi = vin.substring(0, 3);
  const batteryChar = vin.charAt(6);

  const factories: Record<string, string> = {
    '5YJ': 'Fremont, CA',
    '7SA': 'Austin, TX',
    '7G2': 'Austin, TX',
    LRW: 'Shanghai',
    XP7: 'Berlin-Brandenburg',
  };

  const batteries: Record<string, string> = {
    E: 'Li-Ion (NCA/NCM)',
    F: 'LFP',
    H: '4680 Cells',
    V: 'NCA (Panasonic)',
    W: 'NCM',
  };

  return {
    factory: factories[wmi] ?? wmi,
    battery: batteries[batteryChar] ?? batteryChar,
  };
}

function formatEsign(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    COMPLETED: 'Completed',
  };
  return map[status] ?? status;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
