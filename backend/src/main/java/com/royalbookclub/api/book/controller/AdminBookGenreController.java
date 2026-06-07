package com.royalbookclub.api.book.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.book.model.BookGenre;
import com.royalbookclub.api.book.service.BookGenreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for administering Book Salon Houses (Genres).
 */
@RestController
@RequestMapping("/api/v1/admin/genres/books")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Book Genres (Houses)", description = "Administrative endpoints to create and delete book salon houses")
public class AdminBookGenreController {

    private static final Logger log = LoggerFactory.getLogger(AdminBookGenreController.class);

    private final BookGenreService bookGenreService;

    public AdminBookGenreController(BookGenreService bookGenreService) {
        this.bookGenreService = bookGenreService;
    }

    /**
     * Add a Book Salon House.
     */
    @PostMapping
    @Operation(summary = "Add Book Salon House", description = "Insert a new Book Salon House (genre) for library ingestion.")
    public ResponseEntity<ApiResponse<BookGenre>> saveGenre(@RequestBody BookGenre genre) {
        log.info("Admin request to add Book House: {}", genre.getName());
        if (genre.getName() == null || genre.getName().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("House name cannot be empty"));
        }
        BookGenre saved = bookGenreService.saveGenre(genre);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(saved, "Salon House created successfully"));
    }

    /**
     * Delete a Book Salon House.
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete Book Salon House", description = "Deletes an existing Book Salon House.")
    public ResponseEntity<ApiResponse<Void>> deleteGenre(@PathVariable String id) {
        log.info("Admin request to delete Book House with ID: {}", id);
        bookGenreService.deleteGenre(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Salon House deleted successfully"));
    }
}
