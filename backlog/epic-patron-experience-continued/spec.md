# Epic: Patron Experience Continued
**Document Type:** Requirement Document / Detailed Specification
**Context:** User Generated Content (UGC) flows - specifically Blog (Chronicles), Debate participation, and Book Reviews.

## 1. Executive Summary
Currently, writing a blog, participating in a debate, or adding a book review either requires the user to be fully authenticated preemptively, or the UI simply hides/blocks the action with a generic message. To elevate the patron experience, we must provide a seamless, intent-driven onboarding flow (using our existing `OnboardingWizard`) when an anonymous user attempts to interact with any UGC element. Furthermore, content generation must be subject to its own admin-configurable gating rules (like Email Verification), similar to the existing checkout gating.

## 2. Scope & Features

### Feature 1: Seamless UGC Login & Consent Flow
- When an anonymous user attempts to "Write a Book Review", "Start a Chronicle", "Start a Debate", or "Reply to a Debate":
  - Instead of showing a static "Please login" prompt, the UI should intercept the action and call `triggerOnboarding({ actionType: 'content', ...context })`.
  - The `OnboardingWizard` will open, allowing the user to sign in or create an account on the spot.
  - The wizard **must enforce User Agreement acceptance** (Privacy / Terms). This is critical for UGC.
  - Upon successful onboarding, the `onboardingComplete` event will be dispatched, and the parent page will resume the user's intended action (e.g., open the review form or debate modal).

### Feature 2: Admin Content Gating Settings
- Add a new configurable setting in the Admin Console (Curator Settings): `enforceEmailVerificationForContent` (or similar).
- This setting ensures that if a user registered via Email/Password, they *must* verify their email address before they are allowed to submit UGC.
- **Backend Changes**: Update `CheckoutSettings` (or general System Settings) to store `enforceEmailVerificationForContent`.
- **Frontend Admin Changes**: Add a toggle in `CuratorSettingsPage.jsx` for "Require Verified Email for Content Generation".
- **OnboardingWizard Changes**: Update the `checkIsGated()` logic in the wizard to evaluate email verification based on the `target.actionType`. If `actionType` is 'content', evaluate against `enforceEmailVerificationForContent`. If 'checkout'/'return', evaluate against `enforceEmailVerification`.

## 3. Phased Implementation Plan

### Phase 1: Backend Settings Infrastructure
- Update `CheckoutSettings.java` model to include `enforceEmailVerificationForContent`.
- Update `CheckoutSettingsService.java` to persist and retrieve the new field.

### Phase 2: Admin Console Toggle
- Update `CuratorSettingsPage.jsx` to render the new setting toggle.
- Add corresponding translation strings in `en.js`, `hi.js`, `kn.js`.

### Phase 3: Onboarding Wizard Contextual Gating
- Update `OnboardingWizard.jsx` to respect the `actionType` ('content' vs 'checkout').
- Dynamically require email verification based on the appropriate backend setting and the user's intended action.

### Phase 4: Seamless UX Integration (The Interceptors)
- **Book Reviews (`BookDetailPage.jsx`)**: Replace the static login prompt with a "Write a Book Review" button that triggers the Onboarding Wizard. Listen for completion to reveal the review form.
- **Debates/Chronicles (`DiscoursesPage.jsx`)**: Modify the generic login buttons or form blocks for creating/replying to discourses to trigger the Onboarding Wizard. Listen for completion to execute the action.
