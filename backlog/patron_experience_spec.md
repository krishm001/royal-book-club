# Epic: Patron Experience Optimization Spec

## 1. Vision & Goals
The core objective of this epic is to ensure every patron's journey—from discovering a book to checking it out—is absolutely frictionless. The system must eliminate unnecessary steps, provide immediate visual feedback during loading states, and maintain contextual continuity even through complex multi-step processes like registration and email verification.

## 2. Scope & Requirements

### 2.1 Checkout and Return Flows (Omnichannel)
- **Omnichannel Support**: The checkout and return flow must work flawlessly across all combinations:
  - **Platforms**: Desktop, Android, iOS.
  - **User States**: Logged in member, non-logged in member, completely new non-member.
  - **Entry Points**: 
    - NFC tap from outside the app.
    - QR scan from outside the app.
    - Top of Study Page Scan or NFC.
    - Study Listing Checkout button.
    - Book Detail Checkout button.
- **Loading State Visibility**: Users must never be left staring at a static screen. If a QR scan triggers an external redirect or deep link, immediate loading indicators must appear.

### 2.2 UI/UX Layout & Action Visibility
- **Viewport Optimization**: Action buttons and form fields must be immediately visible without requiring horizontal scrolling, and minimizing vertical scrolling.
- **Clarity**: Action expectations must be unambiguous (e.g., clearly delineate between logging in and creating an account).

### 2.3 Specific Identified Violations to Address (Phase 1)
1. **Login Popup Header**: 
   - Rename "Royal Onboarding Archway" to "Royal Archway".
   - Reduce header height to maximize visible space.
   - Adjust scrolling behavior to ensure OAuth buttons (Google/LinkedIn) and the "Enter Archway" button are visible without scrolling on mobile.
   - Rename "Create Covenant Account" to "Create Account".
2. **Disabled OAuth**: Remove non-functional Meta and Twitter login options to declutter the UI.
3. **Create Account Layout**: Fix horizontal overflow (e.g., "Last Name" being pushed out of view to the right). All fields must fit within the viewport width. Auto-scroll to optimize the view.
4. **Error Handling**: Intercept cryptic Firebase errors (e.g., `auth/email-already-in-use`) and map them to human-readable layman terms.
5. **Verification Pending Popup**: 
   - Remove the top letter icon and excess whitespace.
   - Simplify header to "Verification Pending".
   - Add a note reminding users to check their spam folder.
   - Ensure action buttons ("Resend", "Check Now") are immediately visible on mobile.
6. **Cross-Tab Verification Continuity**: 
   - Add a clear warning in the verification popup advising users that clicking the email link may open a *new* browser tab, and they should return to *this* original tab to continue their flow. 
   - *(Technical aside: Firebase handles auth state globally via IndexedDB/LocalStorage, so the original tab will detect the verification, but the user must know to look for it).*
7. **Profile Setup Data Carryover**: Automatically populate the First Name and Last Name fields in the final Profile Setup tab using the data they provided during the initial account creation step.
8. **Intent Retention (Post-Auth Continuity)**: If a user clicks "Checkout" on a book but is forced through the registration flow, the system must cache their original intent (e.g., `pendingCheckoutBookId`). Upon completing the profile setup, the system must automatically resume the checkout flow (opening the checkout modal) rather than dumping them back on the base page.

---

## 3. Implementation Phases

### Phase 1: Authentication UX & Intent Retention ✅
Focuses entirely on fixing the identified UI/UX violations in the authentication and registration flow (Items 2.3.1.1 through 2.3.1.8).

### Phase 2: Omnichannel Entry Points & Loading States ✅
Focuses on standardizing NFC/QR deep-link routing and ensuring immediate loading state visibility across all physical entry points (Items 2.1 & 2.2).

### Phase 3: Hardware Integration & Diagnostics ✅
Focuses on advanced combinations (e.g., scanning while logged out on iOS vs Android) and bridging hardware nuances with the web app interface.

### Phase 4: Mobile Menu & Checkout Hardware UX Optimization ✅
1. **Mobile Menu Scrolling**:
   - Top menu items (Pavilion, Study, etc.) are rendered over a background screen.
   - Fix scrolling behavior so that touches in the gaps between menu items properly scroll the background screen (allowing users to easily reach "leave realm" or profile) without losing the existing visual aesthetics.
2. **Barcode / QR Scanner UI (Checkout Popups)**:
   - **Helper Graphics**: Include visual helpers showing a phone scanning a barcode/QR code on the *back cover* of a book. Show a stylized QR code sticker (matching the salon theme from the admin generator).
   - **Text Reduction**: Remove the iPhone tip and the text "can't see the barcode, submit a manual request".
   - **Brief Prompt**: Add a very short text prompt guiding the user to find and scan the QR code on the back cover.
   - **Space Optimization**:
     - Ensure the Cancel button is always visible at the bottom, even on small screens (e.g., iPhone 8).
     - Maintain the behavior where the UI scrolls up enough to show the top barcode scan tab selector.
     - Reduce whitespace between the bottom manual request tab selector and the viewfinder box.
     - Reduce the height of the viewfinder by approximately 20%.
