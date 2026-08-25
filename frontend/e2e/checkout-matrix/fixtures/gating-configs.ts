/**
 * Gating configuration presets for E2E testing.
 */

export interface GatingConfigPreset {
  phoneMandatory: boolean;
  houseNoMandatory: boolean;
  streetMandatory: boolean;
  cityMandatory: boolean;
  pinCodeMandatory: boolean;
  enforceEmailVerification: boolean;
}

export const GATING_PHONE_ONLY: GatingConfigPreset = {
  phoneMandatory: true,
  houseNoMandatory: false,
  streetMandatory: false,
  cityMandatory: false,
  pinCodeMandatory: false,
  enforceEmailVerification: false,
};

export const GATING_PHONE_EMAIL: GatingConfigPreset = {
  phoneMandatory: true,
  houseNoMandatory: false,
  streetMandatory: false,
  cityMandatory: false,
  pinCodeMandatory: false,
  enforceEmailVerification: true,
};

export const GATING_FULL: GatingConfigPreset = {
  phoneMandatory: true,
  houseNoMandatory: true,
  streetMandatory: true,
  cityMandatory: true,
  pinCodeMandatory: true,
  enforceEmailVerification: true,
};

export const GATING_NONE: GatingConfigPreset = {
  phoneMandatory: false,
  houseNoMandatory: false,
  streetMandatory: false,
  cityMandatory: false,
  pinCodeMandatory: false,
  enforceEmailVerification: false,
};

export function getGatingPreset(configId: string): GatingConfigPreset {
  switch (configId) {
    case 'phone_only':
      return GATING_PHONE_ONLY;
    case 'phone_email':
      return GATING_PHONE_EMAIL;
    case 'full_gating':
      return GATING_FULL;
    case 'no_gating':
      return GATING_NONE;
    default:
      throw new Error(`Unknown gating config ID: ${configId}`);
  }
}

export function getGatingLabel(configId: string): string {
  switch (configId) {
    case 'phone_only':
      return 'Phone Only';
    case 'phone_email':
      return 'Phone + Email Verification';
    case 'full_gating':
      return 'Full Gating (All Fields + Email)';
    case 'no_gating':
      return 'No Gating (Anonymous Allowed)';
    default:
      return 'Unknown Gating';
  }
}
