/**
 * Build Tesla configurator compositor URL from option codes.
 */
export function buildVehicleImageUrl(
  modelCode: string,
  mktOptions?: string,
  view: 'FRONT34' | 'REAR34' | 'SIDE' | 'STUD_FRONT34' = 'STUD_FRONT34',
  size = 800,
): string {
  const model = modelCode.toLowerCase().replace(/^mt/, '').substring(0, 2);
  const opts = mktOptions
    ? mktOptions
        .split(',')
        .map((c) => `$${c.trim()}`)
        .join(',')
    : '';

  return `https://static-assets.tesla.com/configurator/compositor?context=design_studio_2&options=${opts}&view=${view}&model=${model}&size=${size}&bkba_opt=2&crop=0,0,0,0&`;
}

export function decodeModelCode(code: string): string {
  const upper = code.toUpperCase();
  const models: Record<string, string> = {
    MS: 'Model S',
    M3: 'Model 3',
    MX: 'Model X',
    MY: 'Model Y',
    CT: 'Cybertruck',
    MDLS: 'Model S',
    MDL3: 'Model 3',
    MDLX: 'Model X',
    MDLY: 'Model Y',
    MTY70: 'Model Y LR AWD',
    MTY60: 'Model Y SR RWD',
    MTY62: 'Model Y Long Range AWD',
    MTY7L: 'Model Y LR AWD',
    MTS10: 'Model S',
    MTS12: 'Model S Plaid',
    MTX10: 'Model X',
    MTX12: 'Model X Plaid',
    MT314: 'Model 3 LR AWD',
    MT310: 'Model 3 RWD',
    MT336: 'Model 3 Performance',
  };
  return models[upper] ?? `Tesla ${code}`;
}

export function decodeChangeField(field: string): string {
  const labels: Record<string, string> = {
    orderStatus: 'Status zamówienia',
    vinAssigned: 'Przypisano VIN',
    esignStatus: 'Status e-podpisu',
    deliveryWindow: 'Okno dostawy',
    deliveryAppointment: 'Termin odbioru',
    deliveryType: 'Typ dostawy',
    deliveryDate: 'Data dostawy',
    vehicleOdometer: 'Przebieg',
    vehicleRoutingLocation: 'Lokalizacja pojazdu',
    reservationDate: 'Data rezerwacji',
    bookedDate: 'Data zamówienia',
    registrationStep: 'Etap rejestracji',
    regCurrentStep: 'Krok rejestracji',
    orderType: 'Typ zamówienia',
    missingDocuments: 'Brakujące dokumenty',
    etaToCenter: 'ETA do centrum',
    totalDue: 'Kwota do zapłaty',
    paymentComplete: 'Płatność zakończona',
    financingComplete: 'Finansowanie zakończone',
    tradeInComplete: 'Trade-in zakończony',
    pickUpZipCode: 'Kod pocztowy odbioru',
    mktOptions: 'Konfiguracja',
    newOrder: 'Nowe zamówienie',
  };
  if (field.startsWith('milestone:'))
    return field.replace('milestone:', '');
  // For raw dot-paths from deep diff, show last segment
  if (field.includes('.')) {
    const last = field.split('.').pop()!;
    return labels[last] ?? last;
  }
  return labels[field] ?? field;
}

export function decodeChangeValue(
  field: string,
  value: string | number | undefined,
): string {
  if (value == null) return '';
  if (field === 'newOrder') return decodeModelCode(String(value));
  return String(value);
}

// ── Option Code Database ──

