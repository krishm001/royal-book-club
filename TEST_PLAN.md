# End-to-End Automation Test Plan

This document outlines the End-to-End (E2E) testing strategy for the Royal Book Club ecosystem.

## 1. Overview
The automation leverages **Playwright** running on Chromium to execute simulated user flows against the deployed web application (or local `localhost:3000`). Tests are integrated into GitHub Actions (`.github/workflows/e2e.yml`) and trigger automatically upon pushes and successful deployments.

## 2. Test Environments
* **Local Run**: `npx playwright test` uses the `BASE_URL` env variable, defaulting to `http://localhost:3000`.
* **CI/CD Production Run**: GitHub Actions uses the deployed production URL as `BASE_URL`. Test records (books, checkouts) are sandboxed.

## 3. Sandboxing Strategy (Production Safety)
To prevent tests from polluting the production database and affecting the real user experience:
1. **Creation**: Test scripts will append an `isTest: true` attribute when generating mock books and checkout transactions (via the API layer).
2. **Backend Filtering**: The Spring Boot backend (`BookService.java`, `CheckoutService.java`) explicitly ignores any document where `isTest: true` during `getAllBooks()` and `getAllCheckouts()` queries.
3. **Cleanup (Teardown)**: A global teardown or `afterAll` hook removes these temporary test documents to keep the database clean.

### 3.1 Enhanced Production Isolation (Checkout Matrix)
The checkout matrix E2E tests use **multi-layered isolation** to guarantee zero interference with production:

| Layer | Strategy | Details |
|-------|----------|---------|
| **ISBN Prefix** | `E2E_TEST_*` | Test books use ISBNs like `E2E_TEST_0001`. Real ISBNs are 10/13-digit numbers. Impossible collision. |
| **NFC UID Prefix** | `e2e000*` | Test NFC UIDs like `e2e000aabbcc`. Real UIDs are hardware serial numbers from physical chips. |
| **QR ID Range** | `999000001–999999999` | Test QR IDs use this reserved range. Production QR IDs start from `100000001`. |
| **Email Domain** | `@e2e-test.royalbookclub.invalid` | Uses RFC 2606 reserved `.invalid` TLD. Cannot receive real email. |
| **isTest Flag** | `isTest: true` on ALL documents | Backend listing endpoints filter these out. Production users never see test data. |
| **Gating Config Snapshot/Restore** | Save → Test → Restore | Original admin gating settings are saved before tests and restored after. |

## 4. Test Scenarios

### 4.1 Home Page Rendering & Localization
- **Objective**: Ensure the main page loads successfully, displays correctly, and translations (English/Hindi/Kannada) load without crashing.
- **Verification**: Title checks, navigation bar checks ("Pavilion", "Study"). 
- **Terminology Check**: Verify no references to "Salon" or "Sovereign" exist, confirming they have been successfully replaced by "Library" and "Royal".

