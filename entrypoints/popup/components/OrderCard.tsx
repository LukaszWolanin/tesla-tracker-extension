import { useState, useEffect } from 'preact/hooks';
import type { TeslaOrder, TasksResponse, ChangeRecord, OrderStatus } from '@/lib/types';
import { type VehicleData, fetchVehicleData } from '@/lib/tesla-api';
import { getAccessToken, getSettings } from '@/lib/storage';
import {
  decodeModelCode,
  buildVehicleImageUrl,
  extractKeySpecs,
  decodeOptions,
  OPTION_CODES,
  decodeChangeField,
  decodeChangeValue,
} from '@/lib/decode';
import { t } from '@/lib/i18n';

interface OrderCardProps {
  order: TeslaOrder;
  tasks?: TasksResponse;
  changes: ChangeRecord[];
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: t.statusPending,
  BOOKED: t.statusBooked,
  IN_PRODUCTION: t.statusInProduction,
  IN_TRANSIT: t.statusInTransit,
  'READY FOR APPOINTMENT': t.statusReady,
  DELIVERED: t.statusDelivered,
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'badge-warning',
  BOOKED: 'badge-info',
  IN_PRODUCTION: 'badge-info',
  IN_TRANSIT: 'badge-accent',
  'READY FOR APPOINTMENT': 'badge-success',
  DELIVERED: 'badge-success',
};

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

const CATEGORY_LABELS: Record<string, string> = {
  Drivetrain: t.catDrivetrain, Color: t.catColor, Interior: t.catInterior,
  Wheels: t.catWheels, Seating: t.catSeating, Autopilot: t.catAutopilot,
  Charging: t.catCharging, Towing: t.catHak, Package: t.catPackage,
  Model: t.catModel, Drive: t.catDrive, Other: t.catOther,
};

type Section = 'progress' | 'vehicle' | 'vehicle-live' | 'changes';

