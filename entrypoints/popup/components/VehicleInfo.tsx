import type { TeslaOrder, TasksResponse } from '@/lib/types';
import { decodeOptions, extractKeySpecs, OPTION_CODES } from '@/lib/decode';
import { CollapsibleCard } from './CollapsibleCard';
import { t } from '@/lib/i18n';

interface VehicleInfoProps {
  order: TeslaOrder;
  tasks?: TasksResponse;
}

const CATEGORY_LABELS: Record<string, string> = {
  Drivetrain: t.catDrivetrain,
  Color: t.catColor,
  Interior: t.catInterior,
  Wheels: t.catWheels,
  Seating: t.catSeating,
  Autopilot: t.catAutopilot,
  Charging: t.catCharging,
  Towing: t.catHak,
  Package: t.catPackage,
  Model: t.catModel,
  Drive: t.catDrive,
  Other: t.catOther,
};

export function VehicleInfo({ order, tasks }: VehicleInfoProps) {
  const details = tasks?.tasks?.registration?.orderDetails;
  const payment = tasks?.tasks?.finalPayment?.data;
  const vinInfo = order.vin ? decodeVin(order.vin) : null;

  const mktOptions = order.mktOptions ?? details?.mktOptions;

  const keySpecs = mktOptions ? extractKeySpecs(mktOptions) : [];
  const summary = keySpecs.length > 0 ? keySpecs.join(' \u2022 ') : undefined;

  const decodedOpts = mktOptions ? decodeOptions(mktOptions) : [];

  const grouped = new Map<string, typeof decodedOpts>();
  for (const opt of decodedOpts) {
    const list = grouped.get(opt.category) ?? [];
    list.push(opt);
    grouped.set(opt.category, list);
  }

  const categoryOrder = [
    'Drivetrain', 'Color', 'Interior', 'Wheels', 'Seating',
    'Autopilot', 'Charging', 'Towing', 'Package', 'Model', 'Drive', 'Other',
  ];

  return (
    <CollapsibleCard title={t.vehicleDetails} summary={summary}>
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {order.vin && <InfoRow label={t.vin} value={order.vin} mono />}
        {vinInfo?.factory && <InfoRow label={t.factory} value={vinInfo.factory} />}
        {vinInfo?.battery && <InfoRow label={t.battery} value={vinInfo.battery} />}
        {(details?.modelYear || order.year) && (
          <InfoRow label={t.modelYear} value={String(details?.modelYear ?? order.year)} />
        )}
        {order.countryCode && <InfoRow label={t.market} value={order.countryCode} />}
        {order.locale && <InfoRow label={t.locale} value={order.locale} />}
        {details?.vehicleRoutingLocation && (
          <InfoRow label={t.deliveryCenter} value={details.vehicleRoutingLocation} />
        )}
        {details?.vehicleOdometer !== undefined && (
          <InfoRow
            label={t.odometer}
            value={`${details.vehicleOdometer} ${details.vehicleOdometerType ?? 'km'}`}
          />
        )}
        {details?.bookedDate && <InfoRow label={t.booked} value={details.bookedDate} />}
        {details?.reservationDate && (
          <InfoRow
            label={t.reserved}
            value={new Date(details.reservationDate).toLocaleDateString('pl-PL')}
          />
        )}
        {payment?.totalDue !== undefined && (
          <InfoRow label={t.amountDue} value={formatCurrency(payment.totalDue)} />
        )}
        {order.esignStatus && order.esignStatus !== 'NOT_REQUIRED' && (
          <InfoRow
            label={t.eSign}
            value={order.esignStatus === 'COMPLETED' ? t.eSignCompleted : t.eSignPending}
          />
        )}
        {order.isPaymentPending && <InfoRow label={t.payment} value={t.paymentPending} />}
        {order.orderSubstatus && (
          <InfoRow label={t.subStatus} value={order.orderSubstatus} />
        )}
      </div>

      {decodedOpts.length > 0 && (
        <div class="mt-3 pt-3 border-t border-base-300">
          <span class="text-xs font-semibold text-base-content/60">
            {t.configuration}
          </span>
          <div class="mt-2 space-y-2">
            {categoryOrder
              .filter((cat) => grouped.has(cat))
              .map((cat) => (
                <div key={cat}>
                  <span class="text-[10px] uppercase tracking-wider text-base-content/30">
                    {CATEGORY_LABELS[cat] ?? cat}
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

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div class="min-w-0">
      <span class="text-base-content/50">{label}</span>
      <p class={`font-medium truncate ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</p>
    </div>
  );
}

function decodeVin(vin: string) {
  const wmi = vin.substring(0, 3);
  const batteryChar = vin.charAt(6);
  const factories: Record<string, string> = {
    '5YJ': 'Fremont, CA',
    '7SA': 'Austin, TX',
    '7G2': 'Austin, TX',
    LRW: 'Szanghaj',
    XP7: 'Berlin-Brandenburgia',
  };
  const batteries: Record<string, string> = {
    E: 'Li-Ion (NCA/NCM)',
    F: 'LFP',
    H: 'Ogniwa 4680',
    V: 'NCA (Panasonic)',
    W: 'NCM',
  };
  return {
    factory: factories[wmi] ?? wmi,
    battery: batteries[batteryChar] ?? batteryChar,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(amount);
}
