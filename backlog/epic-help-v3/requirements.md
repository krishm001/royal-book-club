# Epic Help V3 — Requirements Specification

**Version**: 3.0  
**Epic**: Help Flow Overhaul — Complete Checkout & Return Journey Tracing  
**Status**: DRAFT  
**Last Updated**: 2026-09-20

---

## 1. Problem Statement

The current help guide (V2) presents checkout and return flows as loosely connected scenes but does not accurately trace every real branch from start to finish. Users face a confusing matrix of entry points (NFC tap, QR scan, top scanner, book card, book detail, direct URL), user states (anonymous, unverified, incomplete, complete, OAuth), and gating configs. The help must become a **complete, branch-aware, visually guided journey** that shows the user exactly what they will see on their phone at every step.

---

## 2. Goals

1. **Trace every checkout & return path** from physical library entry to gatepass/completion, accurately matching the real app behavior.
2. **Branch-and-merge architecture**: Show the default quickest path prominently, with clearly marked deviation branches for alternative paths that merge back into common stages.
3. **3 Mega-Stage structure**: Getting Ready → Sign In & Profile Setup → Execute Checkout/Return.
4. **Real screenshots only** — no imagined mockups. Capture additional missing screenshots via Playwright.
5. **Printable A4 banners** — one per mega-stage, with child banners for sub-paths.
6. **Fix contrast/visibility bugs** across all themes.
7. **Compress header** — maximize content area, minimize wasted space.

---

## 3. Flow Architecture

### 3.1 Entry Points (How users arrive at a checkout/return action)

| # | Entry Point | Physical Action | Lands On | Button Shown | Bypasses Scanner? |
|---|---|---|---|---|---|
| A | **NFC Tap (Outside Website)** | Phone tapped on book NFC chip | Book Detail | **Instant NFC Checkout/Return** (3-min timer) | ✅ Yes |
| B | **QR Scan (Outside Website)** | Camera scans back-cover QR sticker | Book Detail | Standard Checkout/Return | ❌ Opens Scanner Modal |
| C | **Top Scanner (In Website)** | Clicks top scanner button on Study tab | Scanner Modal → P2D Confirmation Popup | 3 buttons: Cancel / Detail / Checkout | ❌ Scanner first, then Confirmation |
| D | **Book Card (In Website)** | Clicks checkout icon on a book card | Scanner Modal | Standard (book-specific) | ❌ Opens Scanner Modal |
| E | **Book Detail (In Website)** | Browses to detail page, clicks checkout | Scanner Modal | Standard Checkout/Return | ❌ Opens Scanner Modal |

> **Key Insight**: Paths A and B do NOT require the website to be open first. Path A is the **shortest recommended path** (works on both iPhone and Android from lock screen). Path C has a unique intermediate confirmation popup (P2D) not present in D/E.

### 3.2 User State Branching (After clicking checkout/return)

| # | User State | What Happens |
|---|---|---|
| 1 | **Anonymous / New** | OnboardingWizard opens → Sign Up (Google ★recommended / LinkedIn / Email) → Verify Email → Accept T&C → Fill Phone + Optional Address → Complete |
| 2 | **Signed up but not logged in / Incomplete** | OnboardingWizard opens → Sign In (Google / LinkedIn / Email+Password) → *If prompted*: complete missing gating fields (phone, email verify) → Complete |
| 3 | **Logged in + Complete profile** | Bypassed entirely → Checkout/Return executes immediately |

### 3.3 The 3 Mega-Stages