export const OPTION_CODES: Record<string, string> = {
  // Autopilot / FSD
  APBS: 'Autopilot',
  APF2: 'Full Self-Driving',
  APH4: 'Enhanced Autopilot',

  // Exterior Colors
  PBSB: 'Solid Black',
  PBCW: 'Pearl White Multi-Coat',
  PMNG: 'Midnight Silver Metallic',
  PPMR: 'Ultra Red',
  PPSB: 'Ultra Blue',
  PPSR: 'Quicksilver',
  PPSW: 'Pearl White',
  PR00: 'Red Multi-Coat',
  PR01: 'Paint',
  PN00: 'Midnight Cherry Red',
  PN01: 'Stealth Grey',
  PBT1: 'Ultra White',

  // Interior
  IPB8: 'All Black Premium',
  IPB10: 'Black Interior',
  IPW10: 'White Interior',
  ICY01: 'Cream Interior',
  IBE00: 'Black & White Interior',

  // Wheels
  WY18B: '18" Aero Wheels',
  WY19B: '19" Gemini Wheels',
  WY19P: '19" Crossflow Wheels',
  WY20P: '20" Induction Wheels',
  WY21A: '21" Uberturbine Wheels',
  W38B: '18" Aero Wheels',
  W39B: '19" Sport Wheels',
  W41B: '19" Gemini Wheels',
  WWY06: 'Winter Wheel Pack Pirelli 19"',

  // Drivetrain / Trim
  MTY62: 'Long Range AWD',
  MTY70: 'Long Range AWD',
  MTY60: 'Standard Range RWD',
  MTY7L: 'Long Range AWD',
  MT314: 'Model 3 Long Range AWD',
  MT310: 'Model 3 RWD',
  MT336: 'Model 3 Performance',
  MTS10: 'Dual Motor',
  MTS12: 'Plaid',
  MTX10: 'Dual Motor',
  MTX12: 'Plaid',
  STY5S: '5-Seat Interior',
  STY7S: '7-Seat Interior',

  // Model
  MDLY: 'Model Y',
  MDL3: 'Model 3',
  MDLS: 'Model S',
  MDLX: 'Model X',

  // Features
  SC04: 'Supercharging Enabled',
  SC05: 'Supercharging Enabled',
  TW01: 'Tow Hitch',
  CPF0: 'Content Package',
  CPF2: 'Premium Connectivity',
  DRLH: 'Left-Hand Drive',
  DRRH: 'Right-Hand Drive',
};

// Categories for grouping decoded options
const CATEGORY_PREFIXES: [string, string][] = [
  ['AP', 'Autopilot'],
  ['P', 'Color'],
  ['IP', 'Interior'],
  ['IB', 'Interior'],
  ['IC', 'Interior'],
  ['WY', 'Wheels'],
  ['W3', 'Wheels'],
  ['W4', 'Wheels'],
  ['WW', 'Wheels'],
  ['MT', 'Drivetrain'],
  ['ST', 'Seating'],
  ['SC', 'Charging'],
  ['TW', 'Towing'],
  ['CP', 'Package'],
  ['MD', 'Model'],
  ['DR', 'Drive'],
];

function categorizeOption(code: string): string {
  for (const [prefix, category] of CATEGORY_PREFIXES) {
    if (code.startsWith(prefix)) return category;
  }
  return 'Other';
}

export interface DecodedOption {
  code: string;
  label: string;
  category: string;
}

export function decodeOptions(mktOptions: string): DecodedOption[] {
  return mktOptions
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((code) => ({
      code,
      label: OPTION_CODES[code] ?? code,
      category: categorizeOption(code),
    }));
}

/**
 * Extract the most important specs from option codes for summary display.
 */
export function extractKeySpecs(mktOptions: string): string[] {
  const opts = decodeOptions(mktOptions);
  const specs: string[] = [];

  // Drivetrain
  const trim = opts.find((o) => o.category === 'Drivetrain');
  if (trim && OPTION_CODES[trim.code]) specs.push(OPTION_CODES[trim.code]);

  // Color
  const color = opts.find((o) => o.category === 'Color');
  if (color && OPTION_CODES[color.code]) specs.push(OPTION_CODES[color.code]);

  // Interior
  const interior = opts.find((o) => o.category === 'Interior');
  if (interior && OPTION_CODES[interior.code]) specs.push(OPTION_CODES[interior.code]);

  // Wheels
  const wheels = opts.find((o) => o.category === 'Wheels');
  if (wheels && OPTION_CODES[wheels.code]) specs.push(OPTION_CODES[wheels.code]);

  // Autopilot
  const ap = opts.find((o) => o.category === 'Autopilot');
  if (ap && OPTION_CODES[ap.code]) specs.push(OPTION_CODES[ap.code]);

  return specs;
}
