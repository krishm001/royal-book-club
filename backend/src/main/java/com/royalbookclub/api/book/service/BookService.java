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
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                books.add(mapToBook(doc));
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
        log.debug("Fetching book from Firestore by ISBN: {}", cleanIsbn);
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(cleanIsbn);
            ApiFuture<DocumentSnapshot> future = docRef.get();
            DocumentSnapshot document = future.get();
            if (document.exists()) {
                return Optional.of(mapToBook(document));
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
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(cleanIsbn);
            ApiFuture<DocumentSnapshot> future = docRef.get();
            DocumentSnapshot document = future.get();

            Book book;
            Instant now = Instant.now();
            if (document.exists()) {
                // Update operation
                Book existing = mapToBook(document);
                
                // Adjust availableCopies if totalCopies changed
                int diff = bookDto.getTotalCopies() - existing.getTotalCopies();
                int newAvailable = Math.max(0, existing.getAvailableCopies() + diff);

                book = Book.builder()
                        .isbn(cleanIsbn)
                        .title(bookDto.getTitle())
                        .subtitle(bookDto.getSubtitle())
                        .authors(bookDto.getAuthors())
                        .genre(bookDto.getGenre())
                        .tags(bookDto.getTags() != null ? bookDto.getTags() : new ArrayList<>())
                        .publisher(bookDto.getPublisher())
                        .publishDate(bookDto.getPublishDate())
                        .description(bookDto.getDescription())
                        .coverUrl(bookDto.getCoverUrl())
                        .pages(bookDto.getPages())
                        .totalCopies(bookDto.getTotalCopies())
                        .availableCopies(bookDto.getAvailableCopies() != null ? bookDto.getAvailableCopies() : newAvailable)
                        .ntagUid(bookDto.getNtagUid())
                        .createdAt(existing.getCreatedAt())
                        .updatedAt(now)
                        .language(bookDto.getLanguage() != null ? bookDto.getLanguage() : "en")
                        .build();
            } else {
                // Insert operation
                book = Book.builder()
                        .isbn(cleanIsbn)
                        .title(bookDto.getTitle())
                        .subtitle(bookDto.getSubtitle())
                        .authors(bookDto.getAuthors())
                        .genre(bookDto.getGenre())
                        .tags(bookDto.getTags() != null ? bookDto.getTags() : new ArrayList<>())
                        .publisher(bookDto.getPublisher())
                        .publishDate(bookDto.getPublishDate())
                        .description(bookDto.getDescription())
                        .coverUrl(bookDto.getCoverUrl())
                        .pages(bookDto.getPages())
                        .totalCopies(bookDto.getTotalCopies())
                        .availableCopies(bookDto.getAvailableCopies() != null ? bookDto.getAvailableCopies() : bookDto.getTotalCopies())
                        .ntagUid(bookDto.getNtagUid())
                        .createdAt(now)
                        .updatedAt(now)
                        .language(bookDto.getLanguage() != null ? bookDto.getLanguage() : "en")
                        .build();
            }

            ApiFuture<WriteResult> writeFuture = docRef.set(bookToMap(book));
            writeFuture.get(); // block to verify completion
            log.info("Successfully saved book to Firestore: {}", cleanIsbn);
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
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(cleanIsbn);
            ApiFuture<WriteResult> writeFuture = docRef.delete();
            writeFuture.get(); // block to verify completion
            log.info("Successfully deleted book: {}", cleanIsbn);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while deleting book: {}", cleanIsbn, e);
            throw new RuntimeException("Failed to delete book", e);
        } catch (ExecutionException e) {
            log.error("Error deleting book: {}", cleanIsbn, e);
            throw new RuntimeException("Failed to delete book", e);
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
                return mapToBook(documents.get(0));
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
        String cleanUid = ntagUid.trim().toLowerCase().replace(":", "");
        if (counter != null && !counter.trim().isEmpty()) {
            long incomingCounter = parseCounterToLong(counter);
            log.info("Verifying parsed NFC counter: {} (raw: {}) for UID: {}", incomingCounter, counter, cleanUid);
            try {
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
                    } else if (incomingCounter == storedCounter) {
                        // Same counter value - check age limits
                        java.util.Date firstSeenAt = counterDoc.getDate("firstSeenAt");
                        if (firstSeenAt != null) {
                            long elapsed = System.currentTimeMillis() - firstSeenAt.getTime();
                            if (elapsed > 300000) {
                                log.warn("NFC counter {} for UID {} has expired. Elapsed: {}ms", incomingCounter, cleanUid, elapsed);
                                throw new BusinessRuleException("NFC Tap session has expired (5-minute security limit exceeded). Please re-tap the physical book.");
                            }
                        }
                    } else {
                        // Older counter value - rejected immediately
                        log.warn("NFC counter reuse attempt! Incoming: {}, Stored Latest: {} for UID: {}", incomingCounter, storedCounter, cleanUid);
                        throw new BusinessRuleException("This NFC counter is outdated and has been superseded by a more recent tap. Re-use of previous taps is strictly prohibited.");
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("Interrupted while validating NFC counter for UID: {}", cleanUid, e);
                throw new RuntimeException("Failed to verify NFC safety counter", e);
            } catch (ExecutionException e) {
                log.error("Error while validating NFC counter for UID: {}", cleanUid, e);
                throw new RuntimeException("Failed to verify NFC safety counter", e);
            }
        }
        return getBookByNtagUid(ntagUid);
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
        map.put("language", book.getLanguage() != null ? book.getLanguage() : "en");
        map.put("createdAt", book.getCreatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(book.getCreatedAt().getEpochSecond(), book.getCreatedAt().getNano()) : null);
        map.put("updatedAt", book.getUpdatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(book.getUpdatedAt().getEpochSecond(), book.getUpdatedAt().getNano()) : null);
        return map;
    }

    @SuppressWarnings("unchecked")
    private Book mapToBook(DocumentSnapshot doc) {
        if (!doc.exists()) return null;

        com.google.cloud.Timestamp createdTimestamp = doc.getTimestamp("createdAt");
        com.google.cloud.Timestamp updatedTimestamp = doc.getTimestamp("updatedAt");

        List<String> authors = (List<String>) doc.get("authors");
        List<String> tags = (List<String>) doc.get("tags");

        return Book.builder()
                .isbn(doc.getString("isbn"))
                .title(doc.getString("title"))
                .subtitle(doc.getString("subtitle"))
                .authors(authors != null ? authors : new ArrayList<>())
                .genre(doc.getString("genre"))
                .tags(tags != null ? tags : new ArrayList<>())
                .publisher(doc.getString("publisher"))
                .publishDate(doc.getString("publishDate"))
                .description(doc.getString("description"))
                .coverUrl(doc.getString("coverUrl"))
                .pages(doc.getLong("pages") != null ? doc.getLong("pages").intValue() : null)
                .totalCopies(doc.getLong("totalCopies") != null ? doc.getLong("totalCopies").intValue() : null)
                .availableCopies(doc.getLong("availableCopies") != null ? doc.getLong("availableCopies").intValue() : null)
                .ntagUid(doc.getString("ntagUid"))
                .language(doc.getString("language") != null ? doc.getString("language") : "en")
                .createdAt(createdTimestamp != null ? Instant.ofEpochSecond(createdTimestamp.getSeconds(), createdTimestamp.getNanos()) : null)
                .updatedAt(updatedTimestamp != null ? Instant.ofEpochSecond(updatedTimestamp.getSeconds(), updatedTimestamp.getNanos()) : null)
                .build();
    }
}
