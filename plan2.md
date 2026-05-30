# Royal Book Club - Phase 2 Enhancement Plan

**Date:** 30 May 2026  
**Status:** Planning & Implementation

---

## Overview
This plan addresses 6 major enhancements to improve user onboarding, admin workflows, access control, UI/UX, and book ingestion with cloud image storage.

---

## Requirement 1: Auto-create Firestore User on Signup

### Problem
- User signs up via Firebase Auth UI
- User exists in Firebase Authentication only
- No corresponding record in Firestore `users` collection
- Backend doesn't know about the user until first API call

### Solution
- **Frontend (SignUp.jsx):** After successful `createUserWithEmailAndPassword`, make a POST call to `/api/v1/auth/register` to trigger user creation
- **Backend (new UserController endpoint):** `POST /api/v1/auth/register` (public, no auth required since Firebase token not yet available)
  - Extract uid and email from request body (or read from token if available)
  - Call `UserService.getOrCreateUser(uid, email, displayName)`
  - Return user object
- **Existing logic:** `UserService.getOrCreateUser` already assigns MEMBER role by default (unless first user → ADMIN)

### Files to modify/create
- `frontend/src/pages/auth/SignUp.jsx` — add POST call after signup
- `backend/src/main/java/com/royalbookclub/api/user/controller/UserController.java` — add register endpoint
- `frontend/src/api/authApi.js` — new service (optional)

---

## Requirement 2: Disable Admin Buttons for Non-Admins

### Problem
- All users can see "Launch Ingestion" and "Manage Members" buttons
- Clicking them when not ADMIN should show error or be disabled

### Solution
- **Frontend:** In components that need admin check, add conditional rendering:
  - `BookIngestionConsole.jsx` — wrap UI in `{user.role === 'ADMIN' ? <Form /> : <AccessDenied />}`
  - `UserManagementPage.jsx` — same check
- **Backend:** Endpoints already protected by `@PreAuthorize("hasRole('ADMIN')")` in Spring Security

### Implementation
- Check `user.role` (from parent `App.jsx` where `onAuthStateChanged` populates it)
- Show disabled button + message if not ADMIN
- Alternatively, do not render the admin route if non-admin (in `App.jsx` routing logic)

### Files to modify
- `frontend/src/pages/admin/BookIngestionConsole.jsx`
- `frontend/src/pages/admin/UserManagementPage.jsx`
- `frontend/src/pages/admin/AdminRequests.jsx`
- `frontend/src/App.jsx` — optional: conditionally render admin routes

---

## Requirement 3: Load Users from Firestore (Replace Dummy Data)

### Problem
- `UserManagementPage.jsx` has hardcoded dummy users (archduke, lady cheste, etc.)
- Should fetch real users from Firestore via backend API

### Solution
- **Frontend:** On mount, fetch users from `GET /api/v1/users` (new endpoint)
- **Backend (UserController):** Add `GET /api/v1/users` (admin-only)
  - Call `UserService.getAllUsers()`
  - Return list of users
- **Frontend:** Display fetched users in table instead of mock data

### Files to modify/create
- `backend/src/main/java/com/royalbookclub/api/user/controller/UserController.java` — add GET /users endpoint
- `frontend/src/pages/admin/UserManagementPage.jsx` — fetch and display real users
- `frontend/src/services/userApi.js` — new service (optional)

---

## Requirement 4: Admin Request Workflow in Curator Console

### Problem
- Admin request backend exists but not fully integrated into admin UI
- Non-admin users cannot easily request admin access
- Admins cannot see and approve/reject requests in a dashboard

### Solution
- **Frontend (AdminRequests.jsx):** Already created; refine:
  - Display pending requests in a clean table/list
  - Show requester email, reason, created date
  - Provide "Approve" and "Reject" buttons
  - Add admin notes field (optional)
  - Refresh list after approve/reject
- **Frontend (AdminDashboard.jsx):** Add:
  - Badge/count of pending admin requests
  - Quick link to Admin Requests page
  - Optional: polling or notification on page load
- **Frontend (UserManagementPage.jsx):** Add "Request Admin Access" button for non-admins
  - Show success message after submission
- **Backend:** AdminRequestService & AdminRequestController already implemented

### Flow
1. Non-admin user clicks "Request Admin Access" in User Management
2. POST to `/api/v1/admin-requests` with reason
3. Request stored in Firestore as PENDING
4. Admin navigates to Admin Requests tab in Curator Console
5. Admin sees list of PENDING requests
6. Admin clicks "Approve" or "Reject"
7. If Approve: user role updated to ADMIN, admin_request status → APPROVED
8. Non-admin user's next login shows them as ADMIN

### Files to modify/create
- `frontend/src/pages/admin/AdminRequests.jsx` — enhance UI/UX
- `frontend/src/pages/admin/AdminDashboard.jsx` — add badge + quick link
- `frontend/src/pages/admin/UserManagementPage.jsx` — add "Request Admin Access" button
- `backend/` — already implemented (AdminRequestService, AdminRequestController)