### 4.2 Authentication Flow
- **Objective**: Ensure the Firebase login popup/redirect works, and users are redirected to their profile.
- **Data**: Uses GitHub Secrets (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`).

### 4.3 Catalog Browse & Search
- **Objective**: Ensure the user can search for a book by ISBN or title.
- **Verification**: Search bar interactions, rendering of book cards, and correct availability count parsing.

### 4.4 Book Checkout & Return (The Core E2E Flow)
- **Objective**: E2E verification of physical book checkout simulation.
- **Steps**:
  1. Trigger test book creation with `isTest: true` and 1 available copy.
  2. Simulate user navigating to the book page.
  3. Click "Checkout" (formerly "Secure Sovereign Checkout").
  4. Verify the database updates the status to `CHECKED_OUT`.
  5. Simulate the Return flow.
  6. Admin API (or teardown) deletes the test book and checkout.

---

## 5. Checkout Flow Matrix Test Suite

### 5.1 Dimensions

The checkout flow is tested across **4 orthogonal dimensions**:

#### Platform (3 values)
| ID | Platform | Playwright Device |
|----|----------|-------------------|
| P1 | Desktop Chrome | `Desktop Chrome` |
| P2 | Android Mobile | `Pixel 7` (mobile Chromium) |
| P3 | iPhone Mobile | `iPhone 14` (WebKit) |

#### User State (6 values)
| ID | User State | Auth Provider | Email Verified | Profile Complete |
|----|-----------|---------------|----------------|------------------|
| U1 | Anonymous (Non-Logged-In) | None | N/A | N/A |
| U2 | Email/Password — Unverified | `password` | ❌ | ❌ |
| U3 | Email/Password — Verified, Incomplete | `password` | ✅ | ❌ (no phone/address) |
| U4 | Email/Password — Verified, Complete | `password` | ✅ | ✅ |
| U5 | Google OAuth | `google.com` | ✅ (auto) | May be incomplete |
| U6 | LinkedIn OAuth | Custom token | ✅ (auto) | May be incomplete |

#### Entry Point (5 values)
| ID | Entry Point | URL Pattern | UI Behavior |
|----|------------|-------------|-------------|
| E1 | NFC Tap (valid counter) | `/?u={ntagUid}&c={counter>last}` | Instant NFC Checkout button, 3-min timer |
| E2 | QR Code Scan | `/?qr={qrId}` | Gated navigation → standard checkout |
| E3 | Direct URL / Catalog Browse | `/#/catalog/{isbn}` | Standard checkout button |
| E4 | NFC Tap (expired/replayed) | `/?u={ntagUid}&c={counter≤last}` | Silent redirect, no instant button |
| E5 | External QR Deep Link | `bookshelfnet.com/?qr={qrId}` | External redirect → gated detail |

#### Admin Self-Checkout Gating Config (4 values)
| ID | Config | Phone | Address | Email Verify |
|----|--------|-------|---------|--------------|
| G1 | Phone Only | ✅ Required | ❌ Optional | ❌ Off |
| G2 | Phone + Email | ✅ Required | ❌ Optional | ✅ Enforced |
| G3 | Full Gating | ✅ Required | ✅ All Required | ✅ Enforced |
| G4 | No Gating | ❌ Optional | ❌ Optional | ❌ Off |

### 5.2 Total Combinations
**3 × 6 × 5 × 4 = 360 total combinations**

### 5.3 Coverage Levels

| Level | Tests | Time | When | Command |
|-------|-------|------|------|---------|
| **Sanity** | 8 | ~3 min | Quick validation | `npx playwright test --project=sanity` |
| **Smoke** | 24 | ~8 min | CI pushes, daily cron | `npx playwright test --project=smoke` |
| **Full Matrix** | 360 | ~45–60 min | Manual trigger only | `npx playwright test --project=full-matrix` |

### 5.4 Example Step-by-Step Journeys

#### Android / Non-Logged-In / NFC Tap (Valid) / Phone+Email Gating
```
Step 1:  Tap NFC tag → Phone opens URL /?u=e2e000aabbcc&c=20
Step 2:  App resolves book via GET /api/v1/books/ntag/e2e000aabbcc?c=20
Step 3:  Book detail page loads with "Instant NFC Checkout" button (3-min timer)
Step 4:  Click "Instant NFC Checkout"
Step 5:  → Gating check: user is anonymous → OnboardingWizard popup opens
Step 6:  Step 1 of wizard: Sign In form displayed
Step 7:  User enters email + password → clicks "Enter Archway"
Step 8:  → enforceEmailVerification=true: "Verify your email" modal shown
Step 9:  User verifies email → polling detects verification (auto-advances)
Step 10: Step 2: Terms & Privacy consent → Accept
Step 11: Step 3: Profile form → Phone number field shown (phoneMandatory=true)
Step 12: User enters phone number → clicks "Save & Continue"
Step 13: OnboardingWizard closes → fires 'onboarding_complete' event
Step 14: Instant NFC Checkout auto-resumes (within 3-min window)
Step 15: Checkout executes → success popup with "View Gatepass"
Result: ✅ PASS — 15 steps, smooth UX, minimal flow
```

#### Desktop / Verified Complete / Direct URL / No Gating
```
Step 1:  Navigate to /#/catalog/E2E_TEST_0001
Step 2:  Book detail page loads with standard "Checkout" button
Step 3:  Click "Checkout"
Step 4:  → Gating check: user verified, profile complete, no gating → all pass
Step 5:  Checkout submitted via POST /api/v1/checkout
Step 6:  Success → "View Gatepass" button visible
Result: ✅ PASS — 6 steps, optimal minimal flow
```

#### iPhone / Google OAuth / QR Scan / No Gating
```
Step 1:  Scan QR sticker → Phone opens /?qr=999000001
Step 2:  App resolves book via fetchBookByQrId → redirects to /#/catalog/E2E_TEST_0001?qrId=999000001
Step 3:  Book detail page loads with standard "Checkout" button
Step 4:  Click "Checkout"
Step 5:  → Gating check: Google user, email auto-verified, no mandatory fields → pass
Step 6:  Checkout executes → success popup
Result: ✅ PASS — 6 steps, optimal minimal flow
```

### 5.5 Daily Compliance Report

A custom Playwright reporter generates an HTML compliance report after every run:

- **Matrix Heatmap**: Color-coded grid showing pass/fail per combination
- **Spec Compliance Checks**: Steps minimized? Smooth UX? Popup → resume works?
- **Step-by-Step Logs**: Exact user journey per combination
- **Failure Analysis**: Error message, stack trace, screenshot
- **Coverage Metrics**: Dimensions covered vs total

Reports are uploaded as GitHub Actions artifacts (30-day retention) and saved locally to `frontend/test-reports/`.

### 5.6 GitHub Actions Integration

| Workflow | Trigger | Level | Budget |
|----------|---------|-------|--------|
| `e2e-checkout-matrix.yml` | Push to main | Smoke (24 tests) | 10 min |
| `e2e-checkout-matrix.yml` | Daily cron (6 AM UTC) | Smoke (24 tests) | 10 min |
| `e2e-checkout-matrix.yml` | Manual dispatch | Configurable | 60 min |

Manual trigger for full matrix:
```bash
gh workflow run e2e-checkout-matrix.yml -f level=full-matrix
```

On failure, an automated GitHub Issue is created with reproduction steps and links to test artifacts.

---

## 6. Environment Variables & Secrets

| Variable | Used By | Purpose |
|----------|---------|---------|
| `BASE_URL` | E2E tests | Target application URL |
| `VITE_API_BASE_URL` | E2E tests | Backend API base URL |
| `TEST_USER_EMAIL` | Auth tests | Pre-existing test user email |
| `TEST_USER_PASSWORD` | Auth tests | Pre-existing test user password |
| `TEST_ADMIN_TOKEN` | Matrix tests | Firebase admin token for test data setup/teardown |
