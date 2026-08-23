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

### Phase 1: Authentication UX & Intent Retention
Focuses entirely on fixing the identified UI/UX violations in the authentication and registration flow (Items 2.3.1.1 through 2.3.1.8).

### Phase 2: Omnichannel Entry Points & Loading States
Focuses on standardizing NFC/QR deep-link routing and ensuring immediate loading state visibility across all physical entry points (Items 2.1 & 2.2).

### Phase 3: Hardware Integration & Diagnostics
Focuses on advanced combinations (e.g., scanning while logged out on iOS vs Android) and bridging hardware nuances with the web app interface.
