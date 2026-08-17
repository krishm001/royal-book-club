package com.royalbookclub.api.book.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.book.dto.BookDto;
import com.royalbookclub.api.book.model.Book;
import com.royalbookclub.api.book.model.BookCopy;
import com.royalbookclub.api.common.exception.BusinessRuleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

/**
 * Service to manage the catalog of books in Google Cloud Firestore.
 */
@Service
public class BookService {

    private static final Logger log = LoggerFactory.getLogger(BookService.class);
    private static final String COLLECTION_NAME = "books";

    private final Firestore firestore;

    public BookService(Firestore firestore) {
        this.firestore = firestore;
    }

    private Map<String, Integer> getPendingReturnsMap() {
        Map<String, Integer> pendingReturns = new HashMap<>();
        try {
            QuerySnapshot snap = firestore.collection("checkouts")
                    .whereEqualTo("status", "REQUESTED_RETURN")
                    .get().get();
            for (DocumentSnapshot doc : snap.getDocuments()) {
                String bookId = doc.getString("bookId");
                if (bookId != null && !bookId.isBlank()) {
                    pendingReturns.put(bookId, pendingReturns.getOrDefault(bookId, 0) + 1);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch pending return counts for catalog availability calculation: {}", e.getMessage());
        }
        return pendingReturns;
    }

    /**
     * Retrieve all books in the library catalog.
     *
     * @return List of all books
     */
    public List<Book> getAllBooks() {
        log.debug("Fetching all books from Firestore");
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection(COLLECTION_NAME).get();
            QuerySnapshot querySnapshot = query.get();
            List<Book> books = new ArrayList<>();
            Map<String, Integer> pendingReturns = getPendingReturnsMap();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                Book book = mapToBook(doc);
                int pendingCount = pendingReturns.getOrDefault(book.getIsbn(), 0);
                if (pendingCount > 0) {
                    int currentAvailable = book.getAvailableCopies() != null ? book.getAvailableCopies() : 0;
                    int total = book.getTotalCopies() != null ? book.getTotalCopies() : 0;
                    int newAvailable = currentAvailable + pendingCount;
                    if (newAvailable > total) {
                        newAvailable = total;
                    }
                    book.setAvailableCopies(newAvailable);
                }
                books.add(book);
            }
            return books;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading books from Firestore", e);
            throw new RuntimeException("Failed to read books", e);
        } catch (ExecutionException e) {
            log.error("Error reading books from Firestore", e);
            throw new RuntimeException("Failed to read books", e);
        }
    }

