package com.royalbookclub.api.checkout.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.royalbookclub.api.checkout.dto.CheckoutRequestDto;
import com.royalbookclub.api.checkout.dto.ReturnRequestDto;
import com.royalbookclub.api.checkout.model.Checkout;
import com.royalbookclub.api.config.service.CheckoutSettingsService;
import com.royalbookclub.api.user.service.UserService;
import com.royalbookclub.api.user.model.User;
import com.royalbookclub.api.common.exception.BusinessRuleException;
import com.royalbookclub.api.common.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ExecutionException;

/**
 * Service managing transactional checkout and return transactions.
 * Uses atomic Firestore transactions to coordinate inventory updates.
 */
@Service
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);
    private static final String COLLECTION_NAME = "checkouts";

    private final Firestore firestore;
    private final CheckoutSettingsService checkoutSettingsService;
    private final UserService userService;

    public CheckoutService(Firestore firestore, CheckoutSettingsService checkoutSettingsService, UserService userService) {
        this.firestore = firestore;
        this.checkoutSettingsService = checkoutSettingsService;
        this.userService = userService;
    }

    private void verifyUserProfileRequirements(String memberId) {
        var settings = checkoutSettingsService.getCheckoutSettings();
        if (settings == null) {
            return;
        }

        if (settings.isPhoneMandatory() || settings.isHouseNoMandatory() || settings.isStreetMandatory() || settings.isCityMandatory() || settings.isPinCodeMandatory()) {
            var user = userService.getUserById(memberId);
            if (user == null) {
                throw new BusinessRuleException("Member profile not found. Please complete your profile before checking out books.");
            }

            List<String> missingFields = new ArrayList<>();
            if (settings.isPhoneMandatory() && (user.getPhone() == null || user.getPhone().trim().isEmpty())) {
                missingFields.add("Phone Number");
            }
            if (settings.isHouseNoMandatory() && (user.getHouseNo() == null || user.getHouseNo().trim().isEmpty())) {
                missingFields.add("House/Apartment Number");
            }
            if (settings.isStreetMandatory() && (user.getStreet() == null || user.getStreet().trim().isEmpty())) {
                missingFields.add("Street Address");
            }
            if (settings.isCityMandatory() && (user.getCity() == null || user.getCity().trim().isEmpty())) {
                missingFields.add("City");
            }
            if (settings.isPinCodeMandatory() && (user.getPinCode() == null || user.getPinCode().trim().isEmpty())) {
                missingFields.add("Postal/PIN Code");
            }

            if (!missingFields.isEmpty()) {
                String missingMsg = String.join(", ", missingFields);
                throw new BusinessRuleException("Checkout Gated: Please update your profile with required information: " + missingMsg + ".");
            }
        }

        if (settings.isEnforceEmailVerification()) {
            if (!userService.isEmailVerified(memberId)) {
                throw new BusinessRuleException("Sovereign verification gating: Your email address is unverified. Please check your inbox or profile page to verify.");
            }
        }
    }

    private void verifyNoPendingReturns(String memberId) {
        try {
            Query pendingReturnsQuery = firestore.collection(COLLECTION_NAME)
                    .whereEqualTo("memberId", memberId)
                    .whereEqualTo("status", "REQUESTED_RETURN")
                    .limit(1);
            QuerySnapshot snap = pendingReturnsQuery.get().get();
            if (!snap.isEmpty()) {
                throw new BusinessRuleException("You have a pending return verification. You must wait for an administrator to approve your pending return before performing new checkouts.");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to verify pending return status", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to verify pending return status", e);
        }
    }

    /**
     * Atomically check out a book to a member.
     * Decrements availableCopies inside a database transaction.
     *
     * @param request The checkout request parameters
     * @return The created Checkout transaction details
     */
    public Checkout checkoutBook(CheckoutRequestDto request) {
        String cleanIsbn = request.getBookId().trim().replace("-", "");
        String memberId = request.getMemberId().trim();

        // Profile details validation
        verifyUserProfileRequirements(memberId);
        verifyNoPendingReturns(memberId);

        DocumentReference bookRef = firestore.collection("books").document(cleanIsbn);
        DocumentReference checkoutRef = firestore.collection(COLLECTION_NAME).document();
        String checkoutId = checkoutRef.getId();

        log.info("Initiating atomic checkout. Member: {}, Book: {}", memberId, cleanIsbn);

        try {
            firestore.runTransaction(transaction -> {
                // 1. Validate Book existence and copy availability
                DocumentSnapshot bookDoc = transaction.get(bookRef).get();
                if (!bookDoc.exists()) {
                    throw new IllegalArgumentException("Book with ISBN " + cleanIsbn + " does not exist in catalog.");
                }

                Long availableCopies = bookDoc.getLong("availableCopies");
                if (availableCopies == null || availableCopies <= 0) {
                    throw new IllegalStateException("Book with ISBN " + cleanIsbn + " has no copies available for checkout.");
                }

                // 2. Prevent duplicate active checkouts of the SAME book by the SAME member
                Query activeQuery = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("memberId", memberId)
                        .whereEqualTo("bookId", cleanIsbn)
                        .whereEqualTo("status", "CHECKED_OUT");
                QuerySnapshot activeSnap = transaction.get(activeQuery).get();
                if (!activeSnap.isEmpty()) {
                    throw new IllegalStateException("Member " + memberId + " already holds active checkout for ISBN: " + cleanIsbn);
                }

                // 3. Update Book Catalog copies
                transaction.update(bookRef, "availableCopies", availableCopies - 1);

                // 4. Construct Checkout Transaction Record
                Instant checkedOutAt = Instant.now();
                Instant dueDate = checkedOutAt.plus(request.getDurationDays(), ChronoUnit.DAYS);

                String email = request.getMemberEmail();
                String name = request.getMemberName();
                try {
                    User dbUser = userService.getUserById(memberId);
                    if (dbUser != null) {
                        if (email == null || email.trim().isEmpty()) {
                            email = dbUser.getEmail();
                        }
                        if (name == null || name.trim().isEmpty()) {
                            name = dbUser.getFullName();
                        }
                    }
                } catch (Exception e) {
                    log.warn("Could not load user profile for memberId {} to populate checkout metadata: {}", memberId, e.getMessage());
                }

                Map<String, Object> checkoutData = new HashMap<>();
                checkoutData.put("id", checkoutId);
                checkoutData.put("bookId", cleanIsbn);
                checkoutData.put("memberId", memberId);
                checkoutData.put("status", "CHECKED_OUT");
                checkoutData.put("checkedOutAt", toTimestamp(checkedOutAt));
                checkoutData.put("dueDate", toTimestamp(dueDate));
                checkoutData.put("returnedAt", null);
                checkoutData.put("approvedAt", toTimestamp(checkedOutAt));
                checkoutData.put("approvedBy", "SYSTEM_DIRECT");
                checkoutData.put("memberEmail", email);
                checkoutData.put("memberName", name);

                transaction.set(checkoutRef, checkoutData);
                return null;
            }).get();

            log.info("Checkout successful. ID: {}", checkoutId);
            return getCheckoutById(checkoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to read checkout transaction after creation."));

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Checkout interrupted for Member: {}, Book: {}", memberId, cleanIsbn, e);
            throw new RuntimeException("Checkout operation interrupted", e);
        } catch (ExecutionException e) {
            log.error("Checkout transaction failed for Member: {}, Book: {}", memberId, cleanIsbn, e);
            Throwable cause = e.getCause();
            if (cause instanceof IllegalArgumentException || cause instanceof IllegalStateException) {
                throw (RuntimeException) cause;
            }
            throw new RuntimeException("Checkout transaction failed: " + e.getMessage(), e);
        }
    }

    /**
     * Create a checkout request (status: REQUESTED_CHECKOUT).
     * Does NOT decrement book inventory copies.
     */
    public Checkout createCheckoutRequest(CheckoutRequestDto request) {
        String cleanIsbn = request.getBookId().trim().replace("-", "");
        String memberId = request.getMemberId().trim();

        // Profile details validation
        verifyUserProfileRequirements(memberId);
        verifyNoPendingReturns(memberId);

        DocumentReference bookRef = firestore.collection("books").document(cleanIsbn);
        DocumentReference checkoutRef = firestore.collection(COLLECTION_NAME).document();
        String checkoutId = checkoutRef.getId();

        log.info("Creating checkout request. Member: {}, Book: {}", memberId, cleanIsbn);

        try {
            DocumentSnapshot bookDoc = bookRef.get().get();
            if (!bookDoc.exists()) {
                throw new IllegalArgumentException("Book with ISBN " + cleanIsbn + " does not exist in catalog.");
            }

            // Prevent duplicate pending requests or active checkouts
            Query pendingQuery = firestore.collection(COLLECTION_NAME)
                    .whereEqualTo("memberId", memberId)
                    .whereEqualTo("bookId", cleanIsbn)
                    .whereIn("status", Arrays.asList("REQUESTED_CHECKOUT", "CHECKED_OUT", "REQUESTED_RETURN"));
            QuerySnapshot pendingSnap = pendingQuery.get().get();
            if (!pendingSnap.isEmpty()) {
                throw new IllegalStateException("Member already has a pending transaction or active checkout for this book.");
            }

            Instant now = Instant.now();

            String email = request.getMemberEmail();
            String name = request.getMemberName();
            try {
                User dbUser = userService.getUserById(memberId);
                if (dbUser != null) {
                    if (email == null || email.trim().isEmpty()) {
                        email = dbUser.getEmail();
                    }
                    if (name == null || name.trim().isEmpty()) {
                        name = dbUser.getFullName();
                    }
                }
            } catch (Exception e) {
                log.warn("Could not load user profile for memberId {} to populate checkout metadata: {}", memberId, e.getMessage());
            }

            Map<String, Object> checkoutData = new HashMap<>();
            checkoutData.put("id", checkoutId);
            checkoutData.put("bookId", cleanIsbn);
            checkoutData.put("memberId", memberId);
            checkoutData.put("status", "REQUESTED_CHECKOUT");
            checkoutData.put("requestedAt", toTimestamp(now));
            checkoutData.put("ntagUid", request.getNtagUid());
            checkoutData.put("memberEmail", email);
            checkoutData.put("memberName", name);

            checkoutRef.set(checkoutData).get();

            return getCheckoutById(checkoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to read checkout request."));
        } catch (Exception e) {
            log.error("Failed to create checkout request", e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    /**
     * Atomically approve a checkout request.
     * Decrements availableCopies and transitions status to CHECKED_OUT.
     */
    public Checkout approveCheckoutRequest(String checkoutId, String adminId) {
        log.info("Approving checkout request ID: {} by Admin: {}", checkoutId, adminId);
        DocumentReference checkoutRef = firestore.collection(COLLECTION_NAME).document(checkoutId);

        try {
            firestore.runTransaction(transaction -> {
                DocumentSnapshot checkoutDoc = transaction.get(checkoutRef).get();
                if (!checkoutDoc.exists()) {
                    throw new IllegalArgumentException("Checkout request not found.");
                }

                String status = checkoutDoc.getString("status");
                if (!"REQUESTED_CHECKOUT".equals(status)) {
                    throw new IllegalStateException("Checkout request is not in REQUESTED_CHECKOUT state.");
                }

                String cleanIsbn = checkoutDoc.getString("bookId");
                DocumentReference bookRef = firestore.collection("books").document(cleanIsbn);
                DocumentSnapshot bookDoc = transaction.get(bookRef).get();

                if (!bookDoc.exists()) {
                    throw new IllegalArgumentException("Book with ISBN " + cleanIsbn + " does not exist.");
                }

                Long availableCopies = bookDoc.getLong("availableCopies");
                if (availableCopies == null || availableCopies <= 0) {
                    throw new IllegalStateException("No copies available in catalog to approve checkout.");
                }

                // Update Book copies
                transaction.update(bookRef, "availableCopies", availableCopies - 1);

                // Update Checkout status & metadata
                Instant now = Instant.now();
                Instant dueDate = now.plus(14, ChronoUnit.DAYS);

                transaction.update(checkoutRef,
                        "status", "CHECKED_OUT",
                        "checkedOutAt", toTimestamp(now),
                        "dueDate", toTimestamp(dueDate),
                        "approvedAt", toTimestamp(now),
                        "approvedBy", adminId
                );

                return null;
            }).get();

            return getCheckoutById(checkoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to read updated checkout."));
        } catch (Exception e) {
            log.error("Failed to approve checkout request: {}", checkoutId, e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    /**
     * Reject a checkout request.
     */
    public Checkout rejectCheckoutRequest(String checkoutId, String adminId) {
        log.info("Rejecting checkout request ID: {} by Admin: {}", checkoutId, adminId);
        DocumentReference checkoutRef = firestore.collection(COLLECTION_NAME).document(checkoutId);
        try {
            firestore.runTransaction(transaction -> {
                DocumentSnapshot checkoutDoc = transaction.get(checkoutRef).get();
                if (!checkoutDoc.exists()) {
                    throw new IllegalArgumentException("Checkout request not found.");
                }

                String status = checkoutDoc.getString("status");
                if (!"REQUESTED_CHECKOUT".equals(status)) {
                    throw new IllegalStateException("Checkout request is not in REQUESTED_CHECKOUT state.");
                }

                transaction.update(checkoutRef,
                        "status", "REJECTED",
                        "approvedAt", toTimestamp(Instant.now()),
                        "approvedBy", adminId
                );
                return null;
            }).get();

            return getCheckoutById(checkoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to read updated checkout."));
        } catch (Exception e) {
            log.error("Failed to reject checkout request: {}", checkoutId, e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    /**
     * Create a return request (status: REQUESTED_RETURN).
     */
    public Checkout createReturnRequest(ReturnRequestDto request) {
        String cleanIsbn = request.getBookId().trim().replace("-", "");
        String memberId = request.getMemberId().trim();
        String checkoutId = request.getCheckoutId() != null ? request.getCheckoutId().trim() : null;

        log.info("Creating return request. Member: {}, Book: {}, Checkout ID: {}", memberId, cleanIsbn, checkoutId);

        try {
            DocumentReference checkoutRef;
            DocumentSnapshot checkoutDoc;

            if (checkoutId != null && !checkoutId.isBlank()) {
                checkoutRef = firestore.collection(COLLECTION_NAME).document(checkoutId);
                checkoutDoc = checkoutRef.get().get();
            } else {
                Query activeQuery = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("memberId", memberId)
                        .whereEqualTo("bookId", cleanIsbn)
                        .whereEqualTo("status", "CHECKED_OUT")
                        .limit(1);
                QuerySnapshot activeSnap = activeQuery.get().get();
                if (activeSnap.isEmpty()) {
                    throw new IllegalArgumentException("No active checkout found for Member: " + memberId + " and Book: " + cleanIsbn);
                }
                checkoutDoc = activeSnap.getDocuments().get(0);
                checkoutRef = checkoutDoc.getReference();
            }

            if (!checkoutDoc.exists()) {
                throw new IllegalArgumentException("Checkout record not found.");
            }

            String status = checkoutDoc.getString("status");
            if (!"CHECKED_OUT".equals(status)) {
                throw new IllegalStateException("Checkout is not in CHECKED_OUT state.");
            }

            Instant now = Instant.now();
            Map<String, Object> updates = new HashMap<>();
            updates.put("status", "REQUESTED_RETURN");
            updates.put("requestedAt", toTimestamp(now));
            updates.put("ntagUid", request.getNtagUid());
            updates.put("returnLatitude", request.getReturnLatitude());
            updates.put("returnLongitude", request.getReturnLongitude());
            updates.put("locationVerified", checkLocationVerification(request.getReturnLatitude(), request.getReturnLongitude()));
            updates.put("nfcOrBarcode", request.getNfcOrBarcode());

            if (checkoutDoc.getString("memberEmail") == null) {
                String email = request.getMemberEmail();
                String name = request.getMemberName();
                try {
                    User dbUser = userService.getUserById(memberId);
                    if (dbUser != null) {
                        if (email == null || email.trim().isEmpty()) {
                            email = dbUser.getEmail();
                        }
                        if (name == null || name.trim().isEmpty()) {
                            name = dbUser.getFullName();
                        }
                    }
                } catch (Exception e) {
                    log.warn("Could not load user profile for memberId {} to populate return metadata: {}", memberId, e.getMessage());
                }
                if (email != null) updates.put("memberEmail", email);
                if (name != null) updates.put("memberName", name);
            }

            checkoutRef.update(updates).get();

            return getCheckoutById(checkoutRef.getId())
                    .orElseThrow(() -> new RuntimeException("Failed to read updated return request."));
        } catch (Exception e) {
            log.error("Failed to create return request", e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    /**
     * Atomically approve a return request.
     * Increments availableCopies and transitions status to RETURNED.
     */
    public Checkout approveReturnRequest(String checkoutId, String adminId) {
        log.info("Approving return request ID: {} by Admin: {}", checkoutId, adminId);
        DocumentReference checkoutRef = firestore.collection(COLLECTION_NAME).document(checkoutId);

        try {
            firestore.runTransaction(transaction -> {
                DocumentSnapshot checkoutDoc = transaction.get(checkoutRef).get();
                if (!checkoutDoc.exists()) {
                    throw new IllegalArgumentException("Checkout record not found.");
                }

                String status = checkoutDoc.getString("status");
                if (!"REQUESTED_RETURN".equals(status)) {
                    throw new IllegalStateException("Checkout record is not in REQUESTED_RETURN state.");
                }

                String cleanIsbn = checkoutDoc.getString("bookId");
                DocumentReference bookRef = firestore.collection("books").document(cleanIsbn);
                DocumentSnapshot bookDoc = transaction.get(bookRef).get();

                if (bookDoc.exists()) {
                    Long available = bookDoc.getLong("availableCopies");
                    Long total = bookDoc.getLong("totalCopies");
                    long newAvailable = (available != null ? available : 0) + 1;
                    if (total != null && newAvailable > total) {
                        newAvailable = total;
                    }
                    transaction.update(bookRef, "availableCopies", newAvailable);
                }

                Instant now = Instant.now();
                transaction.update(checkoutRef,
                        "status", "RETURNED",
                        "returnedAt", toTimestamp(now),
                        "approvedAt", toTimestamp(now),
                        "approvedBy", adminId
                );

                return null;
            }).get();

            return getCheckoutById(checkoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to read updated checkout."));
        } catch (Exception e) {
            log.error("Failed to approve return request: {}", checkoutId, e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    /**
     * Atomically return a book and increment its copy count in catalog.
     *
     * @param request Return parameters
     * @return The updated Checkout transaction details
     */
    public Checkout returnBook(ReturnRequestDto request) {
        String cleanIsbn = request.getBookId().trim().replace("-", "");
        String memberId = request.getMemberId().trim();
        String checkoutId = request.getCheckoutId() != null ? request.getCheckoutId().trim() : null;

        log.info("Initiating atomic return. Member: {}, Book: {}, Request ID: {}", memberId, cleanIsbn, checkoutId);

        try {
            String finalCheckoutId = firestore.runTransaction(transaction -> {
                DocumentReference checkoutRef;
                DocumentSnapshot checkoutDoc;

                if (checkoutId != null && !checkoutId.isBlank()) {
                    checkoutRef = firestore.collection(COLLECTION_NAME).document(checkoutId);
                    checkoutDoc = transaction.get(checkoutRef).get();
                } else {
                    // Try to resolve the active checkout dynamically
                    Query activeQuery = firestore.collection(COLLECTION_NAME)
                            .whereEqualTo("memberId", memberId)
                            .whereEqualTo("bookId", cleanIsbn)
                            .whereEqualTo("status", "CHECKED_OUT")
                            .limit(1);
                    QuerySnapshot activeSnap = transaction.get(activeQuery).get();
                    if (activeSnap.isEmpty()) {
                        throw new IllegalArgumentException("No active checkout found for Member: " + memberId + " and Book: " + cleanIsbn);
                    }
                    checkoutDoc = activeSnap.getDocuments().get(0);
                    checkoutRef = checkoutDoc.getReference();
                }

                if (!checkoutDoc.exists()) {
                    throw new IllegalArgumentException("Checkout transaction not found.");
                }

                String status = checkoutDoc.getString("status");
                if ("RETURNED".equals(status)) {
                    throw new IllegalStateException("This book checkout is already marked as returned.");
                }

                String resolvedBookId = checkoutDoc.getString("bookId");
                DocumentReference bookRef = firestore.collection("books").document(resolvedBookId);
                DocumentSnapshot bookDoc = transaction.get(bookRef).get();

                if (bookDoc.exists()) {
                    Long available = bookDoc.getLong("availableCopies");
                    Long total = bookDoc.getLong("totalCopies");
                    long newAvailable = (available != null ? available : 0) + 1;
                    if (total != null && newAvailable > total) {
                        newAvailable = total; // clamp to maximum bound
                    }
                    transaction.update(bookRef, "availableCopies", newAvailable);
                }

                transaction.update(checkoutRef,
                        "status", "RETURNED",
                        "returnedAt", com.google.cloud.Timestamp.now(),
                        "returnLatitude", request.getReturnLatitude(),
                        "returnLongitude", request.getReturnLongitude(),
                        "locationVerified", checkLocationVerification(request.getReturnLatitude(), request.getReturnLongitude()),
                        "nfcOrBarcode", request.getNfcOrBarcode()
                );

                return checkoutRef.getId();
            }).get();

            log.info("Book return successful. Transaction ID: {}", finalCheckoutId);
            return getCheckoutById(finalCheckoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to read checkout transaction after return."));

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Return interrupted for Member: {}, Book: {}", memberId, cleanIsbn, e);
            throw new RuntimeException("Return operation interrupted", e);
        } catch (ExecutionException e) {
            log.error("Return transaction failed for Member: {}, Book: {}", memberId, cleanIsbn, e);
            Throwable cause = e.getCause();
            if (cause instanceof IllegalArgumentException || cause instanceof IllegalStateException) {
                throw (RuntimeException) cause;
            }
            throw new RuntimeException("Return transaction failed: " + e.getMessage(), e);
        }
    }

    /**
     * Direct verified checkout via Web NFC.
     * Validates matching tag UID in catalog and atomically check outs.
     */
    public Checkout verifiedCheckout(CheckoutRequestDto request) {
        String cleanIsbn = request.getBookId().trim().replace("-", "");
        String memberId = request.getMemberId().trim();
        String tagUid = request.getNtagUid() != null ? request.getNtagUid().trim().toLowerCase().replace(":", "") : null;

        // Profile details validation
        verifyUserProfileRequirements(memberId);

        if (tagUid == null || tagUid.isBlank()) {
            throw new IllegalArgumentException("NFC Tag UID is required for verified checkout.");
        }

        DocumentReference bookRef = firestore.collection("books").document(cleanIsbn);
        DocumentReference checkoutRef = firestore.collection(COLLECTION_NAME).document();
        String checkoutId = checkoutRef.getId();

        log.info("Initiating verified checkout. Member: {}, Book: {}, Tag: {}", memberId, cleanIsbn, tagUid);

        try {
            firestore.runTransaction(transaction -> {
                // 1. Validate Book existence, copy availability, and Tag UID match
                DocumentSnapshot bookDoc = transaction.get(bookRef).get();
                if (!bookDoc.exists()) {
                    throw new IllegalArgumentException("Book with ISBN " + cleanIsbn + " does not exist in catalog.");
                }

                String bookNtagUid = bookDoc.getString("ntagUid");
                if (bookNtagUid == null || bookNtagUid.isBlank()) {
                    throw new IllegalStateException("Book does not have an NTAG213 tag bound to it in the system.");
                }

                String normBookUid = bookNtagUid.trim().toLowerCase().replace(":", "");
                String normTagUid = tagUid.trim().toLowerCase().replace(":", "");
                if (!normBookUid.equals(normTagUid)) {
                    throw new IllegalArgumentException("Scanned NFC Tag UID does not match the bound tag for this book.");
                }

                Long availableCopies = bookDoc.getLong("availableCopies");
                if (availableCopies == null || availableCopies <= 0) {
                    throw new IllegalStateException("Book with ISBN " + cleanIsbn + " has no copies available for checkout.");
                }

                // 2. Prevent duplicate active checkouts of the SAME book by the SAME member
                Query activeQuery = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("memberId", memberId)
                        .whereEqualTo("bookId", cleanIsbn)
                        .whereEqualTo("status", "CHECKED_OUT");
                QuerySnapshot activeSnap = transaction.get(activeQuery).get();
                if (!activeSnap.isEmpty()) {
                    throw new IllegalStateException("Member already holds active checkout for ISBN: " + cleanIsbn);
                }

                // 3. Update Book Catalog copies
                transaction.update(bookRef, "availableCopies", availableCopies - 1);

                // 4. Construct Checkout Transaction Record
                Instant checkedOutAt = Instant.now();
                Instant dueDate = checkedOutAt.plus(request.getDurationDays(), ChronoUnit.DAYS);

                Map<String, Object> checkoutData = new HashMap<>();
                checkoutData.put("id", checkoutId);
                checkoutData.put("bookId", cleanIsbn);
                checkoutData.put("memberId", memberId);
                checkoutData.put("status", "CHECKED_OUT");
                checkoutData.put("checkedOutAt", toTimestamp(checkedOutAt));
                checkoutData.put("dueDate", toTimestamp(dueDate));
                checkoutData.put("returnedAt", null);
                checkoutData.put("ntagUid", tagUid);
                checkoutData.put("approvedAt", toTimestamp(checkedOutAt));
                checkoutData.put("approvedBy", "NFC_VERIFIED");

                transaction.set(checkoutRef, checkoutData);
                return null;
            }).get();

            log.info("Verified checkout successful. ID: {}", checkoutId);
            return getCheckoutById(checkoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to read checkout transaction after creation."));

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Verified checkout interrupted for Member: {}, Book: {}", memberId, cleanIsbn, e);
            throw new RuntimeException("Checkout operation interrupted", e);
        } catch (ExecutionException e) {
            log.error("Verified checkout failed for Member: {}, Book: {}", memberId, cleanIsbn, e);
            Throwable cause = e.getCause();
            if (cause instanceof IllegalArgumentException || cause instanceof IllegalStateException) {
                throw (RuntimeException) cause;
            }
            throw new RuntimeException("Verified checkout failed: " + e.getMessage(), e);
        }
    }

    /**
     * Direct verified return via Web NFC.
     * Validates matching tag UID and atomically returns the book.
     */
    public Checkout verifiedReturn(ReturnRequestDto request) {
        String cleanIsbn = request.getBookId().trim().replace("-", "");
        String memberId = request.getMemberId().trim();
        String tagUid = request.getNtagUid() != null ? request.getNtagUid().trim().toLowerCase().replace(":", "") : null;
        String checkoutId = request.getCheckoutId() != null ? request.getCheckoutId().trim() : null;

        if (tagUid == null || tagUid.isBlank()) {
            throw new IllegalArgumentException("NFC Tag UID is required for verified return.");
        }

        log.info("Initiating verified return. Member: {}, Book: {}, Tag: {}", memberId, cleanIsbn, tagUid);

        try {
            String finalCheckoutId = firestore.runTransaction(transaction -> {
                DocumentReference checkoutRef;
                DocumentSnapshot checkoutDoc;

                if (checkoutId != null && !checkoutId.isBlank()) {
                    checkoutRef = firestore.collection(COLLECTION_NAME).document(checkoutId);
                    checkoutDoc = transaction.get(checkoutRef).get();
                } else {
                    // Try to resolve the active checkout dynamically
                    Query activeQuery = firestore.collection(COLLECTION_NAME)
                            .whereEqualTo("memberId", memberId)
                            .whereEqualTo("bookId", cleanIsbn)
                            .whereIn("status", Arrays.asList("CHECKED_OUT", "REQUESTED_RETURN"))
                            .limit(1);
                    QuerySnapshot activeSnap = transaction.get(activeQuery).get();
                    if (activeSnap.isEmpty()) {
                        throw new IllegalArgumentException("No active checkout or return request found for Member: " + memberId + " and Book: " + cleanIsbn);
                    }
                    checkoutDoc = activeSnap.getDocuments().get(0);
                    checkoutRef = checkoutDoc.getReference();
                }

                if (!checkoutDoc.exists()) {
                    throw new IllegalArgumentException("Checkout transaction not found.");
                }

                String status = checkoutDoc.getString("status");
                if ("RETURNED".equals(status)) {
                    throw new IllegalStateException("This book checkout is already marked as returned.");
                }

                String resolvedBookId = checkoutDoc.getString("bookId");
                DocumentReference bookRef = firestore.collection("books").document(resolvedBookId);
                DocumentSnapshot bookDoc = transaction.get(bookRef).get();

                if (!bookDoc.exists()) {
                    throw new IllegalArgumentException("Book not found.");
                }

                String bookNtagUid = bookDoc.getString("ntagUid");
                if (bookNtagUid == null || bookNtagUid.isBlank()) {
                    throw new IllegalStateException("Book does not have an NTAG213 tag bound to it in the system.");
                }

                String normBookUid = bookNtagUid.trim().toLowerCase().replace(":", "");
                String normTagUid = tagUid.trim().toLowerCase().replace(":", "");
                if (!normBookUid.equals(normTagUid)) {
                    throw new IllegalArgumentException("Scanned NFC Tag UID does not match the bound tag for this book.");
                }

                Long available = bookDoc.getLong("availableCopies");
                Long total = bookDoc.getLong("totalCopies");
                long newAvailable = (available != null ? available : 0) + 1;
                if (total != null && newAvailable > total) {
                    newAvailable = total;
                }
                transaction.update(bookRef, "availableCopies", newAvailable);

                Instant now = Instant.now();
                transaction.update(checkoutRef,
                        "status", "RETURNED",
                        "returnedAt", toTimestamp(now),
                        "approvedAt", toTimestamp(now),
                        "approvedBy", "NFC_VERIFIED",
                        "ntagUid", tagUid
                );

                return checkoutRef.getId();
            }).get();

            log.info("Verified return successful. Transaction ID: {}", finalCheckoutId);
            return getCheckoutById(finalCheckoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to read checkout transaction after return."));

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Verified return interrupted for Member: {}, Book: {}", memberId, cleanIsbn, e);
            throw new RuntimeException("Return operation interrupted", e);
        } catch (ExecutionException e) {
            log.error("Verified return failed for Member: {}, Book: {}", memberId, cleanIsbn, e);
            Throwable cause = e.getCause();
            if (cause instanceof IllegalArgumentException || cause instanceof IllegalStateException) {
                throw (RuntimeException) cause;
            }
            throw new RuntimeException("Verified return failed: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieve a specific checkout record by ID.
     */
    public Optional<Checkout> getCheckoutById(String checkoutId) {
        if (checkoutId == null || checkoutId.isBlank()) {
            return Optional.empty();
        }
        try {
            DocumentSnapshot doc = firestore.collection(COLLECTION_NAME).document(checkoutId).get().get();
            if (doc.exists()) {
                return Optional.of(mapToCheckout(doc));
            }
            return Optional.empty();
        } catch (Exception e) {
            log.error("Failed to read checkout by ID: {}", checkoutId, e);
            throw new RuntimeException("Error reading checkout transaction", e);
        }
    }

    /**
     * Retrieve checkouts made by a member.
     */
    public List<Checkout> getCheckoutsByMember(String memberId) {
        try {
            QuerySnapshot querySnapshot = firestore.collection(COLLECTION_NAME)
                    .whereEqualTo("memberId", memberId.trim())
                    .get().get();
            List<Checkout> list = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                list.add(mapToCheckout(doc));
            }
            return list;
        } catch (Exception e) {
            log.error("Error reading checkouts for member: {}", memberId, e);
            throw new RuntimeException("Failed to load member checkouts", e);
        }
    }

    /**
     * Retrieve all checkout transactions in system.
     */
    public List<Checkout> getAllCheckouts() {
        try {
            QuerySnapshot querySnapshot = firestore.collection(COLLECTION_NAME).get().get();
            List<Checkout> list = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                list.add(mapToCheckout(doc));
            }
            return list;
        } catch (Exception e) {
            log.error("Error reading all checkouts", e);
            throw new RuntimeException("Failed to load catalog checkouts", e);
        }
    }

    /**
     * Admin-forced return/clear of an active checkout or return request.
     */
    public Checkout forceClearCheckout(String checkoutId, String adminId) {
        log.info("Force clearing checkout ID: {} by Admin: {}", checkoutId, adminId);
        DocumentReference checkoutRef = firestore.collection(COLLECTION_NAME).document(checkoutId);

        try {
            firestore.runTransaction(transaction -> {
                DocumentSnapshot checkoutDoc = transaction.get(checkoutRef).get();
                if (!checkoutDoc.exists()) {
                    throw new IllegalArgumentException("Checkout record not found.");
                }

                String status = checkoutDoc.getString("status");
                if (!"CHECKED_OUT".equals(status) && !"REQUESTED_RETURN".equals(status)) {
                    throw new IllegalStateException("Only active checkouts or return requests can be cleared.");
                }

                String cleanIsbn = checkoutDoc.getString("bookId");
                DocumentReference bookRef = firestore.collection("books").document(cleanIsbn);
                DocumentSnapshot bookDoc = transaction.get(bookRef).get();

                if (bookDoc.exists()) {
                    Long available = bookDoc.getLong("availableCopies");
                    Long total = bookDoc.getLong("totalCopies");
                    long newAvailable = (available != null ? available : 0) + 1;
                    if (total != null && newAvailable > total) {
                        newAvailable = total;
                    }
                    transaction.update(bookRef, "availableCopies", newAvailable);
                }

                Instant now = Instant.now();
                transaction.update(checkoutRef,
                        "status", "RETURNED",
                        "returnedAt", toTimestamp(now),
                        "approvedAt", toTimestamp(now),
                        "approvedBy", adminId + " (FORCED_CLEAR)"
                );

                return null;
            }).get();

            return getCheckoutById(checkoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to read updated checkout."));
        } catch (Exception e) {
            log.error("Failed to force clear checkout: {}", checkoutId, e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    private com.google.cloud.Timestamp toTimestamp(Instant instant) {
        return instant != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano()) : null;
    }

    private Instant toInstant(com.google.cloud.Timestamp ts) {
        return ts != null ? Instant.ofEpochSecond(ts.getSeconds(), ts.getNanos()) : null;
    }

    private Checkout mapToCheckout(DocumentSnapshot doc) {
        return Checkout.builder()
                .id(doc.getString("id"))
                .bookId(doc.getString("bookId"))
                .memberId(doc.getString("memberId"))
                .status(doc.getString("status"))
                .checkedOutAt(toInstant(doc.getTimestamp("checkedOutAt")))
                .dueDate(toInstant(doc.getTimestamp("dueDate")))
                .returnedAt(toInstant(doc.getTimestamp("returnedAt")))
                .requestedAt(toInstant(doc.getTimestamp("requestedAt")))
                .approvedAt(toInstant(doc.getTimestamp("approvedAt")))
                .approvedBy(doc.getString("approvedBy"))
                .ntagUid(doc.getString("ntagUid"))
                .memberEmail(doc.getString("memberEmail"))
                .memberName(doc.getString("memberName"))
                .returnLatitude(doc.getDouble("returnLatitude"))
                .returnLongitude(doc.getDouble("returnLongitude"))
                .locationVerified(doc.getBoolean("locationVerified"))
                .nfcOrBarcode(doc.getString("nfcOrBarcode"))
                .build();
    }

    private boolean checkLocationVerification(Double clientLat, Double clientLon) {
        if (clientLat == null || clientLon == null) {
            return false;
        }
        var settings = checkoutSettingsService.getCheckoutSettings();
        if (settings == null || settings.getLibraryLatitude() == null || settings.getLibraryLongitude() == null) {
            return true;
        }
        double libraryLat = settings.getLibraryLatitude();
        double libraryLon = settings.getLibraryLongitude();
        double allowedRadius = settings.getValidRadiusMeters() != null ? settings.getValidRadiusMeters() : 100.0;

        double distance = calculateHaversineDistance(clientLat, clientLon, libraryLat, libraryLon);
        log.info("Haversine check: user distance from library is {} meters (allowed limit: {} meters)", distance, allowedRadius);
        return distance <= allowedRadius;
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371e3; // Earth radius in meters
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaPhi = Math.toRadians(lat2 - lat1);
        double deltaLambda = Math.toRadians(lon2 - lon1);

        double a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                   Math.cos(phi1) * Math.cos(phi2) *
                   Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    public void rateCheckout(String checkoutId, Integer rating) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
        try {
            var docRef = firestore.collection(COLLECTION_NAME).document(checkoutId);
            var snapshot = docRef.get().get();
            if (!snapshot.exists()) {
                throw new ResourceNotFoundException("Checkout transaction not found with ID: " + checkoutId);
            }
            docRef.update("experienceRating", rating).get();
            log.info("Successfully updated checkout {} with experience rating: {}", checkoutId, rating);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to rate checkout transaction", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to rate checkout transaction", e);
        }
    }
}

