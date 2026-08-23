package com.royalbookclub.api.book.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Data Transfer Object for Book catalog items.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookDto {

    private String id;

    @NotBlank(message = "ISBN is required")
    private String isbn;

    @NotBlank(message = "Title is required")
    private String title;

    private String subtitle;

    @NotEmpty(message = "At least one author is required")
    private List<String> authors;

    private String genre;
    private List<String> tags;

    @Builder.Default
    private List<String> alternativeIsbns = new java.util.ArrayList<>();

    private String publisher;
    private String publishDate;
    private String description;
    private String coverUrl;
    
    @Min(value = 0, message = "Pages cannot be negative")
    private Integer pages;

    @NotNull(message = "Total copies count is required")
    @Min(value = 0, message = "Total copies cannot be negative")
    private Integer totalCopies;

    @Min(value = 0, message = "Available copies cannot be negative")
    private Integer availableCopies;

    private String ntagUid;
    
    @Builder.Default
    private List<String> ntagUids = new java.util.ArrayList<>();

    @Builder.Default
    private List<com.royalbookclub.api.book.model.BookCopy> copies = new java.util.ArrayList<>();

    @Builder.Default
    private List<Long> qrIds = new java.util.ArrayList<>();
    
    private Boolean isTest;

    @Builder.Default
    private String language = "en";
}