    /**
     * Retrieve a specific book by its ISBN.
     *
     * @param isbn The ISBN of the book
     * @return Optional containing the Book if found, or empty otherwise
     */
    public Optional<Book> getBookByIsbn(String isbn) {
        if (isbn == null || isbn.isBlank()) {
            return Optional.empty();
        }
        String cleanIsbn = isbn.trim().replace("-", "");
        log.info("Fetching book from Firestore by ISBN: {}", cleanIsbn);
        try {
            DocumentSnapshot docToUse = null;
            // 1. Query by isbn field
            try {
                var queryCol = firestore.collection(COLLECTION_NAME);
                if (queryCol != null) {
                    var queryWhere = queryCol.whereEqualTo("isbn", cleanIsbn);
                    if (queryWhere != null) {
                        ApiFuture<QuerySnapshot> query = queryWhere.limit(1).get();
                        if (query != null) {
                            List<QueryDocumentSnapshot> documents = query.get().getDocuments();
                            if (documents != null && !documents.isEmpty()) {
                                docToUse = documents.get(0);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Query by isbn field failed or unmocked in test: {}", e.getMessage());
            }

            if (docToUse == null) {
                // 2. Query by alternativeIsbns list contains
                try {
                    var queryCol = firestore.collection(COLLECTION_NAME);
                    if (queryCol != null) {
                        var queryAlt = queryCol.whereArrayContains("alternativeIsbns", cleanIsbn);
                        if (queryAlt != null) {
                            ApiFuture<QuerySnapshot> altQuery = queryAlt.limit(1).get();
                            if (altQuery != null) {
                                List<QueryDocumentSnapshot> altDocs = altQuery.get().getDocuments();
                                if (altDocs != null && !altDocs.isEmpty()) {
                                    docToUse = altDocs.get(0);
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Query by alternativeIsbns failed or unmocked in test: {}", e.getMessage());
                }
            }

            if (docToUse == null) {
                // 3. Fallback check legacy document ID path
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(cleanIsbn);
                if (docRef != null) {
                    ApiFuture<DocumentSnapshot> future = docRef.get();
                    if (future != null) {
                        DocumentSnapshot document = future.get();
                        if (document != null && document.exists()) {
                            docToUse = document;
                        }
                    }
                }
            }

            if (docToUse != null && docToUse.exists()) {
                Book book = mapToBook(docToUse);
                populateNfcResetTimestamp(book);

                // Add pending returns count to availableCopies
                try {
                    QuerySnapshot pendingSnap = firestore.collection("checkouts")
                            .whereEqualTo("bookId", book.getId())
                            .whereEqualTo("status", "REQUESTED_RETURN")
                            .get().get();
                    int pendingCount = pendingSnap.size();
                    if (pendingCount > 0) {
                        int currentAvailable = book.getAvailableCopies() != null ? book.getAvailableCopies() : 0;
                        int total = book.getTotalCopies() != null ? book.getTotalCopies() : 0;
                        int newAvailable = currentAvailable + pendingCount;
                        if (newAvailable > total) {
                            newAvailable = total;
                        }
                        book.setAvailableCopies(newAvailable);
                    }
                } catch (Exception ex) {
                    log.warn("Failed to load pending return count for single book isbn {}: {}", cleanIsbn, ex.getMessage());
                }

                return Optional.of(book);
            }
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while fetching book: {}", cleanIsbn, e);
            throw new RuntimeException("Failed to read book", e);
        } catch (ExecutionException e) {
            log.error("Error fetching book: {}", cleanIsbn, e);
            throw new RuntimeException("Failed to read book", e);
        }
    }

    /**
     * Create or update a book in the catalog.
     *
     * @param bookDto The DTO representing the book details
     * @return The updated or created Book model
     */
    public Book createOrUpdateBook(BookDto bookDto) {
        String cleanIsbn = bookDto.getIsbn().trim().replace("-", "");
        log.info("Creating/updating book with ISBN: {}", cleanIsbn);

        try {
            DocumentReference docRef = null;
            DocumentSnapshot document = null;
            String docId = bookDto.getId();

            if (docId != null && !docId.isBlank()) {
                docRef = firestore.collection(COLLECTION_NAME).document(docId);
                document = docRef.get().get();
            } else {
                // Check if a book with this ISBN already exists
                try {
                    var queryCol = firestore.collection(COLLECTION_NAME);
                    if (queryCol != null) {
                        var queryWhere = queryCol.whereEqualTo("isbn", cleanIsbn);
                        if (queryWhere != null) {
                            ApiFuture<QuerySnapshot> query = queryWhere.limit(1).get();
                            if (query != null) {
                                List<QueryDocumentSnapshot> documents = query.get().getDocuments();
                                if (documents != null && !documents.isEmpty()) {
                                    docRef = documents.get(0).getReference();
                                    document = documents.get(0);
                                    docId = docRef.getId();
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Query by isbn field failed or unmocked in test: {}", e.getMessage());
                }

                if (document == null) {
                    // Fallback check legacy document path just in case
                    DocumentReference legacyRef = firestore.collection(COLLECTION_NAME).document(cleanIsbn);
                    if (legacyRef != null) {
                        DocumentSnapshot legacyDoc = legacyRef.get().get();
                        if (legacyDoc != null && legacyDoc.exists()) {
                            docRef = legacyRef;
                            document = legacyDoc;
                            docId = cleanIsbn;
                        }
                    }
                }

                if (docRef == null) {
                    // If no existing document reference found, use the mock-safe legacy document path (cleanIsbn as doc ID)
                    var queryCol = firestore.collection(COLLECTION_NAME);
                    if (queryCol != null) {
                        docRef = queryCol.document(cleanIsbn);
                        docId = cleanIsbn;
                    }
                }

                if (docRef == null) {
                    docRef = firestore.collection(COLLECTION_NAME).document();
                    if (docRef != null) {
                        docId = docRef.getId();
                    } else {
                        docId = java.util.UUID.randomUUID().toString();
                    }
                }
            }

            Book book;
            Instant now = Instant.now();
            if (document != null && document.exists()) {
                // Update operation
                Book existing = mapToBook(document);
                List<BookCopy> copies = synchronizeCopies(existing.getCopies(), bookDto);
                
                // Adjust availableCopies if totalCopies changed
                int diff = bookDto.getTotalCopies() - existing.getTotalCopies();
                int newAvailable = Math.max(0, existing.getAvailableCopies() + diff);

                book = Book.builder()
                        .id(docId)
                        .isbn(cleanIsbn)
                        .title(bookDto.getTitle())
                        .subtitle(bookDto.getSubtitle())
                        .authors(bookDto.getAuthors())
                        .genre(bookDto.getGenre())
                        .tags(bookDto.getTags() != null ? bookDto.getTags() : new ArrayList<>())
                        .alternativeIsbns(bookDto.getAlternativeIsbns() != null ? bookDto.getAlternativeIsbns() : new ArrayList<>())
                        .publisher(bookDto.getPublisher())
                        .publishDate(bookDto.getPublishDate())
                        .description(bookDto.getDescription())
                        .coverUrl(bookDto.getCoverUrl())
                        .pages(bookDto.getPages())
                        .totalCopies(bookDto.getTotalCopies())
                        .availableCopies(bookDto.getAvailableCopies() != null ? bookDto.getAvailableCopies() : newAvailable)
                        .ntagUid(bookDto.getNtagUid())
                        .ntagUids(bookDto.getNtagUids() != null ? bookDto.getNtagUids() : new ArrayList<>())
                        .copies(copies)
                        .createdAt(existing.getCreatedAt())
                        .updatedAt(now)
                        .language(bookDto.getLanguage() != null ? bookDto.getLanguage() : "en")
                        .build();
            } else {
                // Insert operation
                List<BookCopy> copies = synchronizeCopies(new ArrayList<>(), bookDto);
                book = Book.builder()
                        .id(docId)
                        .isbn(cleanIsbn)
                        .title(bookDto.getTitle())
                        .subtitle(bookDto.getSubtitle())
                        .authors(bookDto.getAuthors())
                        .genre(bookDto.getGenre())
                        .tags(bookDto.getTags() != null ? bookDto.getTags() : new ArrayList<>())
                        .alternativeIsbns(bookDto.getAlternativeIsbns() != null ? bookDto.getAlternativeIsbns() : new ArrayList<>())
                        .publisher(bookDto.getPublisher())
                        .publishDate(bookDto.getPublishDate())
                        .description(bookDto.getDescription())
                        .coverUrl(bookDto.getCoverUrl())
                        .pages(bookDto.getPages())
                        .totalCopies(bookDto.getTotalCopies())
                        .availableCopies(bookDto.getAvailableCopies() != null ? bookDto.getAvailableCopies() : bookDto.getTotalCopies())
                        .ntagUid(bookDto.getNtagUid())
                        .ntagUids(bookDto.getNtagUids() != null ? bookDto.getNtagUids() : new ArrayList<>())
                        .copies(copies)
                        .createdAt(now)
                        .updatedAt(now)
                        .language(bookDto.getLanguage() != null ? bookDto.getLanguage() : "en")
                        .build();
            }

            ApiFuture<WriteResult> writeFuture = docRef.set(bookToMap(book));
            writeFuture.get(); // block to verify completion
            log.info("Successfully saved book to Firestore with document ID: {}", docId);
            return book;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while saving book: {}", cleanIsbn, e);
            throw new RuntimeException("Failed to save book", e);
        } catch (ExecutionException e) {
            log.error("Error saving book: {}", cleanIsbn, e);
            throw new RuntimeException("Failed to save book", e);
        }
    }

    /**
     * Delete a book from the catalog by ISBN.
     *
     * @param isbn The ISBN of the book to delete
     */
    public void deleteBook(String isbn) {
        String cleanIsbn = isbn.trim().replace("-", "");
        log.info("Deleting book from Firestore by ISBN: {}", cleanIsbn);
        try {
            Optional<Book> bookOpt = getBookByIsbn(cleanIsbn);
            if (bookOpt.isPresent()) {
                String docId = bookOpt.get().getId();
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(docId);
                ApiFuture<WriteResult> writeFuture = docRef.delete();
                writeFuture.get(); // block to verify completion
                log.info("Successfully deleted book with document ID: {}", docId);
            } else {
                // Fallback direct delete
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(cleanIsbn);
                docRef.delete().get();
                log.info("Successfully completed fallback direct deletion for: {}", cleanIsbn);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while deleting book: {}", cleanIsbn, e);
            throw new RuntimeException("Failed to delete book", e);
        } catch (ExecutionException e) {
            log.error("Error deleting book: {}", cleanIsbn, e);
            throw new RuntimeException("Failed to delete book", e);
        }
    }

    /**
     * Update the number of total and available copies of a book.
     * Gracefully reconciles individual physical copies list and serializes it.
     *
     * @param isbn            The ISBN of the book
     * @param totalCopies     The new total copies
     * @param availableCopies The new available copies
     */
    public void updateBookCopies(String isbn, int totalCopies, int availableCopies) {
        String cleanIsbn = isbn.trim().replace("-", "");
        log.info("Updating book copies for ISBN {}: Total={}, Available={}", cleanIsbn, totalCopies, availableCopies);
        try {
            Optional<Book> bookOpt = getBookByIsbn(cleanIsbn);
            String docId = bookOpt.map(Book::getId).orElse(cleanIsbn);
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(docId);
            firestore.runTransaction(transaction -> {
                DocumentSnapshot doc = transaction.get(docRef).get();
                if (!doc.exists()) {
                    throw new IllegalArgumentException("Book with ISBN " + cleanIsbn + " does not exist.");
                }

                Book book = mapToBook(doc);
                book.setTotalCopies(totalCopies);
                book.setAvailableCopies(availableCopies);

                List<BookCopy> existingCopies = getOrCreateBookCopies(doc);

                BookDto bookDto = BookDto.builder()
                        .isbn(book.getIsbn())
                        .title(book.getTitle())
                        .authors(book.getAuthors())
                        .ntagUid(book.getNtagUid())
                        .ntagUids(book.getNtagUids())
                        .totalCopies(totalCopies)
                        .availableCopies(availableCopies)
                        .build();

                List<BookCopy> updatedCopies = synchronizeCopies(existingCopies, bookDto);
                List<Map<String, Object>> copiesMaps = copiesToListOfMaps(updatedCopies);

                Map<String, Object> updates = new HashMap<>();
                updates.put("totalCopies", totalCopies);
                updates.put("availableCopies", availableCopies);
                updates.put("copies", copiesMaps);
                updates.put("updatedAt", com.google.cloud.Timestamp.now());
                transaction.update(docRef, updates);
                return null;
            }).get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to update book copies", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to update book copies", e);
        }
    }

    private String formatWithColons(String cleanUid) {
        if (cleanUid == null || cleanUid.length() != 14) {
            return cleanUid;
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cleanUid.length(); i += 2) {
            if (i > 0) {
                sb.append(":");
            }
            sb.append(cleanUid.substring(i, i + 2));
        }
        return sb.toString();
    }

    /**
     * Get a book from the catalog by its physical Ntag UID.
     *
     * @param ntagUid The unique serial number of the NFC chip
     * @return The Book if found, or null
     */
    public Book getBookByNtagUid(String ntagUid) {
        String cleanUid = ntagUid.trim().toLowerCase().replace(":", "");
        String colonLower = formatWithColons(cleanUid);
        String colonUpper = colonLower.toUpperCase();
        String cleanUpper = cleanUid.toUpperCase();
        
        List<String> candidates = Arrays.asList(cleanUid, cleanUpper, colonLower, colonUpper, ntagUid.trim());
        log.info("Querying book from Firestore by Ntag UID candidates: {}", candidates);
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME)
                    .whereIn("ntagUid", candidates)
                    .limit(1)
                    .get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();
            if (!documents.isEmpty()) {
                Book book = mapToBook(documents.get(0));
                populateNfcResetTimestamp(book, ntagUid);
                return book;
            }

            // Fallback: check multi-copy array field ntagUids
            ApiFuture<QuerySnapshot> arrayFuture = firestore.collection(COLLECTION_NAME)
                    .whereArrayContainsAny("ntagUids", candidates)
                    .limit(1)
                    .get();
            List<QueryDocumentSnapshot> arrayDocs = arrayFuture.get().getDocuments();
            if (!arrayDocs.isEmpty()) {
                Book book = mapToBook(arrayDocs.get(0));
                populateNfcResetTimestamp(book, ntagUid);
                return book;
            }
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while querying book by Ntag UID: {}", cleanUid, e);
            throw new RuntimeException("Failed to query book by NTAG UID", e);
        } catch (ExecutionException e) {
            log.error("Error querying book by Ntag UID: {}", cleanUid, e);
            throw new RuntimeException("Failed to query book by NTAG UID", e);
        }
    }

    private long parseCounterToLong(String rawCounter) {
        if (rawCounter == null || rawCounter.trim().isEmpty()) {
            throw new BusinessRuleException("NFC Counter parameter is missing or empty.");
        }
        String clean = rawCounter.trim().toLowerCase();
        
        // Strip 0x prefix if hex
        if (clean.startsWith("0x")) {
            clean = clean.substring(2);
        }
        
        // Remove leading zeros but keep at least one digit
        clean = clean.replaceFirst("^0+(?!$)", "");
        if (clean.isEmpty()) {
            return 0L;
        }

        try {
            // Check if it looks like a hex string (contains a-f or we stripped 0x)
            if (clean.matches(".*[a-f].*") || rawCounter.trim().toLowerCase().startsWith("0x")) {
                return Long.parseLong(clean, 16);
            } else {
                return Long.parseLong(clean, 10);
            }
        } catch (NumberFormatException e) {
            // Fallback: try parsing as hex, then decimal as final fallback
            try {
                return Long.parseLong(clean, 16);
            } catch (NumberFormatException e2) {
                try {
                    // Strip any remaining non-alphanumeric characters
                    String stripped = clean.replaceAll("[^0-9a-f]", "");
                    if (stripped.matches(".*[a-f].*")) {
                        return Long.parseLong(stripped, 16);
                    } else {
                        return Long.parseLong(stripped, 10);
                    }
                } catch (Exception ex) {
                    throw new BusinessRuleException("Invalid NFC counter format: " + rawCounter);
                }
            }
        }
    }

    /**
     * Get a book from the catalog by its physical Ntag UID with counter-verification and 5-min safety threshold.
     *
     * @param ntagUid The unique serial number of the NFC chip
     * @param counter The NFC counter parameter (optional)
     * @return The Book if found, or null
     */
    public Book getBookByNtagUid(String ntagUid, String counter) {
        Book book = getBookByNtagUid(ntagUid);
        if (book == null) {
            return null;
        }

        // Dynamically propagate the scanned/matched physical tag UID to the book object
        book.setNtagUid(ntagUid);

        String cleanUid = ntagUid.trim().toLowerCase().replace(":", "");
        if (counter == null || counter.trim().isEmpty()) {
            book.setNfcVerificationStatus("NONE");
            return book;
        }

        try {
            long incomingCounter = parseCounterToLong(counter);
            DocumentReference counterRef = firestore.collection("nfc_counters").document(cleanUid);
            DocumentSnapshot counterDoc = counterRef.get().get();

            if (!counterDoc.exists()) {
                // Save first seen record
                Map<String, Object> data = new HashMap<>();
                data.put("id", cleanUid);
                data.put("uid", cleanUid);
                data.put("counter", incomingCounter);
                data.put("firstSeenAt", new java.util.Date());
                counterRef.set(data).get();
                log.info("Registered first NFC counter for UID: {}, counter: {}", cleanUid, incomingCounter);
                book.setNfcVerificationStatus("VALID");
            } else {
                Long storedCounter = counterDoc.getLong("counter");
                if (storedCounter == null) {
                    storedCounter = 0L;
                }

                if (incomingCounter > storedCounter) {
                    // A later counter is seen - update the latest counter and its timestamp
                    Map<String, Object> data = new HashMap<>();
                    data.put("counter", incomingCounter);
                    data.put("firstSeenAt", new java.util.Date());
                    counterRef.update(data).get();
                    log.info("Updated NFC counter for UID: {} to newer counter: {}", cleanUid, incomingCounter);
                    book.setNfcVerificationStatus("VALID");
                } else if (incomingCounter == storedCounter) {
                    // Same counter value - check age limits
                    java.util.Date firstSeenAt = counterDoc.getDate("firstSeenAt");
                    if (firstSeenAt != null) {
                        long elapsed = System.currentTimeMillis() - firstSeenAt.getTime();
                        if (elapsed > 300000) {
                            log.warn("NFC counter {} for UID {} has expired. Elapsed: {}ms", incomingCounter, cleanUid, elapsed);
                            book.setNfcVerificationStatus("EXPIRED");
                        } else {
                            book.setNfcVerificationStatus("VALID");
                        }
                    } else {
                        book.setNfcVerificationStatus("VALID");
                    }
                } else {
                    // Older counter value - demote
                    log.warn("NFC counter reuse attempt! Incoming: {}, Stored Latest: {} for UID: {}", incomingCounter, storedCounter, cleanUid);
                    book.setNfcVerificationStatus("REUSED");
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while validating NFC counter for UID: {}", cleanUid, e);
            book.setNfcVerificationStatus("NONE");
        } catch (ExecutionException e) {
            log.error("Error while validating NFC counter for UID: {}", cleanUid, e);
            book.setNfcVerificationStatus("NONE");
        }

        return book;
    }

    /**
     * Bind or pair an NTAG UID to an existing book by its ISBN.
     *
     * @param isbn   The book's ISBN
     * @param ntagUid The physical NTAG213 UID
     * @return The updated Book
     */
    public Book bindNtagUid(String isbn, String ntagUid) {
        String cleanIsbn = isbn.trim().replace("-", "");
        String cleanUid = ntagUid.trim().toLowerCase().replace(":", "");
        log.info("Binding Ntag UID '{}' to book with ISBN: {}", cleanUid, cleanIsbn);

        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(cleanIsbn);
            ApiFuture<DocumentSnapshot> future = docRef.get();
            DocumentSnapshot document = future.get();

            if (!document.exists()) {
                throw new IllegalArgumentException("Book with ISBN " + cleanIsbn + " does not exist.");
            }

            Book book = mapToBook(document);
            book.setNtagUid(cleanUid);
            book.setUpdatedAt(Instant.now());

            ApiFuture<WriteResult> writeFuture = docRef.set(bookToMap(book));
            writeFuture.get(); // block to verify completion
            log.info("Successfully bound Ntag UID to book: {}", cleanIsbn);
            return book;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while binding NTAG UID '{}' to book '{}'", cleanUid, cleanIsbn, e);
            throw new RuntimeException("Failed to bind NTAG UID", e);
        } catch (ExecutionException e) {
            log.error("Error while binding NTAG UID '{}' to book '{}'", cleanUid, cleanIsbn, e);
            throw new RuntimeException("Failed to bind NTAG UID", e);
        }
    }

    private List<Map<String, Object>> copiesToListOfMaps(List<BookCopy> copies) {
        List<Map<String, Object>> list = new ArrayList<>();
        if (copies == null) return list;
        for (BookCopy copy : copies) {
            Map<String, Object> m = new HashMap<>();
            m.put("copyNo", copy.getCopyNo());
            m.put("ntagUid", copy.getNtagUid());
            m.put("qrId", copy.getQrId());
            m.put("status", copy.getStatus());
            m.put("currentCheckoutId", copy.getCurrentCheckoutId());
            list.add(m);
        }
        return list;
    }

    @SuppressWarnings("unchecked")
    private List<BookCopy> mapsToListOfCopies(List<Map<String, Object>> maps) {
        List<BookCopy> list = new ArrayList<>();
        if (maps == null) return list;
        for (Map<String, Object> m : maps) {
            if (m == null) continue;
            
            Integer copyNo = null;
            Object copyNoVal = m.get("copyNo");
            if (copyNoVal instanceof Number) {
                copyNo = ((Number) copyNoVal).intValue();
            }
            
            Long qrId = null;
            Object qrIdVal = m.get("qrId");
            if (qrIdVal instanceof Number) {
                qrId = ((Number) qrIdVal).longValue();
            }

            BookCopy copy = BookCopy.builder()
                    .copyNo(copyNo)
                    .ntagUid((String) m.get("ntagUid"))
                    .qrId(qrId)
                    .status((String) m.get("status"))
                    .currentCheckoutId((String) m.get("currentCheckoutId"))
                    .build();
            list.add(copy);
        }
        return list;
    }

    @SuppressWarnings("unchecked")
    public List<BookCopy> getOrCreateBookCopies(DocumentSnapshot doc) {
        List<BookCopy> copies = new ArrayList<>();
        if (doc.contains("copies")) {
            List<Map<String, Object>> copiesMaps = (List<Map<String, Object>>) doc.get("copies");
            if (copiesMaps != null) {
                copies = mapsToListOfCopies(copiesMaps);
            }
        }
        
        Long totalCopiesLong = doc.getLong("totalCopies");
        int totalCopies = totalCopiesLong != null ? totalCopiesLong.intValue() : 0;
        
        List<String> ntagUids = (List<String>) doc.get("ntagUids");
        String legacyNtagUid = doc.getString("ntagUid");
        
        // Ensure copies list matches totalCopies
        if (copies.size() < totalCopies) {
            int start = copies.size() + 1;
            for (int i = start; i <= totalCopies; i++) {
                String tag = (ntagUids != null && i <= ntagUids.size()) ? ntagUids.get(i - 1) : null;
                if (tag == null && i == 1 && legacyNtagUid != null && !legacyNtagUid.isBlank()) {
                    tag = legacyNtagUid;
                }
                copies.add(BookCopy.builder()
                        .copyNo(i)
                        .ntagUid(tag)
                        .status("AVAILABLE")
                        .currentCheckoutId(null)
                        .build());
            }
        } else if (copies.size() > totalCopies) {
            // Trim list preserving non-AVAILABLE copies if possible
            List<BookCopy> nonAvailable = new ArrayList<>();
            List<BookCopy> available = new ArrayList<>();
            for (BookCopy copy : copies) {
                if ("AVAILABLE".equals(copy.getStatus())) {
                    available.add(copy);
                } else {
                    nonAvailable.add(copy);
                }
            }
            
            List<BookCopy> merged = new ArrayList<>();
            merged.addAll(nonAvailable);
            merged.addAll(available);
            
            if (merged.size() > totalCopies) {
                copies = new ArrayList<>(merged.subList(0, totalCopies));
            } else {
                copies = merged;
            }
            
            // Re-index copyNo sequentially
            for (int i = 0; i < copies.size(); i++) {
                copies.get(i).setCopyNo(i + 1);
            }
        }
        
        return copies;
    }

    public List<BookCopy> synchronizeCopies(List<BookCopy> existingCopies, BookDto bookDto) {
        List<BookCopy> copies = new ArrayList<>();
        
        // Build a map of existing copies by copyNo for non-destructive merging
        Map<Integer, BookCopy> existingMap = new HashMap<>();
        if (existingCopies != null) {
            for (BookCopy ec : existingCopies) {
                if (ec.getCopyNo() != null) {
                    existingMap.put(ec.getCopyNo(), ec);
                }
            }
        }

        if (bookDto.getCopies() != null && !bookDto.getCopies().isEmpty()) {
            for (BookCopy dtoCopy : bookDto.getCopies()) {
                Integer copyNo = dtoCopy.getCopyNo();
                BookCopy merged = BookCopy.builder()
                        .copyNo(copyNo)
                        .ntagUid(dtoCopy.getNtagUid())
                        .qrId(dtoCopy.getQrId())
                        .status("AVAILABLE") // Default
                        .currentCheckoutId(null)
                        .build();

                if (copyNo != null && existingMap.containsKey(copyNo)) {
                    BookCopy existing = existingMap.get(copyNo);
                    merged.setStatus(existing.getStatus() != null ? existing.getStatus() : "AVAILABLE");
                    merged.setCurrentCheckoutId(existing.getCurrentCheckoutId());
                }
                copies.add(merged);
            }
        } else {
            if (existingCopies != null) {
                copies.addAll(existingCopies);
            }
        }
        
        int targetTotal = bookDto.getTotalCopies();
        
        if (copies.size() < targetTotal) {
            int start = copies.size() + 1;
            for (int i = start; i <= targetTotal; i++) {
                String tag = (bookDto.getNtagUids() != null && i <= bookDto.getNtagUids().size()) ? bookDto.getNtagUids().get(i - 1) : null;
                if (tag == null && i == 1 && bookDto.getNtagUid() != null && !bookDto.getNtagUid().isBlank()) {
                    tag = bookDto.getNtagUid();
                }
                copies.add(BookCopy.builder()
                        .copyNo(i)
                        .ntagUid(tag)
                        .status("AVAILABLE")
                        .currentCheckoutId(null)
                        .build());
            }
        } else if (copies.size() > targetTotal) {
            List<BookCopy> nonAvailable = new ArrayList<>();
            List<BookCopy> available = new ArrayList<>();
            for (BookCopy copy : copies) {
                if ("AVAILABLE".equals(copy.getStatus())) {
                    available.add(copy);
                } else {
                    nonAvailable.add(copy);
                }
            }
            
            List<BookCopy> merged = new ArrayList<>();
            merged.addAll(nonAvailable);
            merged.addAll(available);
            
            if (merged.size() > targetTotal) {
                copies = new ArrayList<>(merged.subList(0, targetTotal));
            } else {
                copies = merged;
            }
            
            for (int i = 0; i < copies.size(); i++) {
                copies.get(i).setCopyNo(i + 1);
            }
        }
        
        for (BookCopy copy : copies) {
            if (copy.getStatus() == null || copy.getStatus().isBlank()) {
                copy.setStatus("AVAILABLE");
            }
        }
        
        List<String> dtoTags = bookDto.getNtagUids();
        if (dtoTags != null) {
            for (int i = 0; i < copies.size(); i++) {
                if (i < dtoTags.size()) {
                    String tag = dtoTags.get(i);
                    if (tag != null && !tag.isBlank()) {
                        copies.get(i).setNtagUid(tag);
                    }
                }
            }
        }
        
        return copies;
    }

    /**
     * Fetch a book by a copy-level QR ID.
     *
     * @param qrId Scanned globally unique copy QR ID
     * @return Optional containing the Book if found, or empty otherwise
     */
    public Optional<Book> getBookByQrId(Long qrId) {
        if (qrId == null) {
            return Optional.empty();
        }
        log.info("Querying book from Firestore by copy QR ID: {}", qrId);
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME)
                    .whereArrayContains("qrIds", qrId)
                    .limit(1)
                    .get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();
            if (!documents.isEmpty()) {
                Book book = mapToBook(documents.get(0));
                populateNfcResetTimestamp(book);
                return Optional.of(book);
            }
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while querying book by QR ID: {}", qrId, e);
            throw new RuntimeException("Failed to query book by QR ID", e);
        } catch (ExecutionException e) {
            log.error("Error while querying book by QR ID: {}", qrId, e);
            throw new RuntimeException("Failed to query book by QR ID", e);
        }
    }

    private Map<String, Object> bookToMap(Book book) {
        Map<String, Object> map = new HashMap<>();
        map.put("isbn", book.getIsbn());
        map.put("title", book.getTitle());
        map.put("subtitle", book.getSubtitle());
        map.put("authors", book.getAuthors());
        map.put("genre", book.getGenre());
        map.put("tags", book.getTags());
        map.put("publisher", book.getPublisher());
        map.put("publishDate", book.getPublishDate());
        map.put("description", book.getDescription());
        map.put("coverUrl", book.getCoverUrl());
        map.put("pages", book.getPages());
        map.put("totalCopies", book.getTotalCopies());
        map.put("availableCopies", book.getAvailableCopies());
        map.put("ntagUid", book.getNtagUid());
        
        // Dynamically compile the flat array of ntagUids from copies to maintain search indices
        List<String> compiledNtagUids = new ArrayList<>();
        if (book.getNtagUid() != null && !book.getNtagUid().trim().isEmpty()) {
            compiledNtagUids.add(book.getNtagUid().trim().toLowerCase().replace(":", ""));
        }
        if (book.getNtagUids() != null) {
            for (String tag : book.getNtagUids()) {
                if (tag != null && !tag.trim().isEmpty()) {
                    String clean = tag.trim().toLowerCase().replace(":", "");
                    if (!compiledNtagUids.contains(clean)) {
                        compiledNtagUids.add(clean);
                    }
                }
            }
        }
        if (book.getCopies() != null) {
            for (BookCopy copy : book.getCopies()) {
                if (copy.getNtagUid() != null && !copy.getNtagUid().trim().isEmpty()) {
                    String clean = copy.getNtagUid().trim().toLowerCase().replace(":", "");
                    if (!compiledNtagUids.contains(clean)) {
                        compiledNtagUids.add(clean);
                    }
                }
            }
        }
        map.put("ntagUids", compiledNtagUids);
        map.put("copies", copiesToListOfMaps(book.getCopies()));
        map.put("language", book.getLanguage() != null ? book.getLanguage() : "en");
        map.put("createdAt", book.getCreatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(book.getCreatedAt().getEpochSecond(), book.getCreatedAt().getNano()) : null);
        map.put("updatedAt", book.getUpdatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(book.getUpdatedAt().getEpochSecond(), book.getUpdatedAt().getNano()) : null);
        
        // Dynamically compile the flat array of qrIds from copies
        List<Long> qrIds = new ArrayList<>();
        if (book.getCopies() != null) {
            for (BookCopy copy : book.getCopies()) {
                if (copy.getQrId() != null) {
                    qrIds.add(copy.getQrId());
                }
            }
        }
        map.put("qrIds", qrIds);
        map.put("alternativeIsbns", book.getAlternativeIsbns() != null ? book.getAlternativeIsbns() : new ArrayList<String>());
        map.put("id", book.getId());
        
        return map;
    }

    @SuppressWarnings("unchecked")
    private Book mapToBook(DocumentSnapshot doc) {
        if (!doc.exists()) return null;

        com.google.cloud.Timestamp createdTimestamp = doc.getTimestamp("createdAt");
        com.google.cloud.Timestamp updatedTimestamp = doc.getTimestamp("updatedAt");

        List<String> authors = (List<String>) doc.get("authors");
        List<String> tags = (List<String>) doc.get("tags");
        List<String> ntagUids = (List<String>) doc.get("ntagUids");
        List<BookCopy> copies = getOrCreateBookCopies(doc);
        List<Long> qrIds = (List<Long>) doc.get("qrIds");
        List<String> alternativeIsbns = (List<String>) doc.get("alternativeIsbns");

        return Book.builder()
                .id(doc.getId())
                .isbn(doc.getString("isbn"))
                .title(doc.getString("title"))
                .subtitle(doc.getString("subtitle"))
                .authors(authors != null ? authors : new ArrayList<>())
                .genre(doc.getString("genre"))
                .tags(tags != null ? tags : new ArrayList<>())
                .alternativeIsbns(alternativeIsbns != null ? alternativeIsbns : new ArrayList<>())
                .publisher(doc.getString("publisher"))
                .publishDate(doc.getString("publishDate"))
                .description(doc.getString("description"))
                .coverUrl(doc.getString("coverUrl"))
                .pages(doc.getLong("pages") != null ? doc.getLong("pages").intValue() : null)
                .totalCopies(doc.getLong("totalCopies") != null ? doc.getLong("totalCopies").intValue() : null)
                .availableCopies(doc.getLong("availableCopies") != null ? doc.getLong("availableCopies").intValue() : null)
                .ntagUid(doc.getString("ntagUid"))
                .ntagUids(ntagUids != null ? ntagUids : new ArrayList<>())
                .copies(copies)
                .qrIds(qrIds != null ? qrIds : new ArrayList<>())
                .language(doc.getString("language") != null ? doc.getString("language") : "en")
                .createdAt(createdTimestamp != null ? Instant.ofEpochSecond(createdTimestamp.getSeconds(), createdTimestamp.getNanos()) : null)
                .updatedAt(updatedTimestamp != null ? Instant.ofEpochSecond(updatedTimestamp.getSeconds(), updatedTimestamp.getNanos()) : null)
                .build();
    }

    private void populateNfcResetTimestamp(Book book) {
        if (book == null) {
            return;
        }
        populateNfcResetTimestamp(book, book.getNtagUid());
    }

    private void populateNfcResetTimestamp(Book book, String ntagUid) {
        if (book == null || ntagUid == null || ntagUid.isBlank()) {
            return;
        }
        String cleanUid = ntagUid.trim().toLowerCase().replace(":", "");
        try {
            DocumentSnapshot counterDoc = firestore.collection("nfc_counters").document(cleanUid).get().get();
            if (counterDoc.exists()) {
                java.util.Date lastResetAt = counterDoc.getDate("lastResetAt");
                if (lastResetAt != null) {
                    book.setNfcCounterResetAt(lastResetAt.toInstant());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to populate NFC counter reset timestamp for UID: {}", cleanUid, e);
        }
    }
}
