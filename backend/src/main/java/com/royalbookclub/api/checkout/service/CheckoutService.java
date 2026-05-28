package com.royalbookclub.api.checkout.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.royalbookclub.api.checkout.dto.CheckoutRequestDto;
import com.royalbookclub.api.checkout.dto.ReturnRequestDto;
import com.royalbookclub.api.checkout.model.Checkout;
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

    public CheckoutService(Firestore firestore) {
        this.firestore = firestore;
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

                Map<String, Object> checkoutData = new HashMap<>();
                checkoutData.put("id", checkoutId);
                checkoutData.put("bookId", cleanIsbn);
                checkoutData.put("memberId", memberId);
                checkoutData.put("status", "CHECKED_OUT");
                checkoutData.put("checkedOutAt", toTimestamp(checkedOutAt));
                checkoutData.put("dueDate", toTimestamp(dueDate));
                checkoutData.put("returnedAt", null);

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
                        "returnedAt", com.google.cloud.Timestamp.now()
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
                .build();
    }
}