---

## Requirement 5: UI Spacing in SignIn/SignUp Forms

### Problem
- Labels and input boxes are too close (no vertical spacing)
- Poor visual hierarchy and user experience

### Solution
- Add CSS margin-bottom to form labels or form groups
- Ensure consistent spacing between label and input
- Add spacing between form fields

### Implementation
- Create `.auth-form-group` or similar wrapper class
- Add padding/margin in `SignIn.jsx` and `SignUp.jsx` (inline styles or CSS file)

### Files to modify
- `frontend/src/pages/auth/SignIn.jsx` — add spacing
- `frontend/src/pages/auth/SignUp.jsx` — add spacing
- Optional: create `frontend/src/pages/auth/Auth.css`

---

## Requirement 6: Book Image Upload to Cloud Storage

### Problem
- Ingestion form only accepts direct image URLs
- No ability to upload images to Cloud Storage
- Need to store images in `gs://royalbookclubimages` bucket and use public URLs

### Solution

#### Frontend (BookIngestionConsole.jsx)
- Add file input for image upload
- Display preview of selected image
- Keep existing "Image URL" input as fallback
- On file selection:
  - Upload to Cloud Storage bucket `gs://royalbookclubimages`
  - Get public download URL
  - Populate Image URL field with that URL
- When submitting book form, include the image URL (from upload or manual input)

#### Backend (BookService)
- No changes needed; already stores `coverUrl` field

#### Firebase Storage Setup
- Bucket: `gs://royalbookclubimages`
- Firestore Security Rules: Allow authenticated users to upload
- Set files to public (or use signed URLs if private)

#### Implementation Details
- Frontend: Use Firebase Storage SDK (`firebase/storage`)
- Create function `uploadBookImage(file)` that:
  1. Validates file type (jpg, png, webp)
  2. Uploads to `gs://royalbookclubimages/books/{timestamp}_{filename}`
  3. Gets public download URL
  4. Returns URL
- Handle errors gracefully

### Files to modify/create
- `frontend/src/pages/admin/BookIngestionConsole.jsx` — add file input + upload logic
- `frontend/src/services/storageApi.js` — new service for Firebase Storage
- `frontend/src/config/firebase.js` — ensure Storage is initialized
- Firebase Console: Configure `royalbookclubimages` bucket security rules

---

## Implementation Order

1. **Req 5 (UI Spacing)** — Quick, no backend changes
2. **Req 1 (Auto-create Firestore User)** — Core: signup → Firestore user
3. **Req 3 (Load Users from Firestore)** — Backend endpoint + Frontend fetch
4. **Req 2 (Disable Admin Buttons)** — Add role checks in UI
5. **Req 4 (Admin Request Workflow)** — Enhance existing implementation
6. **Req 6 (Cloud Storage Image Upload)** — Advanced: Firebase Storage integration

---

## Files Summary

### New Files
- `frontend/src/services/storageApi.js` — Cloud Storage upload service
- `frontend/src/pages/auth/Auth.css` — Auth form styling
- `frontend/src/services/userApi.js` — User API service (optional)
- `backend/src/main/java/com/royalbookclub/api/auth/dto/RegisterRequest.java` — DTO for register endpoint

### Modified Files
- `frontend/src/pages/auth/SignIn.jsx` — Add spacing
- `frontend/src/pages/auth/SignUp.jsx` — Add spacing + register API call
- `frontend/src/pages/admin/BookIngestionConsole.jsx` — Admin check + image upload
- `frontend/src/pages/admin/UserManagementPage.jsx` — Load real users + Request Admin button
- `frontend/src/pages/admin/AdminRequests.jsx` — Enhance UI
- `frontend/src/pages/admin/AdminDashboard.jsx` — Add badge + quick link
- `backend/src/main/java/com/royalbookclub/api/user/controller/UserController.java` — Add register & get users endpoints
- `frontend/src/config/firebase.js` — Initialize Storage (if needed)

---

## Success Criteria

✅ **Req 1:** New user signs up → Firestore user doc created with MEMBER role automatically  
✅ **Req 2:** Non-admin users cannot click ingestion/member management buttons  
✅ **Req 3:** User table shows real Firestore users, not dummy data  
✅ **Req 4:** Non-admin can request admin; admin can approve/reject in Curator Console  
✅ **Req 5:** Forms have clear spacing between labels and inputs  
✅ **Req 6:** Admin can upload book images to Cloud Storage; public URLs used in catalog  

---

## Notes

- Backend admin request workflow already implemented; frontend UI needs enhancement
- Firebase Storage requires enabling in GCP project and setting bucket rules
- All admin endpoints already protected by Spring Security
- Email/password auth now in place; UI flow is clean

