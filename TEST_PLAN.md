# End-to-End Automation Test Plan

This document outlines the End-to-End (E2E) testing strategy for the Royal Book Club ecosystem.

## 1. Overview
The automation leverages **Playwright** running on Chromium to execute simulated user flows against the deployed web application (or local `localhost:5173`). Tests are integrated into GitHub Actions (`.github/workflows/e2e.yml`) and trigger automatically upon pushes and successful deployments.

## 2. Test Environments
* **Local Run**: `npx playwright test` uses the `BASE_URL` env variable, defaulting to `http://localhost:5173`.
* **CI/CD Production Run**: GitHub Actions uses the deployed production URL as `BASE_URL`. Test records (books, checkouts) are sandboxed.

## 3. Sandboxing Strategy (Production Safety)
To prevent tests from polluting the production database and affecting the real user experience:
1. **Creation**: Test scripts will append an `isTest: true` attribute when generating mock books and checkout transactions (via the API layer).
2. **Backend Filtering**: The Spring Boot backend (`BookService.java`, `CheckoutService.java`) explicitly ignores any document where `isTest: true` during `getAllBooks()` and `getAllCheckouts()` queries.
3. **Cleanup (Teardown)**: A global teardown or `afterAll` hook removes these temporary test documents to keep the database clean.

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
