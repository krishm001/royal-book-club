package com.royalbookclub.api.checkout.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.royalbookclub.api.checkout.dto.CheckoutRequestDto;
import com.royalbookclub.api.checkout.dto.ReturnRequestDto;
import com.royalbookclub.api.checkout.model.Checkout;
import com.royalbookclub.api.config.model.CheckoutSettings;
import com.royalbookclub.api.config.service.CheckoutSettingsService;
import com.royalbookclub.api.user.service.UserService;
import com.royalbookclub.api.user.model.User;
import com.royalbookclub.api.book.service.BookService;
import com.royalbookclub.api.book.model.BookCopy;
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
    private final BookService bookService;

    public CheckoutService(Firestore firestore, CheckoutSettingsService checkoutSettingsService, UserService userService, BookService bookService) {
        this.firestore = firestore;
        this.checkoutSettingsService = checkoutSettingsService;
        this.userService = userService;
        this.bookService = bookService;
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
                // 1. Validate Book existence
                DocumentSnapshot bookDoc = transaction.get(bookRef).get();
                if (!bookDoc.exists()) {
                    throw new IllegalArgumentException("Book with ISBN " + cleanIsbn + " does not exist in catalog.");
                }

                // 2. Co-checkout auto-reconciliation: Query pending return requests for this book
                Query pendingQuery = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("bookId", cleanIsbn)
                        .whereEqualTo("status", "REQUESTED_RETURN");
                QuerySnapshot pendingSnap = transaction.get(pendingQuery).get();

                Long availableCopies = bookDoc.getLong("availableCopies");
                Long totalCopies = bookDoc.getLong("totalCopies");
                long copiesBeforeCheckout = availableCopies != null ? availableCopies : 0;

                if (!pendingSnap.isEmpty()) {
                    log.info("Co-checkout auto-reconciliation: approving {} pending return(s) for Book: {}", pendingSnap.size(), cleanIsbn);
                    Instant now = Instant.now();
                    for (DocumentSnapshot doc : pendingSnap.getDocuments()) {
                        transaction.update(doc.getReference(),
                                "status", "RETURNED",
                                "returnedAt", toTimestamp(now),
                                "approvedAt", toTimestamp(now),
                                "approvedBy", "AUTO_COCHECKOUT_RECONCILED",
                                "locationVerified", true
                        );
                        Long returnCopyNo = doc.getLong("copyNo");
                        transitionCopyStatus(bookDoc, returnCopyNo != null ? returnCopyNo.intValue() : null, doc.getId(), "AVAILABLE", true, transaction, bookRef);
                    }
                    // Re-read bookDoc to reflect updated copies list
                    bookDoc = transaction.get(bookRef).get();
                    copiesBeforeCheckout += pendingSnap.size();
                    if (totalCopies != null && copiesBeforeCheckout > totalCopies) {
                        copiesBeforeCheckout = totalCopies;
                    }
                }

                // 3. Validate copy availability for the new checkout
                if (copiesBeforeCheckout <= 0) {
                    throw new IllegalStateException("Book with ISBN " + cleanIsbn + " has no copies available for checkout.");
                }

                // 4. Prevent duplicate active checkouts of the SAME book by the SAME member
                Query activeQuery = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("memberId", memberId)
                        .whereEqualTo("bookId", cleanIsbn)
                        .whereEqualTo("status", "CHECKED_OUT");
                QuerySnapshot activeSnap = transaction.get(activeQuery).get();
                if (!activeSnap.isEmpty()) {
                    throw new IllegalStateException("Member " + memberId + " already holds active checkout for ISBN: " + cleanIsbn);
                }

                // Find and lock available copy and get copyNo
                Integer copyNo = findAndLockAvailableCopy(bookDoc, checkoutId, request.getNtagUid(), "CHECKED_OUT", transaction, bookRef);

                // 5. Update Book Catalog copies
                transaction.update(bookRef, "availableCopies", copiesBeforeCheckout - 1);

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
                checkoutData.put("copyNo", copyNo);
                checkoutData.put("status", "CHECKED_OUT");
                checkoutData.put("checkedOutAt", toTimestamp(checkedOutAt));
                checkoutData.put("dueDate", toTimestamp(dueDate));
                checkoutData.put("returnedAt", null);
                checkoutData.put("approvedAt", toTimestamp(checkedOutAt));
                checkoutData.put("approvedBy", "SYSTEM_DIRECT");
                checkoutData.put("memberEmail", email);
                checkoutData.put("memberName", name);
                
                if (bookDoc.getBoolean("isTest") != null) {
                    checkoutData.put("isTest", bookDoc.getBoolean("isTest"));
                }

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
     * Does NOT decrement book inventory copies, but claims copy status as REQUESTED_CHECKOUT.
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
            firestore.runTransaction(transaction -> {
                DocumentSnapshot bookDoc = transaction.get(bookRef).get();
                if (!bookDoc.exists()) {
                    throw new IllegalArgumentException("Book with ISBN " + cleanIsbn + " does not exist in catalog.");
                }

                // Prevent duplicate pending requests or active checkouts
                Query pendingQuery = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("memberId", memberId)
                        .whereEqualTo("bookId", cleanIsbn)
                        .whereIn("status", Arrays.asList("REQUESTED_CHECKOUT", "CHECKED_OUT", "REQUESTED_RETURN"));
                QuerySnapshot pendingSnap = transaction.get(pendingQuery).get();
                if (!pendingSnap.isEmpty()) {
                    throw new IllegalStateException("Member already has a pending transaction or active checkout for this book.");
                }

                Integer copyNo = findAndLockAvailableCopy(bookDoc, checkoutId, request.getNtagUid(), "REQUESTED_CHECKOUT", transaction, bookRef);

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
                checkoutData.put("copyNo", copyNo);
                checkoutData.put("status", "REQUESTED_CHECKOUT");
                checkoutData.put("requestedAt", toTimestamp(now));
                checkoutData.put("ntagUid", request.getNtagUid());
                checkoutData.put("memberEmail", email);
                checkoutData.put("memberName", name);
                
                if (bookDoc.getBoolean("isTest") != null) {
                    checkoutData.put("isTest", bookDoc.getBoolean("isTest"));
                }

                transaction.set(checkoutRef, checkoutData);
                return null;
            }).get();

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

                // Co-checkout auto-reconciliation: Query pending return requests for this book
                Query pendingQuery = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("bookId", cleanIsbn)
                        .whereEqualTo("status", "REQUESTED_RETURN");
                QuerySnapshot pendingSnap = transaction.get(pendingQuery).get();

                Long availableCopies = bookDoc.getLong("availableCopies");
                Long totalCopies = bookDoc.getLong("totalCopies");
                long copiesBeforeCheckout = availableCopies != null ? availableCopies : 0;

                if (!pendingSnap.isEmpty()) {
                    log.info("Co-checkout auto-reconciliation (Admin Approval): approving {} pending return(s) for Book: {}", pendingSnap.size(), cleanIsbn);
                    Instant now = Instant.now();
                    for (DocumentSnapshot doc : pendingSnap.getDocuments()) {
                        transaction.update(doc.getReference(),
                                "status", "RETURNED",
                                "returnedAt", toTimestamp(now),
                                "approvedAt", toTimestamp(now),
                                "approvedBy", "AUTO_COCHECKOUT_RECONCILED",
                                "locationVerified", true
                        );
                        Long returnCopyNo = doc.getLong("copyNo");
                        transitionCopyStatus(bookDoc, returnCopyNo != null ? returnCopyNo.intValue() : null, doc.getId(), "AVAILABLE", true, transaction, bookRef);
                    }
                    // Re-read bookDoc to reflect updated copies list
                    bookDoc = transaction.get(bookRef).get();
                    copiesBeforeCheckout += pendingSnap.size();
                    if (totalCopies != null && copiesBeforeCheckout > totalCopies) {
                        copiesBeforeCheckout = totalCopies;
                    }
                }

                if (copiesBeforeCheckout <= 0) {
                    throw new IllegalStateException("No copies available in catalog to approve checkout.");
                }

                Long requestCopyNo = checkoutDoc.getLong("copyNo");
                Integer copyNo = requestCopyNo != null ? requestCopyNo.intValue() : 1;

                // Transition copy status to CHECKED_OUT
                transitionCopyStatus(bookDoc, copyNo, checkoutId, "CHECKED_OUT", false, transaction, bookRef);

                // Update Book copies
                transaction.update(bookRef, "availableCopies", copiesBeforeCheckout - 1);

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

                String cleanIsbn = checkoutDoc.getString("bookId");
                DocumentReference bookRef = firestore.collection("books").document(cleanIsbn);
                DocumentSnapshot bookDoc = transaction.get(bookRef).get();

                Long copyNo = checkoutDoc.getLong("copyNo");
                // Transition copy status back to AVAILABLE and clear currentCheckoutId
                transitionCopyStatus(bookDoc, copyNo != null ? copyNo.intValue() : null, checkoutId, "AVAILABLE", true, transaction, bookRef);

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
            String finalCheckoutId = firestore.runTransaction(transaction -> {
                DocumentReference checkoutRef;
                DocumentSnapshot checkoutDoc;

                if (checkoutId != null && !checkoutId.isBlank()) {
                    checkoutRef = firestore.collection(COLLECTION_NAME).document(checkoutId);
                    checkoutDoc = transaction.get(checkoutRef).get();
                } else {
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
                    throw new IllegalArgumentException("Checkout record not found.");
                }

                String status = checkoutDoc.getString("status");
                if (!"CHECKED_OUT".equals(status)) {
                    throw new IllegalStateException("Checkout is not in CHECKED_OUT state.");
                }

                DocumentReference bookRef = firestore.collection("books").document(cleanIsbn);
                DocumentSnapshot bookDoc = transaction.get(bookRef).get();

                // Perform copy check if NFC/QR is used
                String requestType = request.getNfcOrBarcode() != null ? request.getNfcOrBarcode().trim().toUpperCase() : "";
                if ("NFC".equals(requestType) || "QR".equals(requestType)) {
                    String tagUid = request.getNtagUid() != null ? request.getNtagUid().trim().toLowerCase().replace(":", "") : null;
                    if (tagUid != null && !tagUid.isBlank()) {
                        List<BookCopy> copies = bookService.getOrCreateBookCopies(bookDoc);
                        BookCopy matchedCopy = null;
                        for (BookCopy copy : copies) {
                            if (copy.getNtagUid() != null) {
                                String normCopyTag = copy.getNtagUid().trim().toLowerCase().replace(":", "");
                                if (normCopyTag.equals(tagUid)) {
                                    matchedCopy = copy;
                                    break;
                                }
                            }
                        }
                        if (matchedCopy == null) {
                            throw new IllegalArgumentException("Scanned NFC Tag UID does not match any copy of this book.");
                        }
                        Long expectedCopyNo = checkoutDoc.getLong("copyNo");
                        if (expectedCopyNo != null && matchedCopy.getCopyNo() != expectedCopyNo.intValue()) {
                            throw new IllegalArgumentException(String.format(
                                "This copy (Copy #%d) is different from the one you checked out (Copy #%d). Please return the correct copy or contact library administration.",
                                matchedCopy.getCopyNo(), expectedCopyNo
                            ));
                        }
                    }
                }

                Long copyNo = checkoutDoc.getLong("copyNo");
                
                // Transition copy status to REQUESTED_RETURN
                transitionCopyStatus(bookDoc, copyNo != null ? copyNo.intValue() : null, checkoutDoc.getId(), "REQUESTED_RETURN", false, transaction, bookRef);

                Instant now = Instant.now();
                Map<String, Object> updates = new HashMap<>();
                updates.put("status", "REQUESTED_RETURN");
                updates.put("requestedAt", toTimestamp(now));
                updates.put("ntagUid", request.getNtagUid());
                updates.put("returnLatitude", request.getReturnLatitude());
                updates.put("returnLongitude", request.getReturnLongitude());
                updates.put("locationVerified", checkLocationVerification(request.getReturnLatitude(), request.getReturnLongitude()));
                updates.put("qrVerified", checkQrVerification(request.getScannedQrPath()));
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

                transaction.update(checkoutRef, updates);
                return checkoutRef.getId();
            }).get();

            return getCheckoutById(finalCheckoutId)
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

                    Long copyNo = checkoutDoc.getLong("copyNo");
                    // Transition copy status to AVAILABLE and clear currentCheckoutId
                    transitionCopyStatus(bookDoc, copyNo != null ? copyNo.intValue() : null, checkoutId, "AVAILABLE", true, transaction, bookRef);
                }

                Instant now = Instant.now();
                transaction.update(checkoutRef,
                        "status", "RETURNED",
                        "returnedAt", toTimestamp(now),
                        "approvedAt", toTimestamp(now),
                        "approvedBy", adminId,
                        "returnValidationMethod", "MANUAL_CURATOR"
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
     * Atomically validate and complete a book return using physical library QR validator.
     * Transitions status to RETURNED and increments availableCopies.
     * Works for both CHECKED_OUT and REQUESTED_RETURN.
     */
    public Checkout validateQrReturn(String checkoutId, String qrPathName) {
        log.info("Validating return via QR for checkout ID: {} and QR path name: {}", checkoutId, qrPathName);
        
        CheckoutSettings settings = checkoutSettingsService.getCheckoutSettings();
        boolean qrValid = false;
        if (settings != null) {
            String cleanQrPath = qrPathName.trim();
            // Match exactly or try to extract path name from URL if it's a full URL
            if (cleanQrPath.contains("bookshelfnet.com/")) {
                cleanQrPath = cleanQrPath.substring(cleanQrPath.indexOf("bookshelfnet.com/") + "bookshelfnet.com/".length());
            }
            if (cleanQrPath.contains("?code=")) {
                cleanQrPath = cleanQrPath.substring(cleanQrPath.indexOf("?code=") + "?code=".length());
            }
            if (cleanQrPath.contains("?qr=")) {
                cleanQrPath = cleanQrPath.substring(cleanQrPath.indexOf("?qr=") + "?qr=".length());
            }
            if (cleanQrPath.contains("qr=")) {
                cleanQrPath = cleanQrPath.substring(cleanQrPath.indexOf("qr=") + "qr=".length());
            }

            String activeLatest = settings.getLatestQrPathName();
            String activePrevious = settings.getPreviousQrPathName();
            
            if (activeLatest != null && activeLatest.trim().equalsIgnoreCase(cleanQrPath)) {
                qrValid = true;
            } else if (settings.isPreviousQrActive() && activePrevious != null && activePrevious.trim().equalsIgnoreCase(cleanQrPath)) {
                qrValid = true;
            }
        }
        
        if (!qrValid) {
            throw new IllegalArgumentException("Invalid or inactive Return Validator QR code. Please scan the active library QR code.");
        }

        DocumentReference checkoutRef = firestore.collection(COLLECTION_NAME).document(checkoutId);

        try {
            firestore.runTransaction(transaction -> {
                DocumentSnapshot checkoutDoc = transaction.get(checkoutRef).get();
                if (!checkoutDoc.exists()) {
                    throw new IllegalArgumentException("Checkout record not found.");
                }

                String status = checkoutDoc.getString("status");
                if ("RETURNED".equals(status)) {
                    throw new IllegalStateException("This book checkout is already marked as returned.");
                }

                if (!"CHECKED_OUT".equals(status) && !"REQUESTED_RETURN".equals(status)) {
                    throw new IllegalStateException("Checkout record is not in a returnable state.");
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

                    Long copyNo = checkoutDoc.getLong("copyNo");
                    // Transition copy status to AVAILABLE and clear currentCheckoutId
                    transitionCopyStatus(bookDoc, copyNo != null ? copyNo.intValue() : null, checkoutId, "AVAILABLE", true, transaction, bookRef);
                }

                Instant now = Instant.now();
                transaction.update(checkoutRef,
                        "status", "RETURNED",
                        "returnedAt", toTimestamp(now),
                        "approvedAt", toTimestamp(now),
                        "approvedBy", "QR_VALIDATOR",
                        "returnValidationMethod", "QR_VALIDATOR",
                        "locationVerified", true
                );

                return null;
            }).get();

            return getCheckoutById(checkoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to read updated checkout."));
        } catch (Exception e) {
            log.error("Failed to validate QR return request: {}", checkoutId, e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    /**
     * Cancel an active or pending checkout initiated by mistake.
     * Restores the book copy availability and sets checkout status to CANCELLED.
     */
    public Checkout cancelCheckout(String checkoutId, String memberId) {
        if (checkoutId == null || checkoutId.isBlank()) {
            throw new IllegalArgumentException("Checkout ID is required to cancel checkout.");
        }
        log.info("Initiating checkout cancellation. ID: {}, Member: {}", checkoutId, memberId);

        try {
            firestore.runTransaction(transaction -> {
                DocumentReference checkoutRef = firestore.collection(COLLECTION_NAME).document(checkoutId);
                DocumentSnapshot checkoutDoc = transaction.get(checkoutRef).get();

                if (!checkoutDoc.exists()) {
                    throw new IllegalArgumentException("Checkout transaction not found: " + checkoutId);
                }

                String currentStatus = checkoutDoc.getString("status");
                if ("CANCELLED".equals(currentStatus)) {
                    log.info("Checkout {} is already cancelled.", checkoutId);
                    return null;
                }
                if (!"CHECKED_OUT".equals(currentStatus) && !"REQUESTED_CHECKOUT".equals(currentStatus)) {
                    throw new IllegalStateException("Only active or pending checkouts can be cancelled (current status: " + currentStatus + ")");
                }

                String holderId = checkoutDoc.getString("memberId");
                if (memberId != null && !memberId.isBlank() && !memberId.equals(holderId) && !"ADMIN".equals(memberId) && !"SYSTEM".equals(memberId)) {
                    throw new IllegalArgumentException("Unauthorized: You can only cancel your own checkouts.");
                }

                String resolvedBookId = checkoutDoc.getString("bookId");
                DocumentSnapshot bookDoc = resolveBookDocument(resolvedBookId, transaction);
                if (bookDoc != null && bookDoc.exists()) {
                    DocumentReference bookRef = bookDoc.getReference();
                    Long copyNo = checkoutDoc.getLong("copyNo");
                    
                    // Transition copy status back to AVAILABLE and clear currentCheckoutId
                    transitionCopyStatus(bookDoc, copyNo != null ? copyNo.intValue() : null, checkoutId, "AVAILABLE", true, transaction, bookRef);

                    // If it was fully CHECKED_OUT, increment availableCopies back
                    if ("CHECKED_OUT".equals(currentStatus)) {
                        Long available = bookDoc.getLong("availableCopies");
                        Long total = bookDoc.getLong("totalCopies");
                        long newAvailable = (available != null ? available : 0) + 1;
                        if (total != null && newAvailable > total) {
                            newAvailable = total;
                        }
                        transaction.update(bookRef, "availableCopies", newAvailable);
                    }
                }

                Instant now = Instant.now();
                transaction.update(checkoutRef,
                        "status", "CANCELLED",
                        "cancelledAt", toTimestamp(now),
                        "cancelReason", "USER_INITIATED_ROLLBACK"
                );

                return null;
            }).get();

            return getCheckoutById(checkoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to load cancelled checkout: " + checkoutId));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Checkout cancellation interrupted for ID: {}", checkoutId, e);
            throw new RuntimeException("Cancellation interrupted", e);
        } catch (ExecutionException e) {
            log.error("Checkout cancellation failed for ID: {}", checkoutId, e);
            Throwable cause = e.getCause();
            if (cause instanceof IllegalArgumentException || cause instanceof IllegalStateException) {
                throw (RuntimeException) cause;
            }
            throw new RuntimeException("Failed to cancel checkout: " + e.getMessage(), e);
        }
    }

    /**
     * Revert an accidental book return.
     * Restores the checkout record to CHECKED_OUT, re-locks the copy, and decrements available copies.
     */
    public Checkout cancelReturn(String checkoutId, String memberId) {
        if (checkoutId == null || checkoutId.isBlank()) {
            throw new IllegalArgumentException("Checkout ID is required to cancel return.");
        }
        log.info("Initiating return rollback/undo. ID: {}, Member: {}", checkoutId, memberId);

        try {
            firestore.runTransaction(transaction -> {
                DocumentReference checkoutRef = firestore.collection(COLLECTION_NAME).document(checkoutId);
                DocumentSnapshot checkoutDoc = transaction.get(checkoutRef).get();

                if (!checkoutDoc.exists()) {
                    throw new IllegalArgumentException("Checkout transaction not found: " + checkoutId);
                }

                String currentStatus = checkoutDoc.getString("status");
                if ("CHECKED_OUT".equals(currentStatus)) {
                    log.info("Checkout {} is already in CHECKED_OUT status.", checkoutId);
                    return null;
                }
                if (!"RETURNED".equals(currentStatus) && !"REQUESTED_RETURN".equals(currentStatus)) {
                    throw new IllegalStateException("Only recently returned or requested return checkouts can be undone (current status: " + currentStatus + ")");
                }

                String holderId = checkoutDoc.getString("memberId");
                if (memberId != null && !memberId.isBlank() && !memberId.equals(holderId) && !"ADMIN".equals(memberId) && !"SYSTEM".equals(memberId)) {
                    throw new IllegalArgumentException("Unauthorized: You can only cancel your own return.");
                }

                String resolvedBookId = checkoutDoc.getString("bookId");
                DocumentSnapshot bookDoc = resolveBookDocument(resolvedBookId, transaction);
                if (bookDoc != null && bookDoc.exists()) {
                    DocumentReference bookRef = bookDoc.getReference();
                    Long copyNo = checkoutDoc.getLong("copyNo");

                    // Transition copy status back to CHECKED_OUT with checkoutId
                    transitionCopyStatus(bookDoc, copyNo != null ? copyNo.intValue() : null, checkoutId, "CHECKED_OUT", false, transaction, bookRef);

                    // If it was RETURNED, decrement availableCopies back
                    if ("RETURNED".equals(currentStatus)) {
                        Long available = bookDoc.getLong("availableCopies");
                        long newAvailable = (available != null && available > 0) ? available - 1 : 0;
                        transaction.update(bookRef, "availableCopies", newAvailable);
                    }
                }

                transaction.update(checkoutRef,
                        "status", "CHECKED_OUT",
                        "returnedAt", null,
                        "approvedAt", toTimestamp(Instant.now()),
                        "approvedBy", "RETURN_ROLLBACK"
                );

                return null;
            }).get();

            return getCheckoutById(checkoutId)
                    .orElseThrow(() -> new RuntimeException("Failed to load rolled-back checkout: " + checkoutId));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Return cancellation interrupted for ID: {}", checkoutId, e);
            throw new RuntimeException("Return rollback interrupted", e);
        } catch (ExecutionException e) {
            log.error("Return cancellation failed for ID: {}", checkoutId, e);
            Throwable cause = e.getCause();
            if (cause instanceof IllegalArgumentException || cause instanceof IllegalStateException) {
                throw (RuntimeException) cause;
            }
            throw new RuntimeException("Failed to cancel return: " + e.getMessage(), e);
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

        // Geofencing verification for physical direct return (optional based on curatorial settings)
        Double clientLat = request.getReturnLatitude();
        Double clientLon = request.getReturnLongitude();

        CheckoutSettings settings = checkoutSettingsService.getCheckoutSettings();
        boolean mustEnforceGps = settings == null || settings.isEnforceReturnGeofencing();
        if (mustEnforceGps) {
            if (settings == null) {
                log.warn("Geofencing check: Enforce geofencing is enabled by default, but CheckoutSettings document is missing in Firestore. Bypassing coordinate check.");
            } else if (settings.getLibraryLatitude() == null || settings.getLibraryLongitude() == null) {
                log.warn("Geofencing bypass: Enforce geofencing is active, but Library Latitude or Longitude is null in Curator settings. Please set your library's coordinates in Settings.");
            } else {
                if (clientLat == null || clientLon == null) {
                    recordGeofenceFailure(memberId, cleanIsbn, null, null, settings, -1.0);
                    throw new IllegalArgumentException("Self-return is only permitted within library premises. GPS coordinates are missing or blocked. Please allow location access in your browser.");
                }
                double libraryLat = settings.getLibraryLatitude();
                double libraryLon = settings.getLibraryLongitude();
                double allowedRadius = settings.getValidRadiusMeters() != null ? settings.getValidRadiusMeters() : 100.0;
                double distance = calculateHaversineDistance(clientLat, clientLon, libraryLat, libraryLon);

                log.warn("Geofence return check in returnBook: memberId={}, bookId={}, client location: ({}, {}), required location: ({}, {}), distance: {}m, allowed: {}m",
                        memberId, cleanIsbn, clientLat, clientLon, libraryLat, libraryLon, distance, allowedRadius);

                if (distance > allowedRadius) {
                    recordGeofenceFailure(memberId, cleanIsbn, clientLat, clientLon, settings, distance);
                    throw new IllegalArgumentException(String.format(
                        "Self-return is only permitted within library premises. Attempted location: (%.6f, %.6f), Required library location: (%.6f, %.6f), Distance: %.1fm (Allowed max: %.1fm).",
                        clientLat, clientLon, libraryLat, libraryLon, distance, allowedRadius
                    ));
                }
            }
        } else {
            log.info("Bypassing return geofencing validation check as requested by Curator settings (enforceReturnGeofencing is false).");
        }

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
                    // Perform copy check if NFC/QR is used
                    String requestType = request.getNfcOrBarcode() != null ? request.getNfcOrBarcode().trim().toUpperCase() : "";
                    if ("NFC".equals(requestType) || "QR".equals(requestType)) {
                        String tagUid = request.getNtagUid() != null ? request.getNtagUid().trim().toLowerCase().replace(":", "") : null;
                        if (tagUid != null && !tagUid.isBlank()) {
                            List<BookCopy> copies = bookService.getOrCreateBookCopies(bookDoc);
                            BookCopy matchedCopy = null;
                            for (BookCopy copy : copies) {
                                if (copy.getNtagUid() != null) {
                                    String normCopyTag = copy.getNtagUid().trim().toLowerCase().replace(":", "");
                                    if (normCopyTag.equals(tagUid)) {
                                        matchedCopy = copy;
                                        break;
                                    }
                                }
                            }
                            if (matchedCopy == null) {
                                throw new IllegalArgumentException("Scanned NFC Tag UID does not match any copy of this book.");
                            }
                            Long expectedCopyNo = checkoutDoc.getLong("copyNo");
                            if (expectedCopyNo != null && matchedCopy.getCopyNo() != expectedCopyNo.intValue()) {
                                throw new IllegalArgumentException(String.format(
                                    "This copy (Copy #%d) is different from the one you checked out (Copy #%d). Please return the correct copy or contact library administration.",
                                    matchedCopy.getCopyNo(), expectedCopyNo
                                ));
                            }
                        }
                    }

                    Long available = bookDoc.getLong("availableCopies");
                    Long total = bookDoc.getLong("totalCopies");
                    long newAvailable = (available != null ? available : 0) + 1;
                    if (total != null && newAvailable > total) {
                        newAvailable = total; // clamp to maximum bound
                    }
                    transaction.update(bookRef, "availableCopies", newAvailable);

                    Long copyNo = checkoutDoc.getLong("copyNo");
                    // Transition copy status to AVAILABLE and clear currentCheckoutId
                    transitionCopyStatus(bookDoc, copyNo != null ? copyNo.intValue() : null, checkoutDoc.getId(), "AVAILABLE", true, transaction, bookRef);
                }

                transaction.update(checkoutRef,
                        "status", "RETURNED",
                        "returnedAt", com.google.cloud.Timestamp.now(),
                        "returnLatitude", request.getReturnLatitude(),
                        "returnLongitude", request.getReturnLongitude(),
                        "locationVerified", checkLocationVerification(request.getReturnLatitude(), request.getReturnLongitude()),
                        "nfcOrBarcode", request.getNfcOrBarcode(),
                        "returnValidationMethod", "GEOFENCING"
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

        DocumentReference checkoutRef = firestore.collection(COLLECTION_NAME).document();
        String checkoutId = checkoutRef.getId();

        log.info("Initiating verified checkout. Member: {}, Book: {}, Tag: {}", memberId, cleanIsbn, tagUid);

        try {
            String finalCheckoutId = firestore.runTransaction(transaction -> {
                // 1. Validate Book existence, copy availability, and Tag UID match
                DocumentSnapshot bookDoc = resolveBookDocument(cleanIsbn, transaction);
                if (bookDoc == null) {
                    throw new IllegalArgumentException("Book with ISBN " + cleanIsbn + " does not exist in catalog.");
                }
                DocumentReference bookRef = bookDoc.getReference();

                List<BookCopy> copies = bookService.getOrCreateBookCopies(bookDoc);
                BookCopy matchedCopy = null;
                String normScanned = tagUid.trim().toLowerCase().replace(":", "");
                for (BookCopy copy : copies) {
                    if (copy.getNtagUid() != null) {
                        String normCopyTag = copy.getNtagUid().trim().toLowerCase().replace(":", "");
                        if (normCopyTag.equals(normScanned)) {
                            matchedCopy = copy;
                            break;
                        }
                    }
                }
                if (matchedCopy == null) {
                    throw new IllegalArgumentException("Scanned NFC Tag UID does not match any copy of this book.");
                }
                boolean selfReturned = false;
                String finalCheckoutIdForResult = checkoutId;

                if (!"AVAILABLE".equals(matchedCopy.getStatus())) {
                    if ("CHECKED_OUT".equals(matchedCopy.getStatus())) {
                        Query activeCopyCheckoutQuery = firestore.collection(COLLECTION_NAME)
                                .whereEqualTo("bookId", cleanIsbn)
                                .whereEqualTo("copyNo", matchedCopy.getCopyNo())
                                .whereEqualTo("status", "CHECKED_OUT")
                                .limit(1);
                        QuerySnapshot activeCopyCheckoutSnap = transaction.get(activeCopyCheckoutQuery).get();
                        if (!activeCopyCheckoutSnap.isEmpty()) {
                            DocumentSnapshot activeCheckoutDoc = activeCopyCheckoutSnap.getDocuments().get(0);
                            String holderId = activeCheckoutDoc.getString("memberId");
                            if (memberId.equals(holderId)) {
                                log.info("Auto-healing self-return: member {} presented checked-out copy #{} of ISBN {}. Performing auto verified return.", memberId, matchedCopy.getCopyNo(), cleanIsbn);
                                Instant now = Instant.now();
                                transaction.update(activeCheckoutDoc.getReference(),
                                        "status", "RETURNED",
                                        "returnedAt", toTimestamp(now),
                                        "approvedAt", toTimestamp(now),
                                        "approvedBy", "AUTO_HEAL_SELF_RETURN",
                                        "ntagUid", tagUid
                                );
                                transitionCopyStatus(bookDoc, matchedCopy.getCopyNo(), activeCheckoutDoc.getId(), "AVAILABLE", true, transaction, bookRef);
                                
                                Long available = bookDoc.getLong("availableCopies");
                                Long total = bookDoc.getLong("totalCopies");
                                long newAvailable = (available != null ? available : 0) + 1;
                                if (total != null && newAvailable > total) {
                                    newAvailable = total;
                                }
                                transaction.update(bookRef, "availableCopies", newAvailable);
                                
                                selfReturned = true;
                                finalCheckoutIdForResult = activeCheckoutDoc.getId();
                            } else {
                                log.info("Co-checkout auto-reconciliation: member {} presented copy #{} of ISBN {} currently checked-out by {}. Performing handover auto-return.", memberId, matchedCopy.getCopyNo(), cleanIsbn, holderId);
                                Instant now = Instant.now();
                                transaction.update(activeCheckoutDoc.getReference(),
                                        "status", "RETURNED",
                                        "returnedAt", toTimestamp(now),
                                        "approvedAt", toTimestamp(now),
                                        "approvedBy", "AUTO_HANDOVER_RECONCILED",
                                        "ntagUid", tagUid
                                );
                                transitionCopyStatus(bookDoc, matchedCopy.getCopyNo(), activeCheckoutDoc.getId(), "AVAILABLE", true, transaction, bookRef);
                                
                                // Re-read bookDoc to make sure subsequent logic has updated copies status
                                bookDoc = transaction.get(bookRef).get();
                                
                                Long available = bookDoc.getLong("availableCopies");
                                Long total = bookDoc.getLong("totalCopies");
                                long copiesBefore = (available != null ? available : 0) + 1;
                                if (total != null && copiesBefore > total) {
                                    copiesBefore = total;
                                }
                                transaction.update(bookRef, "availableCopies", copiesBefore);
                            }
                        } else {
                            throw new IllegalStateException("The matched book copy (Copy #" + matchedCopy.getCopyNo() + ") is not available (status: " + matchedCopy.getStatus() + "). No active checkout record was found.");
                        }
                    } else {
                        throw new IllegalStateException("The matched book copy (Copy #" + matchedCopy.getCopyNo() + ") is not available (status: " + matchedCopy.getStatus() + ").");
                    }
                }

                if (!selfReturned) {
                    // 2. Co-checkout auto-reconciliation: Query pending return requests for this book
                    Query pendingQuery = firestore.collection(COLLECTION_NAME)
                            .whereEqualTo("bookId", cleanIsbn)
                            .whereEqualTo("status", "REQUESTED_RETURN");
                    QuerySnapshot pendingSnap = transaction.get(pendingQuery).get();

                    Long availableCopies = bookDoc.getLong("availableCopies");
                    Long totalCopies = bookDoc.getLong("totalCopies");
                    long copiesBeforeCheckout = availableCopies != null ? availableCopies : 0;

                    if (!pendingSnap.isEmpty()) {
                        log.info("Co-checkout auto-reconciliation (NFC): approving {} pending return(s) for Book: {}", pendingSnap.size(), cleanIsbn);
                        Instant now = Instant.now();
                        for (DocumentSnapshot doc : pendingSnap.getDocuments()) {
                            transaction.update(doc.getReference(),
                                    "status", "RETURNED",
                                    "returnedAt", toTimestamp(now),
                                    "approvedAt", toTimestamp(now),
                                    "approvedBy", "AUTO_COCHECKOUT_RECONCILED",
                                    "locationVerified", true
                            );
                            Long returnCopyNo = doc.getLong("copyNo");
                            transitionCopyStatus(bookDoc, returnCopyNo != null ? returnCopyNo.intValue() : null, doc.getId(), "AVAILABLE", true, transaction, bookRef);
                        }
                        // Re-read bookDoc to reflect updated copies list
                        bookDoc = transaction.get(bookRef).get();
                        copiesBeforeCheckout += pendingSnap.size();
                        if (totalCopies != null && copiesBeforeCheckout > totalCopies) {
                            copiesBeforeCheckout = totalCopies;
                        }
                    }

                    // 3. Validate copy availability for the new checkout
                    if (copiesBeforeCheckout <= 0) {
                        throw new IllegalStateException("Book with ISBN " + cleanIsbn + " has no copies available for checkout.");
                    }

                    // 4. Prevent duplicate active checkouts of the SAME book by the SAME member
                    Query activeQuery = firestore.collection(COLLECTION_NAME)
                            .whereEqualTo("memberId", memberId)
                            .whereEqualTo("bookId", cleanIsbn)
                            .whereEqualTo("status", "CHECKED_OUT");
                    QuerySnapshot activeSnap = transaction.get(activeQuery).get();
                    if (!activeSnap.isEmpty()) {
                        throw new IllegalStateException("Member already holds active checkout for ISBN: " + cleanIsbn);
                    }

                    // Find and lock available copy using tagUid
                    Integer copyNo = findAndLockAvailableCopy(bookDoc, checkoutId, tagUid, "CHECKED_OUT", transaction, bookRef);

                    // 5. Update Book Catalog copies
                    transaction.update(bookRef, "availableCopies", copiesBeforeCheckout - 1);

                    // 4. Construct Checkout Transaction Record
                    Instant checkedOutAt = Instant.now();
                    Instant dueDate = checkedOutAt.plus(request.getDurationDays(), ChronoUnit.DAYS);

                    Map<String, Object> checkoutData = new HashMap<>();
                    checkoutData.put("id", checkoutId);
                    checkoutData.put("bookId", cleanIsbn);
                    checkoutData.put("memberId", memberId);
                    checkoutData.put("copyNo", copyNo);
                    checkoutData.put("status", "CHECKED_OUT");
                    checkoutData.put("checkedOutAt", toTimestamp(checkedOutAt));
                    checkoutData.put("dueDate", toTimestamp(dueDate));
                    checkoutData.put("returnedAt", null);
                    checkoutData.put("ntagUid", tagUid);
                    checkoutData.put("approvedAt", toTimestamp(checkedOutAt));
                    checkoutData.put("approvedBy", "NFC_VERIFIED");

                    transaction.set(checkoutRef, checkoutData);
                }

                return finalCheckoutIdForResult;
            }).get();

            log.info("Verified checkout successful. ID: {}", finalCheckoutId);
            return getCheckoutById(finalCheckoutId)
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

        // Geofencing verification for physical direct NFC/Barcode return
        Double clientLat = request.getReturnLatitude();
        Double clientLon = request.getReturnLongitude();

        CheckoutSettings settings = checkoutSettingsService.getCheckoutSettings();
        boolean mustEnforceGps = settings == null || settings.isEnforceReturnGeofencing();
        if (mustEnforceGps) {
            if (settings == null) {
                log.warn("Geofencing check: Enforce geofencing is enabled by default, but CheckoutSettings document is missing in Firestore. Bypassing coordinate check.");
            } else if (settings.getLibraryLatitude() == null || settings.getLibraryLongitude() == null) {
                log.warn("Geofencing bypass: Enforce geofencing is active, but Library Latitude or Longitude is null in Curator settings. Please set your library's coordinates in Settings.");
            } else {
                if (clientLat == null || clientLon == null) {
                    recordGeofenceFailure(memberId, cleanIsbn, null, null, settings, -1.0);
                    throw new IllegalArgumentException("Self-return is only permitted within library premises. GPS coordinates are missing or blocked. Please allow location access in your browser.");
                }
                double libraryLat = settings.getLibraryLatitude();
                double libraryLon = settings.getLibraryLongitude();
                double allowedRadius = settings.getValidRadiusMeters() != null ? settings.getValidRadiusMeters() : 100.0;
                double distance = calculateHaversineDistance(clientLat, clientLon, libraryLat, libraryLon);

                log.warn("Geofence return check in verifiedReturn: memberId={}, bookId={}, client location: ({}, {}), required location: ({}, {}), distance: {}m, allowed: {}m",
                        memberId, cleanIsbn, clientLat, clientLon, libraryLat, libraryLon, distance, allowedRadius);

                if (distance > allowedRadius) {
                    recordGeofenceFailure(memberId, cleanIsbn, clientLat, clientLon, settings, distance);
                    throw new IllegalArgumentException(String.format(
                        "Self-return is only permitted within library premises. Attempted location: (%.6f, %.6f), Required library location: (%.6f, %.6f), Distance: %.1fm (Allowed max: %.1fm).",
                        clientLat, clientLon, libraryLat, libraryLon, distance, allowedRadius
                    ));
                }
            }
        } else {
            log.info("Bypassing return geofencing validation for verified return as requested by Curator settings (enforceReturnGeofencing is false).");
        }

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
                DocumentSnapshot bookDoc = resolveBookDocument(resolvedBookId, transaction);
                if (bookDoc == null) {
                    throw new IllegalArgumentException("Book not found.");
                }
                DocumentReference bookRef = bookDoc.getReference();

                List<BookCopy> copies = bookService.getOrCreateBookCopies(bookDoc);
                BookCopy matchedCopy = null;
                String normScanned = tagUid.trim().toLowerCase().replace(":", "");
                for (BookCopy copy : copies) {
                    if (copy.getNtagUid() != null) {
                        String normCopyTag = copy.getNtagUid().trim().toLowerCase().replace(":", "");
                        if (normCopyTag.equals(normScanned)) {
                            matchedCopy = copy;
                            break;
                        }
                    }
                }
                if (matchedCopy == null) {
                    throw new IllegalArgumentException("Scanned NFC Tag UID does not match any copy of this book.");
                }

                // Copy-Specific Return Matching
                String requestType = request.getNfcOrBarcode() != null ? request.getNfcOrBarcode().trim().toUpperCase() : "";
                if ("NFC".equals(requestType) || "QR".equals(requestType)) {
                    Long expectedCopyNo = checkoutDoc.getLong("copyNo");
                    if (expectedCopyNo != null && matchedCopy.getCopyNo() != expectedCopyNo.intValue()) {
                        throw new IllegalArgumentException(String.format(
                            "This copy (Copy #%d) is different from the one you checked out (Copy #%d). Please return the correct copy or contact library administration.",
                            matchedCopy.getCopyNo(), expectedCopyNo
                        ));
                    }
                }

                Long available = bookDoc.getLong("availableCopies");
                Long total = bookDoc.getLong("totalCopies");
                long newAvailable = (available != null ? available : 0) + 1;
                if (total != null && newAvailable > total) {
                    newAvailable = total;
                }
                transaction.update(bookRef, "availableCopies", newAvailable);

                // Transition copy status to AVAILABLE and clear currentCheckoutId
                transitionCopyStatus(bookDoc, matchedCopy.getCopyNo(), checkoutDoc.getId(), "AVAILABLE", true, transaction, bookRef);

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
                Checkout checkout = mapToCheckout(doc);
                if (Boolean.TRUE.equals(checkout.getIsTest())) {
                    continue;
                }
                list.add(checkout);
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
                Checkout checkout = mapToCheckout(doc);
                if (Boolean.TRUE.equals(checkout.getIsTest())) {
                    continue;
                }
                list.add(checkout);
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
                .returnValidationMethod(doc.getString("returnValidationMethod"))
                .isTest(doc.getBoolean("isTest"))
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

    private boolean checkQrVerification(String qrPathName) {
        if (qrPathName == null || qrPathName.trim().isEmpty()) {
            return false;
        }
        CheckoutSettings settings = checkoutSettingsService.getCheckoutSettings();
        if (settings == null) {
            return false;
        }
        String cleanQrPath = qrPathName.trim();
        if (cleanQrPath.contains("bookshelfnet.com/")) {
            cleanQrPath = cleanQrPath.substring(cleanQrPath.indexOf("bookshelfnet.com/") + "bookshelfnet.com/".length());
        }
        if (cleanQrPath.contains("?code=")) {
            cleanQrPath = cleanQrPath.substring(cleanQrPath.indexOf("?code=") + "?code=".length());
        }
        if (cleanQrPath.contains("?qr=")) {
            cleanQrPath = cleanQrPath.substring(cleanQrPath.indexOf("?qr=") + "?qr=".length());
        }
        if (cleanQrPath.contains("qr=")) {
            cleanQrPath = cleanQrPath.substring(cleanQrPath.indexOf("qr=") + "qr=".length());
        }

        String activeLatest = settings.getLatestQrPathName();
        String activePrevious = settings.getPreviousQrPathName();

        if (activeLatest != null && activeLatest.trim().equalsIgnoreCase(cleanQrPath)) {
            return true;
        } else if (settings.isPreviousQrActive() && activePrevious != null && activePrevious.trim().equalsIgnoreCase(cleanQrPath)) {
            return true;
        }
        return false;
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

    @SuppressWarnings("unchecked")
    private Integer findAndLockAvailableCopy(DocumentSnapshot bookDoc, String checkoutId, String expectedNtagUid, String targetStatus, Transaction transaction, DocumentReference bookRef) {
        List<BookCopy> copies = bookService.getOrCreateBookCopies(bookDoc);
        BookCopy selected = null;

        // 1. If physical NFC UID is expected/provided, match by NFC UID
        if (expectedNtagUid != null && !expectedNtagUid.isBlank()) {
            String normTag = expectedNtagUid.trim().toLowerCase().replace(":", "");
            for (BookCopy copy : copies) {
                if (copy.getNtagUid() != null) {
                    String normCopyTag = copy.getNtagUid().trim().toLowerCase().replace(":", "");
                    if (normCopyTag.equals(normTag)) {
                        selected = copy;
                        break;
                    }
                }
            }
        }

        // 2. Otherwise, find the first available copy
        if (selected == null) {
            for (BookCopy copy : copies) {
                if ("AVAILABLE".equals(copy.getStatus())) {
                    selected = copy;
                    break;
                }
            }
        }

        // 3. Fallback: if still null, find first copy not in CHECKED_OUT or REQUESTED_CHECKOUT status
        if (selected == null) {
            for (BookCopy copy : copies) {
                if (!"CHECKED_OUT".equals(copy.getStatus()) && !"REQUESTED_CHECKOUT".equals(copy.getStatus())) {
                    selected = copy;
                    break;
                }
            }
        }

        // 4. Default fallback: assign to Copy #1
        if (selected == null && !copies.isEmpty()) {
            selected = copies.get(0);
        }

        if (selected != null) {
            selected.setStatus(targetStatus);
            selected.setCurrentCheckoutId(checkoutId);
            
            // Serialize and update the copies list back to the Book using centralized BookService conversion
            List<Map<String, Object>> serializedCopies = bookService.copiesToListOfMaps(copies);
            transaction.update(bookRef, "copies", serializedCopies);
            List<Long> qrIds = BookService.extractQrIdsFromCopies(copies);
            transaction.update(bookRef, "qrIds", qrIds);
            return selected.getCopyNo();
        }
        return 1;
    }

    @SuppressWarnings("unchecked")
    private void transitionCopyStatus(DocumentSnapshot bookDoc, Integer copyNo, String checkoutId, String targetStatus, boolean clearCheckoutId, Transaction transaction, DocumentReference bookRef) {
        if (bookDoc == null || !bookDoc.exists()) return;
        List<BookCopy> copies = bookService.getOrCreateBookCopies(bookDoc);
        boolean updated = false;
        
        if (copyNo != null) {
            for (BookCopy copy : copies) {
                if (copyNo.equals(copy.getCopyNo())) {
                    copy.setStatus(targetStatus);
                    if (clearCheckoutId) {
                        copy.setCurrentCheckoutId(null);
                    } else if (checkoutId != null) {
                        copy.setCurrentCheckoutId(checkoutId);
                    }
                    updated = true;
                    break;
                }
            }
        }
        
        // Secondary fallback match by checkoutId if copyNo mismatch or null
        if (!updated && checkoutId != null) {
            for (BookCopy copy : copies) {
                if (checkoutId.equals(copy.getCurrentCheckoutId())) {
                    copy.setStatus(targetStatus);
                    if (clearCheckoutId) {
                        copy.setCurrentCheckoutId(null);
                    }
                    updated = true;
                    break;
                }
            }
        }

        if (updated) {
            List<Map<String, Object>> serializedCopies = bookService.copiesToListOfMaps(copies);
            transaction.update(bookRef, "copies", serializedCopies);
            List<Long> qrIds = BookService.extractQrIdsFromCopies(copies);
            transaction.update(bookRef, "qrIds", qrIds);
        }
    }

    private void recordGeofenceFailure(String memberId, String bookId, Double clientLat, Double clientLon, CheckoutSettings settings, double distance) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("id", java.util.UUID.randomUUID().toString());
            data.put("memberId", memberId);
            data.put("bookId", bookId);
            data.put("attemptedLatitude", clientLat);
            data.put("attemptedLongitude", clientLon);
            data.put("requiredLatitude", settings != null ? settings.getLibraryLatitude() : null);
            data.put("requiredLongitude", settings != null ? settings.getLibraryLongitude() : null);
            data.put("allowedRadius", settings != null ? (settings.getValidRadiusMeters() != null ? settings.getValidRadiusMeters() : 100.0) : 100.0);
            data.put("calculatedDistance", distance);
            data.put("timestamp", com.google.cloud.Timestamp.now());
            
            firestore.collection("geofence_failures").document((String) data.get("id")).set(data).get();
            log.info("Recorded geofence failure for user {} attempting book return {}", memberId, bookId);
        } catch (Exception e) {
            log.error("Failed to write geofence failure log to Firestore", e);
        }
    }

    private DocumentSnapshot resolveBookDocument(String isbn, com.google.cloud.firestore.Transaction transaction) throws Exception {
        if (isbn == null || isbn.isBlank()) {
            return null;
        }
        String cleanIsbn = isbn.trim().replace("-", "");
        
        // 1. Query by isbn field
        Query isbnQuery = firestore.collection("books").whereEqualTo("isbn", cleanIsbn).limit(1);
        QuerySnapshot isbnSnap = transaction.get(isbnQuery).get();
        if (!isbnSnap.isEmpty()) {
            return isbnSnap.getDocuments().get(0);
        }
        
        // 2. Query by alternativeIsbns list
        Query altQuery = firestore.collection("books").whereArrayContains("alternativeIsbns", cleanIsbn).limit(1);
        QuerySnapshot altSnap = transaction.get(altQuery).get();
        if (!altSnap.isEmpty()) {
            return altSnap.getDocuments().get(0);
        }
        
        // 3. Fallback to document ID
        DocumentReference docRef = firestore.collection("books").document(cleanIsbn);
        DocumentSnapshot docSnap = transaction.get(docRef).get();
        if (docSnap.exists()) {
            return docSnap;
        }
        
        return null;
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