3. **NFC Tap UI (Checkout Popups)**:
   - **Helper Graphics**: Clearly show (via images and minimal text) that the NFC tap must be performed with the phone on the *front top left cover* of the book.
   - **Space Optimization**: Apply the same aggressive space optimization rules as the Barcode Scanner (always show Cancel button), taking advantage of the extra space available since a camera viewfinder is not required.

### Phase 5: NFC State Management and Race Condition Resolution ✅
1. **NFC Checkout/Return Flow Reliability**: 
   - Fix occasional failures with NFC checkout in book detail and book card checkout flows.
   - Prevent the brief appearance of "transaction failed" popup followed by "gatepass / write review" popup when the transaction actually failed.
   - Ensure consecutive NFC scans do not trigger multiple overlapping or racing popups (transaction failed, royal checkout verification, royal return verification, popups with only a "Done" button).
   - Prevent checkout and return popups from alternating unpredictably.
2. **Book Card Flow NFC Bug**: Ensure the confirmation popup does not incorrectly display during NFC tap in the book card flow, and multiple popup issues are resolved.
3. **NFC Global State Consistency**: 
   - Ensure that if an NFC tap issue occurs in book detail/card flow, it does not corrupt the state of the top scanner NFC tap on the study page.
   - Resolve false negative errors like "This copy is currently checked out by another patron" when the book is checked out by the same user or not checked out at all.
4. **Parity with QR Scanner**: NFC tap flows must behave identically to QR scanner flows in terms of verification state handling, logic, and success/failure handling. They are simply two input mechanisms for the same underlying verification logic.

### Phase 6: Loading States, Admin Quotes, and UI Polish ✅
1. **Verification Indicators**: 
   - Ensure a "Verification in progress..." loading indicator is shown immediately upon a successful NFC tap or QR scan across all 3 contexts (Book Detail, Book Card, Top Scanner).
2. **Admin Quotes during Loading**:
   - While the verification indicator is visible, dynamically fetch and display one of the quotes configured by the admin (from `hero_config`) to entertain the user.
3. **Scroll Locking**: 
   - Ensure background scrolling is frozen when ANY popup is open (including confirmation and subsequent verification popups). Currently, it's only locked on the initial scan popup.
4. **Standardized Error Handling**: 
   - Remove inline red text errors (like "Security Mismatch: Scanned barcode does not match...").
   - Instead, transition to the standard Next/Error popup (similar to the "checked out by another patron" popup) and display the failure reason there in a user-friendly manner.

### Phase 7: UI & Animation Refinements ✅
- Update ContinuousScannerAnimation with distinct steps and explicit reset logic using React `key`.
- Incorporate iOS vs Android specific UI tips and animation behaviors.
- Decorate Verification in Progress state to match the final Golden confirmation UI.
- Refactor 3D Book CSS box-model to prevent spine separation on rotation.
- Add action toggles for switching between Return/Checkout during animation.
- Move busy indicator strictly to the Checkout/Return button in BookDetailPage.
- Ensure strict body scroll locking with `modal-open` CSS class.

---

### Phase 8: Patron Experience Continued (NEW)

> [!IMPORTANT]
> This phase addresses critical UX gaps in the top scanner flow and eliminates all remaining technical error leaks across every checkout/return entry point.

#### 8.1 Top Scanner "View Details" Button
When the Top Scanner (on the Study/Catalog page) is used to scan a QR code or tap an NFC tag, the P2D confirmation popup currently shows:
- Book cover, title, author, ISBN
- "Confirm Checkout" / "Confirm Return" action button
- "Cancel" button

**New requirement**: Add a **"View Details"** button alongside the existing action buttons. On click, this button must:
1. Close the P2D modal.
2. Navigate the user to the **Book Detail Page** for the scanned book (`/catalog/:isbn`).
3. The button should be visually distinct from the primary action button (secondary styling) and always visible in the confirmation state (not in error or success states).

#### 8.2 Comprehensive Checkout Error Handling & User-Friendly Messages
All technical/internal error messages across every checkout and return flow must be intercepted, translated to user-friendly language, and presented in a dedicated **Error Popup** (the existing P2D error view or `instantConfirmOpen` error state in BookDetailPage).

##### 8.2.1 Concurrent Checkout Race Condition ("Firestore transaction requires all reads...")
**Current behavior**: When User A has the book detail page open showing the checkout button, and User B checks out the same book in the meantime, User A clicks checkout, scans/taps, and sees a raw Firestore technical error: `"Firestore transaction requires all reads to be executed before all writes"` displayed as inline red text inside the scanner modal.