export function OrderCard({ order, tasks, changes }: OrderCardProps) {
  const [openSection, setOpenSection] = useState<Section | null>('progress');
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);

  const mktOptions = order.mktOptions ?? tasks?.tasks?.registration?.orderDetails?.mktOptions;
  const modelName = decodeModelCode(order.modelCode);
  const imageUrl = buildVehicleImageUrl(order.modelCode, mktOptions);
  const deliveryWindow = tasks?.tasks?.scheduling?.deliveryWindowDisplay;
  const scheduling = tasks?.tasks?.scheduling;
  const keySpecs = mktOptions ? extractKeySpecs(mktOptions) : [];
  const currentStepIdx = ORDER_STEPS.findIndex((s) => s.status === order.orderStatus);
  const isDelivered = order.orderStatus === 'DELIVERED' || order.isDeliveredOrPostDelivered;

  // Fetch live vehicle data for delivered orders
  useEffect(() => {
    if (isDelivered && order.vin) {
      (async () => {
        const token = await getAccessToken();
        if (!token) return;
        const settings = await getSettings();
        const data = await fetchVehicleData(token, order.vin!, settings.region);
        if (data) setVehicleData(data);
      })();
    }
  }, [isDelivered, order.vin]);

  function toggle(s: Section) {
    setOpenSection(openSection === s ? null : s);
  }

  return (
    <div class="pb-1">
      {/* Hero: vehicle image + overlay info */}
      <HeroImage
        imageUrl={imageUrl}
        modelName={modelName}
        referenceNumber={order.referenceNumber}
        statusLabel={STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
        statusColor={STATUS_COLORS[order.orderStatus] ?? 'badge-ghost'}
      />

      {/* Key info strip */}
      <div class="px-3 py-2 bg-base-200/50 border-b border-base-300">
        <div class="flex items-center gap-2 flex-wrap">
          {deliveryWindow && (
            <span class="text-xs font-semibold text-primary">
              {deliveryWindow}
            </span>
          )}
          {keySpecs.map((spec) => (
            <span key={spec} class="text-[10px] text-base-content/40">
              {spec}
            </span>
          ))}
          {order.countryCode && (
            <span class="text-[10px] text-base-content/30">{order.countryCode}</span>
          )}
        </div>
      </div>

      {/* Accordion sections */}
      <div class="divide-y divide-base-300">
        {/* Delivery Progress */}
        <AccordionSection
          title={t.deliveryProgress}
          summary={
            deliveryWindow
              ? `${ORDER_STEPS[currentStepIdx]?.label} \u2022 ${deliveryWindow}`
              : ORDER_STEPS[currentStepIdx]?.label
          }
          open={openSection === 'progress'}
          onToggle={() => toggle('progress')}
        >
          {/* Delivery details */}
          {(deliveryWindow || scheduling?.apptDateTimeAddressStr) && (
            <div class="mb-3 space-y-1">
              {deliveryWindow && (
                <div class="p-2 bg-primary/10 rounded-lg">
                  <span class="text-[10px] text-base-content/50">{t.deliveryWindow}</span>
                  <p class="text-sm font-semibold">{deliveryWindow}</p>
                </div>
              )}
              {scheduling?.apptDateTimeAddressStr && (
                <div class="p-2 bg-success/10 rounded-lg">
                  <span class="text-[10px] text-base-content/50">{t.appointment}</span>
                  <p class="text-sm font-medium">{scheduling.apptDateTimeAddressStr}</p>
                </div>
              )}
              {scheduling?.deliveryType && (
                <p class="text-[10px] text-base-content/40">
                  {scheduling.deliveryType === 'PICKUP_SERVICE_CENTER'
                    ? 'Odbiór w centrum serwisowym'
                    : scheduling.deliveryType}
                </p>
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
                  <span class={isCurrent ? 'font-semibold text-primary' : isDone ? '' : 'text-base-content/30'}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Milestones */}
          {tasks?.activeTaskList && tasks.activeTaskList.length > 0 && (
            <div class="mt-3 pt-2 border-t border-base-300 space-y-1">
              {tasks.activeTaskList.map((m) => (
                <div key={m.taskName} class="flex items-center gap-2 text-xs">
                  <span class={m.status === 'DONE' ? 'text-success' : 'text-base-content/30'}>
                    {m.status === 'DONE' ? '\u2713' : '\u25CB'}
                  </span>
                  <span class={m.status === 'DONE' ? '' : 'text-base-content/40'}>
                    {MILESTONE_LABELS[m.taskName] ?? m.taskName}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Registration status */}
          {tasks?.tasks?.registration?.currentStep && (
            <div class="mt-2 pt-2 border-t border-base-300 text-xs text-base-content/50">
              <span>Rejestracja: </span>
              <span class="font-medium text-base-content/70">
                {tasks.tasks.registration.currentStep.replace(/_/g, ' ')}
              </span>
              {tasks.tasks.registration.regData?.regDetails?.missingDocuments && (
                <p class="text-[10px] text-warning mt-0.5">
                  Brakujące dokumenty: {tasks.tasks.registration.regData.regDetails.missingDocuments
                    .split(', ')
                    .map((d) => d.replace(/_/g, ' ').toLowerCase())
                    .join(', ')}
                </p>
              )}
            </div>
          )}
        </AccordionSection>

        {/* Vehicle Details */}
        <AccordionSection
          title={t.vehicleDetails}
          summary={keySpecs.join(' \u2022 ')}
          open={openSection === 'vehicle'}
          onToggle={() => toggle('vehicle')}
        >
          <VehicleDetails order={order} tasks={tasks} mktOptions={mktOptions} />
        </AccordionSection>

        {/* Post-delivery vehicle data */}
        {isDelivered && vehicleData && (
          <AccordionSection
            title="Pojazd"
            summary={vehicleData.charge_state?.battery_level != null
              ? `${vehicleData.charge_state.battery_level}% \u2022 ${Math.round(vehicleData.charge_state.battery_range ?? 0)} km`
              : undefined}
            open={openSection === 'vehicle-live'}
            onToggle={() => toggle('vehicle-live')}
          >
            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {vehicleData.charge_state?.battery_level != null && (
                <Info label="Bateria" value={`${vehicleData.charge_state.battery_level}%`} />
              )}
              {vehicleData.charge_state?.battery_range != null && (
                <Info label="Zasięg" value={`${Math.round(vehicleData.charge_state.battery_range)} km`} />
              )}
              {vehicleData.charge_state?.charging_state && (
                <Info label="Ładowanie" value={vehicleData.charge_state.charging_state} />
              )}
              {vehicleData.vehicle_state?.odometer != null && (
                <Info label="Przebieg" value={`${Math.round(vehicleData.vehicle_state.odometer)} km`} />
              )}
              {vehicleData.vehicle_state?.car_version && (
                <Info label="Firmware" value={vehicleData.vehicle_state.car_version.split(' ')[0] ?? ''} />
              )}
              {vehicleData.climate_state?.inside_temp != null && (
                <Info label="Temp. wewnątrz" value={`${vehicleData.climate_state.inside_temp}°C`} />
              )}
              {vehicleData.climate_state?.outside_temp != null && (
                <Info label="Temp. zewnątrz" value={`${vehicleData.climate_state.outside_temp}°C`} />
              )}
              {vehicleData.vehicle_state?.locked != null && (
                <Info label="Zamek" value={vehicleData.vehicle_state.locked ? 'Zamknięty' : 'Otwarty'} />
              )}
            </div>
          </AccordionSection>
        )}

        {/* Change Log */}
        {changes.length > 0 && (
          <AccordionSection
            title={t.recentChanges}
            summary={
              changes[0]
                ? `${decodeChangeField(changes[0].field)}: ${decodeChangeValue(changes[0].field, changes[0].newValue)}`
                : undefined
            }
            open={openSection === 'changes'}
            onToggle={() => toggle('changes')}
          >
            <div class="space-y-1.5">
              {changes.map((c, i) => {
                const field = c.field.startsWith('milestone:')
                  ? c.field.replace('milestone:', '')
                  : decodeChangeField(c.field);
                const newVal = decodeChangeValue(c.field, c.newValue);
                const oldVal = decodeChangeValue(c.field, c.oldValue);
                return (
                  <div key={`${c.timestamp}-${i}`} class="flex items-start gap-2 text-xs">
                    <span class="text-base-content/25 shrink-0 text-[10px] pt-0.5">
                      {formatTime(c.timestamp)}
                    </span>
                    <div class="min-w-0">
                      <span class="font-medium">{field}</span>
                      {oldVal && newVal ? (
                        <span class="text-base-content/50"> {oldVal} <span class="text-primary">&rarr;</span> {newVal}</span>
                      ) : newVal ? (
                        <span class="text-success"> {newVal}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionSection>
        )}
      </div>
    </div>
  );
}

// ── Accordion ──

function AccordionSection({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: preact.ComponentChildren;
}) {
  return (
    <div>
      <button
        class="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-base-200/50 transition-colors"
        onClick={onToggle}
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs font-semibold shrink-0">{title}</span>
          {!open && summary && (
            <span class="text-[10px] text-base-content/35 truncate">{summary}</span>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class={`h-3 w-3 shrink-0 text-base-content/30 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div class="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ── Vehicle Details Content ──

function VehicleDetails({
  order,
  tasks,
  mktOptions,
}: {
  order: TeslaOrder;
  tasks?: TasksResponse;
  mktOptions?: string;
}) {
  const details = tasks?.tasks?.registration?.orderDetails;
  const payment = tasks?.tasks?.finalPayment?.data;
  const vinInfo = order.vin ? decodeVin(order.vin) : null;
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
    <div>
      {/* Info grid */}
      <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {order.vin && <Info label="VIN" value={order.vin} mono />}
        {vinInfo?.factory && <Info label={t.factory} value={vinInfo.factory} />}
        {vinInfo?.battery && <Info label={t.battery} value={vinInfo.battery} />}
        {(details?.modelYear || order.year) && (
          <Info label={t.modelYear} value={String(details?.modelYear ?? order.year)} />
        )}
        {order.countryCode && <Info label={t.market} value={order.countryCode} />}
        {details?.vehicleRoutingLocation && (
          <Info label={t.deliveryCenter} value={details.vehicleRoutingLocation} />
        )}
        {details?.vehicleOdometer !== undefined && (
          <Info label={t.odometer} value={`${details.vehicleOdometer} ${details.vehicleOdometerType ?? 'km'}`} />
        )}
        {details?.bookedDate && <Info label={t.booked} value={details.bookedDate} />}
        {payment?.totalDue !== undefined && (
          <Info label={t.amountDue} value={`${payment.totalDue.toLocaleString('pl-PL')} PLN`} />
        )}
        {tasks?.tasks?.registration?.orderType && (
          <Info
            label="Typ"
            value={
              tasks.tasks.registration.orderType === 'TESLA_LEASING'
                ? 'Leasing Tesla'
                : tasks.tasks.registration.orderType
            }
          />
        )}
      </div>

      {/* Config badges */}
      {decodedOpts.length > 0 && (
        <div class="mt-3 pt-2 border-t border-base-300 space-y-1.5">
          {categoryOrder
            .filter((cat) => grouped.has(cat))
            .map((cat) => (
              <div key={cat} class="flex items-start gap-2">
                <span class="text-[10px] text-base-content/30 w-14 shrink-0 pt-0.5 text-right">
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
                <div class="flex flex-wrap gap-1">
                  {grouped.get(cat)!.map((opt) => (
                    <span
                      key={opt.code}
                      class={`badge badge-xs ${OPTION_CODES[opt.code] ? 'badge-primary badge-outline' : 'badge-ghost'}`}
                      title={opt.code}
                    >
                      {opt.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div class="min-w-0">
      <span class="text-[10px] text-base-content/40">{label}</span>
      <p class={`font-medium leading-tight truncate ${mono ? 'font-mono text-[10px]' : 'text-xs'}`}>
        {value}
      </p>
    </div>
  );
}

function decodeVin(vin: string) {
  const wmi = vin.substring(0, 3);
  const batteryChar = vin.charAt(6);
  const factories: Record<string, string> = {
    '5YJ': 'Fremont, CA', '7SA': 'Austin, TX', '7G2': 'Austin, TX',
    LRW: 'Szanghaj', XP7: 'Berlin',
  };
  const batteries: Record<string, string> = {
    E: 'Li-Ion (NCA/NCM)', F: 'LFP', H: 'Ogniwa 4680', V: 'NCA', W: 'NCM',
  };
  return { factory: factories[wmi] ?? wmi, battery: batteries[batteryChar] ?? batteryChar };
}

function HeroImage({
  imageUrl,
  modelName,
  referenceNumber,
  statusLabel,
  statusColor,
}: {
  imageUrl: string;
  modelName: string;
  referenceNumber: string;
  statusLabel: string;
  statusColor: string;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div class="relative bg-base-300 overflow-hidden">
      {/* Image — hidden until loaded */}
      {!imgFailed && (
        <img
          src={imageUrl}
          alt=""
          class={`w-full h-[160px] object-cover object-center transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgFailed(true)}
        />
      )}

      {/* Fallback bg when no image */}
      {(imgFailed || !imgLoaded) && (
        <div class="w-full h-[160px] bg-gradient-to-br from-base-300 to-base-200" />
      )}

      {/* Gradient overlay */}
      <div class="absolute inset-0 bg-gradient-to-t from-base-100/95 via-base-100/20 to-transparent" />

      {/* Overlaid info — always visible */}
      <div class="absolute bottom-0 left-0 right-0 p-3">
        <div class="flex items-end justify-between">
          <div>
            <h2 class="text-lg font-bold leading-tight drop-shadow-sm">{modelName}</h2>
            <p class="text-[10px] text-base-content/50 font-mono">{referenceNumber}</p>
          </div>
          <span class={`badge ${statusColor} badge-sm`}>{statusLabel}</span>
        </div>
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return isToday
    ? d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' });
}
