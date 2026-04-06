import type { TeslaOrder, TasksResponse, ChangeRecord } from './types';

// ── Ignored paths (noise, sensitive data) ──

const IGNORED_KEYS = new Set([
  'requestHelp',
  'lastUpdateDateTime',
  'lastUpdateDatetime',
  'ssn',
  'companySsn',
  'strings',         // UI translation strings from Tesla
  '__smartling_locales',
  'idNumber',
  'idExpirationDate',
  'phoneNumber',
  'email',
]);

// ── Human-readable labels for known paths ──

const PATH_LABELS: Record<string, string> = {
  // Order-level
  'orderStatus': 'orderStatus',
  'vin': 'vinAssigned',
  'mktOptions': 'mktOptions',
  'esignStatus': 'esignStatus',

  // Scheduling
  'tasks.scheduling.deliveryWindowDisplay': 'deliveryWindow',
  'tasks.scheduling.apptDateTimeAddressStr': 'deliveryAppointment',
  'tasks.scheduling.deliveryType': 'deliveryType',
  'tasks.scheduling.deliveryAppointmentDate': 'deliveryDate',

  // Registration / Order Details
  'tasks.registration.orderDetails.vehicleRoutingLocation': 'vehicleRoutingLocation',
  'tasks.registration.orderDetails.vehicleOdometer': 'vehicleOdometer',
  'tasks.registration.orderDetails.reservationDate': 'reservationDate',
  'tasks.registration.orderDetails.bookedDate': 'bookedDate',
  'tasks.registration.orderDetails.vin': 'vinAssigned',
  'tasks.registration.currentStep': 'registrationStep',
  'tasks.registration.orderType': 'orderType',
  'tasks.registration.regData.regDetails.missingDocuments': 'missingDocuments',
  'tasks.registration.regData.regDetails.currentStep': 'regCurrentStep',

  // Final Payment
  'tasks.finalPayment.data.etaToDeliveryCenter': 'etaToCenter',
  'tasks.finalPayment.data.totalDue': 'totalDue',
  'tasks.finalPayment.complete': 'paymentComplete',

  // Delivery details
  'tasks.deliveryDetails.pickUpZipCode': 'pickUpZipCode',

  // Financing / Trade-in
  'tasks.financing.complete': 'financingComplete',
  'tasks.tradeIn.complete': 'tradeInComplete',
};

// ── Deep diff engine ──

interface DiffEntry {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

function deepDiff(
  prev: unknown,
  curr: unknown,
  path = '',
): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  if (Object.is(prev, curr)) return diffs;

  // Both null/undefined → no diff
  if (prev == null && curr == null) return diffs;

  // One is null/undefined, other isn't
  if (prev == null || curr == null) {
    // Only record if new value is meaningful
    if (curr != null) {
      diffs.push({ path, oldValue: prev, newValue: curr });
    }
    return diffs;
  }

  // Arrays: compare via JSON (order-sensitive)
  if (Array.isArray(prev) && Array.isArray(curr)) {
    if (JSON.stringify(prev) !== JSON.stringify(curr)) {
      diffs.push({ path, oldValue: prev, newValue: curr });
    }
    return diffs;
  }

  // Objects: recurse
  if (typeof prev === 'object' && typeof curr === 'object') {
    const allKeys = new Set([
      ...Object.keys(prev as Record<string, unknown>),
      ...Object.keys(curr as Record<string, unknown>),
    ]);

    for (const key of allKeys) {
      if (IGNORED_KEYS.has(key)) continue;

      const childPath = path ? `${path}.${key}` : key;
      const childDiffs = deepDiff(
        (prev as Record<string, unknown>)[key],
        (curr as Record<string, unknown>)[key],
        childPath,
      );
      diffs.push(...childDiffs);
    }
    return diffs;
  }

  // Primitives
  if (prev !== curr) {
    diffs.push({ path, oldValue: prev, newValue: curr });
  }

  return diffs;
}

function toDisplayValue(val: unknown): string | number | undefined {
  if (val == null) return undefined;
  if (typeof val === 'string' || typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  return JSON.stringify(val);
}

// ── Public API ──

/**
 * Compare two order snapshots. Handles new orders and field-level changes.
 */
export function diffOrders(
  previous: TeslaOrder[],
  current: TeslaOrder[],
): ChangeRecord[] {
  const changes: ChangeRecord[] = [];
  const now = Date.now();

  for (const order of current) {
    const prev = previous.find(
      (o) => o.referenceNumber === order.referenceNumber,
    );

    if (!prev) {
      changes.push({
        timestamp: now,
        referenceNumber: order.referenceNumber,
        field: 'newOrder',
        oldValue: undefined,
        newValue: order.modelCode,
      });
      continue;
    }

    // Deep diff the order object
    const diffs = deepDiff(prev, order);
    for (const diff of diffs) {
      const field = PATH_LABELS[diff.path] ?? diff.path;
      changes.push({
        timestamp: now,
        referenceNumber: order.referenceNumber,
        field,
        oldValue: toDisplayValue(diff.oldValue),
        newValue: toDisplayValue(diff.newValue),
      });
    }
  }

  return changes;
}

/**
 * Compare two Tasks API response snapshots (deep diff).
 */
export function diffTaskDetails(
  referenceNumber: string,
  previous: TasksResponse | undefined,
  current: TasksResponse,
): ChangeRecord[] {
  if (!previous) return [];

  const now = Date.now();
  const diffs = deepDiff(previous, current);
  const changes: ChangeRecord[] = [];

  for (const diff of diffs) {
    const field = PATH_LABELS[diff.path] ?? diff.path;
    changes.push({
      timestamp: now,
      referenceNumber,
      field,
      oldValue: toDisplayValue(diff.oldValue),
      newValue: toDisplayValue(diff.newValue),
    });
  }

  return changes;
}
