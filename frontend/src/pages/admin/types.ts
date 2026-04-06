import type { RideRequest } from '../../api/client';

export interface LocationGroup {
  locationId: number;
  locationName: string;
  rides: DashboardRideRequest[];
  totalPax: number;
  hasTimedOut: boolean;
  isFull: boolean;
}

export type DashboardRideRequest = RideRequest & { driverDeniedCount?: number };

/** Badge colours for every possible ride status */
export const STATUS_BADGE: Record<string, string> = {
  PENDING:    'bg-gray-700 text-gray-300',
  OFFERED:    'bg-orange-900 text-orange-200',
  ACCEPTED:   'bg-blue-900 text-blue-200',
  IN_TRANSIT: 'bg-yellow-900 text-yellow-200',
  ARRIVED:    'bg-teal-900 text-teal-200',
  COMPLETED:  'bg-green-900 text-green-200',
  CANCELLED:  'bg-red-900 text-red-200',
};

export const DEFAULT_CAB_CAPACITY = 4;

