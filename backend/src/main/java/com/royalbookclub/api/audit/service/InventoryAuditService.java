package com.royalbookclub.api.audit.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.audit.model.InventoryAudit;
import com.royalbookclub.api.book.model.Book;
import com.royalbookclub.api.book.service.BookService;
import com.royalbookclub.api.common.exception.BusinessRuleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class InventoryAuditService {

    private static final Logger log = LoggerFactory.getLogger(InventoryAuditService.class);
    private static final String COLLECTION_NAME = "inventory_audits";

    private final Firestore firestore;
    private final BookService bookService;

    public InventoryAuditService(Firestore firestore, BookService bookService) {
        this.firestore = firestore;
        this.bookService = bookService;
    }

    /**
     * Start a new active inventory audit session.
     * Completes any existing ACTIVE sessions first.
     */
    public InventoryAudit startAudit(String curatorId) {
        log.info("Curator {} is starting a new inventory audit session", curatorId);
        
        // Complete any active session
        getActiveAudit(curatorId).ifPresent(active -> {
            log.info("Completing pre-existing active session {}", active.getId());
            completeAudit(active.getId());
        });

        String auditId = UUID.randomUUID().toString();
        List<Book> allBooks = bookService.getAllBooks();
        List<String> allIsbns = allBooks.stream()
                .map(Book::getIsbn)
                .filter(isbn -> isbn != null && !isbn.isBlank())
                .collect(Collectors.toList());

        InventoryAudit audit = InventoryAudit.builder()
                .id(auditId)
                .status("ACTIVE")
                .curatorId(curatorId)
                .startedAt(Instant.now())
                .auditedIsbns(new ArrayList<>())
                .missingIsbns(allIsbns)
                .build();

        try {
            firestore.collection(COLLECTION_NAME).document(auditId).set(auditToMap(audit)).get();
            return audit;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to start audit session", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to start audit session", e);
        }
    }

    /**
     * Get the active audit session for a curator, if any.
     */
    public Optional<InventoryAudit> getActiveAudit(String curatorId) {
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection(COLLECTION_NAME)
                    .whereEqualTo("curatorId", curatorId)
                    .whereEqualTo("status", "ACTIVE")
                    .limit(1)
                    .get();
            List<com.google.cloud.firestore.QueryDocumentSnapshot> docs = query.get().getDocuments();
            if (!docs.isEmpty()) {
                return Optional.of(mapToAudit(docs.get(0)));
            }
            return Optional.empty();
        } catch (Exception e) {
            log.error("Error retrieving active audit", e);
            return Optional.empty();
        }
    }

    /**
     * Fetch a specific audit by ID.
     */
    public Optional<InventoryAudit> getAuditById(String auditId) {
        try {
            DocumentSnapshot doc = firestore.collection(COLLECTION_NAME).document(auditId).get().get();
            if (doc.exists()) {
                return Optional.of(mapToAudit(doc));
            }
            return Optional.empty();
        } catch (Exception e) {
            log.error("Error fetching audit by ID {}", auditId, e);
            return Optional.empty();
        }
    }

    /**
     * Scan an item (by ISBN or Tag UID) inside an active audit session.
     */
    public InventoryAudit scanItem(String auditId, String identifier) {
        log.info("Scanning identifier {} in audit {}", identifier, auditId);
        InventoryAudit audit = getAuditById(auditId)
                .orElseThrow(() -> new BusinessRuleException("Audit session not found."));

        if (!"ACTIVE".equals(audit.getStatus())) {
            throw new BusinessRuleException("Cannot scan items in a completed audit session.");
        }

        // Try lookup by ISBN
        Optional<Book> optBook = bookService.getBookByIsbn(identifier);
        
        // If not found, try lookup by NFC Tag UID
        if (optBook.isEmpty()) {
            Book tagBook = bookService.getBookByNtagUid(identifier);
            if (tagBook != null) {
                optBook = Optional.of(tagBook);
            }
        }

        if (optBook.isEmpty()) {
            throw new BusinessRuleException("Book not found for identifier: " + identifier);
        }

        Book book = optBook.get();
        String isbn = book.getIsbn();

        // Add to auditedIsbns list (scanned counts can duplicate to support multi-copy auditing)
        audit.getAuditedIsbns().add(isbn);
        
        // Remove from missingIsbns list
        audit.getMissingIsbns().remove(isbn);

        try {
            firestore.collection(COLLECTION_NAME).document(auditId).set(auditToMap(audit)).get();
            return audit;
        } catch (Exception e) {
            throw new RuntimeException("Failed to update audit session scan", e);
        }
    }

    /**
     * Complete the audit session and automatically reconcile book catalog stocks.
     */
    public InventoryAudit completeAudit(String auditId) {
        log.info("Completing inventory audit session {}", auditId);
        InventoryAudit audit = getAuditById(auditId)
                .orElseThrow(() -> new BusinessRuleException("Audit session not found."));

        if ("COMPLETED".equals(audit.getStatus())) {
            return audit;
        }

        audit.setStatus("COMPLETED");
        audit.setCompletedAt(Instant.now());

        // Perform Reconciliation
        // Group scans to find audited count per ISBN
        Map<String, Long> scanCounts = audit.getAuditedIsbns().stream()
                .collect(Collectors.groupingBy(isbn -> isbn, Collectors.counting()));

        List<Book> allBooks = bookService.getAllBooks();
        for (Book book : allBooks) {
            String isbn = book.getIsbn();
            long actualScanned = scanCounts.getOrDefault(isbn, 0L);
            long expected = book.getTotalCopies() != null ? book.getTotalCopies() : 0L;

            if (actualScanned < expected) {
                long missingCount = expected - actualScanned;
                int newTotal = (int) actualScanned;
                int currentAvailable = book.getAvailableCopies() != null ? book.getAvailableCopies() : 0;
                int newAvailable = Math.max(0, currentAvailable - (int) missingCount);

                log.warn("Reconciling ISBN {}: Scanned {} / Expected {}. Updating total to {}, available to {}", 
                        isbn, actualScanned, expected, newTotal, newAvailable);

                // Update book copy count
                book.setTotalCopies(newTotal);
                book.setAvailableCopies(newAvailable);
                
                try {
                    // Save the updated book back to catalog
                    bookService.updateBookCopies(isbn, newTotal, newAvailable);
                } catch (Exception e) {
                    log.error("Failed to update reconciled book copies for ISBN {}", isbn, e);
                }
            }
        }

        try {
            firestore.collection(COLLECTION_NAME).document(auditId).set(auditToMap(audit)).get();
            return audit;
        } catch (Exception e) {
            throw new RuntimeException("Failed to save completed audit session", e);
        }
    }

    private Map<String, Object> auditToMap(InventoryAudit audit) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", audit.getId());
        map.put("status", audit.getStatus());
        map.put("curatorId", audit.getCuratorId());
        map.put("startedAt", audit.getStartedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(audit.getStartedAt().getEpochSecond(), audit.getStartedAt().getNano()) : null);
        map.put("completedAt", audit.getCompletedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(audit.getCompletedAt().getEpochSecond(), audit.getCompletedAt().getNano()) : null);
        map.put("auditedIsbns", audit.getAuditedIsbns() != null ? audit.getAuditedIsbns() : new ArrayList<>());
        map.put("missingIsbns", audit.getMissingIsbns() != null ? audit.getMissingIsbns() : new ArrayList<>());
        return map;
    }

    @SuppressWarnings("unchecked")
    private InventoryAudit mapToAudit(DocumentSnapshot doc) {
        if (!doc.exists()) return null;

        com.google.cloud.Timestamp startedTimestamp = doc.getTimestamp("startedAt");
        com.google.cloud.Timestamp completedTimestamp = doc.getTimestamp("completedAt");

        List<String> auditedIsbns = (List<String>) doc.get("auditedIsbns");
        List<String> missingIsbns = (List<String>) doc.get("missingIsbns");

        return InventoryAudit.builder()
                .id(doc.getString("id"))
                .status(doc.getString("status"))
                .curatorId(doc.getString("curatorId"))
                .startedAt(startedTimestamp != null ? Instant.ofEpochSecond(startedTimestamp.getSeconds(), startedTimestamp.getNanos()) : null)
                .completedAt(completedTimestamp != null ? Instant.ofEpochSecond(completedTimestamp.getSeconds(), completedTimestamp.getNanos()) : null)
                .auditedIsbns(auditedIsbns != null ? auditedIsbns : new ArrayList<>())
                .missingIsbns(missingIsbns != null ? missingIsbns : new ArrayList<>())
                .build();
    }
}
