package com.royalbookclub.api.book.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

/**
 * Model representing a book review/comment written by a patron.
 * Maps to the "book_reviews" collection in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookReview {
    private String id;
    private String isbn;
    private String userId;
    private String author; // User's name, e.g. "Keats Byron"
    private String content;
    private Integer rating; // 1 to 5 stars
    private Boolean approved;
    private Instant createdAt;
}