```
MEGA-STAGE 1: GETTING READY
  User is in the library. Goal: reach a checkout/return button.

  DEFAULT PATH (★ Recommended):
    Unlock phone → Tap book NFC chip → Book Detail (Instant Checkout)

  ALTERNATE PATHS:
    ├─ QR Scan book (outside website) → Book Detail (Regular Checkout)
    ├─ Open website → Study → Top Scanner → Tap/Scan → P2D Confirm
    ├─ Open website → Study → Browse/Search → Book Card → Checkout
    └─ Open website → Study → Browse/Search → Book Card → Detail → Checkout

  ALL PATHS CONVERGE → User sees a Checkout/Return button
                                    ↓
MEGA-STAGE 2: SIGN IN & PROFILE SETUP
  (Only for users NOT already signed in with complete profile)

  DEFAULT (New User — full journey):
    Click Checkout → Login Popup → Sign Up with Google (recommended)
    → OR LinkedIn → OR Email: fill form → Create Account
    → Verify Email (click link in inbox, come back, check status)
    → Accept Terms & Conditions + Privacy Notice
    → Enter Phone Number (mandatory gating)
    → Optionally: Address (auto-detect location, flat no.)
    → Complete Setup ✅

  RETURNING USER (Already has account):
    Click Checkout → Login Popup → Sign In (Google/LinkedIn/Email+Pwd)
    → IF prompted: complete mandatory info (phone, verify email)
    → Complete ✅

  ALREADY SIGNED IN:
    This stage is skipped entirely → proceeds to Stage 3
                                    ↓
MEGA-STAGE 3: EXECUTE CHECKOUT / RETURN
  INSTANT PATH (from NFC Tap - Path A):
    → Checkout executes immediately (no scanner popup)
    → "Checkout in Progress" popup with literary quote (wait, enjoy!)
    → Success → View Gatepass

  SCANNER PATH (from QR/Book Card/Book Detail - Paths B/D/E):
    → Scanner Popup opens (Tabs: Tap | Scan | Manual)
    → User taps NFC badge OR scans QR code
    → "Checkout in Progress" popup with literary quote
    → Success → View Gatepass

  TOP SCANNER PATH (Path C - special):
    → Scanner popup → Tap/Scan → P2D Confirmation popup
      (3 buttons: Cancel / View Detail / Checkout)
    → User clicks Checkout
    → "Checkout in Progress" popup with literary quote
    → Success → View Gatepass

  RETURN PATHS:
    Same as above but with return-specific verification:
    ├─ NFC tap on book
    ├─ QR scan (book sticker or library Validator QR placard)
    └─ GPS geofence (stand in library, allow location)
    → If GPS fails: fallback to Validator QR scan
    → Success → Write Review prompt
```

---

## 4. Screenshots Required

### 4.1 Existing Screenshots (16)
| File | Content | Status |
|---|---|---|
| 01_catalog_page.png | Study/Catalog page | ✅ |
| 02_onboarding_signin.png | Sign In popup | ✅ |
| 03_onboarding_signup.png | Sign Up form | ✅ |
| 04_onboarding_terms.png | Terms & Conditions step | ✅ |
| 05_onboarding_email_verify.png | Email verification step | ✅ |
| 06_onboarding_profile.png | Profile setup step | ✅ |
| 07_book_detail_page.png | Book detail with standard buttons | ✅ |
| 08_book_detail_nfc_instant.png | Book detail with instant NFC button | ✅ |
| 09_scanner_modal_nfc.png | Scanner modal NFC tab | ✅ |
| 10_scanner_modal_qr.png | Scanner modal QR tab | ✅ |
| 11_checkout_success.png | Checkout success / rating popup | ✅ |
| 12_gatepass_page.png | Gatepass page | ✅ |
| 13_return_scanner.png | Return scanner modal | ✅ |
| 14_return_success.png | Return success | ✅ |
| 15_top_scanner_p2d.png | P2D confirmation popup | ⚠️ 2.7KB (blank) |
| 16_book_card_highlight.png | Book card with checkout button | ✅ |

