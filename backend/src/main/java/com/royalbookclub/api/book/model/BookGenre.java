package com.royalbookclub.api.book.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Model representing a Book Salon House (Genre).
 * Maps to the "book_genres" collection in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookGenre {
    private String id; // document ID, usually name
    private String name; // display name, e.g. "Keats Poetry"
}
