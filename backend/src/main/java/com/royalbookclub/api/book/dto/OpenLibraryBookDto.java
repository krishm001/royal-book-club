package com.royalbookclub.api.book.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Data Transfer Object representing the metadata fetched from Open Library.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpenLibraryBookDto {
    private String isbn;
    private String title;
    private String subtitle;
    private List<String> authors;
    private String publisher;
    private String publishDate;
    private String coverUrl;
    private Integer pages;
    private String description;
}