**Required behavior**:
1. Catch this error at the API response level (the backend `CheckoutService` or `GlobalExceptionHandler` already wraps some errors).
2. Map the technical message to a **user-friendly message**: *"This book was just checked out by another member. Please try a different copy or check back later."*
3. **Close the scanner modal** immediately upon error.
4. **Open the standard Error Popup** (P2D error view in CatalogPage, or `instantConfirmOpen` error state in BookDetailPage) showing the friendly message with the AlertTriangle icon and "Done" button.

##### 8.2.2 Book Mismatch During Card/Detail Checkout ("Security mismatch...")
**Current behavior**: When a patron clicks checkout on Book A's card, the scanner modal opens, and they scan Book B's QR code:
- From **Book Card flow**: The verification spinner keeps spinning indefinitely — nothing happens. The scanner modal stays open with no feedback.
- From **Book Detail flow**: The inline red error text "Security mismatch: Scanned code does not match..." appears inside the scanner modal.

**Required behavior** (uniform across all flows):
1. When a scanned code does not match the expected book, **immediately stop the scanner/spinner**.
2. **Close the scanner modal**.
3. **Open the standard Error Popup** with a user-friendly message: *"The scanned code doesn't match the selected book. Please ensure you're scanning the correct book's QR code or NFC tag."*
4. The error popup must show the AlertTriangle icon, the friendly message, and a "Done" button.

##### 8.2.3 Universal Error Translation Rules
Create a centralized **error translator utility** that maps all known technical/backend errors to user-friendly messages. At minimum, the following mappings must exist:

| Technical Error Pattern | User-Friendly Message |
|---|---|
| `Firestore transaction requires all reads...` | "This book was just checked out by another member. Please try a different copy or check back later." |
| `Security mismatch` / `does not match` | "The scanned code doesn't match the selected book. Please ensure you're scanning the correct book's QR code or NFC tag." |
| `already checked out` / `no available copies` | "Sorry, all copies of this book are currently checked out. Please check back later." |
| `not currently checked out` | "This book is not currently in your study. It may have already been returned." |
| `geofence` / `location` / `outside` | "You appear to be outside the library. Please return to the library to complete this return, or use the manual return option." |
| `email.*verif` / `verification gating` | "Please verify your email address before checking out books. Check your inbox for the verification link." |
| `profile.*required` / `consent` | "Please complete your profile setup before checking out books." |
| `network` / `timeout` / `ECONNREFUSED` | "Unable to connect to the server. Please check your internet connection and try again." |
| Any unmatched error | "Something went wrong. Please try again or contact the library administrator." |

##### 8.2.4 Error Flow Architecture (All Entry Points)
The error handling must be consistent across **all five checkout/return entry points**:

```
Entry Point              Scanner Modal        Error Popup
─────────────────────────────────────────────────────────────
Top Scanner (NFC/QR)  → P2D Overlay       → P2D Error View
Book Card (NFC/QR)    → ScannerModal      → P2D Error View
Book Detail (NFC/QR)  → ScannerModal      → instantConfirmOpen Error
Book Detail (NFC      → Instant NFC       → instantConfirmOpen Error
  session active)       (no scanner)
Manual Fallback       → FallbackModal     → inline error (acceptable)
```

**Rules**:
1. On ANY error during checkout/return verification, the active scanner modal MUST close first.
2. The standard error popup (P2D error view or instantConfirmOpen error state) MUST open with the translated user-friendly message.
3. No raw technical error strings may ever be shown to the user.
4. The error popup must include the AlertTriangle icon, translated message, and a "Done" button to dismiss.

---

## 4. Acceptance Criteria (Phase 8)

### AC-8.1: View Details Button
- [ ] P2D confirmation popup shows "View Details" button when a book is resolved from top scanner.
- [ ] Clicking "View Details" closes the popup and navigates to `/catalog/:isbn`.
- [ ] "View Details" button is NOT shown in error or success states.
- [ ] "View Details" button is visually secondary (outline/ghost style, not competing with the primary confirm action).

### AC-8.2: Error Handling
- [ ] Concurrent checkout race condition shows user-friendly message in error popup, not raw Firestore error.
- [ ] Book mismatch from card scanner stops spinner and shows error popup with friendly message.
- [ ] Book mismatch from detail scanner shows error popup with friendly message.
- [ ] Book mismatch from top scanner shows error popup with friendly message.
- [ ] All five entry points follow the error flow architecture defined in 8.2.4.
- [ ] No technical/raw error strings are ever visible to the end user.
- [ ] Error translator utility covers all patterns in the mapping table (8.2.3).
- [ ] Error popup always has AlertTriangle icon, translated message, and "Done" button.
