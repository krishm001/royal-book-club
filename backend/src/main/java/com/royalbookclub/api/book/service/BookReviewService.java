package com.royalbookclub.api.book.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.book.model.BookReview;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

/**
 * Service to manage book reviews and comments in Firestore.
 */
@Service
public class BookReviewService {

    private static final Logger log = LoggerFactory.getLogger(BookReviewService.class);
    private static final String COLLECTION_NAME = "book_reviews";

    private final Firestore firestore;

    public BookReviewService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Fetch all reviews for a book by its ISBN.
     */
    public List<BookReview> getReviewsByIsbn(String isbn) {
        if (isbn == null || isbn.isBlank()) {
            return new ArrayList<>();
        }
        String cleanIsbn = isbn.trim().replace("-", "");
        log.debug("Fetching reviews from Firestore for ISBN: {}", cleanIsbn);
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection(COLLECTION_NAME)
                    .whereEqualTo("isbn", cleanIsbn)
                    .get();
            QuerySnapshot querySnapshot = query.get();
            List<BookReview> reviews = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                reviews.add(mapToBookReview(doc));
            }
            // Sort in memory by createdAt descending
            reviews.sort((r1, r2) -> {
                if (r1.getCreatedAt() == null || r2.getCreatedAt() == null) return 0;
                return r2.getCreatedAt().compareTo(r1.getCreatedAt());
            });
            return reviews;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading reviews for ISBN: {}", cleanIsbn, e);
            throw new RuntimeException("Failed to read book reviews", e);
        } catch (ExecutionException e) {
            log.error("Error reading reviews for ISBN: {}", cleanIsbn, e);
            throw new RuntimeException("Failed to read book reviews", e);
        }
    }

    /**
     * Save a new review or comment on a book.
     */
    public BookReview saveReview(BookReview review) {
        String cleanIsbn = review.getIsbn().trim().replace("-", "");
        review.setIsbn(cleanIsbn);

        if (review.getId() == null || review.getId().isBlank()) {
            review.setId(UUID.randomUUID().toString());
        }
        if (review.getCreatedAt() == null) {
            review.setCreatedAt(Instant.now());
        }

        log.info("Saving review with ID: {} for ISBN: {}", review.getId(), cleanIsbn);
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(review.getId());
            ApiFuture<WriteResult> writeFuture = docRef.set(bookReviewToMap(review));
            writeFuture.get();
            log.info("Successfully saved book review: {}", review.getId());
            return review;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while saving review: {}", review.getId(), e);
            throw new RuntimeException("Failed to save book review", e);
        } catch (ExecutionException e) {
            log.error("Error saving review: {}", review.getId(), e);
            throw new RuntimeException("Failed to save book review", e);
        }
    }

    private Map<String, Object> bookReviewToMap(BookReview review) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", review.getId());
        map.put("isbn", review.getIsbn());
        map.put("userId", review.getUserId());
        map.put("author", review.getAuthor());
        map.put("content", review.getContent());
        map.put("rating", review.getRating());
        map.put("createdAt", review.getCreatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(review.getCreatedAt().getEpochSecond(), review.getCreatedAt().getNano()) : null);
        return map;
    }

    private BookReview mapToBookReview(DocumentSnapshot doc) {
        if (!doc.exists()) return null;

        com.google.cloud.Timestamp createdTimestamp = doc.getTimestamp("createdAt");

        return BookReview.builder()
                .id(doc.getString("id"))
                .isbn(doc.getString("isbn"))
                .userId(doc.getString("userId"))
                .author(doc.getString("author"))
                .content(doc.getString("content"))
                .rating(doc.getLong("rating") != null ? doc.getLong("rating").intValue() : null)
                .createdAt(createdTimestamp != null ? Instant.ofEpochSecond(createdTimestamp.getSeconds(), createdTimestamp.getNanos()) : null)
                .build();
    }
}
