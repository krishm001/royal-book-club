package com.royalbookclub.api.book.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.book.dto.BookDto;
import com.royalbookclub.api.book.model.Book;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
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
                .createdAt(createdTimestamp != null ? Instant.ofEpochSecond(createdTimestamp.getSeconds(), createdTimestamp.getNanos()) : null)
                .updatedAt(updatedTimestamp != null ? Instant.ofEpochSecond(updatedTimestamp.getSeconds(), updatedTimestamp.getNanos()) : null)
                .build();
    }
}
