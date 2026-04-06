import { storage } from 'wxt/utils/storage';
import { STORAGE_KEYS } from './constants';

type Translations = typeof pl;

const pl = {
  // App
  appTitle: 'Śledzenie Dostawy',
  signOut: 'Wyloguj',
  checkNow: 'Sprawdź teraz',
  lastChecked: 'Sprawdzono',
  justNow: 'przed chwilą',
  minutesAgo: (n: number) => `${n} min temu`,
  noOrders: 'Brak zamówień',
  noOrdersHint:
    'Kliknij odśwież aby sprawdzić zamówienia lub upewnij się, że masz aktywne zamówienie Tesla.',

  // Login
  loginTitle: 'Śledzenie Dostawy',
  loginDescription:
    'Śledź status dostawy Twojej Tesli z powiadomieniami w czasie rzeczywistym.',
  signIn: 'Zaloguj przez Tesla',
  loginPrivacy:
    'Logowanie odbywa się bezpośrednio przez Tesla. Tokeny są szyfrowane i przechowywane lokalnie — nigdy nie trafiają do osób trzecich.',

  // Delivery Progress
  deliveryProgress: 'Postęp Dostawy',
  deliveryWindow: 'Okno Dostawy',
  appointment: 'Umówiony Termin',
  milestones: 'Kamienie Milowe',
  orderPlaced: 'Zamówienie Złożone',
  orderConfirmed: 'Zamówienie Potwierdzone',
  inProduction: 'W Produkcji',
  inTransit: 'W Transporcie',
  readyForPickup: 'Gotowe do Odbioru',
  delivered: 'Dostarczone',

  // Milestones
  'Sign Agreements': 'Podpisanie Umów',
  'Vehicle Exited Factory': 'Wyjazd z Fabryki',
  'Final Invoice Generation': 'Faktura Końcowa',
  'Complete Final Payment': 'Płatność Końcowa',
  'Vehicle Ready for Transport': 'Gotowe do Transportu',
  'Schedule Delivery': 'Umów Dostawę',

  // Vehicle Details
  vehicleDetails: 'Szczegóły Pojazdu',
  configuration: 'Konfiguracja',
  vin: 'VIN',
  factory: 'Fabryka',
  battery: 'Bateria',
  modelYear: 'Rok Modelowy',
  market: 'Rynek',
  locale: 'Język',
  deliveryCenter: 'Centrum Dostawy',
  odometer: 'Przebieg',
  booked: 'Rezerwacja',
  reserved: 'Data Rezerwacji',
  amountDue: 'Do Zapłaty',
  eSign: 'E-Podpis',
  eSignPending: 'Oczekuje',
  eSignCompleted: 'Podpisano',
  payment: 'Płatność',
  paymentPending: 'Oczekuje',
  subStatus: 'Pod-status',

  // Categories
  catDrivetrain: 'Napęd',
  catColor: 'Kolor',
  catInterior: 'Wnętrze',
  catWheels: 'Koła',
  catSeating: 'Miejsca',
  catAutopilot: 'Autopilot',
  catCharging: 'Ładowanie',
  catTowing: 'Hak',
  catPackage: 'Pakiet',
  catModel: 'Model',
  catDrive: 'Napęd',
  catOther: 'Inne',

  // Changes
  recentChanges: 'Ostatnie Zmiany',
  changeStatus: 'Status',
  changeVinAssigned: 'Przypisano VIN',
  changeEsignStatus: 'Status E-Podpisu',
  changeDeliveryWindow: 'Okno Dostawy',
  changeOdometer: 'Przebieg',
  changeDeliveryCenter: 'Centrum Dostawy',
  changeNewOrder: 'Nowe Zamówienie',

  // Status badges
  statusPending: 'Oczekuje',
  statusBooked: 'Potwierdzone',
  statusInProduction: 'Produkcja',
  statusInTransit: 'Transport',
  statusReady: 'Gotowe',
  statusDelivered: 'Dostarczone',

  // Options page
  settings: 'Ustawienia',
  checkInterval: 'Interwał sprawdzania (minuty)',
  everyMinutes: (n: number) =>
    `Co ${n} minut${n === 1 ? 'ę' : n < 5 ? 'y' : ''}`,
  teslaRegion: 'Region Tesla',
  regionNA: 'Ameryka Północna / APAC',
  regionEU: 'Europa / EMEA',
  regionCN: 'Chiny',
  language: 'Język',
  country: 'Kraj',
  langNote: 'Wpływa na język całej aplikacji i danych z API Tesli.',
  notifications: 'Powiadomienia',
  notifyStatusChanges: 'Zmiany statusu',
  notifyVinAssigned: 'Przypisanie VIN',
  notifyDeliveryWindow: 'Aktualizacje okna dostawy',
  notifyMilestones: 'Kamienie milowe',
  saveSettings: 'Zapisz',
  saved: 'Zapisano!',
} as const;

