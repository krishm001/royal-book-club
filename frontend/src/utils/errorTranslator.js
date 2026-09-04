/**
 * errorTranslator.js
 *
 * Centralized utility that converts raw technical/backend error messages
 * into user-friendly language for all checkout and return flows.
 *
 * Usage:
 *   import { translateCheckoutError } from '../../utils/errorTranslator';
 *   const friendlyMsg = translateCheckoutError(rawErrorString);
 */

/**
 * Error pattern → friendly message mapping.
 * Patterns are tested in order — first match wins.
 */
const ERROR_PATTERNS = [
  // Firestore transaction ordering constraint (concurrent checkout race condition)
  {
    patterns: [
      /firestore.*transaction.*requires.*reads.*before.*writes/i,
      /transaction.*all reads.*before.*all writes/i,
      /reads.*before.*writes/i,
    ],
    message:
      'This book was just checked out by another member. Please try a different copy or check back later.',
  },

  // Security / book mismatch (wrong QR or NFC scanned)
  {
    patterns: [
      /security\s*mismatch/i,
      /does not match.*isbn/i,
      /does not match.*registered/i,
      /scanned.*does not match/i,
      /not match.*book/i,
      /wrong\s*book/i,
    ],
    message:
      "The scanned code doesn't match the selected book. Please ensure you're scanning the correct book's QR code or NFC tag.",
  },

  // Already checked out / no available copies
  {
    patterns: [
      /already checked out/i,
      /no available copies/i,
      /all copies.*checked out/i,
      /unavailable/i,
      /no copies available/i,
    ],
    message:
      'Sorry, all copies of this book are currently checked out. Please check back later.',
  },

  // Not checked out by this user / book already returned
  {
    patterns: [
      /not currently checked out/i,
      /already returned/i,
      /not in your.*study/i,
      /you have not checked out/i,
    ],
    message:
      'This book is not currently in your study. It may have already been returned.',
  },

  // Geofence / location outside library
  {
    patterns: [
      /geofence/i,
      /outside.*library/i,
      /location.*outside/i,
      /coordinate.*outside/i,
      /outside.*boundary/i,
      /location.*required/i,
      /return.*location/i,
    ],
    message:
      'You appear to be outside the library. Please return to the library to complete this return, or use the manual return option.',
  },

  // Email verification required
  {
    patterns: [
      /email.*verif/i,
      /verification.*gating/i,
      /unverified.*email/i,
      /verify.*email/i,
      /sovereign.*verification.*gating/i,
    ],
    message:
      'Please verify your email address before checking out books. Check your inbox for the verification link.',
  },

  // Profile / consent required
  {
    patterns: [
      /profile.*required/i,
      /consent.*required/i,
      /complete.*profile/i,
      /profile.*incomplete/i,
      /missing.*profile/i,
      /phone.*required/i,
      /address.*required/i,
    ],
    message:
      'Please complete your profile setup before checking out books. Visit your profile page to add the required details.',
  },

  // Network / connectivity errors
  {
    patterns: [
      /network\s*error/i,
      /timeout/i,
      /econnrefused/i,
      /failed to fetch/i,
      /unable to connect/i,
      /connection.*refused/i,
      /no internet/i,
    ],
    message:
      'Unable to connect to the server. Please check your internet connection and try again.',
  },

  // Checked out by another patron
  {
    patterns: [
      /checked out by another/i,
      /another patron/i,
      /another member/i,
      /borrowed by another/i,
    ],
    message:
      'This copy is currently checked out by another member. Please choose a different copy.',
  },

  // Permission denied (Firestore rules or auth)
  {
    patterns: [
      /permission.denied/i,
      /insufficient.permissions/i,
      /unauthorized/i,
      /403/,
      /access denied/i,
    ],
    message:
      'You do not have permission to perform this action. Please log in again and try.',
  },
];

/**
 * Translates a raw technical error string into a user-friendly message.
 *
 * @param {string|Error} rawError - Raw error message, Error object, or Axios error response.
 * @returns {string} User-friendly error message.
 */
export const translateCheckoutError = (rawError) => {
  // Extract the string from various error shapes
  let errorStr = '';
  if (!rawError) {
    return 'Something went wrong. Please try again or contact the library administrator.';
  }
  if (typeof rawError === 'string') {
    errorStr = rawError;
  } else if (rawError instanceof Error) {
    // Axios error: check response data first
    errorStr =
      rawError.response?.data?.message ||
      rawError.response?.data?.error ||
      rawError.message ||
      String(rawError);
  } else if (typeof rawError === 'object') {
    errorStr =
      rawError.message ||
      rawError.response?.data?.message ||
      JSON.stringify(rawError);
  } else {
    errorStr = String(rawError);
  }

  // Test each pattern in order
  for (const { patterns, message } of ERROR_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(errorStr)) {
        return message;
      }
    }
  }

  // Generic fallback
  return 'Something went wrong. Please try again or contact the library administrator.';
};

export default translateCheckoutError;
