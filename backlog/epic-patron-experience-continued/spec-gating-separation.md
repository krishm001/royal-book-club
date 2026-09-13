# Epic: Patron Experience Continued - Gating Separation

## 1. Context
Currently, the onboarding flow checks global gating fields (like `phoneMandatory`, `houseNoMandatory`, etc.) universally across all actions. The admin console mixes checkout and content gating settings in a single page.
This sub-epic separates the gating rules for physical checkout vs. content generation (writing blogs, reviews, testimonials).

## 2. Scope & Features

### Feature 1: Admin Console Refactor
- **Curator Settings Page**: Remove content gating fields (e.g., `enforceEmailVerificationForContent`, `autoModerateBlogs`).
- **Content Moderation Console**: Add a new "Gating Rules" tab. Move content-specific rules here and introduce 5 new toggles:
  - `phoneMandatoryForContent`
  - `houseNoMandatoryForContent`
  - `streetMandatoryForContent`
  - `cityMandatoryForContent`
  - `pinCodeMandatoryForContent`

### Feature 2: Backend Model Update
- **`CheckoutSettings.java`**: Add the 5 new boolean fields representing content-specific gating constraints.
- **`CheckoutSettingsService.java`**: Map these 5 fields in both fetch (defaults to `false`) and save logic.

### Feature 3: Context-Aware Onboarding (Dynamic Completion)
- **`OnboardingWizard.jsx`**:
  - Dynamically compute required fields (`phone`, `houseNo`, `street`, `city`, `pinCode`) based on `target.actionType`.
  - If `actionType === 'content'`, only the `ForContent` toggles are checked.
  - If a user triggers a content action and satisfies all content-specific rules, the wizard instantly completes (even if they lack fields required for checkout).
  - If the same user later triggers a checkout action, the wizard re-evaluates the checkout-specific rules and re-opens the popup to collect the missing information (e.g., phone number).
