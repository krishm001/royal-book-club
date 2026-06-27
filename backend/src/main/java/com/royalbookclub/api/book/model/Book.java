package com.royalbookclub.api.book.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Model representing a book in the library catalog.
 * Maps to the "books" collection in Firestore.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Book {
    private String isbn;
    private String title;
    private String subtitle;
    
    @Builder.Default
    private List<String> authors = new ArrayList<>();
    
    private String genre;
    
    @Builder.Default
    private List<String> tags = new ArrayList<>();
    
    private String publisher;
    private String publishDate;
    private String description;
    private String coverUrl;
    private Integer pages;
    private Integer totalCopies;
    private Integer availableCopies;
    private String ntagUid;
    private Instant createdAt;
    private Instant updatedAt;
}

