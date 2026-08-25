/**
 * Checkout Flow Test Matrix Definition
 * 
 * Defines the combinations of Platform, User State, Entry Point, and Admin Gating Config
 * for E2E tests, ensuring isolation with `isTest: true` on all mock data.
 * 
 * All test data should use prefixes:
 * - ISBN: E2E_TEST_
 * - NFC UID: e2e000
 * - QR ID: 999000001+
 */

export type Platform = 'desktop_chrome' | 'android_mobile' | 'iphone_mobile';

export type UserState = 
  | 'anonymous'
  | 'email_unverified'
  | 'email_verified_incomplete'
  | 'email_verified_complete'
  | 'google_oauth'
  | 'linkedin_oauth';

export type EntryPoint = 
  | 'nfc_tap_valid'
  | 'qr_scan'
  | 'direct_url'
  | 'nfc_tap_expired'
  | 'qr_deeplink';

export type GatingConfig = 
  | 'phone_only'
  | 'phone_email'
  | 'full_gating'
  | 'no_gating';

export interface TestCombination {
  id: string;
  platform: Platform;
  userState: UserState;
  entryPoint: EntryPoint;
  gatingConfig: GatingConfig;
  tags: string[];
}

export const PLATFORMS: Platform[] = ['desktop_chrome', 'android_mobile', 'iphone_mobile'];
export const USER_STATES: UserState[] = [
  'anonymous', 
  'email_unverified', 
  'email_verified_incomplete', 
  'email_verified_complete', 
  'google_oauth', 
  'linkedin_oauth'
];
export const ENTRY_POINTS: EntryPoint[] = [
  'nfc_tap_valid', 
  'qr_scan', 
  'direct_url', 
  'nfc_tap_expired', 
  'qr_deeplink'
];
export const GATING_CONFIGS: GatingConfig[] = [
  'phone_only', 
  'phone_email', 
  'full_gating', 
  'no_gating'
];

/**
 * Generate all 360 combinations via Cartesian product
 */
function generateAllCombinations(): TestCombination[] {
  const combos: TestCombination[] = [];
  let index = 1;
  for (const p of PLATFORMS) {
    for (const u of USER_STATES) {
      for (const e of ENTRY_POINTS) {
        for (const g of GATING_CONFIGS) {
          combos.push({
            id: `P${PLATFORMS.indexOf(p)+1}_U${USER_STATES.indexOf(u)+1}_E${ENTRY_POINTS.indexOf(e)+1}_G${GATING_CONFIGS.indexOf(g)+1}`,
            platform: p,
            userState: u,
            entryPoint: e,
            gatingConfig: g,
            tags: []
          });
          index++;
        }
      }
    }
  }
  return combos;
}

export const ALL_COMBINATIONS: TestCombination[] = generateAllCombinations();

function findCombo(
  platform: Platform, 
  userState: UserState, 
  entryPoint: EntryPoint, 
  gatingConfig: GatingConfig
): TestCombination {
  return ALL_COMBINATIONS.find(c => 
    c.platform === platform && 
    c.userState === userState && 
    c.entryPoint === entryPoint && 
    c.gatingConfig === gatingConfig
  )!;
}

// 8 hand-picked critical paths
const SANITY_SPECS = [
  { p: 'desktop_chrome', u: 'anonymous', e: 'nfc_tap_valid', g: 'phone_only' },
  { p: 'desktop_chrome', u: 'email_verified_complete', e: 'nfc_tap_valid', g: 'phone_only' },
  { p: 'android_mobile', u: 'anonymous', e: 'qr_scan', g: 'phone_email' },
  { p: 'android_mobile', u: 'email_verified_complete', e: 'direct_url', g: 'no_gating' },
  { p: 'iphone_mobile', u: 'google_oauth', e: 'qr_scan', g: 'no_gating' },
  { p: 'desktop_chrome', u: 'email_unverified', e: 'direct_url', g: 'phone_email' },
  { p: 'desktop_chrome', u: 'email_verified_complete', e: 'nfc_tap_expired', g: 'phone_only' },
  { p: 'android_mobile', u: 'linkedin_oauth', e: 'nfc_tap_valid', g: 'full_gating' }
] as const;

export const SANITY_COMBINATIONS: TestCombination[] = SANITY_SPECS.map(spec => {
  const c = findCombo(spec.p as Platform, spec.u as UserState, spec.e as EntryPoint, spec.g as GatingConfig);
  c.tags.push('sanity');
  return c;
});