const en: Translations = {
  appTitle: 'Delivery Tracker',
  signOut: 'Sign Out',
  checkNow: 'Check now',
  lastChecked: 'Last checked',
  justNow: 'just now',
  minutesAgo: (n: number) => `${n}m ago`,
  noOrders: 'No orders found',
  noOrdersHint:
    'Click refresh to check for orders, or make sure you have an active Tesla order.',

  loginTitle: 'Delivery Tracker',
  loginDescription:
    'Track your Tesla delivery status with real-time notifications.',
  signIn: 'Sign in with Tesla',
  loginPrivacy:
    'Your credentials are handled directly by Tesla. Tokens are encrypted and stored locally — never sent to third parties.',

  deliveryProgress: 'Delivery Progress',
  deliveryWindow: 'Delivery Window',
  appointment: 'Appointment',
  milestones: 'Milestones',
  orderPlaced: 'Order Placed',
  orderConfirmed: 'Order Confirmed',
  inProduction: 'In Production',
  inTransit: 'In Transit',
  readyForPickup: 'Ready for Pickup',
  delivered: 'Delivered',

  'Sign Agreements': 'Sign Agreements',
  'Vehicle Exited Factory': 'Left Factory',
  'Final Invoice Generation': 'Invoice Generated',
  'Complete Final Payment': 'Payment Complete',
  'Vehicle Ready for Transport': 'Ready for Transport',
  'Schedule Delivery': 'Schedule Delivery',

  vehicleDetails: 'Vehicle Details',
  configuration: 'Configuration',
  vin: 'VIN',
  factory: 'Factory',
  battery: 'Battery',
  modelYear: 'Model Year',
  market: 'Market',
  locale: 'Locale',
  deliveryCenter: 'Delivery Center',
  odometer: 'Odometer',
  booked: 'Booked',
  reserved: 'Reserved',
  amountDue: 'Amount Due',
  eSign: 'E-Sign',
  eSignPending: 'Pending',
  eSignCompleted: 'Completed',
  payment: 'Payment',
  paymentPending: 'Pending',
  subStatus: 'Sub-status',

  catDrivetrain: 'Drivetrain',
  catColor: 'Color',
  catInterior: 'Interior',
  catWheels: 'Wheels',
  catSeating: 'Seating',
  catAutopilot: 'Autopilot',
  catCharging: 'Charging',
  catTowing: 'Towing',
  catPackage: 'Package',
  catModel: 'Model',
  catDrive: 'Drive',
  catOther: 'Other',

  recentChanges: 'Recent Changes',
  changeStatus: 'Status',
  changeVinAssigned: 'VIN Assigned',
  changeEsignStatus: 'E-Sign Status',
  changeDeliveryWindow: 'Delivery Window',
  changeOdometer: 'Odometer',
  changeDeliveryCenter: 'Delivery Center',
  changeNewOrder: 'New Order',

  statusPending: 'Pending',
  statusBooked: 'Booked',
  statusInProduction: 'In Production',
  statusInTransit: 'In Transit',
  statusReady: 'Ready',
  statusDelivered: 'Delivered',

  settings: 'Settings',
  checkInterval: 'Check interval (minutes)',
  everyMinutes: (n: number) =>
    `Every ${n} minute${n !== 1 ? 's' : ''}`,
  teslaRegion: 'Tesla Region',
  regionNA: 'North America / APAC',
  regionEU: 'Europe / EMEA',
  regionCN: 'China',
  language: 'Language',
  country: 'Country',
  langNote: 'Affects the entire app UI and Tesla API data language.',
  notifications: 'Notifications',
  notifyStatusChanges: 'Status changes',
  notifyVinAssigned: 'VIN assigned',
  notifyDeliveryWindow: 'Delivery window updates',
  notifyMilestones: 'Milestones',
  saveSettings: 'Save',
  saved: 'Saved!',
};

const translations: Record<string, Translations> = { pl, en };

// ── Active language ──

let currentLang: Translations = pl;

export function setLanguage(lang: string) {
  currentLang = translations[lang] ?? translations.en ?? pl;
}

export async function loadLanguage(): Promise<void> {
  const stored = await storage.getItem<{ deviceLanguage?: string }>(
    `local:${STORAGE_KEYS.settings}`,
  );
  setLanguage(stored?.deviceLanguage ?? 'pl');
}

// Proxy that always reads from currentLang
export const t: Translations = new Proxy(pl, {
  get(_target, prop: string) {
    return (currentLang as Record<string, unknown>)[prop];
  },
});
