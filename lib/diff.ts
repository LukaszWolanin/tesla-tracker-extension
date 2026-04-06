import type { TeslaOrder, TasksResponse, ChangeRecord } from './types';

/**
 * Compare two snapshots of orders and detect meaningful changes.
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

    if (prev.orderStatus !== order.orderStatus) {
      changes.push({
        timestamp: now,
        referenceNumber: order.referenceNumber,
        field: 'orderStatus',
        oldValue: prev.orderStatus,
        newValue: order.orderStatus,
      });
    }

    if (!prev.vin && order.vin) {
      changes.push({
        timestamp: now,
        referenceNumber: order.referenceNumber,
        field: 'vinAssigned',
        oldValue: undefined,
        newValue: order.vin,
      });
    }

    if (prev.esignStatus !== order.esignStatus) {
      changes.push({
        timestamp: now,
        referenceNumber: order.referenceNumber,
        field: 'esignStatus',
        oldValue: prev.esignStatus,
        newValue: order.esignStatus,
      });
    }
  }

  return changes;
}

/**
 * Compare two task detail snapshots for a single order.
 */
export function diffTaskDetails(
  referenceNumber: string,
  previous: TasksResponse | undefined,
  current: TasksResponse,
): ChangeRecord[] {
  const changes: ChangeRecord[] = [];
  const now = Date.now();

  if (!previous) return changes;

  const prevDetails = previous.tasks?.registration?.orderDetails;
  const currDetails = current.tasks?.registration?.orderDetails;

  // Delivery window change
  const prevWindow = previous.tasks?.scheduling?.deliveryWindowDisplay;
  const currWindow = current.tasks?.scheduling?.deliveryWindowDisplay;
  if (prevWindow !== currWindow && currWindow) {
    changes.push({
      timestamp: now,
      referenceNumber,
      field: 'deliveryWindow',
      oldValue: prevWindow,
      newValue: currWindow,
    });
  }

  // Odometer change
  if (
    prevDetails?.vehicleOdometer !== currDetails?.vehicleOdometer &&
    currDetails?.vehicleOdometer !== undefined
  ) {
    changes.push({
      timestamp: now,
      referenceNumber,
      field: 'vehicleOdometer',
      oldValue: prevDetails?.vehicleOdometer,
      newValue: currDetails?.vehicleOdometer,
    });
  }

  // Routing location change
  if (
    prevDetails?.vehicleRoutingLocation !==
      currDetails?.vehicleRoutingLocation &&
    currDetails?.vehicleRoutingLocation
  ) {
    changes.push({
      timestamp: now,
      referenceNumber,
      field: 'vehicleRoutingLocation',
      oldValue: prevDetails?.vehicleRoutingLocation,
      newValue: currDetails?.vehicleRoutingLocation,
    });
  }

  // Milestone changes
  const prevMilestones = previous.activeTaskList ?? [];
  const currMilestones = current.activeTaskList ?? [];
  for (const milestone of currMilestones) {
    const prevMilestone = prevMilestones.find(
      (m) => m.taskName === milestone.taskName,
    );
    if (prevMilestone?.status !== milestone.status) {
      changes.push({
        timestamp: now,
        referenceNumber,
        field: `milestone:${milestone.taskName}`,
        oldValue: prevMilestone?.status,
        newValue: milestone.status,
      });
    }
  }

  return changes;
}