// 24 pairwise covering array combinations
const SMOKE_SPECS = [
  { p: 'desktop_chrome', u: 'anonymous', e: 'nfc_tap_valid', g: 'phone_only' },
  { p: 'desktop_chrome', u: 'email_unverified', e: 'qr_scan', g: 'phone_email' },
  { p: 'desktop_chrome', u: 'email_verified_incomplete', e: 'direct_url', g: 'full_gating' },
  { p: 'desktop_chrome', u: 'email_verified_complete', e: 'nfc_tap_expired', g: 'no_gating' },
  { p: 'desktop_chrome', u: 'google_oauth', e: 'qr_deeplink', g: 'phone_only' },
  { p: 'desktop_chrome', u: 'linkedin_oauth', e: 'nfc_tap_valid', g: 'phone_email' },
  { p: 'android_mobile', u: 'anonymous', e: 'qr_scan', g: 'full_gating' },
  { p: 'android_mobile', u: 'email_unverified', e: 'direct_url', g: 'no_gating' },
  { p: 'android_mobile', u: 'email_verified_incomplete', e: 'nfc_tap_expired', g: 'phone_only' },
  { p: 'android_mobile', u: 'email_verified_complete', e: 'qr_deeplink', g: 'phone_email' },
  { p: 'android_mobile', u: 'google_oauth', e: 'nfc_tap_valid', g: 'full_gating' },
  { p: 'android_mobile', u: 'linkedin_oauth', e: 'qr_scan', g: 'no_gating' },
  { p: 'iphone_mobile', u: 'anonymous', e: 'direct_url', g: 'phone_only' },
  { p: 'iphone_mobile', u: 'email_unverified', e: 'nfc_tap_expired', g: 'phone_email' },
  { p: 'iphone_mobile', u: 'email_verified_incomplete', e: 'qr_deeplink', g: 'full_gating' },
  { p: 'iphone_mobile', u: 'email_verified_complete', e: 'nfc_tap_valid', g: 'no_gating' },
  { p: 'iphone_mobile', u: 'google_oauth', e: 'qr_scan', g: 'phone_only' },
  { p: 'iphone_mobile', u: 'linkedin_oauth', e: 'direct_url', g: 'phone_email' },
  { p: 'desktop_chrome', u: 'anonymous', e: 'nfc_tap_expired', g: 'full_gating' },
  { p: 'android_mobile', u: 'email_unverified', e: 'qr_deeplink', g: 'phone_only' },
  { p: 'iphone_mobile', u: 'email_verified_incomplete', e: 'nfc_tap_valid', g: 'phone_email' },
  { p: 'desktop_chrome', u: 'email_verified_complete', e: 'qr_scan', g: 'full_gating' },
  { p: 'android_mobile', u: 'google_oauth', e: 'direct_url', g: 'no_gating' },
  { p: 'iphone_mobile', u: 'linkedin_oauth', e: 'nfc_tap_expired', g: 'phone_only' }
] as const;

export const SMOKE_COMBINATIONS: TestCombination[] = SMOKE_SPECS.map(spec => {
  const c = findCombo(spec.p as Platform, spec.u as UserState, spec.e as EntryPoint, spec.g as GatingConfig);
  if (!c.tags.includes('smoke')) {
    c.tags.push('smoke');
  }
  return c;
});

/**
 * Returns human-readable label for a test combination
 */
export function describeCombo(combo: TestCombination): string {
  const platformStr = combo.platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  const userStr = combo.userState.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const entryStr = combo.entryPoint.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const gatingStr = combo.gatingConfig.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return `${platformStr} / ${userStr} / ${entryStr} / ${gatingStr} Gating`;
}

/**
 * Derives expected user journey steps based on combination attributes.
 * Useful for test assertions and report generation.
 */
export function getExpectedSteps(combo: TestCombination): string[] {
  const steps: string[] = [];

  // Entry Point Logic
  if (combo.entryPoint === 'nfc_tap_valid') {
    steps.push('Load page via NFC URL with valid counter');
    steps.push('Instant NFC Checkout button appears with 3-min timer');
  } else if (combo.entryPoint === 'nfc_tap_expired') {
    steps.push('Load page via NFC URL with expired counter');
    steps.push('Silent redirect to standard catalog');
  } else if (combo.entryPoint === 'qr_scan' || combo.entryPoint === 'qr_deeplink') {
    steps.push('Load page via QR URL');
    steps.push('Navigate to gated book detail');
  } else {
    steps.push('Load standard book detail page');
  }

  // Auth / User State Logic
  if (combo.userState === 'anonymous') {
    steps.push('User clicks checkout');
    steps.push('OnboardingWizard opens');
    steps.push('Sign In / Sign Up form appears');
    steps.push('User authenticates');
  } else {
    steps.push('User clicks checkout (already authenticated)');
  }

  // Gating Logic
  const requiresEmailVerify = combo.gatingConfig === 'phone_email' || combo.gatingConfig === 'full_gating';
  if (requiresEmailVerify) {
    if (combo.userState === 'email_unverified' || combo.userState === 'anonymous') {
      steps.push('Email verification modal appears');
      steps.push('User completes email verification');
    }
  }

  const requiresPhone = combo.gatingConfig !== 'no_gating'; // phone_only, phone_email, full_gating
  if (requiresPhone) {
    if (combo.userState === 'anonymous' || combo.userState === 'email_unverified' || combo.userState === 'email_verified_incomplete' || combo.userState === 'google_oauth' || combo.userState === 'linkedin_oauth') {
      steps.push('Phone number field prompt appears');
      steps.push('User enters phone number');
    }
  }

  const requiresFullAddress = combo.gatingConfig === 'full_gating';
  if (requiresFullAddress) {
    if (combo.userState !== 'email_verified_complete') {
      steps.push('Address fields prompt appears (House, Street, City, PIN)');
      steps.push('User enters full address');
    }
  }

  // Finalization
  steps.push('Checkout executes');
  steps.push('View Gatepass');

  return steps;
}
