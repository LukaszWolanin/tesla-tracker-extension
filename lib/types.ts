// ── Tesla API Response Types ──

export interface TeslaOrder {
  vehicleMapId?: number;
  referenceNumber: string;
  orderStatus: OrderStatus;
  orderSubstatus?: string;
  modelCode: string;
  vin?: string;
  year?: number;
  countryCode: string;
  locale?: string;
  imageUrl?: string;
  mktOptions?: string;
  isFoundersSeries?: boolean;
  isDeliveredOrPostDelivered?: boolean;
  isPaymentPending?: boolean;
  isB2b?: boolean;
  isUsed?: boolean;
  esignStatus?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'BOOKED'
  | 'IN_PRODUCTION'
  | 'IN_TRANSIT'
  | 'READY FOR APPOINTMENT'
  | 'DELIVERED';

export interface TasksResponse {
  tasks: {
    deliveryDetails?: {
      pickUpZipCode?: string;
      customerType?: string;
      orderContact?: string;
    };
    registration?: {
      orderDetails?: OrderDetails;
      orderType?: string;
      currentStep?: string;
      regData?: {
        regDetails?: {
          missingDocuments?: string;
          currentStep?: string;
          nextStep?: string;
        };
      };
    };
    scheduling?: SchedulingData;
    financing?: { complete?: boolean };
    finalPayment?: {
      data?: PaymentData;
      complete?: boolean;
    };
    tradeIn?: { complete?: boolean };
  };
  activeTaskList?: TaskMilestone[];
  state?: string;
}

export interface OrderDetails {
  reservationDate?: string;
  bookedDate?: string;
  vehicleOdometer?: number;
  vehicleOdometerType?: 'MI' | 'KM';
  vehicleRoutingLocation?: string;
  routingCode?: string;
  mktOptions?: string;
  vin?: string;
  modelYear?: number;
  trimCode?: string;
}

export interface SchedulingData {
  deliveryWindowDisplay?: string;
  apptDateTimeAddressStr?: string;
  deliveryType?: string;
  selfSchedulingUrl?: string;
  isMoreThanTwoWeeks?: boolean;
  deliveryAppointmentDate?: string;
  modelCode?: string;
}

export interface PaymentData {
  etaToDeliveryCenter?: string;
  totalDue?: number;
}

export interface TaskMilestone {
  taskName: string;
  status: 'PENDING' | 'DONE';
  displayName?: string;
}

// ── Auth Types ──

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresAt: number;
}

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

// ── Storage Types ──

export interface EncryptedData {
  ciphertext: string;
  iv: string;
}

export interface StoredState {
  orders: TeslaOrder[];
  taskDetails: Record<string, TasksResponse>;
  lastChecked?: number;
  changeHistory: ChangeRecord[];
}

export interface ChangeRecord {
  timestamp: number;
  referenceNumber: string;
  field: string;
  oldValue: string | number | undefined;
  newValue: string | number | undefined;
}

export interface UserSettings {
  pollIntervalMinutes: number;
  notifyOnStatusChange: boolean;
  notifyOnVinAssigned: boolean;
  notifyOnDeliveryWindow: boolean;
  notifyOnMilestone: boolean;
  region: TeslaRegion;
  deviceLanguage: string;
  deviceCountry: string;
}

export type TeslaRegion = 'na' | 'eu' | 'cn';

// ── Messages between extension parts ──

export type ExtensionMessage =
  | { type: 'TOKEN_FOUND'; accessToken: string; refreshToken?: string }
  | { type: 'AUTH_CODE_FOUND'; code: string; codeVerifier: string }
  | { type: 'GET_STATUS' }
  | { type: 'FORCE_CHECK' }
  | { type: 'TRY_REFRESH' }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'STATUS_UPDATE'; data: StoredState };