### 4.2 New Screenshots Needed
| File | Content | Capture Method |
|---|---|---|
| 17_checkout_in_progress.png | Checkout in progress popup with literary quote | E2E hook: force processing state |
| 19_p2d_confirmation.png | P2D confirmation popup (re-capture) | E2E hook: force p2dModalOpen |
| 20_return_gps_prompt.png | GPS location permission prompt | Screenshot or illustration |
| 21_return_validator_qr.png | Validator QR fallback tab | E2E: force validator_qr tab |

---

## 5. UI Changes

### 5.1 Header Compression
- **Remove**: "Your complete library guide" heading, subtitle, "Royal Guide" label, Sages Badge
- **Keep**: Back button and Print button only
- **Height**: Minimize to ~48px toolbar-style bar
- **Goal**: Content visible immediately without scrolling on mobile

### 5.2 Theme Contrast Fixes
| Theme | Issue | Root Cause | Fix |
|---|---|---|---|
| Academic (light) | .branch-btn.highlight:hover disappears | --primary-dark is undefined, hover bg becomes transparent, white text on beige bg | Define --primary-dark or use explicit filter: brightness(0.85) on hover |
| Default (dark/library) | Non-highlighted .branch-btn text invisible | color not explicitly set, defaults to black on dark var(--surface) | Add explicit color: var(--text-primary) to .branch-btn |

### 5.3 Scene Graph Redesign
Replace the current flat scene graph with a **3-mega-stage stepper** that:
- Shows the default recommended path expanded by default
- Collapses alternative paths under clearly labeled expandable sections
- Merges back into shared content after branch points
- Uses a progress rail (vertical stepper) instead of flat button navigation

---

## 6. Printable Banners (3 A4 Pages)

### Banner 1: MEGA-STAGE 1 — Getting Ready (A4 Landscape)
- **Main path**: TAP your book → You're ready! with large NFC icon
- **Sub-banners** (smaller sections): QR Scan path, Website paths
- Large, visible from 2m distance

### Banner 2: MEGA-STAGE 2 — Sign In & Setup (A4 Landscape)
- **New user path**: Google Sign-Up → Verify Email → Accept T&C → Phone Number
- **Returning user**: Sign In → Complete if prompted
- QR code linking to the digital help page

### Banner 3: MEGA-STAGE 3 — Complete Checkout / Return (A4 Landscape)
- **Instant**: Tap → Done → Gatepass
- **Scanner**: Popup → Tap/Scan → Done → Gatepass
- **Return**: NFC / QR / GPS → Done → Review

---

## 7. Phases

### Phase 1: Foundation (This Sprint)
- [ ] Create backlog structure
- [ ] Write spec (this document)
- [ ] Fix contrast bugs (immediate, theme-level CSS)
- [ ] Compress header
- [ ] Capture missing screenshots via Playwright
- [ ] Re-capture blank P2D screenshot

### Phase 2: Scene Graph Redesign
- [ ] Redesign InteractiveHelpGuide.jsx with 3-mega-stage architecture
- [ ] Implement branch-and-merge UI with progress rail stepper
- [ ] Default path auto-expanded, alternatives collapsible
- [ ] Wire all new screenshots into scenes
- [ ] Add Checkout in Progress popup scene
- [ ] Add P2D confirmation popup scene for Top Scanner path

### Phase 3: Printable Banners
- [ ] Redesign PrintableHelpBanners.jsx with 3 mega-stage banners
- [ ] Sub-banner sections for alternative paths
- [ ] Large-font, high-contrast design visible from distance
- [ ] QR code to digital help page

### Phase 4: Testing & Polish
- [ ] Verify all screenshots render correctly
- [ ] Test all theme combinations (library, academic)
- [ ] Test print layout on A4
- [ ] Verify all i18n keys work (en, hi, kn)
- [ ] Verify page loads after changes

---

## 8. Non-Functional Requirements

- All text must be internationalized via useLanguage() / t() function
- Zero hardcoded secrets or tokens
- All screenshots must be real Playwright captures from the live app
- Print layout must work on standard A4 paper
- Must work on mobile viewport (393x852) and desktop
