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
  notifications: 'Powiadomienia',
  notifyStatusChanges: 'Zmiany statusu',
  notifyVinAssigned: 'Przypisanie VIN',
  notifyDeliveryWindow: 'Aktualizacje okna dostawy',
  notifyMilestones: 'Kamienie milowe',
  saveSettings: 'Zapisz',
  saved: 'Zapisano!',
} as const;

export type TranslationKey = keyof typeof pl;
export const t = pl;
